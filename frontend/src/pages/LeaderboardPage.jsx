function LeaderboardPage() {
  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: 'linear-gradient(180deg, #0f1419 0%, #1a1f2e 100%)',
      padding: '40px 20px',
      color: '#e0e0e0'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#ff8c00',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          Leaderboard
        </h1>
        
        <div style={{
          backgroundColor: '#1a1f2e',
          border: '1px solid #2d3441',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            opacity: 0.5
          }}>
            🏆
          </div>
          <h2 style={{
            color: '#9ca3af',
            fontSize: '24px',
            marginBottom: '10px'
          }}>
            Classement à venir
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '16px'
          }}>
            Cette fonctionnalité sera bientôt disponible
          </p>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage

