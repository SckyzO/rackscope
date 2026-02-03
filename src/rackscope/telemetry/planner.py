from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Dict, List, Iterable, Optional, Tuple

from rackscope.model.checks import ChecksLibrary, CheckDefinition, CheckRule
from rackscope.model.domain import Topology, Rack, Device
from rackscope.telemetry.prometheus import client as prom_client


SEVERITY_ORDER = {"OK": 0, "UNKNOWN": 1, "WARN": 2, "CRIT": 3}


@dataclass
class PlannerConfig:
    identity_label: str = "instance"
    rack_label: str = "rack_id"
    chassis_label: str = "chassis_id"
    job_regex: str = ".*"
    unknown_state: str = "UNKNOWN"
    cache_ttl_seconds: int = 60
    max_ids_per_query: int = 50


@dataclass
class PlannerSnapshot:
    generated_at: float
    node_states: Dict[str, str] = field(default_factory=dict)
    chassis_states: Dict[str, str] = field(default_factory=dict)
    rack_states: Dict[str, str] = field(default_factory=dict)
    rack_nodes: Dict[str, List[str]] = field(default_factory=dict)
    node_checks: Dict[str, Dict[str, str]] = field(default_factory=dict)
    chassis_checks: Dict[str, Dict[str, str]] = field(default_factory=dict)
    rack_checks: Dict[str, Dict[str, str]] = field(default_factory=dict)
    node_alerts: Dict[str, Dict[str, str]] = field(default_factory=dict)
    chassis_alerts: Dict[str, Dict[str, str]] = field(default_factory=dict)
    rack_alerts: Dict[str, Dict[str, str]] = field(default_factory=dict)


