# AionSpy Frontend

Frontend React pour l'application AionSpy - Recherche de personnages Aion 2.

## Installation

1. Installer les dépendances :
```bash
npm install
```

## Lancement

1. Assurez-vous que le backend FastAPI est lancé sur `http://localhost:8000`

2. Lancez le serveur de développement :
```bash
npm run dev
```

3. Ouvrez votre navigateur sur `http://localhost:5173`

## Note importante : CORS

Si vous obtenez des erreurs CORS lors de l'appel à l'API, vous devrez ajouter le middleware CORS dans votre backend FastAPI.

Ajoutez dans `backend/app/main.py` :
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
