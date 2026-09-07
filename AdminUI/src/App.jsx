import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import GuestRoute from './components/GuestRoute'
import { useEffect } from 'react'
import './App.css'

function App() {
  return (
    <Router basename="/">
      <ScrollToTop />
      <Routes>
        <Route path="/admin/login" element={<GuestRoute><AdminLogin /></GuestRoute>} />
        <Route 
          path="/admin" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        {/* Redirect root and fallback routes to /admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  )
}

export default App
