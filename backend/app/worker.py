"""
Worker de mise à jour du leaderboard.
Boucle sur tous les serveurs et modes de jeu toutes les 4 heures.
"""
import asyncio
import httpx
import json
import time
from datetime import datetime
from typing import List, Dict, Optional
from .redis_client import redis_client

TW_BASE_URL = "https://tw.ncsoft.com/aion2"
UPDATE_INTERVAL = 4 * 60 * 60  # 4 heures en secondes
CACHE_TTL = 3 * 60 * 60  # 3 heures en secondes (TTL sur les clés Redis)

# Modes de jeu disponibles
RANKING_CONTENTS_TYPES = [1, 3, 4, 5, 6, 20, 21]  # 7 modes
RANKING_TYPES = [0, 1]  # Overall (0) et Weekly (1)

# Délai entre les requêtes pour ne pas saturer l'API
REQUEST_DELAY = 0.1  # 100ms entre chaque requête


def get_redis_key(mode_id: int, ranking_type: int = 0) -> str:
    """
    Génère la clé Redis pour un mode de jeu.
    Format: leaderboard:[MODE_ID]:[RANKING_TYPE]
    """
    return f"leaderboard:{mode_id}:{ranking_type}"


async def fetch_servers() -> List[Dict]:
    """Récupère la liste des serveurs depuis l'API."""
    headers = {"User-Agent": "Mozilla/5.0"}
    url = f"{TW_BASE_URL}/api/gameinfo/servers?lang=en"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("serverList", [])
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des serveurs: {e}")
        return []


