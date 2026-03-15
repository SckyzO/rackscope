# Hardware Library (Templates)

This directory contains the definitions of all hardware components used in Rackscope.

## Directory Structure

- `devices/`: Definitions for individual enclosures (Servers, Switches, Storage, etc.).
- `racks/`: Definitions for full rack frames and their built-in infrastructure (PDU, HMC).

## How it works

Rackscope separates **What** a piece of hardware looks like (Templates) from **Where** it is located (Topology).

1.  Define your hardware model once in a template.
2.  Reference it in `topology.yaml` using its `id`.

For detailed schema specifications, see the README in each sub-directory.
