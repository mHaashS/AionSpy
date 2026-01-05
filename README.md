# AionSpy 🎮

Une application web complète pour explorer et analyser les données du jeu **Aion 2**. Recherche de personnages, consultation des classements en temps réel, et visualisation détaillée des profils de joueurs.

## 📖 À propos du projet

**AionSpy** est né d'un besoin personnel : avoir un outil moderne et performant pour suivre les classements globaux et analyser les personnages d'Aion 2. 
L'API officielle NCSoft existe, mais elle est limitée (un serveur à la fois, pas de consolidation globale) et l'interface n'est pas agréable. 
J'ai donc décidé de créer ma propre solution avec l'api officielle NCSoft qui n'est pas documentée. 
J'ai du analyser les requetes réseau depuis le navigateur pour trouver les differents endpoints de l'api afin de pouvoir l'exploiter.

### Le défi principal

L'API officielle permet de récupérer les classements **par serveur uniquement**. Pour avoir une vue globale, il faudrait faire 32 requêtes (un par serveur) à chaque fois qu'un utilisateur veut voir le leaderboard global. C'est :
- ❌ Lent: 10-12s (32 requêtes séquentielles)
- ❌ Coûteux en ressources

### Ma solution

J'ai créé un **système de cache intelligent avec Redis** qui :
- ✅ Consolide automatiquement les données de tous les serveurs
- ✅ Met à jour les classements toutes les 4 heures en arrière-plan
- ✅ Permet des réponses ultra-rapides (<1ms) pour les utilisateurs
- ✅ Réduit drastiquement les appels à l'API externe

## 🏗️ Architecture et choix techniques

### Backend : FastAPI + Redis

#### Le Worker (`worker.py`)
Le cœur de l'optimisation. Un script Python qui tourne en arrière-plan et :

1. **Récupère les données de tous les serveurs** (32 serveurs × 7 modes de jeu × 2 races = 448 requêtes)
2. **Consolide et trie** les résultats globalement
3. **Stocke dans Redis** avec des Sorted Sets (ZSET) pour un tri automatique
4. **Met à jour toutes les 4 heures** automatiquement

**Pourquoi Redis Sorted Sets ?**
- Le tri est fait nativement par Redis (ultra-rapide)
- Pas besoin de trier côté API
- Support natif de la pagination avec `ZREVRANGE`
- Performance constante même avec des milliers d'entrées


### Fonctionnalités

**Page d'accueil** (`HomePage.jsx`)
- Barre de recherche avec animation
- Résultats triés par niveau du personnage
- Affichage paginé (4 résultats par défaut, "Show all" pour voir tout)
  
  <img width="1909" height="909" alt="image" src="https://github.com/user-attachments/assets/cbeb569b-7c68-41dc-b1b8-2cf2c9cfabc0" />

**Modale Character** (`ModaleCharacter.jsx`)
La partie la plus complexe du frontend. Une modale avec 7 onglets :
- **EQUIPMENT** : Armes, armures, accessoires, runes, arcana (avec tooltips au survol)
- **STATS** : Toutes les statistiques du personnage
- **SKILLS** : Compétences actives, passives, Sigma Skills
- **RANKS** : Classements dans chaque mode de jeu
- **DAEVANION** : Progression des planches Daevanion
- **TITLES** : Collection de titres
- **COSMETICS** : Skins équipés

  <img width="1901" height="911" alt="image" src="https://github.com/user-attachments/assets/13f5c3a2-f4b9-439d-a1ac-03f780c9a68e" />

**Page Leaderboard** (`LeaderboardPage.jsx`)
- Filtres multiples : mode de jeu, type (Overall/Weekly), serveur
- **Pagination infinie au scroll** : Charge 20 joueurs à la fois
- Affichage détaillé : K/D/A, points, grade, évolution du rang
- Clic sur un joueur → ouverture de la modale de détails

<img width="1893" height="912" alt="image" src="https://github.com/user-attachments/assets/e71c5bb0-9ea5-420b-bd63-48baa833eb90" />

