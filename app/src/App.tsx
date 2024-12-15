import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SyncProvider } from './contexts/SyncContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/misc/ProtectedRoute'
import { useDarkMode } from './hooks/useDarkMode'
import { ListViewPage } from './pages/ListViewPage'
import { Toaster } from './components/ui/toaster'
import { DBProvider } from './contexts/DBContext'
import { RegisterPage } from './pages/RegisterPage'
    
function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/register' || location.pathname === '/login';
  useDarkMode();

  return (
    <DBProvider>
      <AuthProvider>
        <SyncProvider>
          <div className="min-h-screen bg-gray-50">
            {!isAuthPage && <Navbar />}
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
              <Route path="/dashboard/list/:id" element={<ListViewPage />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
            <Toaster />
          </div>
        </SyncProvider>
      </AuthProvider>
    </DBProvider>
  )
}

export default App
