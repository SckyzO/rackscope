"""
Generic metrics collection service for rack components and devices.

Metrics are defined in YAML templates (DeviceTemplate.metrics,
RackComponentTemplate.metrics) rather than in Python code.  This keeps the
core codebase vendor-agnostic: adding support for a new PDU brand or storage
array requires only a new template, not a code change.  The service reads
the metric list from the template and issues PromQL queries at runtime.
"""

import asyncio
import logging
import re
from typing import Dict, Optional, List

from rackscope.model.catalog import Catalog, RackComponentRef, RackComponentTemplate, DeviceTemplate
from rackscope.model.domain import Rack, Device
from rackscope.model.metrics import MetricsLibrary
from rackscope.services.instance_service import expand_device_instances
from rackscope.telemetry.prometheus import PrometheusClient

logger = logging.getLogger(__name__)


def resolve_metric_query(
    metric_id: str,
    library: Optional["MetricsLibrary"],
    rack_id: str,
    instance: Optional[str] = None,
) -> Optional[str]:
    """Resolve a metric library ID to an actual PromQL query.

    Templates store metric library IDs (e.g. 'pdu_active_power'), not raw
    Prometheus metric names. This function looks up the ID in the library and
    substitutes placeholders ({rack_id}, {instance}) in the metric expression.

    Without a library the metric_id is used as-is (backward compat fallback).
    """
    if library is None:
        # Fallback: treat the ID as a raw metric name (legacy behaviour)
        if instance:
            return f'{metric_id}{{instance="{instance}"}}'
        return f'{metric_id}{{rack_id="{rack_id}"}}'

    metric_def = library.get_metric(metric_id)
    if metric_def is None:
        logger.debug(f"Metric '{metric_id}' not found in library — using ID as raw name")
        if instance:
            return f'{metric_id}{{instance="{instance}"}}'
        return f'{metric_id}{{rack_id="{rack_id}"}}'

    expr = metric_def.metric
    # Substitute placeholders
    expr = expr.replace('"{rack_id}"', f'"{rack_id}"')
    expr = expr.replace("{rack_id}", rack_id)
    if instance:
        expr = expr.replace('"{instance}"', f'"{instance}"')
        expr = expr.replace("{instance}", instance)
    return expr


async def collect_component_metrics(
    rack: Rack,
    component_ref: RackComponentRef,
    catalog: Catalog,
    prom_client: PrometheusClient,
    library: Optional[MetricsLibrary] = None,
) -> Dict[str, float]:
    """
    Collect metrics for a rack component based on its template.

    Args:
        rack: The rack containing the component
        component_ref: Reference to the component (contains template_id)
        catalog: Catalog containing component templates
        prom_client: Prometheus client for querying

    Returns:
        Dictionary mapping metric names to their values
        Example: {"activepower_watt": 1234.5, "current_amp": 5.2}
    """
    template = catalog.get_rack_component_template(component_ref.template_id)
    if not template:
        logger.warning(
            f"Component template '{component_ref.template_id}' not found for rack {rack.id}"
        )
        return {}

    if not template.metrics:
        return {}

    # Build all queries up front so they can be fired in parallel below.
    # resolve_metric_query translates library IDs (e.g. 'pdu_active_power') to
    # actual PromQL expressions via the metrics library, then falls back to
    # treating the ID as a raw metric name for backward compatibility.
    queries = {}
    for metric_name in template.metrics:
        if library is not None:
            query = resolve_metric_query(metric_name, library, rack.id)
        else:
            query = build_metric_query(
                metric_name=metric_name,
                rack_id=rack.id,
                component_ref=component_ref,
                template=template,
            )
        if query:
            queries[metric_name] = query

    metrics: Dict[str, float] = {}
    try:
        responses = await asyncio.gather(
            *[prom_client.query(query, cache_type="metrics") for query in queries.values()],
            return_exceptions=True,
        )
    except Exception as e:
        logger.error(f"Error fetching component metrics for rack {rack.id}: {e}")
        return metrics

    for metric_name, response in zip(queries.keys(), responses):
        if isinstance(response, Exception) or isinstance(response, BaseException):
            logger.error(f"Error fetching metric {metric_name} for rack {rack.id}: {response}")
            continue
        if not isinstance(response, dict):
            continue

        value = parse_prometheus_result(response)
        if value is not None:
            metrics[metric_name] = value

    return metrics


