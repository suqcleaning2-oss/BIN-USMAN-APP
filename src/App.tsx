import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import AdminDashboard from './pages/AdminDashboard';
import AdminListingEditor from './pages/AdminListingEditor';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/booking/:id" element={<AuthGuard><BookingConfirmation /></AuthGuard>} />
          <Route path="/payment/status/:status" element={<AuthGuard><PaymentStatus /></AuthGuard>} />
          <Route path="/my-bookings" element={<AuthGuard><MyBookings /></AuthGuard>} />
          <Route path="/my-wishlist" element={<AuthGuard><MyWishlist /></AuthGuard>} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/listing/new" element={<AdminGuard><AdminListingEditor /></AdminGuard>} />
          <Route path="/admin/listing/edit/:id" element={<AdminGuard><AdminListingEditor /></AdminGuard>} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
