# Générateur de Topologie via API REST

Génère des topologies de datacenters en utilisant les endpoints REST du backend Rackscope.

## Avantages vs Générateur de Fichiers

| Critère | Générateur de Fichiers | Générateur API |
|---------|----------------------|----------------|
| **Validation** | Post-génération (au chargement) | Temps réel (chaque création) |
| **Disponibilité** | Redémarrage requis | Immédiate (live) |
| **GitOps** | ✅ Full support | ⚠️ Manuel (export nécessaire) |
| **Transactionnel** | ❌ Tout ou rien au chargement | ✅ Par élément (rollback manuel) |
| **Backend requis** | ❌ Non | ✅ Oui (doit tourner) |
| **Use cases** | Setup initial, migrations, CI/CD | Édition interactive, tests rapides, UI admin |

## Prérequis

### 1. Backend en cours d'exécution

```bash
# Démarrer le stack
make up

# Vérifier que le backend répond
curl http://localhost:8000/api/healthz
# Doit retourner: {"status":"ok"}
```

### 2. Topologie vide ou existante

**Important** : Le générateur API **ajoute** des éléments à la topologie existante. Il ne remplace pas.

Pour repartir de zéro :
```bash
# Option 1: Réinitialiser la topologie
rm -rf config/topology/*
docker compose restart backend

# Option 2: Utiliser une topologie de test
# Modifier app.yaml pour pointer vers une topologie temporaire
```

## Utilisation

### Mode Dry-Run (Recommandé pour tester)

```bash
cd tools/
python generate_topology_api.py -c generator_config_small.yaml --dry-run
```

**Sortie exemple :**
```
DRY RUN MODE - No API calls will be made

Generating topology from config...
  Sites: 1

Would create site: test-dc (Test Datacenter)
  Would create room: room-test (Test Room)
    Would create aisle: aisle-test (Test Aisle)
      Would create rack: rack-01 (Test Rack 01)
        Would add 21 devices to rack-01
      Would create rack: rack-02 (Test Rack 02)
        Would add 21 devices to rack-02

✓ Topology generation completed!
  Sites created: 0
  Rooms created: 0
  Aisles created: 0
  Racks created: 0
```

### Génération Réelle

```bash
# Avec la config par défaut (small)
python generate_topology_api.py

# Avec une config spécifique
python generate_topology_api.py -c generator_config_hpc.yaml

# Avec un backend distant
python generate_topology_api.py -c generator_config_small.yaml --url http://prod-server:8000
```

**Sortie exemple :**
```
Loading configuration from generator_config_small.yaml...
✓ Backend is reachable at http://localhost:8000

Generating topology from config...
  Sites: 1

  ✓ Site created: test-dc
    ✓ Room created: room-test
      ✓ Aisle created: aisle-test
        ✓ Rack created: rack-01
          ✓ 21 devices added to rack-01
        ✓ Rack created: rack-02
          ✓ 21 devices added to rack-02

✓ Topology generation completed!
  Sites created: 1
  Rooms created: 1
  Aisles created: 1
  Racks created: 2

Note: The topology is now live in the backend!
      Visit http://localhost:8000 to see it.
```

## API Endpoints Utilisés

Le générateur appelle les endpoints suivants dans l'ordre :

### 1. Créer un Site
```http
POST /api/topology/sites
Content-Type: application/json

{
  "id": "test-dc",
  "name": "Test Datacenter"
}
```

### 2. Créer une Room
```http
POST /api/topology/sites/{site_id}/rooms
Content-Type: application/json

{
  "id": "room-test",
  "name": "Test Room"
}
```

### 3. Créer une Aisle
```http
POST /api/topology/rooms/{room_id}/aisles/create
Content-Type: application/json

{
  "aisles": [
    {
      "id": "aisle-test",
      "name": "Test Aisle"
    }
  ]
}
```

### 4. Créer un Rack
```http
PUT /api/topology/aisles/{aisle_id}/racks
Content-Type: application/json

{
  "racks": [
    {
      "id": "rack-01",
      "name": "Test Rack 01",
      "template_id": "standard-42u-air",
      "u_height": 42,
      "devices": []
    }
  ]
}
```

### 5. Ajouter des Devices à un Rack
```http
PUT /api/topology/racks/{rack_id}/devices
Content-Type: application/json

{
  "devices": [
    {
      "id": "rack-01-sw",
      "name": "switch-01",
      "template_id": "eth-switch-tor",
      "u_position": 42
    },
    {
      "id": "rack-01-c01",
      "name": "Compute 01",
      "template_id": "bs-1u-twin-cpu",
      "u_position": 1,
      "nodes": "compute[001-002]"
    }
  ]
}
```

## Gestion d'Erreurs

### Backend non accessible

```
✗ Backend not reachable at http://localhost:8000: Connection refused
✗ Generation failed: Backend is not reachable. Start it with 'make up'
```

**Solution :** Démarrer le backend avec `make up`

### Site déjà existant

```
✗ Generation failed: Failed to create site test-dc: {"detail":"Site id already exists"}
```

**Solutions :**
1. Utiliser un ID de site différent dans la config
2. Supprimer le site existant manuellement
3. Modifier la topologie pour ajouter uniquement des rooms/aisles/racks

### Timeout

```
✗ Generation failed: Failed to create rack rack-01: Request timeout
```

**Solutions :**
1. Augmenter le timeout : `--timeout 60`
2. Vérifier la charge du backend
3. Simplifier la configuration (moins de racks/devices à la fois)

## Workflows Recommandés

### 1. Développement / Tests

