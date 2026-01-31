from rackscope.model.domain import Topology, Site, Aisle, Rack
from rackscope.model.loader import load_topology
import pytest
import yaml


def test_rack_model():
    rack = Rack(id="r1", name="Rack 1")
    assert rack.id == "r1"
    assert rack.u_height == 42


def test_aisle_model():
    rack = Rack(id="r1", name="Rack 1")
    aisle = Aisle(id="a1", name="Aisle 1", racks=[rack])
    assert len(aisle.racks) == 1
    assert aisle.racks[0].id == "r1"


def test_topology_validation():
    # Duplicate site IDs should fail
    with pytest.raises(Exception):
        Topology(sites=[Site(id="s1", name="S1"), Site(id="s1", name="S1 duplicated")])


def test_load_topology(tmp_path):
    d = tmp_path / "config"
    d.mkdir()
    f = d / "topology.yaml"
    content = {
        "sites": [
            {
                "id": "dc1",
                "name": "DC1",
                "rooms": [
                    {
                        "id": "room1",
                        "name": "Room 1",
                        "aisles": [
                            {
                                "id": "aisle1",
                                "name": "Aisle 1",
                                "racks": [{"id": "r1", "name": "Rack 1"}],
                            }
                        ],
                    }
                ],
            }
        ]
    }
    f.write_text(yaml.dump(content))

    topo = load_topology(f)
    assert len(topo.sites) == 1
    assert topo.sites[0].id == "dc1"
    assert topo.sites[0].rooms[0].aisles[0].racks[0].id == "r1"