class TelemetryPlanner:
    def __init__(self, config: Optional[PlannerConfig] = None) -> None:
        self.config = config or PlannerConfig()
        self._snapshot: Optional[PlannerSnapshot] = None

    def update_config(self, config: PlannerConfig) -> None:
        self.config = config
        self._snapshot = None

    async def get_snapshot(
        self,
        topology: Topology,
        checks: ChecksLibrary,
        targets_by_check: Optional[Dict[str, Dict[str, List[str]]]] = None,
    ) -> PlannerSnapshot:
        now = time.monotonic()
        if self._snapshot and (now - self._snapshot.generated_at) < self.config.cache_ttl_seconds:
            return self._snapshot

        node_ids, chassis_ids, rack_ids, rack_nodes = _collect_topology_ids(topology)
        queries = _build_queries(
            checks.checks,
            node_ids,
            chassis_ids,
            rack_ids,
            self.config.max_ids_per_query,
            self.config.job_regex,
            targets_by_check,
        )
        total_ids = len(node_ids) + len(chassis_ids) + len(rack_ids)
        if targets_by_check is not None:
            total_ids = _count_target_ids(targets_by_check)
        prom_client.record_planner_batch(
            total_ids=total_ids,
            query_count=len(queries),
            max_ids_per_query=self.config.max_ids_per_query,
        )

        node_states: Dict[str, str] = {}
        chassis_states: Dict[str, str] = {}
        rack_states: Dict[str, str] = {}
        node_checks: Dict[str, Dict[str, str]] = {}
        chassis_checks: Dict[str, Dict[str, str]] = {}
        rack_checks: Dict[str, Dict[str, str]] = {}
        node_alerts: Dict[str, Dict[str, str]] = {}
        chassis_alerts: Dict[str, Dict[str, str]] = {}
        rack_alerts: Dict[str, Dict[str, str]] = {}

        seen_nodes: set[str] = set()
        seen_chassis: set[str] = set()
        seen_racks: set[str] = set()

        for check, query in queries:
            if not query:
                continue
            result = await prom_client.query(query, cache_type='health')
            if result.get("status") != "success":
                continue
            for item in result.get("data", {}).get("result", []):
                labels = item.get("metric") or {}
                key = _extract_key(check, labels, self.config)
                if not key:
                    continue
                severity = _evaluate_rules(check, item.get("value"))
                if check.scope == "node":
                    seen_nodes.add(key)
                    node_states[key] = _max_severity(node_states.get(key), severity)
                    # Store all check results
                    node_checks.setdefault(key, {})
                    current = node_checks[key].get(check.id)
                    if _max_severity(current, severity) == severity:
                        node_checks[key][check.id] = severity
                    # Store alerts separately for WARN/CRIT
                    if severity in ("WARN", "CRIT"):
                        node_alerts.setdefault(key, {})
                        current = node_alerts[key].get(check.id)
                        if _max_severity(current, severity) == severity:
                            node_alerts[key][check.id] = severity
                elif check.scope == "chassis":
                    seen_chassis.add(key)
                    chassis_states[key] = _max_severity(chassis_states.get(key), severity)
                    # Store all check results
                    chassis_checks.setdefault(key, {})
                    current = chassis_checks[key].get(check.id)
                    if _max_severity(current, severity) == severity:
                        chassis_checks[key][check.id] = severity
                    # Store alerts separately for WARN/CRIT
                    if severity in ("WARN", "CRIT"):
                        chassis_alerts.setdefault(key, {})
                        current = chassis_alerts[key].get(check.id)
                        if _max_severity(current, severity) == severity:
                            chassis_alerts[key][check.id] = severity
                elif check.scope == "rack":
                    seen_racks.add(key)
                    rack_states[key] = _max_severity(rack_states.get(key), severity)
                    # Store all check results
                    rack_checks.setdefault(key, {})
                    current = rack_checks[key].get(check.id)
                    if _max_severity(current, severity) == severity:
                        rack_checks[key][check.id] = severity
                    # Store alerts separately for WARN/CRIT
                    if severity in ("WARN", "CRIT"):
                        rack_alerts.setdefault(key, {})
                        current = rack_alerts[key].get(check.id)
                        if _max_severity(current, severity) == severity:
                            rack_alerts[key][check.id] = severity

        _apply_unknown(node_ids, seen_nodes, node_states, self.config.unknown_state)
        _apply_unknown(chassis_ids, seen_chassis, chassis_states, self.config.unknown_state)
        _apply_unknown(rack_ids, seen_racks, rack_states, self.config.unknown_state)

        # Derive rack state from node states and combine with rack checks.
        for rack_id, nodes in rack_nodes.items():
            states = [node_states.get(n, self.config.unknown_state) for n in nodes]
            node_agg = _aggregate_states(states, self.config.unknown_state)
            existing = rack_states.get(rack_id)
            if node_agg in ("WARN", "CRIT"):
                rack_states[rack_id] = _max_severity(existing, node_agg)
                continue
            if existing is None:
                rack_states[rack_id] = node_agg
                continue
            if existing == self.config.unknown_state and node_agg != self.config.unknown_state:
                rack_states[rack_id] = node_agg

        self._snapshot = PlannerSnapshot(
            generated_at=now,
            node_states=node_states,
            chassis_states=chassis_states,
            rack_states=rack_states,
            rack_nodes=rack_nodes,
            node_checks=node_checks,
            chassis_checks=chassis_checks,
            rack_checks=rack_checks,
            node_alerts=node_alerts,
            chassis_alerts=chassis_alerts,
            rack_alerts=rack_alerts,
        )
        return self._snapshot


def _build_queries(
    checks: Iterable[CheckDefinition],
    node_ids: List[str],
    chassis_ids: List[str],
    rack_ids: List[str],
    max_ids_per_query: int,
    job_regex: str,
    targets_by_check: Optional[Dict[str, Dict[str, List[str]]]] = None,
) -> List[Tuple[CheckDefinition, str]]:
    queries: List[Tuple[CheckDefinition, str]] = []

    for check in checks:
        if targets_by_check is not None:
            scoped_targets = targets_by_check.get(check.id)
            if not scoped_targets:
                continue
            node_ids = scoped_targets.get("node", [])
            chassis_ids = scoped_targets.get("chassis", [])
            rack_ids = scoped_targets.get("rack", [])
            if check.scope == "node" and not node_ids:
                continue
            if check.scope == "chassis" and not chassis_ids:
                continue
            if check.scope == "rack" and not rack_ids:
                continue
        base_expr = check.expr or ""
        expanded = [base_expr]
        expanded = _expand_placeholder(expanded, "$jobs", [job_regex], max_ids_per_query)
        expanded = _expand_placeholder(expanded, "$instances", node_ids, max_ids_per_query)
        expanded = _expand_placeholder(expanded, "$racks", rack_ids, max_ids_per_query)
        expanded = _expand_placeholder(expanded, "$chassis", chassis_ids, max_ids_per_query)
        for expr in expanded:
            queries.append((check, expr))

    return queries


def _count_target_ids(targets_by_check: Dict[str, Dict[str, List[str]]]) -> int:
    node_ids: set[str] = set()
    chassis_ids: set[str] = set()
    rack_ids: set[str] = set()
    for targets in targets_by_check.values():
        node_ids.update(targets.get("node", []))
        chassis_ids.update(targets.get("chassis", []))
        rack_ids.update(targets.get("rack", []))
    return len(node_ids) + len(chassis_ids) + len(rack_ids)


def _extract_key(
    check: CheckDefinition, labels: Dict[str, str], config: PlannerConfig
) -> Optional[str]:
    if check.selectors:
        return labels.get(check.selectors[0])
    if check.scope == "node":
        return labels.get(config.identity_label)
    if check.scope == "chassis":
        return labels.get(config.chassis_label)
    if check.scope == "rack":
        return labels.get(config.rack_label)
    return None


def _evaluate_rules(check: CheckDefinition, value: Optional[List[str]]) -> str:
    if value is None:
        return "UNKNOWN"
    try:
        numeric = float(value[1])
    except (TypeError, ValueError, IndexError):
        return "UNKNOWN"

    matched: List[str] = []
    for rule in check.rules:
        if _compare(numeric, rule):
            matched.append(rule.severity)

    if not matched:
        return "OK"
    return max(matched, key=lambda s: SEVERITY_ORDER.get(s, 0))


def _compare(value: float, rule: CheckRule) -> bool:
    try:
        rule_value = float(rule.value)
    except (TypeError, ValueError):
        return False
    if rule.op == "==":
        return value == rule_value
    if rule.op == "!=":
        return value != rule_value
    if rule.op == ">":
        return value > rule_value
    if rule.op == ">=":
        return value >= rule_value
    if rule.op == "<":
        return value < rule_value
    if rule.op == "<=":
        return value <= rule_value
    return False


def _regex_for_ids(ids: Iterable[str]) -> str:
    filtered = [item for item in ids if item]
    if not filtered:
        return ".*"
    regex = _trie_to_regex(_build_trie(filtered))
    return f"^(?:{regex})$"


def _escape_label_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


class _TrieNode:
    def __init__(self) -> None:
        self.children: Dict[str, "_TrieNode"] = {}
        self.terminal = False


def _build_trie(values: Iterable[str]) -> _TrieNode:
    root = _TrieNode()
    for value in values:
        node = root
        for ch in value:
            node = node.children.setdefault(ch, _TrieNode())
        node.terminal = True
    return root


def _trie_to_regex(node: _TrieNode) -> str:
    options = []
    suffix_map: Dict[str, List[str]] = {}

    for ch, child in node.children.items():
        suffix = _trie_to_regex(child)
        suffix_map.setdefault(suffix, []).append(ch)

    for suffix, chars in suffix_map.items():
        prefix = _chars_to_regex(chars)
        if suffix:
            options.append(f"{prefix}{suffix}")
        else:
            options.append(prefix)

    if node.terminal:
        options.append("")

    if not options:
        return ""

    if "" in options:
        options = [opt for opt in options if opt]
        if not options:
            return ""
        grouped = _join_options(options)
        return f"(?:{grouped})?"

    return _join_options(options)


def _join_options(options: List[str]) -> str:
    if len(options) == 1:
        return options[0]
    return f"(?:{'|'.join(options)})"


def _chars_to_regex(chars: List[str]) -> str:
    if len(chars) == 1:
        return _escape_label_value(chars[0])
    if all(ch.isdigit() for ch in chars):
        ranges = _digit_ranges(sorted(set(chars)))
        if len(ranges) == 1 and ranges[0][0] == ranges[0][1]:
            return ranges[0][0]
        parts = []
        for start, end in ranges:
            if start == end:
                parts.append(start)
            else:
                parts.append(f"{start}-{end}")
        return f"[{''.join(parts)}]"
    escaped = "".join(_escape_label_value(ch) for ch in sorted(set(chars)))
    return f"[{escaped}]"


