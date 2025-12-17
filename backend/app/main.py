from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import asyncio
from typing import Optional, List, Dict, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from .redis_client import redis_client

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AionSpy fonctionne"}

TW_BASE_URL = "https://tw.ncsoft.com/aion2"
KR_BASE_URL = "https://kr.ncsoft.com/aion2"

# Modes de jeu valides selon l'API NCSoft
VALID_RANKING_CONTENTS_TYPES = [1, 3, 4, 5, 6, 20, 21]  # 7 modes
VALID_RANKING_TYPES = [0, 1]  # Overall (0) et Weekly (1)


def get_redis_key(mode_id: int, ranking_type: int = 0) -> str:
    """
    Génère la clé Redis pour un mode de jeu.
    Format: leaderboard:[MODE_ID]:[RANKING_TYPE]
    """
    return f"leaderboard:{mode_id}:{ranking_type}"


async def getGlobalLeaderboard(mode_id: int, ranking_type: int = 0, limit: int = 100, offset: int = 0) -> Dict:
    """
    Récupère le leaderboard global depuis Redis en utilisant ZREVRANGE.
    
    Args:
        mode_id: ID du mode de jeu (1, 3, 4, 5, 6, 20, 21)
        ranking_type: Type de classement (0 = Overall, 1 = Weekly)
        limit: Nombre de joueurs à récupérer (par défaut 100)
        offset: Décalage pour la pagination (par défaut 0)
    
    Returns:
        Dictionnaire avec season et rankingList
    
    Raises:
        HTTPException: Si Redis est vide ou inaccessible, ou si le mode est invalide
    """
    # Valider le mode de jeu
    if mode_id not in VALID_RANKING_CONTENTS_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Mode de jeu invalide: {mode_id}. Modes valides: {VALID_RANKING_CONTENTS_TYPES}"
        )
    
    # Valider le type de classement
    if ranking_type not in VALID_RANKING_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de classement invalide: {ranking_type}. Types valides: {VALID_RANKING_TYPES}"
        )
    
    try:
        # Vérifier si Redis est disponible de manière asynchrone
        client = redis_client.client
        
        if client is None:
            raise HTTPException(
                status_code=503,
                detail="Redis n'est pas disponible. Veuillez démarrer Redis ou utiliser un serveur spécifique."
            )
        
        # Vérifier la disponibilité de Redis dans un thread séparé pour ne pas bloquer
        loop = asyncio.get_event_loop()
        is_available = await loop.run_in_executor(None, redis_client.is_available)
        
        if not is_available:
            raise HTTPException(
                status_code=503,
                detail="Redis n'est pas disponible. Veuillez démarrer Redis ou utiliser un serveur spécifique."
            )
        
        redis_key = get_redis_key(mode_id, ranking_type)
        
        # Vérifier si la clé existe et récupérer les données dans un thread séparé
        def get_redis_data():
            # Vérifier si la clé existe
            if not client.exists(redis_key):
                return None
            
            # Récupérer les meilleurs joueurs avec ZREVRANGE et WITHSCORES
            # ZREVRANGE retourne les membres triés par score décroissant
            # Calculer les indices pour la pagination
            start_index = offset
            end_index = offset + limit - 1
            
            return client.zrevrange(redis_key, start_index, end_index, withscores=True)
        
        # Exécuter l'opération Redis dans un thread séparé
        results = await loop.run_in_executor(None, get_redis_data)
        
        if results is None:
            raise HTTPException(
                status_code=404,
                detail=f"Leaderboard non disponible pour le mode {mode_id} (type {ranking_type}). Le worker doit être exécuté pour initialiser les données."
            )
        
        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"Leaderboard vide pour le mode {mode_id} (type {ranking_type})"
            )
        
        # Parser les résultats avec le bon rang (offset + 1) en parallèle
        def parse_player(idx: int, player_json: str, score: float) -> Optional[Tuple[int, Dict]]:
            """Parse un joueur et retourne (index, dictionnaire) ou None en cas d'erreur."""
            rank = offset + idx + 1  # Rang global dans le leaderboard
            try:
                player = json.loads(player_json)
                # S'assurer que le rank est correct et le point correspond au score
                player["rank"] = rank
                player["point"] = int(score)  # Utiliser le score de Redis
                return (idx, player)
            except json.JSONDecodeError as e:
                print(f"⚠️  Erreur de parsing JSON pour le joueur au rang {rank}: {e}")
                return None
        
        # Parser tous les joueurs en parallèle de manière asynchrone
        # Utiliser asyncio.run_in_executor pour ne pas bloquer le thread principal
        ranking_list = []
        if len(results) > 0:
            # Fonction synchrone pour parser tous les joueurs
            def parse_all_players_sync():
                results_dict = {}
                with ThreadPoolExecutor(max_workers=min(20, len(results))) as executor:
                    # Soumettre toutes les tâches de parsing
                    future_to_idx = {
                        executor.submit(parse_player, idx, player_json, score): idx
                        for idx, (player_json, score) in enumerate(results)
                    }
                    
                    # Collecter les résultats dans l'ordre
                    for future in as_completed(future_to_idx):
                        try:
                            result = future.result()
                            if result is not None:
                                idx, player = result
                                results_dict[idx] = player
                        except Exception as e:
                            idx = future_to_idx[future]
                            print(f"⚠️  Erreur lors du parsing du joueur à l'index {idx}: {e}")
                
                # Reconstruire la liste dans l'ordre
                return [results_dict[i] for i in sorted(results_dict.keys())]
            
            # Exécuter le parsing dans un thread séparé pour ne pas bloquer
            loop = asyncio.get_event_loop()
            ranking_list = await loop.run_in_executor(None, parse_all_players_sync)
        
        # Récupérer les informations de saison depuis le premier joueur si disponible
        season_data = None
        if ranking_list and "season" in ranking_list[0]:
            season_data = ranking_list[0].get("season")
        
        return {
            "season": season_data,
            "rankingList": ranking_list,
            "total": len(ranking_list),
            "mode_id": mode_id,
            "ranking_type": ranking_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur lors de la récupération du leaderboard: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération du leaderboard: {str(e)}"
        )

