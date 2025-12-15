import { useState } from 'react'
import axios from 'axios'

function App() {
  const [characterName, setCharacterName] = useState('')
  const [characterData, setCharacterData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [characterDetails, setCharacterDetails] = useState(null)
  const [characterEquipment, setCharacterEquipment] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const searchCharacter = async () => {
    if (!characterName.trim()) return
    
    setLoading(true)
    setError(null)
    setCharacterData(null)
    
    try {
      const response = await axios.get(`http://localhost:8000/api/search/${characterName}`)
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

  const getCharacterDetails = async (characterId, serverId) => {
    setDetailsLoading(true)
    setSelectedCharacter(characterId)
    setCharacterDetails(null)
    setCharacterEquipment(null)
    setError(null)
    setIsModalOpen(true) // Ouvrir la popin
    
    try {
      // Faire les deux appels en parallèle
      const [infoResponse, equipmentResponse] = await Promise.all([
        axios.get(`http://localhost:8000/api/character_info`, {
          params: {
            character_id: characterId,
            server_id: serverId
          }
        }),
        axios.get(`http://localhost:8000/api/character_equipment`, {
          params: {
            character_id: characterId,
            server_id: serverId
          }
        })
      ])
      
      setCharacterDetails(infoResponse.data)
      setCharacterEquipment(equipmentResponse.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des détails')
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setCharacterDetails(null)
    setCharacterEquipment(null)
    setSelectedCharacter(null)
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>
        AionSpy - Recherche de Personnage
      </h1>
      
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        gap: '10px',
        justifyContent: 'center'
      }}>
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Entrez le nom du personnage"
          style={{ 
            padding: '10px', 
            fontSize: '16px', 
            width: '300px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={searchCharacter}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#ffe6e6',
          borderRadius: '4px',
          border: '1px solid #ffcccc'
        }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

{characterData && characterData.list && (
  <div style={{ 
    border: '1px solid #ccc', 
    padding: '20px', 
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    marginBottom: '20px'
  }}>
    <h2 style={{ marginTop: 0, color: '#333' }}>
      Résultats de recherche ({characterData.list.length})
    </h2>
    
    {characterData.list.map((character, index) => {
      const cleanName = character.name.replace(/<[^>]*>/g, '')
      const isSelected = selectedCharacter === character.characterId
      
      return (
        <button
          key={index}
          onClick={() => getCharacterDetails(character.characterId, character.serverId)}
          disabled={detailsLoading}
          style={{ 
            width: '100%',
            border: '1px solid #ddd', 
            padding: '15px', 
            marginBottom: '10px',
            borderRadius: '6px',
            backgroundColor: isSelected && detailsLoading ? '#e3f2fd' : '#fff',
            cursor: detailsLoading ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            fontSize: '16px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!detailsLoading) e.target.style.backgroundColor = '#f0f0f0'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = isSelected && detailsLoading ? '#e3f2fd' : '#fff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#007bff' }}>{cleanName}</h3>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                <span>Niveau {character.level}</span> • 
                <span> {character.serverName}</span>
              </div>
            </div>
            {detailsLoading && isSelected && (
              <span style={{ color: '#007bff' }}>Chargement...</span>
            )}
          </div>
        </button>
      )
    })}
  </div>
)}

{/* Popin (Modal) */}
{isModalOpen && (
  <div 
    onClick={closeModal}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}
  >
    <div 
      onClick={(e) => e.stopPropagation()} // Empêcher la fermeture en cliquant dans la popin
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}
    >
      {/* Header avec bouton fermer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #ddd',
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        zIndex: 10
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>Détails du personnage</h2>
        <button
          onClick={closeModal}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '0 10px',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>

      {/* Contenu de la popin */}
      <div style={{ padding: '20px' }}>
        {detailsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Chargement des détails du personnage...</p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ 
                color: 'red', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#ffe6e6',
                borderRadius: '4px',
                border: '1px solid #ffcccc'
              }}>
                <strong>Erreur :</strong> {error}
              </div>
            )}

            {characterDetails && (
              <div style={{ 
                marginBottom: '20px'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>Informations détaillées</h3>
                <pre style={{ 
                  background: '#f9f9f9', 
                  padding: '15px', 
                  overflow: 'auto',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '13px',
                  maxHeight: '400px'
                }}>
                  {JSON.stringify(characterDetails, null, 2)}
                </pre>
              </div>
            )}

            {characterEquipment && (
              <div>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>Équipement</h3>
                <pre style={{ 
                  background: '#f9f9f9', 
                  padding: '15px', 
                  overflow: 'auto',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '13px',
                  maxHeight: '400px'
                }}>
                  {JSON.stringify(characterEquipment, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  )
}

export default App

