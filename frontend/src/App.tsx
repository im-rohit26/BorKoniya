import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CallProvider } from './context/CallContext'
import { CallNotification } from './components/calling/CallNotification'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LanguageSelectorModal } from './components/common/LanguageSelectorModal'
import { ScreenCaptureProtection } from './components/security/ScreenCaptureProtection'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { MobileBottomNav } from './components/common/MobileBottomNav'

// Route Code-Splitting: Lazy load each page on demand
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const MatchesPage = lazy(() => import('./pages/MatchesPage').then((m) => ({ default: m.MatchesPage })))
const ProfileDetailPage = lazy(() => import('./pages/ProfileDetailPage').then((m) => ({ default: m.ProfileDetailPage })))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ProfileWizardPage = lazy(() => import('./pages/ProfileWizardPage').then((m) => ({ default: m.ProfileWizardPage })))
const InterestsPage = lazy(() => import('./pages/InterestsPage').then((m) => ({ default: m.InterestsPage })))
const ShortlistPage = lazy(() => import('./pages/ShortlistPage').then((m) => ({ default: m.ShortlistPage })))
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-3 border-crimson-700 border-t-transparent" />
  </div>
)

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
    <ErrorBoundary>
      <BrowserRouter>
      <AuthProvider>
        <CallProvider>
        {/* Global 1-to-1 Voice & Video Call UI */}
        <CallNotification />

        {/* Global Anti-Screenshot & Download Shield */}
        <ScreenCaptureProtection />

        {/* First-visit Language Prompt */}
        <LanguageSelectorModal
          isOpen={showInitialLangModal}
          onClose={() => setShowInitialLangModal(false)}
          isInitial={true}
        />

        <Suspense fallback={<PageLoader />}>
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
        </Suspense>

        {/* Persistent App-Like Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
        </CallProvider>
      </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