async def fetch_server_ranking(
    ranking_contents_type: int,
    ranking_type: int,
    server_id: int,
    server_name: str,
    server_short_name: str
) -> Optional[List[Dict]]:
    """
    Récupère le classement d'un serveur spécifique.
    Retourne la liste des joueurs ou None en cas d'erreur.
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    url = (
        f"{TW_BASE_URL}/api/ranking/list?"
        f"lang=en&rankingContentsType={ranking_contents_type}"
        f"&rankingType={ranking_type}&serverId={server_id}"
    )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            ranking_list = data.get("rankingList", [])
            
            # Ajouter les informations du serveur à chaque joueur
            for player in ranking_list:
                player["serverName"] = server_name
                player["serverShortName"] = server_short_name
            
            return ranking_list
    except Exception as e:
        print(f"  ⚠️  Erreur pour serveur {server_id} ({server_name}): {e}")
        return None


async def update_mode_leaderboard(
    ranking_contents_type: int,
    ranking_type: int,
    servers: List[Dict]
) -> int:
    """
    Met à jour le leaderboard global pour un mode de jeu spécifique.
    Récupère les données de tous les serveurs et les insère dans Redis.
    
    Returns:
        Nombre de joueurs insérés dans Redis
    """
    redis_key = get_redis_key(ranking_contents_type, ranking_type)
    client = redis_client.client
    
    print(f"\n📊 Mise à jour du mode {ranking_contents_type} (type {ranking_type})...")
    
    all_players = []
    
    # Récupérer les classements de tous les serveurs
    for server in servers:
        server_id = server["serverId"]
        server_name = server["serverName"]
        server_short_name = server.get("serverShortName", "")
        
        players = await fetch_server_ranking(
            ranking_contents_type,
            ranking_type,
            server_id,
            server_name,
            server_short_name
        )
        
        if players:
            all_players.extend(players)
            print(f"  ✅ Serveur {server_id} ({server_name}): {len(players)} joueurs")
        else:
            print(f"  ⚠️  Serveur {server_id} ({server_name}): Aucune donnée")
        
        # Délai pour ne pas saturer l'API
        await asyncio.sleep(REQUEST_DELAY)
    
    if not all_players:
        print(f"  ❌ Aucun joueur récupéré pour le mode {ranking_contents_type}")
        # Ne pas supprimer les anciennes données si on n'a pas de nouvelles données
        # Cela permet de garder les données précédentes en cas de problème temporaire
        return 0
    
    # Supprimer l'ancien leaderboard pour ce mode seulement si on a de nouvelles données
    client.delete(redis_key)
    
    # Insérer tous les joueurs dans Redis avec ZADD
    # Le score est le point du joueur, le membre est le JSON du joueur
    pipe = client.pipeline()
    
    for player in all_players:
        player_json = json.dumps(player)
        score = player.get("point", 0)
        pipe.zadd(redis_key, {player_json: score})
    
    # Exécuter toutes les insertions en une fois
    pipe.execute()
    
    # Définir le TTL de 3 heures sur la clé
    client.expire(redis_key, CACHE_TTL)
    
    # Trier et réassigner les rangs pour information
    all_players.sort(key=lambda x: x.get("point", 0), reverse=True)
    for i, player in enumerate(all_players):
        player["rank"] = i + 1
    
    print(f"  ✅ {len(all_players)} joueurs insérés dans Redis (clé: {redis_key})")
    
    return len(all_players)


async def check_ranking_type_exists(
    ranking_contents_type: int,
    ranking_type: int,
    servers: List[Dict]
) -> bool:
    """
    Vérifie rapidement si un type de classement existe en testant le premier serveur.
    Retourne True si des données sont disponibles, False sinon.
    """
    if not servers:
        return False
    
    # Tester avec le premier serveur seulement
    test_server = servers[0]
    players = await fetch_server_ranking(
        ranking_contents_type,
        ranking_type,
        test_server["serverId"],
        test_server["serverName"],
        test_server.get("serverShortName", "")
    )
    
    return players is not None and len(players) > 0


async def update_all_leaderboards():
    """
    Met à jour tous les leaderboards (tous les modes × tous les types).
    Vérifie d'abord si chaque type existe avant de le traiter.
    """
    print("\n" + "="*60)
    print(f"🔄 Début de la mise à jour des leaderboards - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Récupérer la liste des serveurs
    servers = await fetch_servers()
    
    if not servers:
        print("❌ Impossible de récupérer la liste des serveurs")
        return
    
    print(f"✅ {len(servers)} serveurs trouvés")
    
    total_players = 0
    
    # Mettre à jour chaque mode de jeu
    for ranking_contents_type in RANKING_CONTENTS_TYPES:
        for ranking_type in RANKING_TYPES:
            # Vérifier si ce type de classement existe avant de le traiter
            # On vérifie seulement pour le type 1 (Weekly) car le type 0 (Overall) existe toujours
            if ranking_type == 1:
                print(f"🔍 Vérification de l'existence du mode {ranking_contents_type} (type {ranking_type})...")
                if not await check_ranking_type_exists(ranking_contents_type, ranking_type, servers):
                    print(f"  ⏭️  Mode {ranking_contents_type} (type {ranking_type}) non disponible, ignoré")
                    continue
            
            count = await update_mode_leaderboard(
                ranking_contents_type,
                ranking_type,
                servers
            )
            total_players += count
            
            # Petit délai entre les modes pour ne pas surcharger
            await asyncio.sleep(0.5)
    
    print("\n" + "="*60)
    print(f"✅ Mise à jour terminée - {total_players} joueurs au total")
    print(f"⏰ Prochaine mise à jour dans {UPDATE_INTERVAL / 3600:.1f} heures")
    print("="*60 + "\n")


async def main():
    """
    Boucle principale du worker.
    Met à jour les leaderboards toutes les 4 heures.
    """
    print("🚀 Worker de mise à jour du leaderboard démarré")
    print(f"⏰ Intervalle de mise à jour: {UPDATE_INTERVAL / 3600:.1f} heures")
    print(f"💾 TTL des clés Redis: {CACHE_TTL / 3600:.1f} heures")
    
    # Faire une première mise à jour immédiate
    await update_all_leaderboards()
    
    # Boucle infinie avec mise à jour toutes les 4 heures
    while True:
        print(f"\n⏳ Attente de {UPDATE_INTERVAL / 3600:.1f} heures avant la prochaine mise à jour...")
        await asyncio.sleep(UPDATE_INTERVAL)
        await update_all_leaderboards()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Worker arrêté par l'utilisateur")
    except Exception as e:
        print(f"\n\n❌ Erreur fatale: {e}")
        raise

