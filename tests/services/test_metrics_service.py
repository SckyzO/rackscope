"""Tests for generic metrics collection service."""

import pytest
from unittest.mock import AsyncMock, Mock

from rackscope.model.catalog import (
    Catalog,
    RackComponentRef,
    RackComponentTemplate,
    RackTemplate,
    RackInfrastructure,
    DeviceTemplate,
    LayoutConfig,
)
from rackscope.model.domain import Rack, Device
from rackscope.model.metrics import MetricDefinition, MetricsLibrary
from rackscope.services.metrics_service import (
    build_device_metric_query,
    build_metric_query,
    collect_component_metrics,
    collect_device_metrics,
    collect_rack_component_metrics,
    collect_rack_devices_metrics,
    parse_prometheus_result,
    resolve_metric_query,
)


@pytest.fixture
def pdu_template():
    """Sample PDU template with metrics."""
    return RackComponentTemplate(
        id="pdu-raritan-px3",
        name="Raritan PX3 PDU",
        type="pdu",
        location="side",
        u_height=0,
        metrics=[
            "raritan_pdu_activepower_watt",
            "raritan_pdu_current_ampere",
            "raritan_pdu_apparentpower_voltampere",
        ],
    )


@pytest.fixture
def switch_template():
    """Sample switch template with metrics."""
    return RackComponentTemplate(
        id="switch-cisco-nexus",
        name="Cisco Nexus Switch",
        type="switch",
        location="u-mount",
        u_height=1,
        metrics=[
            "switch_port_status",
            "switch_port_traffic_bytes",
        ],
    )


@pytest.fixture
def catalog_with_templates(pdu_template, switch_template):
    """Catalog with component templates."""
    return Catalog(rack_component_templates=[pdu_template, switch_template])


@pytest.fixture
def rack_with_pdu():
    """Rack with PDU component."""
    return Rack(
        id="rack01",
        name="Rack 01",
        u_height=42,
        template_id="standard-rack-42u",
    )


@pytest.fixture
def pdu_component_ref():
    """Reference to a PDU component."""
    return RackComponentRef(
        template_id="pdu-raritan-px3",
        side="left",
    )


@pytest.fixture
def mock_prom_client():
    """Mock Prometheus client."""
    client = Mock()
    client.query = AsyncMock()
    return client


class TestBuildMetricQuery:
    """Test metric query building."""

    def test_build_pdu_query(self, pdu_template, pdu_component_ref):
        """Test building query for PDU metric."""
        query = build_metric_query(
            metric_name="raritan_pdu_activepower_watt",
            rack_id="rack01",
            component_ref=pdu_component_ref,
            template=pdu_template,
        )

        assert query is not None
        assert "raritan_pdu_activepower_watt" in query
        assert 'rack_id="rack01"' in query
        assert 'inletid!=""' in query  # PDU-specific filter

    def test_build_switch_query(self, switch_template):
        """Test building query for switch metric."""
        component_ref = RackComponentRef(
            template_id="switch-cisco-nexus",
            u_position=1,
        )

        query = build_metric_query(
            metric_name="switch_port_status",
            rack_id="rack01",
            component_ref=component_ref,
            template=switch_template,
        )

        assert query is not None
        assert "switch_port_status" in query
        assert 'rack_id="rack01"' in query
        # Switch queries don't have inlet filter
        assert "inletid" not in query


class TestParsePrometheusResult:
    """Test Prometheus result parsing."""

    def test_parse_single_value(self):
        """Test parsing response with single time series."""
        response = {
            "status": "success",
            "data": {
                "result": [
                    {
                        "metric": {"rack_id": "rack01", "pduname": "pdu-left"},
                        "value": [1234567890, "1234.5"],
                    }
                ]
            },
        }

        value = parse_prometheus_result(response)
        assert value == 1234.5

    def test_parse_multiple_values_sum(self):
        """Test parsing response with multiple time series (should sum)."""
        response = {
            "status": "success",
            "data": {
                "result": [
                    {
                        "metric": {"rack_id": "rack01", "inletid": "1"},
                        "value": [1234567890, "100.0"],
                    },
                    {
                        "metric": {"rack_id": "rack01", "inletid": "2"},
                        "value": [1234567890, "150.0"],
                    },
                ]
            },
        }

        value = parse_prometheus_result(response)
        assert value == 250.0  # Sum of 100.0 + 150.0

    def test_parse_empty_result(self):
        """Test parsing response with no data."""
        response = {"status": "success", "data": {"result": []}}

        value = parse_prometheus_result(response)
        assert value is None

    def test_parse_invalid_response(self):
        """Test parsing invalid response."""
        response = {"status": "error", "error": "query failed"}

        value = parse_prometheus_result(response)
        assert value is None

    def test_parse_invalid_value_format(self):
        """Test parsing response with invalid value format."""
        response = {
            "status": "success",
            "data": {
                "result": [
                    {
                        "metric": {"rack_id": "rack01"},
                        "value": [1234567890, "invalid"],
                    }
                ]
            },
        }

        value = parse_prometheus_result(response)
        assert value is None


