import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SearchPage } from './pages/SearchPage'
import { MatchesPage } from './pages/MatchesPage'
import { ProfileDetailPage } from './pages/ProfileDetailPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfileWizardPage } from './pages/ProfileWizardPage'
import { InterestsPage } from './pages/InterestsPage'
import { ShortlistPage } from './pages/ShortlistPage'
import { ChatPage } from './pages/ChatPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { LanguageSelectorModal } from './components/common/LanguageSelectorModal'
import { ScreenCaptureProtection } from './components/security/ScreenCaptureProtection'
import { MobileBottomNav } from './components/common/MobileBottomNav'

export default function App() {
  const [showInitialLangModal, setShowInitialLangModal] = useState(false)

  useEffect(() => {
    // Show first-screen language selection if not previously chosen
    const hasChosenLang = localStorage.getItem('borkonya_lang_selected')
    if (!hasChosenLang) {
      setShowInitialLangModal(true)
    }
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Global Anti-Screenshot & Download Shield */}
        <ScreenCaptureProtection />

        {/* First-visit Language Prompt */}
        <LanguageSelectorModal
          isOpen={showInitialLangModal}
          onClose={() => setShowInitialLangModal(false)}
          isInitial={true}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/profile/:id" element={<ProfileDetailPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/success-stories" element={<LandingPage />} />
          <Route path="/help" element={<LandingPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/create"
            element={
              <ProtectedRoute>
                <ProfileWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <ProfileWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/privacy"
            element={
              <ProtectedRoute>
                <ProfileWizardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interests"
            element={
              <ProtectedRoute>
                <InterestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shortlist"
            element={
              <ProtectedRoute>
                <ShortlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shortlisted"
            element={
              <ProtectedRoute>
                <ShortlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {/* Persistent App-Like Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </AuthProvider>
    </BrowserRouter>
  )
}
