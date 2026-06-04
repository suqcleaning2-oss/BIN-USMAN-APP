import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-secondary bg-white py-12 mt-20">
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

          <div className="flex flex-wrap justify-center gap-8">
            <a 
              href="https://binusmen.wordpress.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-body/40 hover:text-primary-dark transition-all duration-300"
            >
              Privacy Policy
              <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-all -translate-y-0.5" />
            </a>
            <span className="text-[10px] font-black uppercase tracking-widest text-body/10 select-none">
              &copy; {new Date().getFullYear()} BIN USMAN
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