**Gestion des tooltips d'équipement**
J'ai implémenté un système de tooltips qui charge les détails d'un item au survol :
- Positionnement dynamique (évite les bords de l'écran)
- Cache des items déjà chargés
- Loading state pendant le chargement

<img width="1893" height="906" alt="image" src="https://github.com/user-attachments/assets/56e60868-230a-49f3-8561-ab87331e93a4" />

## 🚀 Défis rencontrés et solutions

### 1. Performance des classements globaux

**Problème** : Faire 32 requêtes à chaque demande utilisateur = très lent

**Solution** : Worker en arrière-plan + Redis cache
- Le worker fait le travail lourd toutes les 4 heures
- Les utilisateurs récupèrent les données depuis Redis (<1ms)
- Réduction de 99% des appels API
- Cache intelligent

### 2. Tri et consolidation des données

**Problème** : Comment trier des milliers de joueurs de 32 serveurs différents ?

**Solution** : Redis Sorted Sets
- Chaque joueur est stocké avec son score comme "score" Redis
- Redis trie automatiquement par score décroissant
- `ZREVRANGE` permet de récupérer les top N joueurs en O(log N + M)

### 3. Pagination infinie

**Problème** : Afficher des milliers de joueurs sans lag

**Solution** : Pagination côté serveur + scroll infini
- L'API supporte `limit` et `offset`
- Le frontend charge 20 joueurs à la fois
- Détection du scroll proche du bas → chargement automatique
- État de chargement pour une meilleure UX

### 4. Gestion des erreurs API

**Problème** : L'API externe peut être lente ou indisponible

**Solution** : Fallback gracieux
- Si Redis indisponible → appel direct à l'API (plus lent mais fonctionne)
- Si un serveur échoue → le worker continue avec les autres
- Messages d'erreur clairs pour l'utilisateur

### 5. Tooltips d'équipement

**Problème** : Charger les détails de chaque item au survol sans spammer l'API

**Solution** : Cache frontend + chargement lazy
- Cache des items déjà chargés dans le state
- Un seul appel API par item (même si survolé plusieurs fois)
- Positionnement dynamique pour éviter les débordements

## 📊 Résultats et performances

### Avant (sans cache)
- **Temps de réponse** : ~10-12 secondes (32 requêtes séquentielles)
- **Appels API** : 32 par utilisateur par requête

### Après (avec Redis)
- **Temps de réponse** : <50ms 
- **Appels API** : 0 par utilisateur (données en cache)
- **Mise à jour** : Toutes les 4 heures (acceptable pour un leaderboard)

## 🛠️ Technologies utilisées

### Backend
- **FastAPI** : Framework moderne, rapide, avec support async natif
- **Uvicorn** : Serveur ASGI pour FastAPI
- **Redis** : Base de données en mémoire, parfaite pour le cache
- **httpx** : Client HTTP asynchrone (plus performant que requests)

### Frontend
- **React** : Bibliothèque UI avec hooks modernes
- **React Router** : Navigation entre les pages
- **Axios** : Client HTTP pour les appels API
- **Vite** : Build tool ultra-rapide (remplace Create React App)

## 📁 Structure du code
AionSpy/
├── backend/
│   ├── app/
│   │   ├── main.py              # API FastAPI (endpoints REST)
│   │   ├── worker.py            # Worker de mise à jour (boucle infinie)
│   │   └── redis_client.py      # Singleton Redis
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # Router principal
    │   ├── pages/
    │   │   ├── HomePage.jsx     # Page d'accueil + recherche
    │   │   ├── LeaderboardPage.jsx  # Classements
    │   │   └── SearchPage.jsx   # (Alternative recherche)
    │   └── components/
    │       ├── ModaleCharacter.jsx  # Modale détails personnage
    │       └── Navigation.jsx
    └── package.jsont des données (CSV, JSON)

## 📝 Ce que j'ai appris

Ce projet m'a permis de :
- **Optimiser les performances** : Cache, pagination, lazy loading
- **Comprendre Redis** : Sorted Sets, TTL, pipelines
- **Architecturer une app complète** : Backend + Frontend + Worker
- **Gérer l'asynchrone** : FastAPI async, httpx async
- **Gérer les erreurs** : Fallbacks, messages clairs
