import { Link, useLocation } from 'react-router-dom'

function Navigation() {
  const location = useLocation()

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px 40px',
      backgroundColor: '#1a1f2e',
      borderBottom: '1px solid #2d3441',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', gap: '15px' }}>
        <Link
          to="/"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/' ? '#252b3d' : 'transparent',
            border: location.pathname === '/' ? '1px solid #ff8c00' : '1px solid transparent',
            color: location.pathname === '/' ? '#ff8c00' : '#9ca3af',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: location.pathname === '/' ? 'bold' : 'normal',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== '/') {
              e.target.style.backgroundColor = '#252b3d'
              e.target.style.color = '#e0e0e0'
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== '/') {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.color = '#9ca3af'
            }
          }}
        >
          Home
        </Link>
        <Link
          to="/leaderboard"
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: location.pathname === '/leaderboard' ? '#252b3d' : 'transparent',
            border: location.pathname === '/leaderboard' ? '1px solid #ff8c00' : '1px solid transparent',
            color: location.pathname === '/leaderboard' ? '#ff8c00' : '#9ca3af',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: location.pathname === '/leaderboard' ? 'bold' : 'normal',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== '/leaderboard') {
              e.target.style.backgroundColor = '#252b3d'
              e.target.style.color = '#e0e0e0'
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== '/leaderboard') {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.color = '#9ca3af'
            }
          }}
        >
          Leaderboard
        </Link>
      </div>
    </nav>
  )
}

export default Navigation