def _digit_ranges(digits: List[str]) -> List[Tuple[str, str]]:
    ranges: List[Tuple[str, str]] = []
    start = prev = digits[0]
    for d in digits[1:]:
        if ord(d) == ord(prev) + 1:
            prev = d
            continue
        ranges.append((start, prev))
        start = prev = d
    ranges.append((start, prev))
    return ranges


def _expand_placeholder(
    expressions: List[str],
    token: str,
    ids: List[str],
    max_ids_per_query: int,
) -> List[str]:
    if token not in "".join(expressions):
        return expressions
    if not ids:
        return [expr.replace(token, ".*") for expr in expressions]
    chunks = [ids[i : i + max_ids_per_query] for i in range(0, len(ids), max_ids_per_query)]
    expanded: List[str] = []
    for expr in expressions:
        if token not in expr:
            expanded.append(expr)
            continue
        for chunk in chunks:
            expanded.append(expr.replace(token, _regex_for_ids(chunk)))
    return expanded


def _max_severity(current: Optional[str], candidate: str) -> str:
    if current is None:
        return candidate
    if SEVERITY_ORDER.get(candidate, 0) > SEVERITY_ORDER.get(current, 0):
        return candidate
    return current


def _aggregate_states(states: List[str], unknown: str) -> str:
    if not states:
        return unknown
    if "CRIT" in states:
        return "CRIT"
    if "WARN" in states:
        return "WARN"
    if unknown in states:
        return unknown
    return "OK"


def _apply_unknown(
    expected: List[str], seen: set[str], target: Dict[str, str], unknown: str
) -> None:
    for key in expected:
        if key not in seen:
            target.setdefault(key, unknown)


def _collect_topology_ids(
    topology: Topology,
) -> Tuple[List[str], List[str], List[str], Dict[str, List[str]]]:
    node_ids: List[str] = []
    chassis_ids: List[str] = []
    rack_ids: List[str] = []
    rack_nodes: Dict[str, List[str]] = {}

    for site in topology.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    _collect_from_rack(rack, rack_ids, chassis_ids, node_ids, rack_nodes)
            for rack in room.standalone_racks:
                _collect_from_rack(rack, rack_ids, chassis_ids, node_ids, rack_nodes)

    node_ids = _unique(node_ids)
    chassis_ids = _unique(chassis_ids)
    rack_ids = _unique(rack_ids)
    for rack_id, nodes in rack_nodes.items():
        rack_nodes[rack_id] = _unique(nodes)
    return node_ids, chassis_ids, rack_ids, rack_nodes


def _collect_from_rack(
    rack: Rack,
    rack_ids: List[str],
    chassis_ids: List[str],
    node_ids: List[str],
    rack_nodes: Dict[str, List[str]],
) -> None:
    rack_ids.append(rack.id)
    rack_nodes.setdefault(rack.id, [])
    for device in rack.devices:
        chassis_ids.append(device.id)
        nodes = _extract_nodes(device)
        rack_nodes[rack.id].extend(nodes)
        node_ids.extend(nodes)


def _extract_nodes(device: Device) -> List[str]:
    if isinstance(device.instance, dict):
        return [node for node in device.instance.values() if isinstance(node, str)]
    if isinstance(device.instance, list):
        return [node for node in device.instance if isinstance(node, str)]
    if isinstance(device.instance, str):
        return _expand_nodes_pattern(device.instance)
    if isinstance(device.nodes, dict):
        return [node for node in device.nodes.values() if isinstance(node, str)]
    if isinstance(device.nodes, list):
        return [node for node in device.nodes if isinstance(node, str)]
    if isinstance(device.nodes, str):
        return _expand_nodes_pattern(device.nodes)
    return [device.id]


def _expand_nodes_pattern(pattern: str) -> List[str]:
    if not isinstance(pattern, str):
        return []
    match = re.match(r"^(.*)\[(\d+)-(\d+)\]$", pattern)
    if not match:
        return [pattern]
    prefix, start, end = match.groups()
    width = len(start)
    start_num = int(start)
    end_num = int(end)
    if end_num < start_num:
        return [pattern]
    return [f"{prefix}{num:0{width}d}" for num in range(start_num, end_num + 1)]


def _unique(values: List[str]) -> List[str]:
    return list(dict.fromkeys(values))
