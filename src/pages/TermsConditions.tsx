import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAppContent, AppContentDoc } from '../services/appContentService';
import { ArrowLeft, Scale, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function TermsConditions() {
  const [data, setData] = useState<AppContentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const content = await fetchAppContent('terms_conditions');
      setData(content);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const parseContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-4" />;
      
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg sm:text-xl font-semibold tracking-tight text-heading mt-8 mb-4 first:mt-0 uppercase">
            {trimmed.slice(4)}
          </h3>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl sm:text-2xl font-semibold tracking-tight text-heading mt-10 mb-4 first:mt-0 uppercase">
            {trimmed.slice(3)}
          </h2>
        );
      }
      if (trimmed.startsWith('- **')) {
        const match = trimmed.match(/^- \*\*(.*?)\*\*:\s*(.*)/);
        if (match) {
          return (
            <div key={idx} className="flex gap-3 text-sm text-body/70 ml-4 mb-3 leading-relaxed">
              <span className="text-primary-dark select-none font-bold mt-0.5">•</span>
              <p>
                <strong className="text-heading font-semibold">{match[1]}: </strong>
                {match[2]}
              </p>
            </div>
          );
        }
      }
      if (trimmed.startsWith('- ')) {
        return (
          <div key={idx} className="flex gap-3 text-sm text-body/70 ml-4 mb-3 leading-relaxed">
            <span className="text-primary-dark select-none font-bold mt-0.5">•</span>
            <p>{trimmed.slice(2)}</p>
          </div>
        );
      }
      return (
        <p key={idx} className="text-sm text-body/70 leading-relaxed mb-4">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="flex items-center justify-between z-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-secondary text-[10px] font-black uppercase tracking-[0.2em] text-heading hover:bg-neutral-50 hover:text-primary-dark transition-all duration-300 shadow-sm active:scale-95 cursor-pointer group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-secondary pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary-dark text-[9px] font-black uppercase tracking-widest">
            <Scale size={10} />
            <span>Legal Center</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading leading-none">
            Terms & <span className="text-primary-dark italic font-normal">Conditions</span>
          </h1>
          {data && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-body/30 max-w-xs">
              Version {data.version} • Updated {data.lastUpdated}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-body/30 animate-pulse">
            Loading terms...
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-secondary p-8 space-y-4">
          <p className="text-sm text-body/60">Failed to load the terms and conditions.</p>
          <button 
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary text-xs font-bold text-heading hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-[2.5rem] border border-secondary shadow-[0_20px_50px_rgba(0,0,0,0.02)] p-8 sm:p-12 space-y-2"
        >
          {data && parseContent(data.content)}
        </motion.div>
      )}
    </div>
  );
}
