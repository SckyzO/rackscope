# Générateur de Topologie Configurable

Outil pour générer des topologies de datacenters réalistes à partir de fichiers de configuration YAML.

## Vue d'ensemble

Le générateur transforme une configuration déclarative en une topologie complète avec :
- Hiérarchie physique (Sites → Rooms → Aisles → Racks → Devices)
- Placement automatique des devices dans les racks
- Gestion des compteurs de nœuds par type
- Support des patterns pour noms et IDs
- Génération optionnelle de localisations géographiques (via Faker)

## Architecture

```
tools/
├── generate_topology.py          # Script principal
├── generator_models.py           # Modèles Pydantic pour validation
├── generator_config_hpc.yaml     # Config complète (~600 nœuds)
├── generator_config_small.yaml   # Config simple pour tests (~40 nœuds)
└── GENERATOR_README.md          # Cette documentation
```

## Installation

### Dépendances requises

```bash
pip install pydantic pyyaml faker
```

**Note** : `faker` est optionnel. Si absent, la génération de localisation fake sera désactivée.

## Utilisation

### Commande de base

```bash
# Générer à partir d'une config (sortie segmentée)
python generate_topology.py -c generator_config_small.yaml -o config/topology

# Générer vers un fichier monolithique
python generate_topology.py -c generator_config_hpc.yaml -o topology.yaml

# Utiliser la config par défaut (generator_config_hpc.yaml)
python generate_topology.py -o config/topology
```

### Options

- `-c, --config` : Chemin vers le fichier de configuration YAML (défaut: `generator_config_hpc.yaml`)
- `-o, --output` : Chemin de sortie
  - Si termine par `.yaml` : fichier monolithique
  - Sinon : structure segmentée (recommandé pour prod)

## Format de Configuration

### Structure Globale

```yaml
version: "1.0"
description: "Description de la topologie"

node_counters:
  compute: 1      # Compteur initial pour nœuds compute
  gpu: 1          # Compteur initial pour nœuds GPU
  visu: 1         # etc.
  storage: 1
  io: 1
  login: 1
  mgmt: 1

sites:
  - id: dc1
    name: "Main Datacenter"
    location:  # Optionnel
      generate: true  # Générer fake location
      country: "FR"   # Code pays pour Faker
      # OU localisation manuelle:
      # latitude: 48.8566
      # longitude: 2.3522
      # address: "Paris, France"

    rooms:
      - id: room-a
        name: "Room A"
        aisles:
          - id: aisle-01
            name: "Aisle 01"
            racks:
              # Configuration des racks...
```

### Configuration de Racks

```yaml
racks:
  - count: 6                              # Nombre de racks à générer
    id_pattern: "r{aisle_num:02d}-{rack_num:02d}"
    name_pattern: "Rack CPU {rack_num:02d}"
    template_id: "bull-xh3000"            # Template de rack
    u_height: 48                          # Hauteur en U
    devices:                              # Liste des devices
      # Configuration des devices...
```

### Configuration de Devices

```yaml
devices:
  - template_id: "bs-1u-twin-cpu"         # Template du device
    count: 20                             # Nombre de devices
    u_start: 1                            # Position U de départ
    u_step: 2                             # Pas entre devices (optionnel, auto si None)
    name_pattern: "Compute Encl {i:02d}"  # Pattern du nom
    id_pattern: "{rack_id}-c{i:02d}"      # Pattern de l'ID
    nodes_pattern: "compute[{start:03d}-{end:03d}]"  # Pattern des nœuds (optionnel)
    nodes_per_device: 2                   # Nœuds par device
    node_counter_start: null              # Compteur spécifique (null = global)
```

### Variables de Pattern

Les patterns supportent les variables suivantes :

**Pour racks :**
- `{aisle_num}` : Numéro de l'allée (1-based)
- `{rack_num}` : Numéro du rack (1-based)

**Pour devices :**
- `{rack_id}` : ID du rack parent
- `{rack_num}` : Numéro du rack (1-based)
- `{i}` : Index du device (1-based)

**Pour nodes patterns :**
- `{start}` : Premier numéro de nœud
- `{end}` : Dernier numéro de nœud
- `{i}` : Index du device
- `{rack_num}` : Numéro du rack

