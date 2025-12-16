import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import LeaderboardPage from './pages/LeaderboardPage'

function App() {
  return (
    <Router>
      <div style={{ 
        height: '100vh',
        overflow: 'hidden',
        background: `
          linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%),
          linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 50px 50px, 50px 50px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Navigation />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </div>
              </div>
    </Router>
  )
}

export default App