@pytest.mark.asyncio
class TestCollectComponentMetrics:
    """Test component metrics collection."""

    async def test_collect_pdu_metrics(
        self,
        rack_with_pdu,
        pdu_component_ref,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting metrics for a PDU component."""
        # Mock Prometheus responses
        mock_prom_client.query.side_effect = [
            # Response for activepower_watt
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {}, "value": [1234567890, "1234.5"]},
                    ]
                },
            },
            # Response for current_ampere
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {}, "value": [1234567890, "5.2"]},
                    ]
                },
            },
            # Response for apparentpower_voltampere
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {}, "value": [1234567890, "1300.0"]},
                    ]
                },
            },
        ]

        metrics = await collect_component_metrics(
            rack=rack_with_pdu,
            component_ref=pdu_component_ref,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        assert metrics == {
            "raritan_pdu_activepower_watt": 1234.5,
            "raritan_pdu_current_ampere": 5.2,
            "raritan_pdu_apparentpower_voltampere": 1300.0,
        }
        assert mock_prom_client.query.call_count == 3

    async def test_collect_metrics_template_not_found(
        self,
        rack_with_pdu,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting metrics when template is not found."""
        invalid_ref = RackComponentRef(
            template_id="nonexistent-template",
            side="left",
        )

        metrics = await collect_component_metrics(
            rack=rack_with_pdu,
            component_ref=invalid_ref,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        assert metrics == {}
        mock_prom_client.query.assert_not_called()

    async def test_collect_metrics_no_metrics_defined(
        self,
        rack_with_pdu,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting metrics when template has no metrics."""
        # Add template with no metrics
        empty_template = RackComponentTemplate(
            id="empty-component",
            name="Empty Component",
            type="other",
            location="side",
            u_height=0,
            metrics=[],  # No metrics
        )
        catalog_with_templates.rack_component_templates.append(empty_template)

        empty_ref = RackComponentRef(template_id="empty-component", side="left")

        metrics = await collect_component_metrics(
            rack=rack_with_pdu,
            component_ref=empty_ref,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        assert metrics == {}
        mock_prom_client.query.assert_not_called()

    async def test_collect_metrics_query_error(
        self,
        rack_with_pdu,
        pdu_component_ref,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test handling query errors gracefully."""
        # Mock one successful response and one error
        mock_prom_client.query.side_effect = [
            {"status": "success", "data": {"result": [{"value": [0, "100.0"]}]}},
            Exception("Query timeout"),
            {"status": "error", "error": "invalid query"},
        ]

        metrics = await collect_component_metrics(
            rack=rack_with_pdu,
            component_ref=pdu_component_ref,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        # Should only have the successful metric
        assert len(metrics) == 1
        assert "raritan_pdu_activepower_watt" in metrics


@pytest.mark.asyncio
class TestCollectRackComponentMetrics:
    """Test collecting metrics for all rack components."""

    async def test_collect_rack_with_pdu(
        self,
        rack_with_pdu,
        pdu_component_ref,
        catalog_with_templates,
        mock_prom_client,
        pdu_template,
    ):
        """Test collecting metrics for rack with PDU."""
        # Create rack template with PDU component
        rack_template = RackTemplate(
            id="standard-rack-42u",
            name="Standard 42U Rack",
            u_height=42,
            infrastructure=RackInfrastructure(
                rack_components=[pdu_component_ref],
            ),
        )
        catalog_with_templates.rack_templates = [rack_template]

        # Mock Prometheus responses (3 metrics)
        mock_prom_client.query.side_effect = [
            {"status": "success", "data": {"result": [{"value": [0, "1234.5"]}]}},
            {"status": "success", "data": {"result": [{"value": [0, "5.2"]}]}},
            {"status": "success", "data": {"result": [{"value": [0, "1300.0"]}]}},
        ]

        all_metrics = await collect_rack_component_metrics(
            rack=rack_with_pdu,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        assert "pdu-raritan-px3" in all_metrics
        assert len(all_metrics["pdu-raritan-px3"]) == 3

    async def test_collect_rack_no_template(
        self,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting metrics for rack without template."""
        rack_no_template = Rack(
            id="rack02",
            name="Rack 02",
            u_height=42,
            template_id=None,  # No template
        )

        all_metrics = await collect_rack_component_metrics(
            rack=rack_no_template,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        assert all_metrics == {}
        mock_prom_client.query.assert_not_called()

    async def test_collect_rack_no_components(
        self,
        rack_with_pdu,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting metrics for rack with no components."""
        # Create rack template without components
        rack_template = RackTemplate(
            id="standard-rack-42u",
            name="Standard 42U Rack",
            u_height=42,
            infrastructure=RackInfrastructure(
                rack_components=[],  # No components
            ),
        )
        catalog_with_templates.rack_templates = [rack_template]

        all_metrics = await collect_rack_component_metrics(
            rack=rack_with_pdu,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        assert all_metrics == {}
        mock_prom_client.query.assert_not_called()


@pytest.fixture
def server_template():
    """Sample server template with metrics."""
    return DeviceTemplate(
        id="server-compute",
        name="Compute Server",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        metrics=[
            "node_temperature_celsius",
            "node_power_watts",
        ],
    )


@pytest.fixture
def device_with_instances():
    """Device with multiple instances."""
    return Device(
        id="device01",
        name="Compute Node",
        template_id="server-compute",
        u_position=10,
        instance="compute[01-02]",  # Expands to compute01, compute02
    )


@pytest.fixture
def rack_with_devices(device_with_instances):
    """Rack containing devices."""
    return Rack(
        id="rack01",
        name="Rack 01",
        u_height=42,
        devices=[device_with_instances],
    )


@pytest.fixture
def catalog_with_device_template(server_template):
    """Catalog with device template."""
    return Catalog(device_templates=[server_template])


class TestBuildDeviceMetricQuery:
    """Test device metric query building."""

    def test_build_single_instance_query(self):
        """Test building query for single instance."""
        query = build_device_metric_query(
            metric_name="node_temperature_celsius",
            rack_id="rack01",
            instances=["compute01"],
        )

        assert query is not None
        assert "node_temperature_celsius" in query
        assert 'rack_id="rack01"' in query
        assert 'instance="compute01"' in query

    def test_build_multiple_instances_query(self):
        """Test building query for multiple instances."""
        query = build_device_metric_query(
            metric_name="node_power_watts",
            rack_id="rack01",
            instances=["compute01", "compute02", "compute03"],
        )

        assert query is not None
        assert "node_power_watts" in query
        assert 'rack_id="rack01"' in query
        assert 'instance=~"compute01|compute02|compute03"' in query

    def test_build_query_no_instances(self):
        """Test building query with no instances."""
        query = build_device_metric_query(
            metric_name="node_temperature_celsius",
            rack_id="rack01",
            instances=[],
        )

        assert query is None


@pytest.mark.asyncio
class TestCollectDeviceMetrics:
    """Test device metrics collection."""

    async def test_collect_device_metrics_success(
        self,
        device_with_instances,
        server_template,
        mock_prom_client,
    ):
        """Test collecting metrics for a device with multiple instances."""
        # Mock Prometheus responses (2 metrics × 2 instances)
        mock_prom_client.query.side_effect = [
            # Response for node_temperature_celsius
            {
                "status": "success",
                "data": {
                    "result": [
                        {
                            "metric": {"instance": "compute01"},
                            "value": [1234567890, "65.0"],
                        },
                        {
                            "metric": {"instance": "compute02"},
                            "value": [1234567890, "70.0"],
                        },
                    ]
                },
            },
            # Response for node_power_watts
            {
                "status": "success",
                "data": {
                    "result": [
                        {
                            "metric": {"instance": "compute01"},
                            "value": [1234567890, "250.0"],
                        },
                        {
                            "metric": {"instance": "compute02"},
                            "value": [1234567890, "300.0"],
                        },
                    ]
                },
            },
        ]

        metrics = await collect_device_metrics(
            device=device_with_instances,
            rack_id="rack01",
            template=server_template,
            prom_client=mock_prom_client,
        )

        assert metrics == {
            "compute01": {
                "node_temperature_celsius": 65.0,
                "node_power_watts": 250.0,
            },
            "compute02": {
                "node_temperature_celsius": 70.0,
                "node_power_watts": 300.0,
            },
        }
        assert mock_prom_client.query.call_count == 2

    async def test_collect_device_metrics_no_metrics(
        self,
        device_with_instances,
        mock_prom_client,
    ):
        """Test collecting metrics when template has no metrics."""
        empty_template = DeviceTemplate(
            id="server-empty",
            name="Empty Server",
            type="server",
            u_height=2,
            layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
            metrics=[],  # No metrics
        )

        metrics = await collect_device_metrics(
            device=device_with_instances,
            rack_id="rack01",
            template=empty_template,
            prom_client=mock_prom_client,
        )

        assert metrics == {}
        mock_prom_client.query.assert_not_called()

    async def test_collect_device_metrics_query_error(
        self,
        device_with_instances,
        server_template,
        mock_prom_client,
    ):
        """Test handling query errors gracefully."""
        mock_prom_client.query.side_effect = [
            {
                "status": "success",
                "data": {"result": [{"metric": {"instance": "compute01"}, "value": [0, "65.0"]}]},
            },
            Exception("Query timeout"),
        ]

        metrics = await collect_device_metrics(
            device=device_with_instances,
            rack_id="rack01",
            template=server_template,
            prom_client=mock_prom_client,
        )

        # Should only have the successful metric
        assert "compute01" in metrics
        assert "node_temperature_celsius" in metrics["compute01"]


@pytest.mark.asyncio
class TestCollectRackDevicesMetrics:
    """Test collecting metrics for all devices in a rack."""

    async def test_collect_rack_devices_metrics(
        self,
        rack_with_devices,
        catalog_with_device_template,
        mock_prom_client,
    ):
        """Test collecting metrics for all devices in a rack."""
        # Mock Prometheus responses (2 metrics)
        mock_prom_client.query.side_effect = [
            # node_temperature_celsius
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {"instance": "compute01"}, "value": [0, "65.0"]},
                        {"metric": {"instance": "compute02"}, "value": [0, "70.0"]},
                    ]
                },
            },
            # node_power_watts
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {"instance": "compute01"}, "value": [0, "250.0"]},
                        {"metric": {"instance": "compute02"}, "value": [0, "300.0"]},
                    ]
                },
            },
        ]

        all_metrics = await collect_rack_devices_metrics(
            rack=rack_with_devices,
            catalog=catalog_with_device_template,
            prom_client=mock_prom_client,
        )

        assert "compute01" in all_metrics
        assert "compute02" in all_metrics
        assert all_metrics["compute01"]["node_temperature_celsius"] == 65.0
        assert all_metrics["compute02"]["node_power_watts"] == 300.0

    async def test_collect_rack_devices_no_devices(
        self,
        catalog_with_device_template,
        mock_prom_client,
    ):
        """Test collecting metrics for rack with no devices."""
        empty_rack = Rack(
            id="rack02",
            name="Rack 02",
            u_height=42,
            devices=[],  # No devices
        )

        all_metrics = await collect_rack_devices_metrics(
            rack=empty_rack,
            catalog=catalog_with_device_template,
            prom_client=mock_prom_client,
        )

        assert all_metrics == {}
        mock_prom_client.query.assert_not_called()

    async def test_collect_rack_devices_no_template(
        self,
        rack_with_devices,
        mock_prom_client,
    ):
        """Test collecting metrics when device template not found."""
        empty_catalog = Catalog(device_templates=[])

        all_metrics = await collect_rack_devices_metrics(
            rack=rack_with_devices,
            catalog=empty_catalog,
            prom_client=mock_prom_client,
        )

        assert all_metrics == {}
        mock_prom_client.query.assert_not_called()


# ── Tests for resolve_metric_query and library integration ──────────────────


@pytest.mark.asyncio
class TestMetricsLibraryIntegration:
    """Test metrics library integration with collect functions."""

    async def test_collect_component_metrics_with_library(
        self,
        rack_with_pdu,
        pdu_component_ref,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting component metrics using metrics library."""
        from rackscope.model.loader import load_metrics_library

        library = load_metrics_library("config/metrics/library")

        # Mock Prometheus responses
        mock_prom_client.query.side_effect = [
            {"status": "success", "data": {"result": [{"value": [0, "1234.5"]}]}},
            {"status": "success", "data": {"result": [{"value": [0, "5.2"]}]}},
            {"status": "success", "data": {"result": [{"value": [0, "1300.0"]}]}},
        ]

        metrics = await collect_component_metrics(
            rack=rack_with_pdu,
            component_ref=pdu_component_ref,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
            library=library,
        )

        # Should have collected all metrics
        assert len(metrics) == 3
        assert mock_prom_client.query.call_count == 3

    async def test_collect_device_metrics_with_library(
        self,
        device_with_instances,
        server_template,
        mock_prom_client,
    ):
        """Test collecting device metrics using metrics library."""
        from rackscope.model.loader import load_metrics_library

        library = load_metrics_library("config/metrics/library")

        # Mock Prometheus responses
        mock_prom_client.query.side_effect = [
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {"instance": "compute01"}, "value": [0, "65.0"]},
                        {"metric": {"instance": "compute02"}, "value": [0, "70.0"]},
                    ]
                },
            },
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {"instance": "compute01"}, "value": [0, "250.0"]},
                        {"metric": {"instance": "compute02"}, "value": [0, "300.0"]},
                    ]
                },
            },
        ]

        metrics = await collect_device_metrics(
            device=device_with_instances,
            rack_id="rack01",
            template=server_template,
            prom_client=mock_prom_client,
            library=library,
        )

        # Should have collected metrics for both instances
        assert "compute01" in metrics
        assert "compute02" in metrics


@pytest.mark.asyncio
class TestMetricQueryBuilding:
    """Test edge cases in metric query building."""

    async def test_collect_component_metrics_empty_result(
        self,
        rack_with_pdu,
        pdu_component_ref,
        catalog_with_templates,
        mock_prom_client,
    ):
        """Test collecting component metrics when Prometheus returns empty result."""
        # Mock empty Prometheus responses
        mock_prom_client.query.side_effect = [
            {"status": "success", "data": {"result": []}},
            {"status": "success", "data": {"result": []}},
            {"status": "success", "data": {"result": []}},
        ]

        metrics = await collect_component_metrics(
            rack=rack_with_pdu,
            component_ref=pdu_component_ref,
            catalog=catalog_with_templates,
            prom_client=mock_prom_client,
        )

        # Should return empty dict when no data
        assert metrics == {}

    async def test_collect_device_metrics_using_node_id_label(
        self,
        device_with_instances,
        server_template,
        mock_prom_client,
    ):
        """Test device metrics collection when exporter uses node_id instead of instance."""
        # Mock response with node_id label instead of instance
        mock_prom_client.query.side_effect = [
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {"node_id": "compute01"}, "value": [0, "65.0"]},
                        {"metric": {"node_id": "compute02"}, "value": [0, "70.0"]},
                    ]
                },
            },
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {"node_id": "compute01"}, "value": [0, "250.0"]},
                        {"metric": {"node_id": "compute02"}, "value": [0, "300.0"]},
                    ]
                },
            },
        ]

        metrics = await collect_device_metrics(
            device=device_with_instances,
            rack_id="rack01",
            template=server_template,
            prom_client=mock_prom_client,
        )

        # Should handle node_id label
        assert "compute01" in metrics
        assert "compute02" in metrics

    async def test_collect_device_metrics_missing_instance_label(
        self,
        device_with_instances,
        server_template,
        mock_prom_client,
    ):
        """Test device metrics collection when result has no instance/node_id label."""
        # Mock response with no instance or node_id label
        mock_prom_client.query.side_effect = [
            {
                "status": "success",
                "data": {
                    "result": [
                        {"metric": {}, "value": [0, "65.0"]},  # No instance label
                    ]
                },
            },
            {"status": "success", "data": {"result": []}},
        ]

        metrics = await collect_device_metrics(
            device=device_with_instances,
            rack_id="rack01",
            template=server_template,
            prom_client=mock_prom_client,
        )

        # Should skip metrics without instance labels
        assert metrics == {}


class TestParsePrometheusResultEdgeCases:
    """Test edge cases in Prometheus result parsing."""

    def test_parse_result_not_dict(self):
        """Test parsing when response is not a dict."""
        from rackscope.services.metrics_service import parse_prometheus_result

        result = parse_prometheus_result("not a dict")
        assert result is None

    def test_parse_result_no_data_key(self):
        """Test parsing when response has no data key."""
        from rackscope.services.metrics_service import parse_prometheus_result

        response = {"status": "success"}
        result = parse_prometheus_result(response)
        assert result is None

    def test_parse_result_malformed_value(self):
        """Test parsing when value has unexpected format."""
        from rackscope.services.metrics_service import parse_prometheus_result

        response = {
            "status": "success",
            "data": {
                "result": [
                    {"metric": {}, "value": "not a list"},  # Invalid format
                ]
            },
        }
        result = parse_prometheus_result(response)
        assert result is None


# ── resolve_metric_query ──────────────────────────────────────────────────────


def test_resolve_metric_query_no_library_with_instance():
    """Without library, instance replaces rack_id filter when provided."""
    result = resolve_metric_query("my_metric", None, "rack01", instance="node01")
    assert result == 'my_metric{instance="node01"}'


def test_resolve_metric_query_no_library_no_instance():
    """Without library and no instance, rack_id label is used."""
    result = resolve_metric_query("my_metric", None, "rack01")
    assert result == 'my_metric{rack_id="rack01"}'


def test_resolve_metric_query_library_missing_metric_with_instance():
    """Missing metric in library falls back to ID as raw name with instance."""
    library = MetricsLibrary(metrics=[])
    result = resolve_metric_query("unknown_metric", library, "rack01", instance="node01")
    assert result == 'unknown_metric{instance="node01"}'


def test_resolve_metric_query_library_found_with_instance():
    """Found metric in library substitutes instance placeholder."""
    from rackscope.model.metrics import MetricDisplay

    metric = MetricDefinition(
        id="node_temp",
        name="Node Temperature",
        metric='node_temperature_celsius{instance="{instance}"}',
        display=MetricDisplay(unit="celsius"),
        category="compute",
    )
    library = MetricsLibrary(metrics=[metric])
    result = resolve_metric_query("node_temp", library, "rack01", instance="node01")
    assert "node01" in result
    assert "node_temperature_celsius" in result


# ── collect_component_metrics — exception path ───────────────────────────────


@pytest.mark.asyncio
async def test_collect_component_metrics_gather_exception(pdu_template):
    """collect_component_metrics returns empty dict when asyncio.gather raises."""
    catalog = Catalog()
    catalog.rack_component_templates.append(pdu_template)
    rack = Rack(id="rack01", name="Rack 01", devices=[])
    ref = RackComponentRef(template_id="pdu-raritan-px3")

    prom_client = AsyncMock()
    prom_client.query = AsyncMock(side_effect=Exception("Prometheus unreachable"))

    result = await collect_component_metrics(rack, ref, catalog, prom_client)
    assert result == {}


# ── collect_rack_component_metrics — no rack template ─────────────────────────


@pytest.mark.asyncio
async def test_collect_rack_component_metrics_no_rack_template():
    """Returns empty dict when rack has no matching rack template."""
    catalog = Catalog()
    rack = Rack(id="rack01", name="Rack 01", template_id="nonexistent", devices=[])
    prom_client = AsyncMock()

    result = await collect_rack_component_metrics(rack, catalog, prom_client)
    assert result == {}


# ── collect_device_metrics — exception path ──────────────────────────────────


@pytest.mark.asyncio
async def test_collect_device_metrics_gather_exception():
    """collect_device_metrics returns empty dict when asyncio.gather raises."""
    template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=1,
        metrics=["node_temperature_celsius"],
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
    )
    device = Device(id="dev1", name="D1", template_id="compute", u_position=1, instance="node01")
    prom_client = AsyncMock()
    prom_client.query = AsyncMock(side_effect=Exception("timeout"))

    result = await collect_device_metrics(device, "rack01", template, prom_client)
    assert result == {}
