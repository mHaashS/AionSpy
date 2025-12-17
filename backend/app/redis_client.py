"""
Module Redis avec pattern Singleton pour gérer la connexion Redis.
"""
import redis
from typing import Optional

class RedisClient:
    """
    Singleton pour gérer la connexion Redis de manière centralisée.
    Connexion lazy : ne se connecte que lorsque nécessaire.
    """
    _instance: Optional['RedisClient'] = None
    _client: Optional[redis.Redis] = None
    _connection_attempted: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Ne pas se connecter immédiatement, seulement lors de la première utilisation
        pass
    
    def _ensure_connection(self):
        """Établit la connexion Redis si elle n'existe pas encore."""
        if self._client is not None:
            return
        
        if self._connection_attempted:
            # Déjà tenté, ne pas réessayer
            return
        
        self._connection_attempted = True
        
        try:
            self._client = redis.Redis(
                host='localhost',
                port=6379,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            # Test de connexion
            self._client.ping()
            print("✅ Connexion Redis établie")
        except (redis.ConnectionError, redis.TimeoutError, Exception) as e:
            print(f"⚠️  Redis non disponible: {e}")
            print("⚠️  L'API fonctionnera en mode fallback (appels directs à l'API externe)")
            self._client = None
    
    @property
    def client(self) -> Optional[redis.Redis]:
        """
        Retourne le client Redis.
        Retourne None si Redis n'est pas disponible.
        """
        self._ensure_connection()
        return self._client
    
    def is_available(self) -> bool:
        """Vérifie si Redis est disponible."""
        self._ensure_connection()
        if self._client is None:
            return False
        try:
            return self._client.ping()
        except:
            return False

# Instance globale du client Redis (connexion lazy)
redis_client = RedisClient()

