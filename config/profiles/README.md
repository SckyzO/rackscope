# Config Profiles

This directory contains your real infrastructure configurations.

## Structure

Each profile is a self-contained directory:

```
config/profiles/
└── my-datacenter/
    ├── app.yaml           ← main config (paths relative to this dir)
    ├── topology/          ← YAML topology files
    ├── templates/         ← device/rack templates
    ├── checks/library/    ← health check definitions
    └── metrics/library/   ← metric definitions
```

## Creating a new profile

```bash
cp -r config/examples/hpc-cluster config/profiles/my-datacenter
# Edit config/profiles/my-datacenter/app.yaml and topology/
make use CONFIG=my-datacenter
```

## Examples vs Profiles

- `config/examples/` — read-only demo configurations (homelab, hpc-cluster, exascale…)
- `config/profiles/` — your real infrastructure configurations