**Formatage :**
- `{rack_num:02d}` : Padding avec zéros (01, 02, 03...)
- `{i:03d}` : Padding sur 3 chiffres (001, 002, 003...)

## Gestion des Compteurs de Nœuds

Le générateur maintient des compteurs globaux par type de nœud :

```yaml
node_counters:
  compute: 1    # compute001, compute002...
  gpu: 1        # gpu001, gpu002...
  visu: 1       # visu001, visu002...
```

Le type est **inféré automatiquement** depuis le `nodes_pattern` :
- `compute[...]` → compteur `compute`
- `gpu[...]` → compteur `gpu`
- `visu[...]` → compteur `visu`
- `hdd-*` ou `ssd-*` → compteur `storage`
- `io*` → compteur `io`
- `login*` → compteur `login`
- `mngt*` ou `mgmt*` → compteur `mgmt`

### Compteurs Locaux vs Globaux

Par défaut, les compteurs sont **globaux** (partagés entre tous les racks).

Pour un compteur **local** (redémarre à chaque device) :

```yaml
devices:
  - template_id: "srv-1u-mgmt"
    count: 4
    nodes_pattern: "login{i:02d}"
    node_counter_start: 1   # Force le compteur à 1
```

Cela génère : `login01`, `login02`, `login03`, `login04`

## Exemples de Configurations

### 1. Configuration Minimale

```yaml
version: "1.0"
sites:
  - id: test
    name: "Test"
    rooms:
      - id: room1
        name: "Room 1"
        aisles:
          - id: aisle1
            name: "Aisle 1"
            racks:
              - count: 1
                id_pattern: "rack-01"
                name_pattern: "Rack 01"
                template_id: "standard-42u-air"
                u_height: 42
                devices:
                  - template_id: "srv-1u-mgmt"
                    count: 1
                    u_start: 1
                    name_pattern: "Server"
                    id_pattern: "srv-01"
```

### 2. Rack avec Plusieurs Types de Devices

```yaml
racks:
  - count: 1
    id_pattern: "storage-01"
    name_pattern: "Storage Rack"
    template_id: "standard-42u-air"
    u_height: 42
    devices:
      # Switch en haut
      - template_id: "eth-switch-tor"
        count: 1
        u_start: 42
        name_pattern: "Switch"
        id_pattern: "{rack_id}-sw"

      # Serveurs I/O
      - template_id: "srv-1u-mgmt"
        count: 2
        u_start: 30
        u_step: 1
        name_pattern: "IO Server {i}"
        id_pattern: "{rack_id}-io{i}"
        nodes_pattern: "io{rack_num}{i}"
        nodes_per_device: 1

      # Arrays de stockage
      - template_id: "storage-4u-60disk"
        count: 5
        u_start: 1
        u_step: 4
        name_pattern: "Disk Array {i}"
        id_pattern: "{rack_id}-da{i}"
        nodes_pattern: "hdd-{rack_num}-d{i}[01-60]"
        nodes_per_device: 60
```

### 3. Multi-Sites avec Localisations

```yaml
sites:
  - id: paris-dc
    name: "Paris Datacenter"
    location:
      generate: true
      country: "FR"
    rooms: [...]

  - id: london-dc
    name: "London Datacenter"
    location:
      latitude: 51.5074
      longitude: -0.1278
      address: "London, UK"
    rooms: [...]
```

## Validation

La configuration est validée automatiquement avec Pydantic :

```python
from generator_models import GeneratorConfig
import yaml

with open("config.yaml") as f:
    config_data = yaml.safe_load(f)

config = GeneratorConfig(**config_data)
# ValidationError si la config est invalide
```

**Erreurs courantes :**
- Champs requis manquants (`id`, `name`, `template_id`, etc.)
- Types invalides (string au lieu de int, etc.)
- Valeurs hors limites (`u_height > 48`, `count < 1`)
- Champs inconnus (typos dans les noms de champs)

## Sortie

### Structure Segmentée (Recommandée)

```
config/topology/
├── sites.yaml
└── datacenters/
    └── dc1/
        └── rooms/
            └── room-a/
                ├── room.yaml
                ├── aisles/
                │   ├── aisle-01/
                │   │   ├── aisle.yaml
                │   │   └── racks/
                │   │       ├── r01-01.yaml
                │   │       └── r01-02.yaml
                │   └── aisle-02/
                │       └── ...
                └── standalone_racks/
                    └── rack-standalone.yaml
```

