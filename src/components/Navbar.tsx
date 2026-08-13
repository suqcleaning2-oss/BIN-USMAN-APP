import React, { useState, useEffect } from 'react';
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
  Mail,
  Search,
  Sun,
  Moon,
  Laptop,
  Palette,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

export default function Navbar() {
  const { user, isAdmin, profile } = useAuth();
  const { theme, themeMode, setThemeMode, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(true);
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
    navigate('/');
  };

  const handleSearchPropertiesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrawerOpen(false);
    if (location.pathname === '/') {
      const searchBox = document.querySelector('input[placeholder*="Search"]') || document.getElementById('best-hotels-apartments-heading');
      if (searchBox) {
        searchBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      navigate('/');
    }
  };

  const themeOptions: { id: ThemeMode; label: string; icon: any; desc: string }[] = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Classic gold & crisp' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Midnight luxury' },
    { id: 'system', label: 'System', icon: Laptop, desc: 'Match device' },
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

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
             {/* Fast Header Theme Toggle accessible on all screen sizes */}
             <button
               onClick={toggleTheme}
               className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl ${isDark ? 'bg-white/5 border border-white/10 text-[#D4AF37] hover:bg-white/10' : 'bg-secondary/25 border border-secondary text-heading hover:bg-secondary/40'} transition-all duration-300 active:scale-90`}
               title={`Current theme: ${themeMode === 'system' ? `System (${theme})` : themeMode}. Click to switch.`}
               aria-label="Toggle Theme"
             >
               {theme === 'dark' ? (
                 <Sun size={18} strokeWidth={2} className="text-[#D4AF37]" />
               ) : (
                 <Moon size={18} strokeWidth={2} className="text-heading" />
               )}
             </button>

             <Link 
               to="/list-property" 
               className="px-3.5 py-2.5 sm:px-5 sm:py-2.5 rounded-full bg-[#D4AF37] text-[#111111] hover:bg-neutral-900 hover:text-[#D4AF37] font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 inline-flex items-center gap-2"
               aria-label="List Your Property"
             >
               <Building size={12} strokeWidth={2.5} />
               <span className="hidden min-[520px]:inline">List Your Property</span>
             </Link>

             {user ? (
               <Link 
                 to="/settings"
                 className={`flex items-center gap-2 sm:gap-3 p-1 sm:px-4 sm:py-2 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-secondary/25 hover:bg-secondary/40 border-secondary'} rounded-full border transition-colors`}
                 aria-label="Account Settings"
               >
                 <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#111111] flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                   {profile?.fullName?.[0] || user.email?.[0]}
                 </div>
                 <div className="hidden md:flex flex-col">
                   <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-heading'}`}>{profile?.fullName || 'Guest'}</span>
                   <span className={`text-[8px] uppercase tracking-widest leading-none ${isDark ? 'text-white/60' : 'text-body/60'}`}>Account</span>
                 </div>
               </Link>
             ) : (
               <Link 
                 to="/login"
                 className={`hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border ${isDark ? 'border-zinc-800 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37]' : 'border-secondary text-heading hover:border-[#D4AF37] hover:text-[#D4AF37]'} text-[10px] font-black uppercase tracking-widest transition-all`}
               >
                 <LogIn size={12} strokeWidth={2} />
                 <span>Login</span>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            />
            
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 left-0 w-[88vw] max-w-[340px] ${isDark ? 'bg-zinc-950 text-white border-r border-zinc-900' : 'bg-white text-heading'} z-[80] shadow-[30px_0_60px_rgba(0,0,0,0.15)] flex flex-col p-6 sm:p-7 overflow-hidden`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex flex-col">
                  <span className={`text-xl font-semibold uppercase tracking-tighter ${isDark ? 'text-white' : 'text-heading'}`}>MENU</span>
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-zinc-500' : 'text-body/30'}`}>Explore Bin Usman</span>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full border ${isDark ? 'border-zinc-800 text-zinc-400 hover:text-white' : 'border-secondary text-body hover:text-primary-dark'} hover:rotate-90 transition-all duration-500`}
                  aria-label="Close Menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
                
                {/* 1. Home */}
                <Link 
                  to="/"
                  className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                    location.pathname === '/' 
                    ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                    : isDark 
                      ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                      : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    location.pathname === '/' 
                      ? 'bg-black/10 text-neutral-950' 
                      : isDark 
                        ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                        : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                  }`}>
                    <Layers size={16} strokeWidth={location.pathname === '/' ? 2.5 : 1.5} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                    Home
                  </span>
                </Link>

                {/* 2. Search / Properties */}
                <a 
                  href="#properties"
                  onClick={handleSearchPropertiesClick}
                  className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                    isDark 
                      ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                      : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isDark 
                      ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                      : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                  }`}>
                    <Search size={16} strokeWidth={1.5} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-200' : 'text-heading'}`}>
                    Search / Properties
                  </span>
                </a>

                {/* 3. List Your Property */}
                <Link 
                  to="/list-property"
                  className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                    location.pathname === '/list-property' 
                    ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                    : isDark 
                      ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                      : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    location.pathname === '/list-property' 
                      ? 'bg-black/10 text-neutral-950' 
                      : isDark 
                        ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                        : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                  }`}>
                    <Building size={16} strokeWidth={location.pathname === '/list-property' ? 2.5 : 1.5} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/list-property' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                    List Your Property
                  </span>
                </Link>

                {/* 4. Theme / Appearance (Available to ALL users) */}
                <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-[#FAF8F5] border-secondary'
                }`}>
                  <button
                    type="button"
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="w-full flex items-center justify-between p-3.5 transition-colors text-left"
                    aria-label="Theme / Appearance options"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-zinc-900 text-[#D4AF37] border border-zinc-800' : 'bg-white text-[#D4AF37] border border-secondary'
                      }`}>
                        <Palette size={16} strokeWidth={1.75} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-200' : 'text-heading'}`}>
                          Theme / Appearance
                        </span>
                        <span className="text-[8px] font-semibold text-[#D4AF37] uppercase tracking-widest">
                          {themeMode === 'system' ? `System (${theme})` : themeMode}
                        </span>
                      </div>
                    </div>
                    {isThemeMenuOpen ? (
                      <ChevronUp size={16} className={isDark ? 'text-zinc-400' : 'text-body/50'} />
                    ) : (
                      <ChevronDown size={16} className={isDark ? 'text-zinc-400' : 'text-body/50'} />
                    )}
                  </button>

                  {/* Expandable Theme Mode Selector */}
                  <AnimatePresence initial={false}>
                    {isThemeMenuOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`px-3 pb-3 pt-1 border-t ${isDark ? 'border-zinc-800/80' : 'border-secondary/60'}`}
                      >
                        <div className="grid grid-cols-3 gap-1.5">
                          {themeOptions.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = themeMode === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setThemeMode(opt.id)}
                                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-300 text-center ${
                                  isSelected
                                    ? 'bg-[#D4AF37] text-neutral-950 font-bold shadow-md shadow-[#D4AF37]/20 scale-[1.02]'
                                    : isDark
                                      ? 'bg-zinc-900/90 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                                      : 'bg-white text-body/80 hover:bg-secondary/30 hover:text-heading border border-secondary'
                                }`}
                              >
                                <Icon size={15} strokeWidth={isSelected ? 2.5 : 1.75} className="mb-1" />
                                <span className="text-[9px] font-black uppercase tracking-wider block leading-tight">
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider */}
                <div className={`h-px my-2 ${isDark ? 'bg-zinc-800/80' : 'bg-secondary/60'}`} />

                {/* 5. User Account / Auth Section */}
                {user ? (
                  <>
                    <Link 
                      to="/settings"
                      className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                        location.pathname === '/settings' 
                        ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                        : isDark 
                          ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                          : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        location.pathname === '/settings' 
                          ? 'bg-black/10 text-neutral-950' 
                          : isDark 
                            ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                            : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                      }`}>
                        <User size={16} strokeWidth={location.pathname === '/settings' ? 2.5 : 1.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/settings' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                          Profile / Account
                        </span>
                        <span className={`text-[8px] uppercase tracking-widest ${location.pathname === '/settings' ? 'text-black/70' : 'text-body/50'}`}>
                          {profile?.fullName || user.email}
                        </span>
                      </div>
                    </Link>

                    <Link 
                      to="/my-wishlist"
                      className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                        location.pathname === '/my-wishlist' 
                        ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                        : isDark 
                          ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                          : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        location.pathname === '/my-wishlist' 
                          ? 'bg-black/10 text-neutral-950' 
                          : isDark 
                            ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                            : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                      }`}>
                        <Heart size={16} strokeWidth={location.pathname === '/my-wishlist' ? 2.5 : 1.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/my-wishlist' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                        My Wishlist
                      </span>
                    </Link>

                    <Link 
                      to="/my-bookings"
                      className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                        location.pathname === '/my-bookings' 
                        ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                        : isDark 
                          ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                          : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        location.pathname === '/my-bookings' 
                          ? 'bg-black/10 text-neutral-950' 
                          : isDark 
                            ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                            : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                      }`}>
                        <Calendar size={16} strokeWidth={location.pathname === '/my-bookings' ? 2.5 : 1.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/my-bookings' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                        My Bookings
                      </span>
                    </Link>

                    {isAdmin && (
                      <Link 
                        to="/admin"
                        className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                          location.pathname.startsWith('/admin') 
                          ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                          : isDark 
                            ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                            : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          location.pathname.startsWith('/admin') 
                            ? 'bg-black/10 text-neutral-950' 
                            : isDark 
                              ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                              : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                        }`}>
                          <LayoutDashboard size={16} strokeWidth={location.pathname.startsWith('/admin') ? 2.5 : 1.5} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname.startsWith('/admin') ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                          Admin Area
                        </span>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link 
                      to="/login"
                      className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                        location.pathname === '/login' 
                        ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                        : isDark 
                          ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                          : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        location.pathname === '/login' 
                          ? 'bg-black/10 text-neutral-950' 
                          : isDark 
                            ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                            : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                      }`}>
                        <LogIn size={16} strokeWidth={location.pathname === '/login' ? 2.5 : 1.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/login' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                        Login
                      </span>
                    </Link>

                    <Link 
                      to="/register"
                      className={`group flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 ${
                        location.pathname === '/register' 
                        ? 'bg-[#D4AF37] text-neutral-950 shadow-lg shadow-[#D4AF37]/20 font-bold' 
                        : isDark 
                          ? 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700'
                          : 'bg-background/40 text-body hover:bg-background border border-secondary/40 hover:border-secondary'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        location.pathname === '/register' 
                          ? 'bg-black/10 text-neutral-950' 
                          : isDark 
                            ? 'bg-zinc-900 group-hover:bg-[#D4AF37] group-hover:text-black border border-zinc-800' 
                            : 'bg-white group-hover:bg-[#D4AF37] group-hover:text-black border border-secondary'
                      }`}>
                        <UserPlus size={16} strokeWidth={location.pathname === '/register' ? 2.5 : 1.5} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${location.pathname === '/register' ? 'text-neutral-950' : isDark ? 'text-zinc-200' : 'text-heading'}`}>
                        Sign Up
                      </span>
                    </Link>
                  </>
                )}

                {/* Divider */}
                <div className={`h-px my-2 ${isDark ? 'bg-zinc-800/80' : 'bg-secondary/60'}`} />

                {/* 6. Public Informational Pages */}
                {[
                  { name: 'About Us', path: '/about-us', icon: Compass },
                  { name: 'Privacy Policy', path: '/privacy-policy', icon: Shield },
                  { name: 'Terms & Conditions', path: '/terms-conditions', icon: Scale },
                  { name: 'Contact Us', path: '/contact-us', icon: Mail }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-300 ${
                        isActive 
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold shadow-md' 
                        : isDark 
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-900/50' 
                          : 'text-body/70 hover:text-heading hover:bg-background/40'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isActive 
                          ? 'bg-black/10 text-neutral-950' 
                          : isDark 
                            ? 'bg-zinc-900/80 border border-zinc-800/60' 
                            : 'bg-white border border-secondary/60'
                      }`}>
                        <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Logout Button (if user logged in) */}
              {user && (
                <div className={`pt-4 border-t ${isDark ? 'border-zinc-850' : 'border-secondary'} shrink-0 mt-auto`}>
                  <button 
                    onClick={handleLogout}
                    className={`w-full group flex items-center gap-3.5 p-3.5 rounded-2xl ${isDark ? 'bg-red-950/20 text-red-400 hover:bg-red-900 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'} transition-all duration-500`}
                  >
                    <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center border ${isDark ? 'border-red-950 bg-zinc-900 text-red-400' : 'border-red-100 text-red-500'} group-hover:border-red-400 group-hover:bg-red-400 group-hover:text-white transition-all`}>
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