@app.get("/api/search/{character_name}")
async def search_character_tw(character_name: str):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/search/aion2tw/search/v2/character?keyword={character_name}"
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}


@app.get("/api/character_info")
async def get_character_info(character_id: str, server_id: int):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/character/info?lang=en&characterId={character_id}&serverId={server_id}"
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}


@app.get("/api/character_equipment")
async def get_character_equipment(character_id: str, server_id: int):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/character/equipment?lang=en&characterId={character_id}&serverId={server_id}"
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}


@app.get("/api/equipment_item")
async def get_equipment_item(
    id: int,
    enchantLevel: int,
    characterId: str,
    serverId: int,
    slotPos: int,
    lang: str = "en",
):
    """
    Proxy to fetch a specific equipment item detail for tooltip display.
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    url = (
        f"{TW_BASE_URL}/api/character/equipment/item?"
        f"id={id}&enchantLevel={enchantLevel}&characterId={characterId}"
        f"&serverId={serverId}&slotPos={slotPos}&lang={lang}"
    )
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}


@app.get("/api/item_info")
async def get_item_info(item_id: str, enchant_level: int, character_id: str, server_id: int, slot_pos):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/character/equipment/item?id={item_id}&enchantLevel={enchant_level}&characterId={character_id}&serverId={server_id}&slotPos={slot_pos}&lang=en"
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}


@app.get("/api/ranking/list")
async def get_ranking_list(
    rankingContentsType: int = 1,
    rankingType: int = 0,
    serverId: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    lang: str = "en"
):
    """
    Récupère le classement depuis Redis (si serverId est None) ou depuis l'API externe (si serverId est fourni).
    
    Si serverId est None, utilise getGlobalLeaderboard() pour récupérer depuis Redis.
    Si Redis n'est pas disponible, fait un fallback vers l'API externe en consolidant tous les serveurs.
    Si serverId est fourni, fait un appel direct à l'API externe (pour compatibilité).
    """
    # Valider le mode de jeu
    if rankingContentsType not in VALID_RANKING_CONTENTS_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Mode de jeu invalide: {rankingContentsType}. Modes valides: {VALID_RANKING_CONTENTS_TYPES}"
        )
    
    # Valider le type de classement
    if rankingType not in VALID_RANKING_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de classement invalide: {rankingType}. Types valides: {VALID_RANKING_TYPES}"
        )
    
    # Si aucun serveur spécifique n'est demandé, essayer Redis d'abord
    if serverId is None:
        try:
            return await getGlobalLeaderboard(rankingContentsType, rankingType, limit, offset)
        except HTTPException as e:
            # Si Redis n'est pas disponible (503) ou vide (404), faire un fallback
            if e.status_code == 503:
                # Redis non disponible, fallback vers l'API externe
                print(f"⚠️  Redis non disponible, fallback vers l'API externe pour le mode {rankingContentsType}")
                # On pourrait faire un fallback ici, mais pour l'instant on retourne l'erreur
                # pour que l'utilisateur sache qu'il doit démarrer Redis
                raise HTTPException(
                    status_code=503,
                    detail="Redis n'est pas disponible. Veuillez démarrer Redis avec 'redis-server' ou sélectionner un serveur spécifique."
                )
            elif e.status_code == 404:
                # Redis disponible mais données vides, fallback possible
                raise HTTPException(
                    status_code=404,
                    detail=f"Leaderboard non disponible. Le worker doit être exécuté pour initialiser les données. Mode: {rankingContentsType}, Type: {rankingType}"
                )
            else:
                raise e
    
    # Sinon, appel direct à l'API externe (pour compatibilité avec les appels existants)
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/ranking/list?lang={lang}&rankingContentsType={rankingContentsType}&rankingType={rankingType}&serverId={serverId}"
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}


@app.get("/api/ranking/global")
async def get_global_leaderboard(
    mode_id: int,
    ranking_type: int = 0,
    limit: int = 100,
    offset: int = 0
):
    """
    Endpoint dédié pour récupérer le leaderboard global depuis Redis.
    Utilise ZREVRANGE pour une récupération ultra-rapide.
    
    Modes valides: 1, 3, 4, 5, 6, 20, 21
    Types valides: 0 (Overall), 1 (Weekly)
    """
    return await getGlobalLeaderboard(mode_id, ranking_type, limit, offset)


@app.get("/api/gameinfo/servers")
async def get_servers(lang: str = "en"):
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/gameinfo/servers?lang={lang}"
    print(url)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        return {"error": "Request timed out"}
    except httpx.HTTPError as e:
        return {"error": str(e)}