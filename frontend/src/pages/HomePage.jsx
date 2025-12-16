import { useState } from 'react'
import axios from 'axios'

function HomePage() {
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
  const [hoveredItemId, setHoveredItemId] = useState(null)
  const [hoveredItemPosition, setHoveredItemPosition] = useState({ x: 0, y: 0 })
  const [equipmentItemsDetails, setEquipmentItemsDetails] = useState({})
  const [equipmentItemsLoading, setEquipmentItemsLoading] = useState(false)

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
    setEquipmentItemsDetails({})
    
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
      
      // Charger tous les détails d'équipement
      if (equipmentResponse.data?.equipment?.equipmentList) {
        setEquipmentItemsLoading(true)
        const equipmentList = equipmentResponse.data.equipment.equipmentList
        const detailsPromises = equipmentList.map(item => 
          axios.get('http://localhost:8000/api/equipment_item', {
            params: {
              id: item.id,
              enchantLevel: item.enchantLevel ?? 0,
              characterId: characterId,
              serverId: serverId,
              slotPos: item.slotPos,
              lang: 'en'
            }
          }).then(response => ({ id: item.id, data: response.data }))
            .catch(err => ({ id: item.id, error: err.response?.data?.error || 'Erreur' }))
        )
        
        const results = await Promise.all(detailsPromises)
        const detailsMap = {}
        results.forEach(result => {
          if (result.data) {
            detailsMap[result.id] = result.data
          }
        })
        setEquipmentItemsDetails(detailsMap)
        setEquipmentItemsLoading(false)
      }
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
    setEquipmentItemsDetails({})
    setHoveredItemId(null)
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

  const getGradeTextColor = (grade) => {
    if (grade === 'Unique') return '#ffd700' // Jaune
    if (grade === 'Legend') return '#4a90e2' // Bleu
    if (grade === 'Rare') return '#4ade80'   // Vert
    return '#e0e0e0'
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

  const handleItemHover = (item, event) => {
    setHoveredItemId(item.id)
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredItemPosition({ x: rect.right + 10, y: rect.top })
  }

  const handleItemLeave = () => {
    setHoveredItemId(null)
  }

  const renderEquipmentCard = (item) => {
    const gradeColors = getItemGradeColors(item.grade)
    const isHovered = hoveredItemId === item.id

    return (
      <div 
        key={item.id || item.name}
        onMouseEnter={(e) => handleItemHover(item, e)}
        onMouseLeave={handleItemLeave}
        style={{
          backgroundColor: isHovered ? '#2d3441' : '#252b3d',
          padding: '15px',
          borderRadius: '8px',
          border: `1px solid ${gradeColors.borderColor}`,
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'background-color 0.2s, border-color 0.2s',
          cursor: 'pointer'
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
  }

  const renderEquipmentTooltip = () => {
    if (!hoveredItemId || !equipmentItemsDetails[hoveredItemId]) return null
    
    const itemDetails = equipmentItemsDetails[hoveredItemId]
    const gradeColors = getItemGradeColors(itemDetails.grade)

    return (
      <div
        style={{
          position: 'fixed',
          left: `${hoveredItemPosition.x}px`,
          top: `${hoveredItemPosition.y}px`,
          backgroundColor: '#1a1f2e',
          borderRadius: '8px',
          border: `1px solid ${gradeColors.borderColor}`,
          padding: '15px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
          width: '420px',
          maxWidth: '420px',
          maxHeight: '80vh',
          overflow: 'auto',
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: gradeColors.nameColor, fontWeight: 'bold', fontSize: '16px' }}>{itemDetails.name}</span>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', color: '#9ca3af', fontSize: '13px' }}>
            <span>Level {itemDetails.equipLevel}</span>
            {itemDetails.enchantLevel > 0 && <span>+{itemDetails.enchantLevel}</span>}
            {itemDetails.exceedLevel > 0 && <span>★{itemDetails.exceedLevel}</span>}
            {itemDetails.raceName && <span>{itemDetails.raceName}</span>}
            {itemDetails.classNames && itemDetails.classNames.length > 0 && (
              <span>{itemDetails.classNames.join(', ')}</span>
            )}
          </div>

          {itemDetails.mainStats && itemDetails.mainStats.length > 0 && (
            <>
              <div style={{ height: '1px', backgroundColor: '#2d3441', margin: '8px 0' }}></div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>BASE STATS</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {itemDetails.mainStats.map((stat, sIdx) => {
                    const hasExtra = stat.extra && stat.extra !== '0' && stat.extra !== '0%'
                    return (
                      <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e0e0e0', fontSize: '13px' }}>
                        <span style={{ color: '#9ca3af' }}>{stat.name}</span>
                        <span>
                          {stat.value}
                          {hasExtra ? ` (+${stat.extra})` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
          </>
          )}

          {(() => {
            const additionalStats = [
              ...(itemDetails.subStats || []).map(stat => ({ type: 'stat', ...stat })),
              ...(itemDetails.subSkills || []).map(skill => ({ type: 'skill', ...skill }))
            ]
            return additionalStats.length > 0 ? (
              <>
                <div style={{ height: '1px', backgroundColor: '#2d3441', margin: '8px 0' }}></div>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>ADDITIONAL STATS</div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                  {additionalStats.map((entry, idx) => {
                    if (entry.type === 'skill') {
                      return (
                          <div key={`skill-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgb(218, 136, 14)', fontSize: '13px' }}>
                          <img src={entry.icon} alt={entry.name} style={{ width: '16px', height: '16px' }} />
                          <span>{entry.name}{entry.level ? ` (Lv.${entry.level})` : ''}</span>
                        </div>
                      )
                    }
                    return (
                        <div key={`stat-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a6e3a1', fontSize: '13px' }}>
                        <span>{entry.name}</span>
                        <span>{entry.value}</span>
                      </div>
                    )
                  })}
                </div>
                </div>
              </>
            ) : null
          })()}

          {itemDetails.magicStoneStat && itemDetails.magicStoneStat.length > 0 && (
            <>
              <div style={{ height: '1px', backgroundColor: '#2d3441', margin: '8px 0' }}></div>
            <div>
                <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>MANASTONES ({itemDetails.magicStoneStat.length}/{itemDetails.magicStoneSlotCount})</div>
                <div style={{ display: 'grid', gap: '6px' }}>
                {itemDetails.magicStoneStat.map((stone, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getGradeTextColor(stone.grade), fontSize: '13px' }}>
                    <img src={stone.icon} alt={stone.name} style={{ width: '16px', height: '16px' }} />
                    <span>{stone.name}: {stone.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
          )}

          {itemDetails.godStoneStat && itemDetails.godStoneStat.length > 0 && (
            <>
              <div style={{ height: '1px', backgroundColor: '#2d3441', margin: '8px 0' }}></div>
            <div>
                <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' }}>THEOSTONE</div>
              {itemDetails.godStoneStat.map((stone, sIdx) => (
                <div key={sIdx} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getGradeTextColor(stone.grade), fontSize: '13px', marginBottom: '4px' }}>
                    <img src={stone.icon} alt={stone.name} style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontWeight: 'bold' }}>{stone.name}</span>
                  </div>
                    <div style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.4' }}>{stone.desc}</div>
                </div>
              ))}
            </div>
          </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: 'linear-gradient(180deg, #0f1419 0%, #1a1f2e 100%)',
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
          Votre compagnon Aion 2
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
          padding: '15px 20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          <span style={{
            fontSize: '20px',
            marginRight: '15px',
            color: '#ff8c00'
          }}>🔍</span>
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Rechercher un personnage..."
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
            {loading ? 'Recherche...' : 'Rechercher'}
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
                  maxWidth: '900px',
                  border: '1px solid #2d3441', 
                  padding: '10px', 
                  marginBottom: '10px',
                  borderRadius: '6px',
                  backgroundColor: isSelected && detailsLoading ? '#252b3d' : '#1a1f2e',
                  cursor: detailsLoading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontSize: '16px',
                  transition: 'background-color 0.2s, border-color 0.2s',
                  color: '#e0e0e0'
                }}
                onMouseEnter={(e) => {
                  if (!detailsLoading) {
                    e.currentTarget.style.backgroundColor = '#252b3d'
                    e.currentTarget.style.borderColor = '#3a4252'
                    const inner = e.currentTarget.querySelector('.result-inner')
                    if (inner) {
                      inner.style.backgroundColor = '#252b3d'
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected && detailsLoading ? '#252b3d' : '#1a1f2e'
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
                    {detailsLoading && isSelected && (
                      <span style={{ color: '#ff8c00' }}>Chargement...</span>
                    )}
                  </div>
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
            className="modal-scrollable"
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
              border: '1px solid rgba(105, 152, 181, 1)',
              marginTop: '30px',
              padding: '10px 2px'
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
                                  {categories.weapons.map((item) => renderEquipmentCard(item))}
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
                                  {categories.armor.map((item) => renderEquipmentCard(item))}
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
                                  {categories.accessories.map((item) => renderEquipmentCard(item))}
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
                                  {categories.runes.map((item) => renderEquipmentCard(item))}
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
                                  {categories.arcana.map((item) => renderEquipmentCard(item))}
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
      {renderEquipmentTooltip()}
    </div>
  )
}

export default HomePage
