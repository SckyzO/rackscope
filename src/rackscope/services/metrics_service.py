"""
Generic metrics collection service for rack components.

This service replaces hardcoded metric collection (like get_pdu_metrics) with
a template-driven approach where metrics are defined in RackComponentTemplate.
"""

import asyncio
import logging
from typing import Dict, Optional

from rackscope.model.catalog import Catalog, RackComponentRef, RackComponentTemplate
from rackscope.model.domain import Rack
from rackscope.telemetry.prometheus import PrometheusClient

logger = logging.getLogger(__name__)


async def collect_component_metrics(
    rack: Rack,
    component_ref: RackComponentRef,
    catalog: Catalog,
    prom_client: PrometheusClient,
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
    # Get the component template
    template = catalog.get_rack_component_template(component_ref.template_id)
    if not template:
        logger.warning(
            f"Component template '{component_ref.template_id}' not found for rack {rack.id}"
        )
        return {}

    # If template has no metrics defined, return empty dict
    if not template.metrics:
        return {}

    # Build queries for all metrics
    queries = {}
    for metric_name in template.metrics:
        query = build_metric_query(
            metric_name=metric_name,
            rack_id=rack.id,
            component_ref=component_ref,
            template=template,
        )
        if query:
            queries[metric_name] = query

    # Execute all queries in parallel
    metrics: Dict[str, float] = {}
    try:
        responses = await asyncio.gather(
            *[prom_client.query(query) for query in queries.values()],
            return_exceptions=True,
        )
    except Exception as e:
        logger.error(f"Error fetching component metrics for rack {rack.id}: {e}")
        return metrics

    # Parse responses
    for metric_name, response in zip(queries.keys(), responses):
        if isinstance(response, Exception):
            logger.error(f"Error fetching metric {metric_name} for rack {rack.id}: {response}")
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
    # Basic query template with rack_id filter
    # This is a generic approach - can be extended with more sophisticated patterns
    query = f'{metric_name}{{rack_id="{rack_id}"}}'

    # For PDU-type components, add inlet filter to get inlet-level metrics
    if template.type == "pdu":
        query = f'{metric_name}{{rack_id="{rack_id}", inletid!=""}}'

    # For switch-type components, might want port-level metrics
    elif template.type == "switch":
        # Example: Get all port metrics for the switch
        query = f'{metric_name}{{rack_id="{rack_id}"}}'

    # For side-mounted components, could add position filter if needed
    # This would require additional metadata in the component template

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

    # If multiple time series, sum them up
    # (e.g., PDU with multiple inlets - total power is sum of all inlets)
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

    # Get rack template
    rack_template = catalog.get_rack_template(rack.template_id)
    if not rack_template:
        return {}

    # Get all rack components from infrastructure
    rack_components = rack_template.infrastructure.rack_components
    if not rack_components:
        return {}

    # Collect metrics for each component
    all_metrics: Dict[str, Dict[str, float]] = {}

    for component_ref in rack_components:
        # Use template_id as component identifier
        # (could also use a combination of template_id + position for uniqueness)
        component_id = component_ref.template_id

        metrics = await collect_component_metrics(
            rack=rack,
            component_ref=component_ref,
            catalog=catalog,
            prom_client=prom_client,
        )

        if metrics:
            all_metrics[component_id] = metrics

    return all_metrics