**Avantages :**
- Diffs Git propres (modifications localisées)
- Édition concurrente sûre
- Meilleure organisation
- Scalabilité

### Fichier Monolithique

```yaml
sites:
  - id: dc1
    name: "Main Datacenter"
    rooms:
      - id: room-a
        name: "Room A"
        aisles:
          - id: aisle-01
            name: "Aisle 01"
            racks:
              - id: r01-01
                name: "Rack 01"
                devices:
                  - id: r01-01-c01
                    ...
```

**Utilisation :** Tests, démos, topologies simples

## Tests

```bash
# Valider une config
python -c "
from generator_models import GeneratorConfig
import yaml
with open('generator_config_small.yaml') as f:
    config = GeneratorConfig(**yaml.safe_load(f))
print('✓ Configuration valide')
"

# Générer et compter les éléments
python generate_topology.py -c generator_config_small.yaml -o /tmp/test.yaml
```

## Tips & Tricks

### 1. Debugger les Patterns

Utilisez une config simple avec `count: 1` pour tester vos patterns :

```yaml
racks:
  - count: 1
    id_pattern: "r{aisle_num:02d}-{rack_num:02d}"
    # Vérifiez la sortie avant d'augmenter count
```

### 2. Réutiliser des Configs

Créez des fragments YAML réutilisables :

```yaml
# fragment_compute_rack.yaml
template_id: "bull-xh3000"
u_height: 48
devices:
  - template_id: "ib-switch-l1"
    count: 1
    u_start: 42
    # ...
```

Puis combinez-les avec YAML anchors/aliases.

### 3. Tester Progressivement

Commencez petit et augmentez :

1. 1 site, 1 room, 1 aisle, 1 rack
2. Ajoutez des devices
3. Ajoutez plus de racks
4. Ajoutez plus d'aisles

### 4. Valider avec le Simulateur

Après génération, testez avec le simulateur :

```bash
docker compose restart simulator
curl http://localhost:9000/metrics | grep "node_temperature"
```

## Migration depuis l'Ancien Générateur

L'ancien `generate_topology.py` (275 lignes hardcodées) est remplacé par ce système configurable.

**Pour migrer :**

1. Analysez l'ancien code pour identifier les patterns
2. Créez un fichier de config YAML équivalent
3. Testez avec une petite config
4. Comparez les sorties (ancien vs nouveau)
5. Ajustez les patterns si nécessaire

## Troubleshooting

### "faker not installed"

```bash
pip install faker
# OU désactivez la génération de localisation
location:
  generate: false
```

### "Configuration validation failed"

Lisez l'erreur Pydantic. Elle indique :
- Le champ en erreur
- La valeur fournie
- La valeur attendue

### "Can't open file"

Vérifiez le chemin du fichier de config avec `-c`.

### "No racks generated"

Vérifiez `count > 0` dans vos configs de racks.

## Référence API

### Modèles Pydantic

- `GeneratorConfig` : Configuration racine
- `SiteConfig` : Configuration d'un site
- `LocationConfig` : Configuration de localisation
- `RoomConfig` : Configuration d'une room
- `AisleConfig` : Configuration d'une allée
- `RackConfig` : Configuration de rack
- `DevicePlacementConfig` : Configuration de device
- `NodeCounterConfig` : Compteurs de nœuds

### Classes

- `TopologyGenerator` : Générateur principal
  - `generate()` : Génère la topologie complète

### Fonctions

- `load_config(path)` : Charge et valide une config
- `write_monolithic(data, output)` : Écrit en fichier unique
- `write_segmented(data, base)` : Écrit en structure segmentée

## Contribuer

Pour ajouter une fonctionnalité :

1. Modifiez `generator_models.py` pour ajouter les champs nécessaires
2. Implémentez la logique dans `TopologyGenerator`
3. Ajoutez un exemple dans un fichier de config
4. Testez avec une petite config
5. Documentez dans ce README

## Voir Aussi

- [CLAUDE.md](../CLAUDE.md) : Guide de développement
- [AGENTS.md](../AGENTS.md) : Règles strictes du projet
- [docs/ADMIN_GUIDE.md](../docs/ADMIN_GUIDE.md) : Guide d'administration
