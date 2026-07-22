import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-secondary dark:border-zinc-800 bg-white dark:bg-[#07090E] py-12 mt-20 transition-all duration-500">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg font-semibold tracking-tighter text-heading uppercase">
              Bin <span className="text-primary-dark italic font-normal">Usman</span>
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-body/30">
              Best stays in Pakistan
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-8 items-center text-center">
            <Link 
              to="/about-us" 
              className="text-[10px] font-black uppercase tracking-widest text-body/40 hover:text-primary-dark transition-all duration-300"
            >
              About Us
            </Link>
            <Link 
              to="/contact-us" 
              className="text-[10px] font-black uppercase tracking-widest text-body/40 hover:text-primary-dark transition-all duration-300"
            >
              Contact Us
            </Link>
            <Link 
              to="/privacy-policy" 
              className="text-[10px] font-black uppercase tracking-widest text-body/40 hover:text-primary-dark transition-all duration-300"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms-conditions" 
              className="text-[10px] font-black uppercase tracking-widest text-body/40 hover:text-primary-dark transition-all duration-300"
            >
              Terms & Conditions
            </Link>
            <span className="text-[10px] font-black uppercase tracking-widest text-body/10 select-none">
              &copy; {new Date().getFullYear()} BIN USMAN
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
