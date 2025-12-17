import { useState, useEffect } from 'react'
import axios from 'axios'

function LeaderboardPage() {
  const [rankingData, setRankingData] = useState(null)
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedRankingType, setSelectedRankingType] = useState(0)
  const [selectedRankingContentsType, setSelectedRankingContentsType] = useState(1)
  const [cache, setCache] = useState({})
  const [displayedPlayers, setDisplayedPlayers] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const playersPerPage = 20

  const rankingTypes = [
    { id: 1, name: 'Abyss' },
    { id: 5, name: 'Arena Solo' },
    { id: 6, name: 'Co-op Arena' },
    { id: 3, name: 'Nightmare' },
    { id: 4, name: 'Transcendence' },
    { id: 21, name: 'Ascension Trial' },
    { id: 20, name: 'Raid' }
  ]

  useEffect(() => {
    fetchServers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
    setDisplayedPlayers([])
    setAllPlayers([])
    setHasMore(true)
    fetchRanking()
  }, [selectedServer, selectedRankingType, selectedRankingContentsType])

  useEffect(() => {
    if (allPlayers.length > 0) {
      const endIndex = currentPage * playersPerPage
      const newPlayers = allPlayers.slice(0, endIndex)
      setDisplayedPlayers(newPlayers)
      setHasMore(endIndex < allPlayers.length)
    }
  }, [allPlayers, currentPage])

  const fetchServers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/gameinfo/servers', {
        params: { lang: 'en' }
      })
      if (response.data?.serverList) {
        setServers(response.data.serverList)
      }
    } catch (err) {
      console.error('Error fetching servers:', err)
    }
  }

  const getCacheKey = (rankingContentsType, rankingType, serverId) => {
    const serverKey = serverId || 'all'
    return `${rankingContentsType}-${rankingType}-${serverKey}`
  }

  const fetchRanking = async () => {
    const cacheKey = getCacheKey(selectedRankingContentsType, selectedRankingType, selectedServer)
    
    // Vérifier si les données sont en cache
    if (cache[cacheKey]) {
      const cachedData = cache[cacheKey]
      if (!selectedServer || selectedServer === '') {
        // Pour "All Servers", utiliser la pagination
        setAllPlayers(cachedData.rankingList || [])
        const initialPlayers = (cachedData.rankingList || []).slice(0, playersPerPage)
        setDisplayedPlayers(initialPlayers)
        setHasMore((cachedData.rankingList || []).length > playersPerPage)
        setRankingData({
          season: cachedData.season,
          rankingList: initialPlayers
        })
      } else {
        // Pour un serveur spécifique, afficher tout
        setRankingData(cachedData)
        setAllPlayers(cachedData.rankingList || [])
        setDisplayedPlayers(cachedData.rankingList || [])
        setHasMore(false)
      }
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      if (!selectedServer || selectedServer === '') {
        // "All Servers" - faire des appels pour tous les serveurs
        if (servers.length === 0) {
          // Attendre que les serveurs soient chargés
          return
        }

        // Faire des appels API en parallèle pour tous les serveurs
        const promises = servers.map(server => 
          axios.get('http://localhost:8000/api/ranking/list', {
            params: {
              rankingContentsType: selectedRankingContentsType,
              rankingType: selectedRankingType,
              serverId: server.serverId,
              lang: 'en'
            }
          }).then(response => response.data)
            .catch(err => {
              console.error(`Error fetching ranking for server ${server.serverId}:`, err)
              return null
            })
        )

        const results = await Promise.all(promises)
        
        // Combiner tous les résultats
        const allPlayers = []
        let seasonData = null
        
        results.forEach((data, index) => {
          if (data && data.rankingList) {
            // Prendre les données de saison du premier résultat valide
            if (!seasonData && data.season) {
              seasonData = data.season
            }
            
            // Ajouter tous les joueurs avec leur serveur
            data.rankingList.forEach(player => {
              allPlayers.push({
                ...player,
                serverName: servers[index].serverName,
                serverShortName: servers[index].serverShortName
              })
            })
          }
        })

        // Trier par points (décroissant)
        allPlayers.sort((a, b) => b.point - a.point)

        // Réassigner les rangs
        allPlayers.forEach((player, index) => {
          player.rank = index + 1
        })

        // Stocker tous les joueurs dans l'état
        setAllPlayers(allPlayers)
        
        // Afficher seulement les 20 premiers
        const initialPlayers = allPlayers.slice(0, playersPerPage)
        setDisplayedPlayers(initialPlayers)
        setHasMore(allPlayers.length > playersPerPage)

        // Créer l'objet de données combiné pour le cache
        const combinedData = {
          season: seasonData,
          rankingList: allPlayers
        }
        
        setRankingData({
          season: seasonData,
          rankingList: initialPlayers
        })
        
        // Mettre en cache les données combinées
        setCache(prevCache => ({
          ...prevCache,
          [cacheKey]: combinedData
        }))
      } else {
        // Serveur spécifique
        const response = await axios.get('http://localhost:8000/api/ranking/list', {
          params: {
            rankingContentsType: selectedRankingContentsType,
            rankingType: selectedRankingType,
            serverId: selectedServer,
            lang: 'en'
          }
        })
        const data = response.data
        setRankingData(data)
        setAllPlayers(data.rankingList || [])
        setDisplayedPlayers(data.rankingList || [])
        setHasMore(false)
        
        // Mettre en cache les données
        setCache(prevCache => ({
          ...prevCache,
          [cacheKey]: data
        }))
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error loading leaderboard')
      setRankingData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getRankColor = (rank) => {
    if (rank === 1) return '#ffd700'
    if (rank === 2) return '#c0c0c0'
    if (rank === 3) return '#cd7f32'
    return '#e0e0e0'
  }

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: `
        linear-gradient(135deg, rgb(25, 21, 15) 0%, #1a1f2e 50%),
        linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 50px 50px, 50px 50px',
      padding: '40px 20px',
      color: '#e0e0e0'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '30px'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#ff8c00',
            marginBottom: '15px',
            textShadow: '0 0 20px rgba(255, 140, 0, 0.5)'
          }}>
            LEADERBOARD
          </h1>
          
          {rankingData?.season && (
            <div style={{
              color: '#9ca3af',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              Season {rankingData.season.seasonNo} • {rankingData.rankingList?.length || 0} players
            </div>
          )}
        </div>

        {/* Ranking Type Tabs */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          flexWrap: 'wrap',
          borderBottom: '2px solid #2d3441',
          paddingBottom: '10px'
        }}>
          {rankingTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedRankingContentsType(type.id)}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedRankingContentsType === type.id ? '#ff8c00' : 'transparent',
                border: selectedRankingContentsType === type.id ? '1px solid #ff8c00' : '1px solid #2d3441',
                borderRadius: '8px 8px 0 0',
                color: selectedRankingContentsType === type.id ? '#1a1f2e' : '#9ca3af',
                fontSize: '14px',
                fontWeight: selectedRankingContentsType === type.id ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-2px'
              }}
              onMouseEnter={(e) => {
                if (selectedRankingContentsType !== type.id) {
                  e.currentTarget.style.backgroundColor = '#252b3d'
                  e.currentTarget.style.color = '#e0e0e0'
                  e.currentTarget.style.borderColor = '#3a4252'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRankingContentsType !== type.id) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#9ca3af'
                  e.currentTarget.style.borderColor = '#2d3441'
                }
              }}
            >
              {type.name}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '30px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value === '' ? '' : parseInt(e.target.value))}
            style={{
              padding: '10px 15px',
              backgroundColor: '#1a1f2e',
              border: '1px solid #2d3441',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">All Servers</option>
            {servers.map(server => (
              <option key={server.serverId} value={server.serverId}>
                {server.serverName} ({server.serverShortName})
              </option>
            ))}
          </select>

          <select
            value={selectedRankingType}
            onChange={(e) => setSelectedRankingType(parseInt(e.target.value))}
            style={{
              padding: '10px 15px',
              backgroundColor: '#1a1f2e',
              border: '1px solid #2d3441',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={0}>Overall</option>
            <option value={1}>Weekly</option>
          </select>
        </div>

        {/* Leaderboard Table */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '60px',
            color: '#9ca3af'
          }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#1a1f2e',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: '20px',
            color: '#ff6b6b',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {rankingData && rankingData.rankingList && (
          <div style={{
            backgroundColor: '#1a1f2e',
            border: '1px solid #2d3441',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 150px 120px 180px 80px',
              gap: '20px',
              padding: '15px 20px',
              backgroundColor: '#252b3d',
              borderBottom: '2px solid #2d3441',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#9ca3af'
            }}>
              <div>#</div>
              <div>PLAYER</div>
              <div>K/D/A</div>
              <div>POINTS</div>
              <div>GRADE</div>
              <div>+/-</div>
            </div>

            {/* Table Rows */}
            <div 
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
              onScroll={(e) => {
                const target = e.target
                const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
                
                // Charger plus de données quand on approche du bas (50px avant la fin)
                if (scrollBottom < 50 && hasMore && !isLoadingMore && (!selectedServer || selectedServer === '')) {
                  setIsLoadingMore(true)
                  setTimeout(() => {
                    setCurrentPage(prev => prev + 1)
                    setIsLoadingMore(false)
                  }, 100)
                }
              }}
            >
              {displayedPlayers.map((player, index) => (
                <div
                  key={player.characterId || index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 150px 120px 180px 80px',
                    gap: '20px',
                    padding: '15px 20px',
                    borderBottom: '1px solid #2d3441',
                    backgroundColor: index === 0 ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (index !== 0) {
                      e.currentTarget.style.backgroundColor = '#252b3d'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== 0) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    color: getRankColor(player.rank),
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {player.rank}
                  </div>

                  {/* Player Info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {player.profileImage && (
                      <img
                        src={player.profileImage}
                        alt={player.characterName}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: '2px solid #2d3441'
                        }}
                      />
                    )}
                    <div>
                      <div style={{
                        color: '#e0e0e0',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        marginBottom: '4px'
                      }}>
                        {player.characterName}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#9ca3af'
                      }}>
                        <span>{player.className}</span>
                        {player.serverShortName && (
                          <>
                            <span>•</span>
                            <span>{player.serverShortName}</span>
                          </>
                        )}
                        {player.guildName && (
                          <>
                            <span>•</span>
                            <span>{player.guildName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* K/D/A */}
                  <div style={{
                    fontSize: '14px',
                    color: '#e0e0e0'
                  }}>
                    <div style={{ color: '#4ade80' }}>
                      {formatNumber(player.extraDataMap?.killCount || 0)}K
                    </div>
                    <div style={{ color: '#f87171' }}>
                      {formatNumber(player.extraDataMap?.deathCount || 0)}D
                    </div>
                    <div style={{ color: '#60a5fa' }}>
                      {formatNumber(player.extraDataMap?.assistCount || 0)}A
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{
                    color: '#ff8c00',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {formatNumber(player.point)}
                  </div>

                  {/* Grade */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {player.gradeIcon && (
                      <img
                        src={player.gradeIcon}
                        alt={player.gradeName}
                        style={{
                          width: '32px',
                          height: '32px'
                        }}
                      />
                    )}
                    <span style={{
                      color: '#e0e0e0',
                      fontSize: '14px'
                    }}>
                      {player.gradeName}
                    </span>
                  </div>

                  {/* Rank Change */}
                  <div style={{
                    color: player.rankChange > 0 ? '#4ade80' : player.rankChange < 0 ? '#f87171' : '#9ca3af',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {player.rankChange > 0 ? `+${player.rankChange}` : player.rankChange < 0 ? player.rankChange : '-'}
                  </div>
                </div>
              ))}
              
              {isLoadingMore && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  Loading more...
                </div>
              )}
              
              {!hasMore && displayedPlayers.length > 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  No more players to load
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeaderboardPage
