# Architecture du système de Leaderboard avec Redis

## Vue d'ensemble

Le système utilise **Redis Sorted Sets (ZSET)** pour stocker et récupérer rapidement les classements globaux du jeu.

## Composants

### 1. Redis Client (`redis_client.py`)
- **Pattern Singleton** : Une seule instance de connexion Redis partagée
- **Gestion d'erreurs** : Vérification de la connexion au démarrage
- **Réutilisable** : Utilisé par le worker et l'API

### 2. Worker de mise à jour (`worker.py`)
- **Fonction** : Met à jour les classements toutes les 4 heures
- **Processus** :
  1. Récupère la liste des 32 serveurs
  2. Pour chaque mode (7 modes) × chaque type (2 types) :
     - Interroge les 32 serveurs
     - Combine les résultats
     - Insère dans Redis avec `ZADD`
     - Définit un TTL de 3 heures
- **Optimisations** :
  - Délai de 100ms entre chaque requête API
  - Utilisation de `pipeline` Redis pour les insertions groupées
  - Gestion d'erreurs par serveur (continue même si un serveur échoue)

### 3. API de lecture (`main.py`)
- **Fonction `getGlobalLeaderboard()`** :
  - Utilise `ZREVRANGE` pour récupérer les meilleurs joueurs
  - Retourne les données triées automatiquement par score
  - Gère les erreurs si Redis est vide
- **Endpoint `/api/ranking/list`** :
  - Si `serverId` est `None` → utilise Redis (leaderboard global)
  - Si `serverId` est fourni → appel direct à l'API externe (compatibilité)
- **Endpoint `/api/ranking/global`** :
  - Endpoint dédié pour le leaderboard global depuis Redis

## Structure des données Redis

### Format des clés
```
leaderboard:[MODE_ID]:[RANKING_TYPE]
```

Exemples :
- `leaderboard:1:0` → Abyss Overall
- `leaderboard:1:1` → Abyss Weekly
- `leaderboard:5:0` → Arena Solo Overall

### Format des valeurs (ZSET)
- **Membre** : JSON stringifié du joueur complet
  ```json
  {
    "characterId": "...",
    "characterName": "PlayerName",
    "point": 15000,
    "serverName": "Server1",
    "serverShortName": "S1",
    "className": "Sorcerer",
    ...
  }
  ```
- **Score** : Points du joueur (utilisé pour le tri automatique)

## Flux de données

### Mise à jour (Worker)
```
Worker → API Externe (32 serveurs) → Combine & Trie → Redis ZADD → TTL 3h
```

### Lecture (API)
```
Client → API FastAPI → Redis ZREVRANGE → Retourne JSON
```

## Avantages de cette architecture

1. **Performance** :
   - Lecture ultra-rapide depuis Redis (<1ms)
   - Pas de calcul de tri côté API (fait par Redis)
   - Pas de consolidation côté API (fait par le worker)

2. **Scalabilité** :
   - Un seul worker met à jour pour tous les utilisateurs
   - Cache partagé entre tous les utilisateurs
   - Réduction drastique des appels API externes

3. **Fiabilité** :
   - TTL automatique (expiration après 3h)
   - Gestion d'erreurs robuste
   - Worker continue même si certains serveurs échouent

4. **Maintenabilité** :
   - Code séparé (worker vs API)
   - Singleton Redis pour éviter les connexions multiples
   - Logs détaillés pour le debugging

## Modes de jeu supportés

| ID | Nom |
|----|-----|
| 1 | Abyss |
| 3 | Nightmare |
| 4 | Transcendence |
| 5 | Arena Solo |
| 6 | Co-op Arena |
| 20 | Raid |
| 21 | Ascension Trial |

## Types de classement

| ID | Nom |
|----|-----|
| 0 | Overall |
| 1 | Weekly |

## Commandes Redis utiles

```bash
# Voir les 10 meilleurs joueurs d'un mode
redis-cli ZREVRANGE leaderboard:1:0 0 9 WITHSCORES

# Compter le nombre de joueurs
redis-cli ZCARD leaderboard:1:0

# Voir le TTL restant
redis-cli TTL leaderboard:1:0

# Voir toutes les clés de leaderboard
redis-cli KEYS leaderboard:*

# Supprimer un leaderboard (pour forcer une mise à jour)
redis-cli DEL leaderboard:1:0
```

## Déploiement

### Développement
1. Démarrer Redis : `redis-server`
2. Démarrer le worker : `python backend/app/worker.py`
3. Démarrer l'API : `uvicorn app.main:app --reload`

### Production
- Utiliser un gestionnaire de processus (systemd, supervisor, PM2)
- Configurer Redis avec persistance si nécessaire
- Monitorer les logs du worker
- Configurer des alertes si le worker s'arrête

## Limitations connues

1. **Précision du classement** :
   - L'API externe ne retourne que les top 100 par serveur
   - Un joueur classé 101e sur son serveur n'apparaîtra pas dans le classement global
   - C'est une limitation de l'API source, pas de notre système

2. **Fréquence de mise à jour** :
   - Mise à jour toutes les 4 heures
   - Les données peuvent être jusqu'à 4 heures en retard
   - Le TTL de 3 heures assure qu'il y a toujours un chevauchement

3. **Taille mémoire Redis** :
   - ~50-100 MB pour tous les classements
   - Chaque joueur = ~1-2 KB de JSON
   - 32 serveurs × 100 joueurs × 7 modes × 2 types = ~44,800 joueurs max

