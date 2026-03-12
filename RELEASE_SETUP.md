# Release Setup — rackscope.dev

Procédure complète pour publier Rackscope sur le domaine `rackscope.dev` avec
GitHub Pages. À exécuter dans l'ordre depuis un autre PC.

---

## Prérequis

- Accès GitHub : `SckyzO/rackscope` (repo actuel)
- Accès OVH : zone DNS de `rackscope.dev`
- Git + SSH configuré sur le PC

---

## Phase 1 — Renommer le repo actuel

1. Aller sur https://github.com/SckyzO/rackscope/settings
2. Section **"Danger Zone"** → **Rename repository**
3. Nouveau nom : `rackscope_dev`
4. Confirmer

> GitHub redirige automatiquement tous les anciens liens — rien ne casse.

Mettre à jour le remote local sur **chaque machine** :
```bash
git remote set-url origin git@github.com:SckyzO/rackscope_dev.git
# Vérifier :
git remote -v
```

---

## Phase 2 — Créer le nouveau repo public

1. Aller sur https://github.com/new
2. Nom : `rackscope`
3. Visibilité : **Public**
4. Ne rien initialiser (pas de README, pas de .gitignore)
5. Créer le repo

---

## Phase 3 — DNS chez OVH

Dans la zone DNS de `rackscope.dev` sur OVH, ajouter ces enregistrements :

| Type  | Sous-domaine | Valeur                | TTL  |
|-------|--------------|-----------------------|------|
| A     | `@`          | `185.199.108.153`     | 3600 |
| A     | `@`          | `185.199.109.153`     | 3600 |
| A     | `@`          | `185.199.110.153`     | 3600 |
| A     | `@`          | `185.199.111.153`     | 3600 |
| CNAME | `www`        | `sckyzO.github.io.`   | 3600 |

> Propagation DNS : 15 min à 24 h selon OVH.
> Vérifier la propagation : `dig rackscope.dev A`

---

## Phase 4 — Configurer GitHub Pages sur le nouveau repo

1. Aller sur https://github.com/SckyzO/rackscope/settings/pages
2. **Source** : `Deploy from a branch` → branche `gh-pages`, dossier `/ (root)`
3. **Custom domain** : `rackscope.dev`
4. Cocher **Enforce HTTPS** (disponible après validation DNS)

> GitHub va créer automatiquement un fichier `CNAME` dans la branche `gh-pages`.

---

## Phase 5 — Préparer le contenu du repo public

Depuis la machine de dev (`rackscope_dev`) :

```bash
# Ajouter le nouveau repo comme remote secondaire
git remote add public git@github.com:SckyzO/rackscope.git

# Pousser la branche main vers le repo public
git push public main
```

Fichiers à **supprimer** du repo public avant la première release (optionnel) :
- `ARCHITECTURE/` — notes de design privées
- `config/examples/exascale/` — exemple interne
- Tout fichier contenant des secrets ou IPs internes

---

## Phase 6 — Activer le workflow de déploiement docs

Le workflow `deploy-docs.yml` existe déjà dans `.github/workflows/`.
Il se déclenche sur push vers `main` (branche `gh-pages` mise à jour automatiquement).

Dans le **nouveau repo** `SckyzO/rackscope` :
1. Aller sur https://github.com/SckyzO/rackscope/settings/actions
2. S'assurer que les GitHub Actions sont activées
3. Aller sur https://github.com/SckyzO/rackscope/settings/pages
4. Vérifier que la source est bien `gh-pages`

Déclencher un premier build manuellement :
```bash
# Depuis rackscope_dev, pousser un tag pour déclencher release.yml
git tag v1.0.0
git push public v1.0.0
```

---

## Phase 7 — Vérification finale

```bash
# DNS propagé ?
dig rackscope.dev A

# HTTPS fonctionnel ?
curl -I https://rackscope.dev

# Docs accessibles ?
curl -s https://rackscope.dev | grep -o "<title>.*</title>"
```

URL attendue : **https://rackscope.dev** → documentation Docusaurus

---

## Résumé de l'architecture cible

```
SckyzO/rackscope_dev  (privé)   ← repo de travail, tous les commits
SckyzO/rackscope      (public)  ← code source public + GitHub Pages
                                   → https://rackscope.dev (docs Docusaurus)
```

---

## Notes

- Le fichier `docusaurus.config.js` est déjà configuré pour `rackscope.dev`
- La variable `DOCS_BASE_URL` dans GitHub Actions doit être `/` pour un apex domain
  (à configurer dans Settings → Secrets → Variables de `SckyzO/rackscope`)
- Le certificat TLS est géré automatiquement par GitHub (Let's Encrypt)
