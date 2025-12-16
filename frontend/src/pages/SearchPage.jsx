import { useState } from 'react'
import axios from 'axios'

function SearchPage() {
  const [characterName, setCharacterName] = useState('')
  const [characterData, setCharacterData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [characterDetails, setCharacterDetails] = useState(null)
  const [characterEquipment, setCharacterEquipment] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('EQUIPMENT')

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
    setIsModalOpen(true)
    
    try {
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
    setActiveTab('EQUIPMENT')
  }

  const organizeEquipmentByCategory = (equipmentList) => {
    if (!equipmentList) return { weapons: [], armor: [], accessories: [], runes: [], arcana: [] }
    
    const categories = {
      weapons: [],
      armor: [],
      accessories: [],
      runes: [],
      arcana: []
    }
    
    equipmentList.forEach(item => {
      if (item.slotPos <= 2) {
        categories.weapons.push(item)
      } else if (item.slotPos <= 8 || item.slotPos === 19) {
        categories.armor.push(item)
      } else if (item.slotPosName && item.slotPosName.startsWith('Rune')) {
        categories.runes.push(item)
      } else if (item.slotPosName && item.slotPosName.startsWith('Arcana')) {
        categories.arcana.push(item)
      } else {
        categories.accessories.push(item)
      }
    })
    
    return categories
  }

  const organizeSkillsByCategory = (skillList) => {
    if (!skillList) return { active: [], passive: [], dp: [] }
    
    const categories = {
      active: [],
      passive: [],
      dp: []
    }
    
    skillList.forEach(skill => {
      if (skill.category === 'Active') {
        categories.active.push(skill)
      } else if (skill.category === 'Passive') {
        categories.passive.push(skill)
      } else if (skill.category === 'Dp') {
        categories.dp.push(skill)
      }
    })
    
    return categories
  }

  const getItemLevel = (statList) => {
    if (!statList) return null
    const itemLevelStat = statList.find(stat => stat.type === 'ItemLevel')
    return itemLevelStat ? itemLevelStat.value : null
  }

  const getItemGradeColors = (grade) => {
    if (grade === 'Unique') {
      return { borderColor: '#ffd700', nameColor: '#ffd700' }
    } else if (grade === 'Epic') {
      return { borderColor: '#ff8c00', nameColor: '#ff8c00' }
    } else if (grade === 'Legend') {
      return { borderColor: '#4a90e2', nameColor: '#4a90e2' }
    } else if (grade === 'Rare') {
      return { borderColor: '#9d4edd', nameColor: '#9d4edd' }
    } else if (grade === 'Special') {
      return { borderColor: '#06ffa5', nameColor: '#06ffa5' }
    }
    return { borderColor: '#2d3441', nameColor: '#fff' }
  }

  const getEnchantDisplay = (item) => {
    const { grade, enchantLevel, exceedLevel } = item
    
    if (grade === 'Unique' && enchantLevel === 15 && exceedLevel > 0) {
      return (
        <span style={{ 
          color: '#ffd700', 
          fontSize: '12px',
          border: '1px solid #ffd700',
          backgroundColor: 'rgba(255, 215, 0, 0.15)',
          borderRadius: '4px',
          padding: '2px 6px',
          display: 'inline-block'
        }}>★{exceedLevel}</span>
      )
    }
    
    if (grade === 'Epic' && enchantLevel === 20 && exceedLevel > 0) {
      return (
        <span style={{ 
          color: '#ffd700', 
          fontSize: '12px',
          border: '1px solid #ffd700',
          backgroundColor: 'rgba(255, 215, 0, 0.15)',
          borderRadius: '4px',
          padding: '2px 6px',
          display: 'inline-block'
        }}>★{exceedLevel}</span>
      )
    }
    
    return (
      <>
        {enchantLevel > 0 && (
          <span style={{ 
            color: '#4ade80', 
            fontSize: '12px',
            border: '1px solid #4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.15)',
            borderRadius: '4px',
            padding: '2px 6px',
            display: 'inline-block'
          }}>+{enchantLevel}</span>
        )}
        {exceedLevel > 0 && (
          <span style={{ 
            color: '#ffd700', 
            fontSize: '12px',
            border: '1px solid #ffd700',
            backgroundColor: 'rgba(255, 215, 0, 0.15)',
            borderRadius: '4px',
            padding: '2px 6px',
            display: 'inline-block'
          }}>x{exceedLevel}</span>
        )}
      </>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f1419 0%, #1a1f2e 100%)',
      color: '#e0e0e0'
    }}>
      <h1 style={{ textAlign: 'center', color: '#ff8c00', marginBottom: '30px' }}>
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
            border: '1px solid #2d3441',
            borderRadius: '4px',
            backgroundColor: '#1a1f2e',
            color: '#e0e0e0'
          }}
        />
        <button
          onClick={searchCharacter}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#ff8c00',
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
          color: '#ff6b6b', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#2d1a1a',
          borderRadius: '4px',
          border: '1px solid #ff6b6b'
        }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

