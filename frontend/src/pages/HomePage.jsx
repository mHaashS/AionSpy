import { useState } from 'react'
import axios from 'axios'
import ModaleCharacter from '../components/ModaleCharacter'

function HomePage() {
  const [characterName, setCharacterName] = useState('')
  const [characterData, setCharacterData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCharacterId, setModalCharacterId] = useState(null)
  const [modalServerId, setModalServerId] = useState(null)
  const [showAllResults, setShowAllResults] = useState(false)
  const [isIconRotating, setIsIconRotating] = useState(false)

  const searchCharacter = async () => {
    if (!characterName.trim()) return
    
    setLoading(true)
    setError(null)
    setCharacterData(null)
    setShowAllResults(false) // Réinitialiser l'état de pagination
    
    try {
      const response = await axios.get(`http://localhost:8000/api/search/${characterName}`)
      // Trier les résultats par niveau décroissant
      if (response.data && response.data.list) {
        response.data.list.sort((a, b) => {
          const levelA = parseInt(a.level) || 0
          const levelB = parseInt(b.level) || 0
          return levelB - levelA // Décroissant
        })
      }
      setCharacterData(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la recherche')
      setCharacterData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchCharacter()
    }
  }

  const clearSearch = () => {
    if (characterName) {
      // Transition de croix vers loupe
      setIsIconRotating(true)
      setTimeout(() => {
        setCharacterName('')
        setCharacterData(null)
        setError(null)
        setShowAllResults(false)
        setTimeout(() => setIsIconRotating(false), 300)
      }, 150)
    }
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    if (!characterName && newValue) {
      // Transition de loupe vers croix
      setIsIconRotating(true)
      setTimeout(() => setIsIconRotating(false), 300)
    } else if (characterName && !newValue) {
      // Transition de croix vers loupe (si l'utilisateur efface manuellement)
      setIsIconRotating(true)
      setTimeout(() => setIsIconRotating(false), 300)
    }
    setCharacterName(newValue)
  }

  const getCharacterDetails = (characterId, serverId) => {
    setModalCharacterId(characterId)
    setModalServerId(serverId)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalCharacterId(null)
    setModalServerId(null)
  }

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      background: `
        linear-gradient(135deg, rgb(25, 21, 15) 0%, #1a1f2e 50%),
        linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 50px 50px, 50px 50px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '40px 20px',
      color: '#e0e0e0'
    }}>
      {/* Logo/Titre principal */}
      <div style={{
        textAlign: 'center',
        marginBottom: '60px'
      }}>
        <h1 style={{
          fontSize: '64px',
          fontWeight: 'bold',
          color: '#ff8c00',
          margin: '0 0 10px 0',
          textShadow: '0 0 20px rgba(255, 140, 0, 0.5)',
          letterSpacing: '2px'
        }}>
          AionSpy
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#9ca3af',
          margin: 0,
          fontWeight: '300'
        }}>
          Your Aion 2 companion
        </p>
      </div>

      {/* Barre de recherche principale */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#1a1f2e',
          border: '2px solid #ff8c00',
          borderRadius: '12px',
          padding: '10px 15px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          <span 
            onClick={characterName ? clearSearch : undefined}
            style={{
              fontSize: '25px',
              marginRight: '15px',
              color: '#ff8c00',
              cursor: characterName ? 'pointer' : 'default',
              transition: isIconRotating ? 'none' : 'transform 0.2s, color 0.2s',
              animation: isIconRotating ? 'rotateIcon 0.3s ease-in-out' : 'none',
              userSelect: 'none',
              display: 'inline-block'
            }}
            onMouseEnter={(e) => {
              if (characterName && !isIconRotating) {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.color = '#ff9d1a'
              }
            }}
            onMouseLeave={(e) => {
              if (characterName && !isIconRotating) {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.color = '#ff8c00'
              }
            }}
          >
            {characterName ? '✕' : '🔍'}
          </span>
          <style>{`
            @keyframes rotateIcon {
              0% { transform: rotate(0deg); opacity: 1; }
              50% { transform: rotate(90deg); opacity: 0; }
              100% { transform: rotate(180deg); opacity: 1; }
            }
          `}</style>
          <input
            type="text"
            value={characterName}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Search a character name..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#e0e0e0',
              fontSize: '16px',
              outline: 'none'
            }}
          />
          <button
            onClick={searchCharacter}
            disabled={loading}
            style={{
              backgroundColor: '#ff8c00',
              color: '#1a1f2e',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.backgroundColor = '#ffa64d'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.backgroundColor = '#ff8c00'
            }}
          >
            {loading ? 'Search...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#2d1a1a',
          borderRadius: '4px',
          border: '1px solid #ff6b6b',
          maxWidth: '600px',
          width: '100%'
        }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {characterData && characterData.list && (
        <div style={{ 
          border: '1px solid #2d3441', 
          padding: '10px 10px 0 10px', 
          borderRadius: '8px',
          backgroundColor: '#1a1f2e',
          marginTop: '0px',
          marginBottom: '20px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{ 
            padding: '10px 0', 
            marginBottom: '10px',
            borderBottom: '1px solid #2d3441',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>
              {characterData.list.length > 4 && !showAllResults 
                ? `Showing 4 of ${characterData.list.length} results`
                : `Results (${characterData.list.length})`}
            </span>
            {characterData.list.length > 4 && !showAllResults && (
              <button
                onClick={() => setShowAllResults(true)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#ff8c00',
                  color: '#1a1f2e',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff9d1a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff8c00'
                }}
              >
                Show all results
              </button>
            )}
            {characterData.list.length > 4 && showAllResults && (
              <button
                onClick={() => setShowAllResults(false)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#2d3441',
                  color: '#e0e0e0',
                  border: '1px solid #3a4252',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3a4252'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2d3441'
                }}
              >
                Show less
              </button>
            )}
          </div>
          
          <div style={{
            maxHeight: showAllResults ? '440px' : '400px',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '5px',
            paddingBottom: '10px',
            transition: 'max-height 0.4s ease-in-out'
          }}>
            {(showAllResults ? characterData.list : characterData.list.slice(0, 4)).map((character, index) => {
            const cleanName = character.name.replace(/<[^>]*>/g, '')
            
            return (
              <button
                key={index}
                onClick={() => getCharacterDetails(character.characterId, character.serverId)}
                style={{ 
                  width: '100%',
                  maxWidth: '900px',
                  border: '1px solid #2d3441', 
                  padding: '10px', 
                  marginBottom: '10px',
                  borderRadius: '6px',
                  backgroundColor: '#1a1f2e',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '16px',
                  transition: 'background-color 0.2s, border-color 0.2s',
                  color: '#e0e0e0'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#252b3d'
                    e.currentTarget.style.borderColor = '#3a4252'
                    const inner = e.currentTarget.querySelector('.result-inner')
                    if (inner) {
                      inner.style.backgroundColor = '#252b3d'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1f2e'
                  e.currentTarget.style.borderColor = '#2d3441'
                  const inner = e.currentTarget.querySelector('.result-inner')
                  if (inner) {
                    inner.style.backgroundColor = 'inherit'
                  }
                }}
              >
                <div className="result-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'inherit' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#ff8c00' }}>{cleanName}</h3>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Niveau {character.level}</span> • 
                      <span> {character.serverName}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {character.race === 2 && (
                      <span style={{ 
                        color: '#9d4edd', 
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        Asmodian
                      </span>
                    )}
                    {character.race === 1 && (
                      <span style={{ 
                        color: '#87ceeb', 
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        Elyos
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          </div>
        </div>
      )}

      <ModaleCharacter
        isOpen={isModalOpen}
        onClose={closeModal}
        characterId={modalCharacterId}
        serverId={modalServerId}
      />
    </div>
  )
}

export default HomePage
