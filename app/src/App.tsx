import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/misc/ProtectedRoute'
import { useDarkMode } from './hooks/useDarkMode'
import { ListViewPage } from './pages/ListViewPage'
// import { ListView } from '.'

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  useDarkMode();

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {!isLoginPage && <Navbar />}
          <main>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard/:id" element={<ListViewPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
    </AuthProvider>
  )
}

export default App