{characterData && characterData.list && (
  <div style={{ 
    border: '1px solid #2d3441', 
    padding: '20px', 
    borderRadius: '8px',
    backgroundColor: '#1a1f2e',
    marginBottom: '20px'
  }}>
    <h2 style={{ marginTop: 0, color: '#ff8c00' }}>
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
            border: '1px solid #2d3441', 
            padding: '15px', 
            marginBottom: '10px',
            borderRadius: '6px',
            backgroundColor: isSelected && detailsLoading ? '#252b3d' : '#1a1f2e',
            cursor: detailsLoading ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            fontSize: '16px',
            transition: 'background-color 0.2s',
            color: '#e0e0e0'
          }}
          onMouseEnter={(e) => {
            if (!detailsLoading) e.target.style.backgroundColor = '#252b3d'
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = isSelected && detailsLoading ? '#252b3d' : '#1a1f2e'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#ff8c00' }}>{cleanName}</h3>
              <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px' }}>
                <span>Level {character.level}</span> • 
                <span> {character.serverName}</span>
              </div>
            </div>
            {detailsLoading && isSelected && (
              <span style={{ color: '#ff8c00' }}>Chargement...</span>
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}
  >
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: '#1a1f2e',
        borderRadius: '8px',
        maxWidth: '1500px',
        width: '100%',
        maxHeight: '95vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        color: '#e0e0e0',
        border: '1px solid rgba(105, 152, 181, 1)'
      }}
    >
      {detailsLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#e0e0e0' }}>
          <p style={{ fontSize: '18px' }}>Chargement des détails du personnage...</p>
        </div>
      ) : characterDetails && characterEquipment ? (
        <>
          {characterDetails.profile && (
            <div style={{
              padding: '30px',
              margin: '30px 30px 30px',
              background: 'linear-gradient(135deg, #1e2330 0%, #252b3d 100%)',
              border: '1px solid #2d3441',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}>
              <button
                onClick={closeModal}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#e0e0e0',
                  padding: '0 10px',
                  lineHeight: '1',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  zIndex: 10
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2d3441'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative' }}>
                  <img 
                    src={characterDetails.profile.profileImage || '/placeholder.png'} 
                    alt={characterDetails.profile.characterName}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      border: '3px solid #4a90e2',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    backgroundColor: '#4a90e2',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    border: '2px solid #1a1f2e',
                    fontSize: '14px'
                  }}>
                    {characterDetails.profile.characterLevel}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <h1 style={{ margin: 0, color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                      {characterDetails.profile.characterName}
                    </h1>
                    <span style={{ color: '#9ca3af', fontSize: '16px' }}>
                      {characterDetails.profile.serverName}
                    </span>
                  </div>
                  <div style={{ marginBottom: '8px', color: '#b0b8c4' }}>
                    <span style={{ marginRight: '15px' }}>{characterDetails.profile.className}</span>
                    <span>{characterDetails.profile.raceName}</span>
                  </div>
                  {characterDetails.profile.titleName && (
                    <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '10px' }}>
                      {characterDetails.profile.titleName}
                    </div>
                  )}
                  {getItemLevel(characterDetails.stat?.statList) && (
                    <div style={{
                      display: 'inline-block',
                      backgroundColor: '#2d3441',
                      padding: '6px 12px',
                      borderRadius: '7px',
                      border: '1px solid rgb(139, 179, 228)',
                      color: 'rgb(139, 179, 228)',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                       Combat Power {getItemLevel(characterDetails.stat?.statList)}
                    </div>
                  )}
                </div>

                {(characterEquipment.petwing?.pet || characterEquipment.petwing?.wing) && (
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {characterEquipment.petwing.pet && (
                      <div style={{
                        backgroundColor: '#252b3d',
                        padding: '15px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        minWidth: '100px',
                        border: '1px solid #2d3441',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                      }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px' }}>PET</div>
                        <img 
                          src={characterEquipment.petwing.pet.icon} 
                          alt={characterEquipment.petwing.pet.name}
                          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ fontSize: '11px', color: '#e0e0e0', marginTop: '5px' }}>
                          {characterEquipment.petwing.pet.name}
                        </div>
                      </div>
                    )}
                    {characterEquipment.petwing.wing && (
                      <div style={{
                        backgroundColor: '#252b3d',
                        padding: '15px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        minWidth: '100px',
                        border: '1px solid #2d3441',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                      }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px' }}>WINGS</div>
                        <img 
                          src={characterEquipment.petwing.wing.icon} 
                          alt={characterEquipment.petwing.wing.name}
                          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <div style={{ fontSize: '11px', color: '#e0e0e0', marginTop: '5px' }}>
                          {characterEquipment.petwing.wing.name}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '10px',
            backgroundColor: '#252b3d',
            padding: '15px 30px',
            border: 'none'
          }}>
            {['EQUIPMENT', 'STATS', 'SKILLS', 'RANKS', 'DAEVANION', 'TITLES', 'COSMETICS'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '15px 25px',
                  backgroundColor: activeTab === tab ? '#1e2330' : '#252b3d',
                  border: activeTab === tab ? '1px solid #4a90e2' : '1px solid #2d3441',
                  borderRadius: '8px',
                  color: activeTab === tab ? '#4a90e2' : '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab 
                    ? '0 4px 12px rgba(74, 144, 226, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.target.style.color = '#e0e0e0'
                    e.target.style.backgroundColor = '#1e2330'
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.target.style.color = '#9ca3af'
                    e.target.style.backgroundColor = '#252b3d'
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: '30px', minHeight: '400px' }}>
            {activeTab === 'EQUIPMENT' && characterEquipment.equipment && (
              <div>
                {(() => {
                  const categories = organizeEquipmentByCategory(characterEquipment.equipment.equipmentList)
                  return (
                    <>
                      {categories.weapons.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>Weapons</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {categories.weapons.map((item, idx) => {
                              const gradeColors = getItemGradeColors(item.grade)
                              return (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  border: `1px solid ${gradeColors.borderColor}`,
                                  display: 'flex',
                                  gap: '12px',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <img 
                                  src={item.icon} 
                                  alt={item.name}
                                  style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: gradeColors.nameColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>{item.slotPosName}</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {getEnchantDisplay(item)}
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {categories.armor.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>Armor</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {categories.armor.map((item, idx) => {
                              const gradeColors = getItemGradeColors(item.grade)
                              return (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  border: `1px solid ${gradeColors.borderColor}`,
                                  display: 'flex',
                                  gap: '12px',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <img 
                                  src={item.icon} 
                                  alt={item.name}
                                  style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: gradeColors.nameColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>{item.slotPosName}</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {getEnchantDisplay(item)}
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {categories.accessories.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>Accessories</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {categories.accessories.map((item, idx) => {
                              const gradeColors = getItemGradeColors(item.grade)
                              return (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  border: `1px solid ${gradeColors.borderColor}`,
                                  display: 'flex',
                                  gap: '12px',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <img 
                                  src={item.icon} 
                                  alt={item.name}
                                  style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: gradeColors.nameColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>{item.slotPosName}</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {getEnchantDisplay(item)}
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {categories.runes.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>Runes</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {categories.runes.map((item, idx) => {
                              const gradeColors = getItemGradeColors(item.grade)
                              return (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  border: `1px solid ${gradeColors.borderColor}`,
                                  display: 'flex',
                                  gap: '12px',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <img 
                                  src={item.icon} 
                                  alt={item.name}
                                  style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: gradeColors.nameColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>{item.slotPosName}</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {getEnchantDisplay(item)}
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {categories.arcana.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>Arcana</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                            {categories.arcana.map((item, idx) => {
                              const gradeColors = getItemGradeColors(item.grade)
                              return (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '15px',
                                  borderRadius: '8px',
                                  border: `1px solid ${gradeColors.borderColor}`,
                                  display: 'flex',
                                  gap: '12px',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <img 
                                  src={item.icon} 
                                  alt={item.name}
                                  style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ color: gradeColors.nameColor, fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>{item.slotPosName}</div>
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    {getEnchantDisplay(item)}
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {activeTab === 'STATS' && characterDetails.stat && (
              <div>
                <h3 style={{ color: '#4a90e2', marginBottom: '20px', fontSize: '20px' }}>Statistics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                  {characterDetails.stat.statList.filter(stat => stat.type !== 'ItemLevel').map((stat, idx) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: '#252b3d',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #2d3441'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>{stat.name}</div>
                        <div style={{ color: '#4a90e2', fontWeight: 'bold', fontSize: '18px' }}>{stat.value}</div>
                      </div>
                      {stat.statSecondList && stat.statSecondList.length > 0 && (
                        <div style={{ borderTop: '1px solid #2d3441', paddingTop: '10px', marginTop: '10px' }}>
                          {stat.statSecondList.map((effect, effectIdx) => (
                            <div key={effectIdx} style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>
                              {effect}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'RANKS' && characterDetails.ranking && (
              <div>
                <h3 style={{ color: '#4a90e2', marginBottom: '20px', fontSize: '20px' }}>Rankings</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {characterDetails.ranking.rankingList.filter(rank => rank.rank !== null).map((rank, idx) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: '#252b3d',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #2d3441',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {rank.gradeIcon && (
                          <img 
                            src={rank.gradeIcon} 
                            alt={rank.gradeName}
                            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                          />
                        )}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                            {rank.rankingContentsName}
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: '14px' }}>{rank.gradeName}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#4a90e2', fontWeight: 'bold', fontSize: '20px' }}>Rank #{rank.rank}</div>
                        <div style={{ color: '#9ca3af', fontSize: '14px' }}>{rank.point?.toLocaleString()} points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'DAEVANION' && characterDetails.daevanion && (
              <div>
                <h3 style={{ color: '#4a90e2', marginBottom: '20px', fontSize: '20px' }}>Daevanion Boards</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                  {characterDetails.daevanion.boardList.map((board, idx) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: '#252b3d',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #2d3441',
                        textAlign: 'center'
                      }}
                    >
                      <img 
                        src={board.icon} 
                        alt={board.name}
                        style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '15px' }}
                      />
                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>
                        {board.name}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                        {board.openNodeCount} / {board.totalNodeCount} nodes
                      </div>
                      <div style={{ 
                        marginTop: '10px',
                        backgroundColor: '#2d3441',
                        borderRadius: '4px',
                        padding: '5px',
                        color: '#4a90e2',
                        fontSize: '12px'
                      }}>
                        {Math.round((board.openNodeCount / board.totalNodeCount) * 100)}% Complete
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'TITLES' && characterDetails.title && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#4a90e2', fontSize: '20px', margin: 0 }}>Titles</h3>
                  <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                    {characterDetails.title.ownedCount} / {characterDetails.title.totalCount}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                  {characterDetails.title.titleList.slice(0, 20).map((title, idx) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: '#252b3d',
                        padding: '15px',
                        borderRadius: '8px',
                        border: '1px solid #2d3441'
                      }}
                    >
                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>
                        {title.name}
                      </div>
                      <div style={{ 
                        display: 'inline-block',
                        color: title.grade === 'Unique' ? '#ffd700' : '#9ca3af',
                        fontSize: '12px',
                        backgroundColor: '#2d3441',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }}>
                        {title.grade}
                      </div>
                      {title.equipStatList && title.equipStatList.length > 0 && (
                        <div style={{ borderTop: '1px solid #2d3441', paddingTop: '10px', marginTop: '10px' }}>
                          {title.equipStatList.map((stat, statIdx) => (
                            <div key={statIdx} style={{ color: '#4a90e2', fontSize: '13px', marginTop: '4px' }}>
                              {stat.desc}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'SKILLS' && characterEquipment.skill && (
              <div>
                {(() => {
                  const skillCategories = organizeSkillsByCategory(characterEquipment.skill.skillList)
                  const activeSkills = skillCategories.active.filter(skill => skill.acquired === 1)
                  const passiveSkills = skillCategories.passive.filter(skill => skill.acquired === 1)
                  const dpSkills = skillCategories.dp.filter(skill => skill.acquired === 1)
                  const equippedDpCount = dpSkills.filter(skill => skill.equip === 1).length

                  return (
                    <>
                      {activeSkills.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>
                            Active Skills ({activeSkills.length})
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
                            {activeSkills.map((skill, idx) => (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  border: '1px solid #2d3441',
                                  textAlign: 'center',
                                  position: 'relative',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <img 
                                    src={skill.icon} 
                                    alt={skill.name}
                                    style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '4px' }}
                                  />
                                  {skill.skillLevel > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      backgroundColor: '#4a90e2',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      border: '2px solid #1e2330'
                                    }}>
                                      {skill.skillLevel}
                                    </div>
                                  )}
                                </div>
                                <div style={{ color: '#e0e0e0', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>
                                  {skill.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {passiveSkills.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>
                            Passive Skills ({passiveSkills.length})
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
                            {passiveSkills.map((skill, idx) => (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  border: '1px solid #2d3441',
                                  textAlign: 'center',
                                  position: 'relative',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <img 
                                    src={skill.icon} 
                                    alt={skill.name}
                                    style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '4px' }}
                                  />
                                  {skill.skillLevel > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      backgroundColor: '#4a90e2',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      border: '2px solid #1e2330'
                                    }}>
                                      {skill.skillLevel}
                                    </div>
                                  )}
                                </div>
                                <div style={{ color: '#e0e0e0', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>
                                  {skill.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dpSkills.length > 0 && (
                        <div style={{ 
                          marginBottom: '30px',
                          backgroundColor: '#1e2330',
                          border: '1px solid #2d3441',
                          borderRadius: '12px',
                          padding: '20px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                        }}>
                          <h3 style={{ color: '#4a90e2', marginBottom: '15px', fontSize: '18px' }}>
                            Sigma Skills ({dpSkills.length}) {equippedDpCount > 0 && `${equippedDpCount} equipped`}
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
                            {dpSkills.map((skill, idx) => (
                              <div 
                                key={idx}
                                style={{
                                  backgroundColor: '#252b3d',
                                  padding: '10px',
                                  borderRadius: '8px',
                                  border: skill.equip === 1 ? '1px solid #4a90e2' : '1px solid #2d3441',
                                  textAlign: 'center',
                                  position: 'relative',
                                  boxShadow: skill.equip === 1 ? '0 2px 8px rgba(74, 144, 226, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}
                              >
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <img 
                                    src={skill.icon} 
                                    alt={skill.name}
                                    style={{ 
                                      width: '64px', 
                                      height: '64px', 
                                      objectFit: 'contain', 
                                      borderRadius: '4px',
                                      opacity: skill.skillLevel === 0 ? 0.5 : 1
                                    }}
                                  />
                                  {skill.equip === 1 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-5px',
                                      left: '-18px',
                                      color: 'rgb(88, 214, 105)',
                                      width: '20px',
                                      height: '20px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                    }}>
                                      E
                                    </div>
                                  )}
                                  {skill.skillLevel > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-8px',
                                      right: '-8px',
                                      backgroundColor: '#4a90e2',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      border: '2px solid #1e2330'
                                    }}>
                                      {skill.skillLevel}
                                    </div>
                                  )}
                                </div>
                                <div style={{ color: '#e0e0e0', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>
                                  {skill.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {activeTab === 'COSMETICS' && characterEquipment && characterEquipment.equipment && (
              <div>
                {(() => {
                  const skinList = characterEquipment.equipment.skinList || []
                  return skinList.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {skinList.map((cosmetic, idx) => {
                      const gradeColors = getItemGradeColors(cosmetic.grade)
                      return (
                        <div 
                          key={idx}
                          style={{
                            backgroundColor: '#252b3d',
                            padding: '20px',
                            borderRadius: '12px',
                            border: `1px solid ${gradeColors.borderColor}`,
                            textAlign: 'center',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)'
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <img 
                            src={cosmetic.icon} 
                            alt={cosmetic.name}
                            style={{ 
                              width: '80px', 
                              height: '80px', 
                              objectFit: 'contain', 
                              borderRadius: '8px',
                              marginBottom: '15px',
                              backgroundColor: '#1e2330',
                              padding: '8px'
                            }}
                          />
                          <div style={{ 
                            color: gradeColors.nameColor, 
                            fontWeight: 'bold', 
                            fontSize: '14px', 
                            marginBottom: '8px',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {cosmetic.name}
                          </div>
                          <div style={{ 
                            color: '#9ca3af', 
                            fontSize: '12px',
                            backgroundColor: '#2d3441',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {cosmetic.slotPosName}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px', 
                    color: '#9ca3af',
                    fontSize: '16px'
                  }}>
                    {characterEquipment.equipment?.skinList ? 'Aucun cosmétique équipé' : 'Données de cosmétiques non disponibles'}
                  </div>
                )
                })()}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: '#e0e0e0' }}>
          {error ? (
            <div style={{ color: '#ff6b6b' }}>{error}</div>
          ) : (
            <p style={{ fontSize: '18px' }}>Chargement des détails du personnage...</p>
          )}
        </div>
      )}
    </div>
  </div>
)}
    </div>
  )
}

export default SearchPage

