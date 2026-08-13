import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ListingDetail from './pages/ListingDetail';
import BookingConfirmation from './pages/BookingConfirmation';
import MyBookings from './pages/MyBookings';
import PaymentStatus from './pages/PaymentStatus';
import MyWishlist from './pages/MyWishlist';
import AccountSettings from './pages/AccountSettings';
import AdminDashboard from './pages/AdminDashboard';
import AdminListingEditor from './pages/AdminListingEditor';
import ListProperty from './pages/ListProperty';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import NavigationStateRestorer from './components/NavigationStateRestorer';
import SplashScreen from './components/SplashScreen';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-[60vh] w-full flex items-center justify-center">Loading...</div>;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname, search: location.search, bookingState: location.state }} replace />;
  }
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-[60vh] w-full flex items-center justify-center">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col w-full overflow-y-auto -webkit-overflow-scrolling-touch touch-auto">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/booking/:id" element={<AuthGuard><BookingConfirmation /></AuthGuard>} />
          <Route path="/payment/status/:status" element={<AuthGuard><PaymentStatus /></AuthGuard>} />
          <Route path="/my-bookings" element={<AuthGuard><MyBookings /></AuthGuard>} />
          <Route path="/my-wishlist" element={<AuthGuard><MyWishlist /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><AccountSettings /></AuthGuard>} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/listing/new" element={<AdminGuard><AdminListingEditor /></AdminGuard>} />
          <Route path="/admin/listing/edit/:id" element={<AdminGuard><AdminListingEditor /></AdminGuard>} />
          <Route path="/list-property" element={<ListProperty />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [timerFinished, setTimerFinished] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimerFinished(true);
    }, 2000); // 2s brand splash display
    return () => clearTimeout(timer);
  }, []);

  // Safety fallback so splash screen never gets stuck indefinitely
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (timerFinished && !authLoading) {
      setShowSplash(false);
      // Only redirect if a logged-in user explicitly lands on /login or /register
      if (user && (location.pathname === '/login' || location.pathname === '/register')) {
        const destination = location.state?.from || '/';
        const bookingState = location.state?.bookingState;
        navigate(destination, { state: bookingState, replace: true });
      }
    }
  }, [timerFinished, authLoading, user, navigate, location.pathname, location.state]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return <AppRoutes />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <NavigationStateRestorer />
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}