def build_metric_query(
    metric_name: str,
    rack_id: str,
    component_ref: RackComponentRef,
    template: RackComponentTemplate,
) -> Optional[str]:
    """
    Build a Prometheus query for a specific metric.

    This function constructs queries based on metric naming conventions.
    It supports various label patterns commonly used in datacenter monitoring.

    Args:
        metric_name: Name of the metric (e.g., "activepower_watt")
        rack_id: ID of the rack containing the component
        component_ref: Reference to the component
        template: Component template with metadata

    Returns:
        PromQL query string or None if metric cannot be queried
    """
    query = f'{metric_name}{{rack_id="{rack_id}"}}'

    if template.type == "pdu":
        # PDUs expose one time series per inlet; filtering on inletid!="" selects
        # only inlet-level rows and excludes any rack-level aggregation rows that
        # some exporters emit alongside.
        query = f'{metric_name}{{rack_id="{rack_id}", inletid!=""}}'

    return query


def parse_prometheus_result(response: dict) -> Optional[float]:
    """
    Parse a Prometheus query response and extract a single numeric value.

    For responses with multiple time series (like PDU with multiple inlets),
    this function returns the sum of all values.

    Args:
        response: Prometheus API response dictionary

    Returns:
        Numeric value or None if parsing fails
    """
    if not isinstance(response, dict) or response.get("status") != "success":
        return None

    result_data = response.get("data", {}).get("result", [])
    if not result_data:
        return None

    # Sum across all time series: components like PDUs expose one series per
    # inlet, so the total power/current is the sum over all inlets.
    total = 0.0
    count = 0

    for item in result_data:
        try:
            value_str = item.get("value", [None, "0"])[1]
            value = float(value_str)
            total += value
            count += 1
        except (TypeError, ValueError, IndexError) as e:
            logger.debug(f"Failed to parse metric value: {e}")
            continue

    return total if count > 0 else None


async def collect_rack_component_metrics(
    rack: Rack,
    catalog: Catalog,
    prom_client: PrometheusClient,
    library: Optional[MetricsLibrary] = None,
) -> Dict[str, Dict[str, float]]:
    """
    Collect metrics for all rack components (PDUs, switches, etc.).

    This function replaces the old hardcoded get_pdu_metrics() approach.

    Args:
        rack: The rack to collect metrics for
        catalog: Catalog containing component templates
        prom_client: Prometheus client

    Returns:
        Dictionary mapping component IDs to their metrics
        Example: {
            "pdu-left": {"activepower_watt": 1234.5, "current_amp": 5.2},
            "pdu-right": {"activepower_watt": 1150.0, "current_amp": 4.8}
        }
    """
    if not rack.template_id:
        return {}

    rack_template = catalog.get_rack_template(rack.template_id)
    if not rack_template:
        return {}

    rack_components = rack_template.infrastructure.rack_components
    if not rack_components:
        return {}

    all_metrics: Dict[str, Dict[str, float]] = {}

    for component_ref in rack_components:
        # template_id is used as the component key; this is unique per rack
        # because a rack template cannot reference the same component template twice.
        component_id = component_ref.template_id

        metrics = await collect_component_metrics(
            rack=rack,
            component_ref=component_ref,
            catalog=catalog,
            prom_client=prom_client,
            library=library,
        )

        if metrics:
            all_metrics[component_id] = metrics

    return all_metrics


# --- Device Metrics Collection ---


