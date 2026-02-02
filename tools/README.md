# Rackscope Tools

Outils pour générer et manipuler des topologies de datacenters.

## Vue d'ensemble

Ce répertoire contient **deux générateurs de topologie** complémentaires :

| Outil | Type | Use Case Principal |
|-------|------|-------------------|
| `generate_topology.py` | **Générateur de fichiers** | Production, GitOps, CI/CD, grandes topos |
| `generate_topology_api.py` | **Générateur via API** | Développement, tests rapides, UI admin |

## Fichiers

```
tools/
├── README.md                          # Ce fichier
├── GENERATOR_README.md                # Doc du générateur de fichiers
├── API_GENERATOR_README.md            # Doc du générateur API
│
├── generator_models.py                # Modèles Pydantic (partagés)
├── generate_topology.py               # Générateur de fichiers YAML
├── generate_topology_api.py           # Générateur via REST API
│
├── generator_config_hpc.yaml          # Config complète (~600 nœuds)
├── generator_config_small.yaml        # Config simple pour tests (~40 nœuds)
│
└── test_api_generator.sh              # Script de test pour API generator
```

## Quick Start

### 1. Générateur de Fichiers (Recommandé pour commencer)

```bash
# Générer une petite topologie de test
python generate_topology.py -c generator_config_small.yaml -o /tmp/test_topology

# Vérifier la structure créée
ls -R /tmp/test_topology

# Générer la topologie complète HPC
python generate_topology.py -c generator_config_hpc.yaml -o config/topology

# Redémarrer le backend pour charger
docker compose restart backend
```

### 2. Générateur API (Nécessite backend en cours)

```bash
# Démarrer le stack
make up

# Dry-run (montre ce qui serait créé)
python generate_topology_api.py -c generator_config_small.yaml --dry-run

# Génération réelle
python generate_topology_api.py -c generator_config_small.yaml

# Vérifier dans l'UI
firefox http://localhost:5173
```

## Documentation

- **[GENERATOR_README.md](GENERATOR_README.md)** : Documentation complète du générateur de fichiers
- **[API_GENERATOR_README.md](API_GENERATOR_README.md)** : Documentation complète du générateur API

## Importers/Exporters (Planned)

Importers depuis CMDBs externes :
- NetBox → View Model
- RacksDB → View Model
- BlueBanquise → View Model

## Voir Aussi

- [CLAUDE.md](../CLAUDE.md) : Guide de développement
- [docs/ADMIN_GUIDE.md](../docs/ADMIN_GUIDE.md) : Guide d'administration
