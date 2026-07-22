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
  Heart,
  Building,
  Compass,
  Shield,
  Scale,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
  const { user, isAdmin, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    { name: 'List Your Property', path: '/list-property', icon: Building },
    ...(user ? [
      { name: 'My Wishlist', path: '/my-wishlist', icon: Heart },
      { name: 'My Bookings', path: '/my-bookings', icon: Calendar },
      { name: 'Account Settings', path: '/settings', icon: User },
      ...(isAdmin ? [{ name: 'Admin Area', path: '/admin', icon: LayoutDashboard }] : [])
    ] : [
      { name: 'Login', path: '/login', icon: LogIn },
      { name: 'Sign Up', path: '/register', icon: UserPlus },
    ]),
    { name: 'About Us', path: '/about-us', icon: Compass },
    { name: 'Privacy Policy', path: '/privacy-policy', icon: Shield },
    { name: 'Terms & Conditions', path: '/terms-conditions', icon: Scale },
    { name: 'Contact Us', path: '/contact-us', icon: Mail }
  ];

  return (
    <>
      <nav className={`border-b ${isDark ? 'border-zinc-800 bg-[#07090E]' : 'border-secondary bg-white'} sticky top-0 z-[60] transition-all duration-500 shadow-sm backdrop-blur-md`}>
        <div className="container mx-auto px-4 sm:px-6 h-24 flex items-center">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl ${isDark ? 'bg-white/5 border border-white/10 text-white hover:bg-[#D4AF37] hover:text-[#111111] hover:border-[#D4AF37]' : 'bg-secondary/25 border border-secondary text-heading hover:bg-[#D4AF37] hover:text-[#111111] hover:border-[#D4AF37]'} transition-all duration-500 active:scale-90 cursor-pointer shadow-inner shrink-0`}
            aria-label="Open Menu"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>

          <Link to="/" className="flex items-center gap-2 sm:gap-3.5 group select-none ml-2 sm:ml-4">
            {/* Pure, Streamlined Floating Circular Logo Emblem */}
            <div className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] rounded-full overflow-hidden shrink-0 flex items-center justify-center transition-all duration-700 group-hover:scale-110 active:scale-95 shadow-md bg-transparent relative">
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
                textShadow: isDark ? '0px 1.5px 3px rgba(0, 0, 0, 0.6), 0px 0px 1px rgba(255, 255, 255, 0.2)' : 'none',
                letterSpacing: '0.04em'
              }}
              className={`text-lg sm:text-2xl md:text-3xl font-extrabold uppercase leading-none flex items-center bg-gradient-to-b ${isDark ? 'from-[#FFFDF0] via-[#D4AF37] to-[#95731C]' : 'from-[#1a1a1a] via-[#D4AF37] to-[#111111]'} bg-clip-text text-transparent group-hover:text-[#D4AF37] transition-all duration-500`}
            >
              BIN&nbsp;USMAN
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
             <Link 
               to="/list-property" 
               className="px-3.5 py-2.5 sm:px-6 sm:py-2.5 rounded-full bg-[#D4AF37] text-[#111111] hover:bg-neutral-900 hover:text-[#D4AF37] font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 inline-flex items-center gap-2"
               aria-label="List Your Property"
             >
               <Building size={12} strokeWidth={2.5} />
               <span className="hidden min-[480px]:inline">List Your Property</span>
             </Link>
             {user && (
               <Link 
                 to="/settings"
                 className={`flex items-center gap-2 sm:gap-3 p-1 sm:px-4 sm:py-2 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-secondary/25 hover:bg-secondary/40 border-secondary'} rounded-full border transition-colors`}
                 aria-label="Account Settings"
               >
                 <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#111111] flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                   {profile?.fullName?.[0] || user.email?.[0]}
                 </div>
                 <div className="hidden sm:flex flex-col">
                   <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-heading'}`}>{profile?.fullName || 'Guest'}</span>
                   <span className={`text-[8px] uppercase tracking-widest leading-none ${isDark ? 'text-white/60' : 'text-body/60'}`}>Account Settings</span>
                 </div>
               </Link>
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
              className={`fixed inset-y-0 left-0 w-[85vw] max-w-[320px] ${isDark ? 'bg-zinc-950 text-white border-r border-zinc-900' : 'bg-white text-heading'} z-[80] shadow-[30px_0_60px_rgba(0,0,0,0.1)] flex flex-col p-6 sm:p-8`}
            >
              <div className="flex items-center justify-between mb-8 sm:mb-12">
                <div className="flex flex-col">
                  <span className={`text-xl font-semibold uppercase tracking-tighter ${isDark ? 'text-white' : 'text-heading'}`}>MENU</span>
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-zinc-500' : 'text-body/30'}`}>Explore</span>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full border ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-white' : 'border-secondary text-body hover:text-primary-dark'} hover:rotate-90 transition-all duration-500`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2.5 sm:space-y-3.5 flex-1 overflow-y-auto pr-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <Link 
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl transition-all duration-500 ${
                        isActive 
                        ? 'bg-primary-dark text-white shadow-xl shadow-primary/20' 
                        : isDark 
                          ? 'bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/0 hover:border-zinc-800'
                          : 'bg-background/30 text-body hover:bg-background border border-secondary/0 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isActive 
                          ? 'bg-white/20' 
                          : isDark 
                            ? 'bg-zinc-900 group-hover:bg-primary-dark group-hover:text-white border border-zinc-800' 
                            : 'bg-white group-hover:bg-primary-dark group-hover:text-white border border-secondary'
                      }`}>
                        <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-white' : isDark ? 'text-zinc-300 group-hover:text-white' : 'text-heading'}`}>
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
                <div className={`pt-4 sm:pt-6 border-t ${isDark ? 'border-zinc-850' : 'border-secondary'} mt-auto`}>
                  <button 
                    onClick={handleLogout}
                    className={`w-full group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl ${isDark ? 'bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'} transition-all duration-500`}
                  >
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white flex items-center justify-center border ${isDark ? 'border-red-950 bg-zinc-900 text-red-400' : 'border-red-100 text-red-500'} group-hover:border-red-400 group-hover:bg-red-400 group-hover:text-white transition-all`}>
                      <LogOut size={16} strokeWidth={1.5} />
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