async def collect_device_metrics(
    device: Device,
    rack_id: str,
    template: DeviceTemplate,
    prom_client: PrometheusClient,
    library: Optional[MetricsLibrary] = None,
) -> Dict[str, Dict[str, float]]:
    """
    Collect metrics for a single device based on its template.

    This function replaces hardcoded get_node_metrics() logic.

    Args:
        device: The device to collect metrics for
        rack_id: ID of the rack containing the device
        template: Device template with metrics list
        prom_client: Prometheus client

    Returns:
        Dictionary mapping instance names to their metrics
        Example: {
            "node01": {"temperature": 65.0, "power": 250.0},
            "node02": {"temperature": 70.0, "power": 300.0}
        }
    """
    if not template.metrics:
        return {}

    instances = expand_device_instances(device)

    # Map base_metric_name → query.
    # When a library entry exists, its .metric field is a full PromQL expression
    # (e.g. "node_temperature_celsius{instance=\"$instance\", name=~\"CPU.*\"}").
    # We substitute $instance with the actual instance regex and use the base
    # metric name (before the first '{') as the storage key — this lets each
    # profile/exporter define its own PromQL while keeping the lookup in
    # collect_rack_state generic (m.get("node_temperature_celsius")).
    queries: Dict[str, str] = {}
    for metric_id in template.metrics:
        metric_def = library.get_metric(metric_id) if library else None
        if metric_def:
            # Extract base name for use as storage key (exporter-agnostic)
            base_name = re.match(r'^([a-zA-Z_:][a-zA-Z0-9_:]*)', metric_def.metric)
            key = base_name.group(1) if base_name else metric_id
            # Substitute $instance placeholder with the actual instance filter
            if len(instances) == 1:
                instance_val = instances[0]
                expr = metric_def.metric.replace('$instance', instance_val)
                # Replace instance="$instance" → instance="val"
                query = re.sub(r'instance="\$instance"', f'instance="{instance_val}"', expr)
            else:
                instance_pattern = "|".join(instances)
                query = re.sub(
                    r'instance="\$instance"',
                    f'instance=~"{instance_pattern}"',
                    metric_def.metric,
                )
            queries[key] = query
        else:
            query = build_device_metric_query(
                metric_name=metric_id,
                rack_id=rack_id,
                instances=instances,
            )
            if query:
                queries[metric_id] = query

    all_instances_metrics: Dict[str, Dict[str, float]] = {}
    try:
        responses = await asyncio.gather(
            *[prom_client.query(query, cache_type="metrics") for query in queries.values()],
            return_exceptions=True,
        )
    except Exception as e:
        logger.error(f"Error fetching device metrics for {device.id}: {e}")
        return all_instances_metrics

    for metric_name, response in zip(queries.keys(), responses):
        if isinstance(response, Exception):
            logger.error(f"Error fetching metric {metric_name} for {device.id}: {response}")
            continue

        if not isinstance(response, dict) or response.get("status") != "success":
            continue

        result_data = response.get("data", {}).get("result", [])
        for item in result_data:
            metric_labels = item.get("metric", {})
            # Some exporters use "node_id" instead of "instance"; try both.
            instance_name = metric_labels.get("instance") or metric_labels.get("node_id")

            if not instance_name:
                continue

            try:
                value_str = item.get("value", [None, "0"])[1]
                value = float(value_str)
            except (TypeError, ValueError, IndexError) as e:
                logger.debug(f"Failed to parse metric value: {e}")
                continue

            if instance_name not in all_instances_metrics:
                all_instances_metrics[instance_name] = {}
            all_instances_metrics[instance_name][metric_name] = value

    return all_instances_metrics


def build_device_metric_query(
    metric_name: str,
    rack_id: str,
    instances: List[str],
) -> Optional[str]:
    """
    Build a Prometheus query for a device metric.

    Args:
        metric_name: Name of the metric (e.g., "node_temperature_celsius")
        rack_id: ID of the rack containing the device
        instances: List of instance names for the device

    Returns:
        PromQL query string or None if metric cannot be queried
    """
    if not instances:
        return None

    # Use a regex matcher for multiple instances to issue one query instead of N.
    if len(instances) == 1:
        instance_filter = f'instance="{instances[0]}"'
    else:
        instance_pattern = "|".join(instances)
        instance_filter = f'instance=~"{instance_pattern}"'

    query = f'{metric_name}{{rack_id="{rack_id}", {instance_filter}}}'

    return query


async def collect_rack_devices_metrics(
    rack: Rack,
    catalog: Catalog,
    prom_client: PrometheusClient,
    library: Optional[MetricsLibrary] = None,
) -> Dict[str, Dict[str, float]]:
    """
    Collect metrics for all devices in a rack.

    This function replaces the old hardcoded get_node_metrics() approach.

    Args:
        rack: The rack to collect metrics for
        catalog: Catalog containing device templates
        prom_client: Prometheus client

    Returns:
        Dictionary mapping instance names to their metrics
        Example: {
            "node01": {"temperature": 65.0, "power": 250.0},
            "node02": {"temperature": 70.0, "power": 300.0}
        }
    """
    all_metrics: Dict[str, Dict[str, float]] = {}

    for device in rack.devices:
        template = catalog.get_device_template(device.template_id)
        if not template or not template.metrics:
            continue

        device_metrics = await collect_device_metrics(
            device=device,
            rack_id=rack.id,
            template=template,
            prom_client=prom_client,
            library=library,
        )

        all_metrics.update(device_metrics)

    return all_metrics
