import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import NewRegistration from './pages/NewRegistration'
import InstructionsPage from './pages/InstructionsPage'
import OtpVerification from './pages/OtpVerification'
import RegistrationPage from './pages/RegistrationPage'
import CorrectionPage from './pages/CorrectionPage'
import ApplicationDashboard from './pages/ApplicationDashboard'
import ForgotPassword from './pages/ForgotPassword'
import VerifyApplication from './pages/VerifyApplication'
import VerifyAdmitCard from './pages/VerifyAdmitCard'
import AdmitCard from './pages/AdmitCard'
import ProtectedRoute from './components/ProtectedRoute'
import GuestRoute from './components/GuestRoute'
import Maintenance from './pages/Maintenance'
import { useEffect } from 'react'
import './App.css'

function App() {
  return (
    <Router basename="/">
      <ScrollToTop />
      <Routes>
        {/* <Route path="/under-maintenance" element={<Maintenance />} /> */}
        <Route path="/" element={<GuestRoute><Home /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><InstructionsPage /></GuestRoute>} />
        <Route path="/verify" element={<VerifyApplication />} />
        <Route path="/verify/:registrationNo" element={<VerifyApplication />} />
        <Route path="/applicant-review" element={<VerifyApplication />} />
        <Route path="/applicant-review/:registrationNo" element={<VerifyApplication />} />

        {/* Admit Card QR Verification (Direct URL scan only - no navigation buttons) */}
        <Route path="/verify-admit-card" element={<VerifyAdmitCard />} />
        <Route path="/verify-admit-card/:registrationNo" element={<VerifyAdmitCard />} />
        <Route path="/verify-admitcard" element={<VerifyAdmitCard />} />
        <Route path="/verify-admitcard/:registrationNo" element={<VerifyAdmitCard />} />
        <Route path="/admit-card-verification" element={<VerifyAdmitCard />} />
        <Route path="/admit-card-verification/:registrationNo" element={<VerifyAdmitCard />} />
        <Route path="/admit-card/verify" element={<VerifyAdmitCard />} />
        <Route path="/admit-card/verify/:registrationNo" element={<VerifyAdmitCard />} />
        <Route path="/admitcard/verify" element={<VerifyAdmitCard />} />
        <Route path="/admitcard/verify/:registrationNo" element={<VerifyAdmitCard />} />

        <Route path="/new-registration" element={<GuestRoute><NewRegistration /></GuestRoute>} />
        <Route path="/verify-otp" element={<GuestRoute><OtpVerification /></GuestRoute>} />
        <Route 
          path="/application" 
          element={
            <ProtectedRoute>
              <ApplicationDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/registration-form" 
          element={
            <ProtectedRoute>
              <RegistrationPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/correction" 
          element={
            <ProtectedRoute>
              <CorrectionPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/admit-card" element={<AdmitCard />} />
        <Route path="/download-admit-card" element={<AdmitCard />} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      </Routes>
    </Router>
  )
}

export default App
