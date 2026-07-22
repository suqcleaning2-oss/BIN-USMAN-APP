import React from 'react';
import { motion } from 'motion/react';
// @ts-ignore
import brandLogo from '../assets/images/luxury_brand_logo_1781392420468.jpg';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#07090E] flex flex-col items-center justify-center z-[100] overflow-hidden select-none">
      {/* Decorative Gold & Dark Glow Gradients for high-end store aesthetics */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#D4AF37]/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#D4AF37]/5 blur-[120px]" />

      <div className="flex flex-col items-center max-w-sm px-6 text-center z-10 space-y-6">
        {/* Floating circular logo with gold gradient outline */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1], // Elegant custom cubic-bezier
          }}
          className="relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full p-[3px] bg-gradient-to-b from-[#FFFDF0] via-[#D4AF37] to-[#95731C] shadow-[0_15px_40px_rgba(212,175,55,0.15)]"
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center">
            <img 
              src={brandLogo} 
              alt="Bin Usman Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* Brand Title and Tagline with staggered animations */}
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              textShadow: '0px 2px 4px rgba(0, 0, 0, 0.8), 0px 0px 1px rgba(255, 255, 255, 0.1)',
              letterSpacing: '0.15em'
            }}
            className="text-3xl sm:text-4xl font-extrabold uppercase leading-none bg-gradient-to-b from-[#FFFDF0] via-[#D4AF37] to-[#95731C] bg-clip-text text-transparent font-serif"
          >
            BIN USMAN
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-white/60 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em]"
          >
            Find the Best Hotels & Apartments
          </motion.p>
        </div>

        {/* Sleek Golden Linear loading/progress bar */}
        <div className="pt-6 w-40 sm:w-48">
          <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.3, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFFDF0]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
