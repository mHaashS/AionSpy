# Guide de démarrage rapide

## Prérequis

1. **Redis installé et démarré**
   ```bash
   # Vérifier que Redis fonctionne
   redis-cli ping
   # Devrait retourner: PONG
   ```

2. **Dépendances Python installées**
   ```bash
   pip install -r requirements.txt
   ```

## Démarrage en 3 étapes

### 1. Démarrer Redis
```bash
redis-server
```

### 2. Démarrer le Worker (dans un terminal séparé)
```bash
cd backend/app
python worker.py
```

Le worker va :
- Faire une première mise à jour immédiate (~3-5 minutes)
- Attendre 4 heures
- Répéter indéfiniment

### 3. Démarrer l'API FastAPI (dans un autre terminal)
```bash
cd backend/app
uvicorn main:app --reload
```

## Test rapide

### Vérifier que Redis contient des données
```bash
redis-cli KEYS leaderboard:*
# Devrait afficher les clés comme: leaderboard:1:0, leaderboard:1:1, etc.
```

### Tester l'API
```bash
# Leaderboard global Abyss Overall (depuis Redis)
curl http://localhost:8000/api/ranking/list?rankingContentsType=1&rankingType=0

# Leaderboard d'un serveur spécifique (depuis API externe)
curl http://localhost:8000/api/ranking/list?rankingContentsType=1&rankingType=0&serverId=1001
```

### Tester depuis le frontend
1. Ouvrir `http://localhost:5173`
2. Aller sur la page Leaderboard
3. Sélectionner "All Servers"
4. Les données devraient se charger rapidement depuis Redis

## Dépannage

### Erreur: "Connection refused" pour Redis
**Solution** : Vérifier que Redis est démarré
```bash
redis-cli ping
```

### Erreur: "Leaderboard non disponible"
**Solution** : Le worker doit être exécuté au moins une fois. Attendez la fin de la première mise à jour.

### Le worker ne démarre pas
**Solution** : Vérifier les dépendances
```bash
pip install redis httpx
```

### L'API retourne une erreur 500
**Solution** : Vérifier les logs du worker et de l'API. Assurez-vous que Redis est accessible.

## Structure des fichiers

```
backend/
├── app/
│   ├── redis_client.py    # Client Redis (Singleton)
│   ├── worker.py          # Worker de mise à jour
│   └── main.py            # API FastAPI
├── requirements.txt       # Dépendances Python
├── README_WORKER.md       # Documentation du worker
├── ARCHITECTURE.md        # Documentation de l'architecture
└── QUICK_START.md         # Ce fichier
```

## Prochaines étapes

1. ✅ Redis démarré
2. ✅ Worker en cours d'exécution
3. ✅ API démarrée
4. ✅ Frontend connecté

Le système est maintenant opérationnel ! 🎉

