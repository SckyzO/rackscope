---
id: topology
title: Topology & Catalog API
sidebar_position: 3
---

# Topology & Catalog API

## Topology

### GET /api/topology

Returns the full topology (all sites, rooms, aisles, racks, devices).

### GET /api/topology/sites

Returns all sites.

### GET /api/topology/sites/{site_id}

Returns a single site with its rooms.

### GET /api/topology/rooms/{room_id}

Returns a room with its aisles and racks.

### GET /api/topology/racks/{rack_id}

Returns a rack with its devices.

### GET /api/topology/devices/{rack_id}/{device_id}

Returns a device with its instances.

### POST/PUT /api/topology/...

All topology endpoints support create/update operations. Changes are saved to YAML and global state is reloaded.

## Catalog

### GET /api/catalog

Returns the full catalog (all device and rack templates).

### GET /api/catalog/device-templates

Returns all device templates.

### GET /api/catalog/device-templates/{template_id}

Returns a single device template.

### POST /api/catalog/device-templates

Creates a new device template.

### PUT /api/catalog/device-templates/{template_id}

Updates an existing device template.

### DELETE /api/catalog/device-templates/{template_id}

Deletes a device template.

### GET /api/catalog/rack-templates

Returns all rack templates.

### GET /api/catalog/rack-component-templates

Returns all rack component templates.

## Checks

### GET /api/checks

Returns all health checks in the library.

### GET /api/checks/{check_id}

Returns a single health check.

### GET /api/checks/files

Returns the list of check YAML files.

### PUT /api/checks/files/{filename}

Updates a check YAML file.
