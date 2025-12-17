# Worker de mise à jour du Leaderboard

## Description

Le worker `worker.py` est un script en arrière-plan qui met à jour automatiquement les classements du jeu dans Redis toutes les 4 heures.

## Architecture

- **Redis Sorted Sets (ZSET)** : Utilise les structures de données Redis optimisées pour les leaderboards
- **Clés Redis** : Format `leaderboard:[MODE_ID]:[RANKING_TYPE]`
- **TTL** : 3 heures sur chaque clé Redis
- **Modes de jeu** : 7 modes (1, 3, 4, 5, 6, 20, 21)
- **Types de classement** : Overall (0) et Weekly (1)
- **Serveurs** : 32 serveurs interrogés

## Installation

1. Installer les dépendances :
```bash
pip install -r requirements.txt
```

2. Démarrer Redis :
```bash
# Windows (avec WSL ou installation native)
redis-server

# Linux/Mac
sudo systemctl start redis
# ou
redis-server
```

3. Vérifier que Redis fonctionne :
```bash
redis-cli ping
# Devrait retourner: PONG
```

## Utilisation

### Démarrer le worker

```bash
cd backend/app
python worker.py
```

Le worker va :
1. Faire une première mise à jour immédiate
2. Attendre 4 heures
3. Répéter indéfiniment

### Arrêter le worker

Appuyez sur `Ctrl+C` pour arrêter proprement le worker.

## Structure des données Redis

### Clés
- `leaderboard:1:0` → Abyss Overall
- `leaderboard:1:1` → Abyss Weekly
- `leaderboard:5:0` → Arena Solo Overall
- etc.

### Format des données
Chaque joueur est stocké dans le ZSET avec :
- **Membre** : JSON stringifié du joueur (avec toutes ses informations)
- **Score** : Points du joueur (utilisé pour le tri automatique)

### Exemple de commande Redis
```bash
# Voir les 10 meilleurs joueurs
redis-cli ZREVRANGE leaderboard:1:0 0 9 WITHSCORES

# Voir le nombre de joueurs dans un leaderboard
redis-cli ZCARD leaderboard:1:0

# Voir le TTL restant
redis-cli TTL leaderboard:1:0
```

## Performance

- **Temps de mise à jour** : ~3-5 minutes pour tous les modes (32 serveurs × 7 modes × 2 types)
- **Délai entre requêtes** : 100ms pour ne pas saturer l'API externe
- **Lecture depuis Redis** : <1ms par requête

## Dépannage

### Erreur de connexion Redis
```
❌ Erreur de connexion Redis: Error connecting to Redis
```
**Solution** : Vérifier que Redis est démarré et accessible sur `localhost:6379`

### Leaderboard vide dans l'API
```
404: Leaderboard non disponible pour le mode X
```
**Solution** : Le worker doit être exécuté au moins une fois pour initialiser les données

### API externe lente
Le worker inclut des délais entre les requêtes pour ne pas saturer l'API. Si nécessaire, ajustez `REQUEST_DELAY` dans `worker.py`.

## Logs

Le worker affiche des logs détaillés :
- ✅ Succès
- ⚠️ Avertissements (serveur sans données)
- ❌ Erreurs
- 📊 Progression de la mise à jour

## Production

Pour la production, utilisez un gestionnaire de processus comme :
- **systemd** (Linux)
- **supervisor**
- **PM2**
- **Docker** avec restart policy

Exemple avec systemd :
```ini
[Unit]
Description=Leaderboard Worker
After=network.target redis.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/backend/app
ExecStart=/usr/bin/python3 worker.py
Restart=always

[Install]
WantedBy=multi-user.target
```