```bash
# 1. Dry-run pour valider la config
python generate_topology_api.py -c my_config.yaml --dry-run

# 2. Générer dans une topologie de test
python generate_topology_api.py -c my_config.yaml

# 3. Vérifier dans l'UI
firefox http://localhost:5173

# 4. Si OK, exporter pour commit Git
# (TODO: ajouter un endpoint d'export)
```

### 2. Production

```bash
# Utiliser le générateur de fichiers pour production
python generate_topology.py -c my_config.yaml -o config/topology

# Commit dans Git
git add config/topology/
git commit -m "Add new datacenter topology"
git push

# Deploy avec GitOps (Ansible, etc.)
```

### 3. Migration de Topologie Existante

```bash
# 1. Backup actuel
cp -r config/topology config/topology.backup

# 2. Générer nouvelle topologie via API
python generate_topology_api.py -c new_config.yaml

# 3. Exporter pour Git
# TODO: Créer endpoint GET /api/topology/export

# 4. Comparer avec backup
diff -r config/topology.backup config/topology

# 5. Valider et commit
```

## Comparaison avec cURL

Au lieu d'utiliser le générateur, tu peux aussi appeler l'API directement avec cURL :

### Créer un site manuellement

```bash
curl -X POST http://localhost:8000/api/topology/sites \
  -H "Content-Type: application/json" \
  -d '{
    "id": "manual-dc",
    "name": "Manual Datacenter"
  }'
```

### Créer une room

```bash
curl -X POST http://localhost:8000/api/topology/sites/manual-dc/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "id": "manual-room",
    "name": "Manual Room"
  }'
```

**Avantage du générateur :** Gère automatiquement l'ordre des appels, les patterns, les compteurs de nœuds, etc.

## Intégration avec UI Admin

Le générateur API est idéal pour une interface d'administration web :

```typescript
// frontend/src/services/topologyGenerator.ts
async function generateTopology(config: GeneratorConfig) {
  // 1. Créer site
  const siteResp = await fetch('/api/topology/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: config.sites[0].id,
      name: config.sites[0].name,
    }),
  });

  // 2. Créer rooms
  for (const room of config.sites[0].rooms) {
    await fetch(`/api/topology/sites/${config.sites[0].id}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: room.id,
        name: room.name,
      }),
    });
  }

  // etc.
}
```

## Limitations Actuelles

1. **Pas de rollback automatique** : Si la création échoue au milieu, les éléments déjà créés restent
2. **Pas d'édition** : Le générateur ne met pas à jour les éléments existants, seulement création
3. **Pas d'export Git** : Pas d'endpoint pour exporter la topologie en YAML pour commit Git
4. **Append-only** : Ajoute à la topologie existante, ne remplace pas

## Améliorations Futures

### 1. Endpoint d'Export

```http
GET /api/topology/export
Accept: application/x-tar

# Retourne un tarball de la topologie segmentée
```

### 2. Mode Transaction

```python
# Créer une transaction
tx_id = generator.begin_transaction()

try:
    generator.create_site("dc1", "DC1")
    generator.create_room("dc1", "room1", "Room 1")
    generator.commit_transaction(tx_id)
except Exception:
    generator.rollback_transaction(tx_id)
```

### 3. Diff / Preview

```bash
# Montrer ce qui va changer avant de l'appliquer
python generate_topology_api.py -c config.yaml --diff
```

### 4. Mode Idempotent

```python
# Créer ou mettre à jour si existe déjà
generator.create_or_update_site("dc1", "DC1")
```

## Debugging

### Mode Verbose

```bash
# Activer les logs détaillés
export REQUESTS_DEBUG=1
python generate_topology_api.py -c config.yaml
```

### Intercepter les requêtes

```bash
# Utiliser mitmproxy pour voir toutes les requêtes HTTP
pip install mitmproxy
mitmproxy -p 8080

# Dans une autre terminal
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
python generate_topology_api.py -c config.yaml --url http://localhost:8000
```

### Tester un seul endpoint

```python
# test_single_endpoint.py
from generate_topology_api import TopologyAPIGenerator

generator = TopologyAPIGenerator("http://localhost:8000")

# Tester juste la création de site
result = generator.create_site("test-site", "Test Site")
print(result)
```

## FAQ

### Q: Puis-je utiliser le générateur API en production ?

**R:** Oui, mais il est recommandé d'exporter ensuite la topologie en YAML pour versioning Git. Le générateur de fichiers reste préférable pour des déploiements GitOps.

### Q: Que se passe-t-il si j'interromps la génération (Ctrl+C) ?

**R:** Les éléments déjà créés restent dans le backend. Tu dois soit :
1. Les supprimer manuellement via l'UI ou l'API
2. Continuer depuis le point d'arrêt (pas encore supporté)

### Q: Puis-je générer des topologies énormes (1000+ racks) ?

**R:** Techniquement oui, mais :
- Augmente le timeout : `--timeout 300`
- Fais-le en plusieurs passes (par room ou aisle)
- Privilégie le générateur de fichiers pour les grandes topos

### Q: Comment migrer d'une topologie générée par API vers des fichiers ?

**R:** Actuellement, il faut exporter manuellement ou attendre l'endpoint d'export. Alternat ive : utilise directement le générateur de fichiers.

## Voir Aussi

- [GENERATOR_README.md](GENERATOR_README.md) : Documentation du générateur de fichiers
- [CLAUDE.md](../CLAUDE.md) : Guide de développement
- [docs/API_REFERENCE.md](../docs/API_REFERENCE.md) : Référence complète de l'API REST
