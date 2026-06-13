import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
// @ts-ignore
import brandLogo from '../assets/images/luxury_brand_logo_1781392420468.jpg';
import { 
  LogOut, 
  User, 
  LayoutDashboard, 
  Home as HomeIcon, 
  Menu, 
  X, 
  Calendar,
  Layers,
  LogIn,
  UserPlus,
  ArrowRight,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { user, isAdmin, profile } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isDrawerOpen]);

  const handleLogout = async () => {
    await auth.signOut();
    setIsDrawerOpen(false);
    navigate('/login');
  };

  const menuItems = [
    { name: 'Home', path: '/', icon: Layers },
    ...(user ? [
      { name: 'My Wishlist', path: '/my-wishlist', icon: Heart },
      { name: 'My Bookings', path: '/my-bookings', icon: Calendar },
      ...(isAdmin ? [{ name: 'Admin Area', path: '/admin', icon: LayoutDashboard }] : [])
    ] : [
      { name: 'Login', path: '/login', icon: LogIn },
      { name: 'Sign Up', path: '/register', icon: UserPlus },
    ])
  ];

  return (
    <>
      <nav className="border-b border-[#0D366D] bg-[#0B2A5B] sticky top-0 z-[60] transition-all duration-500 shadow-xl backdrop-blur-md">
        <div className="container mx-auto px-6 h-24 flex items-center">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-[#D4AF37] hover:text-[#111111] hover:border-[#D4AF37] transition-all duration-500 active:scale-90 cursor-pointer shadow-inner shrink-0"
            aria-label="Open Menu"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>

          {/* Luxury Diagonal Slash Separator */}
          <span className="text-white/20 text-3xl font-extralight select-none mx-4 leading-none select-none transition-colors duration-500 hover:text-[#D4AF37]/45">/</span>

          <Link to="/" className="flex items-center gap-3.5 group select-none">
            {/* Pure, Streamlined Floating Circular Logo Emblem */}
            <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0 flex items-center justify-center transition-all duration-700 group-hover:scale-110 active:scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.5)] bg-transparent relative">
              <img 
                src={brandLogo} 
                alt="Bin Usman Logo" 
                className="w-full h-full object-cover select-none scale-[1.42] transition-transform duration-700 group-hover:scale-[1.50]"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Premium Gold Embossed Serif Brand Text */}
            <span 
              style={{
                fontFamily: '"Cinzel", "Playfair Display", Georgia, serif',
                textShadow: '0px 1.5px 3px rgba(0, 0, 0, 0.6), 0px 0px 1px rgba(255, 255, 255, 0.2)',
                letterSpacing: '0.04em'
              }}
              className="text-2xl md:text-3xl font-extrabold uppercase leading-none flex items-center bg-gradient-to-b from-[#FFFDF0] via-[#D4AF37] to-[#95731C] bg-clip-text text-transparent group-hover:from-white group-hover:to-[#D4AF37] transition-all duration-500"
            >
              BIN&nbsp;USMAN
            </span>
          </Link>

          <div className="ml-auto hidden md:flex items-center gap-4">
             {user && (
               <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full border border-white/10">
                 <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#111111] flex items-center justify-center text-[10px] font-black uppercase">
                   {profile?.fullName?.[0] || user.email?.[0]}
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">{profile?.fullName || 'Guest'}</span>
                   <span className="text-[8px] text-white/60 uppercase tracking-widest leading-none">User Account</span>
                 </div>
               </div>
             )}
          </div>
        </div>
      </nav>

      {/* Side Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-full max-w-[320px] bg-white z-[80] shadow-[30px_0_60px_rgba(0,0,0,0.1)] flex flex-col p-8"
            >
              <div className="flex items-center justify-between mb-16">
                <div className="flex flex-col">
                  <span className="text-xl font-semibold text-heading uppercase tracking-tighter">MENU</span>
                  <span className="text-[10px] font-black text-body/30 uppercase tracking-[0.3em]">Explore</span>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-secondary text-body hover:text-primary-dark hover:rotate-90 transition-all duration-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link 
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-4 p-5 rounded-[1.5rem] transition-all duration-500 ${
                        isActive 
                        ? 'bg-primary-dark text-white shadow-xl shadow-primary/20' 
                        : 'bg-background/30 text-body hover:bg-background border border-secondary/0 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isActive ? 'bg-white/20' : 'bg-white group-hover:bg-primary-dark group-hover:text-white border border-secondary'
                      }`}>
                        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-white' : 'text-heading'}`}>
                        {item.name}
                      </span>
                      {isActive && (
                        <motion.div 
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>

              {user && (
                <div className="pt-8 border-t border-secondary mt-auto">
                  <button 
                    onClick={handleLogout}
                    className="w-full group flex items-center gap-4 p-5 rounded-[1.5rem] bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all duration-500"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-red-100 group-hover:border-red-400 group-hover:bg-red-400 text-red-500 group-hover:text-white transition-all">
                      <LogOut size={18} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Logout</span>
                    <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
