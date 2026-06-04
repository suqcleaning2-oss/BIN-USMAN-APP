import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className = "" }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onRefresh();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh data');
    } finally {
      // Small timeout to show the rotation
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={`
        w-10 h-10 rounded-full bg-primary-dark text-white shadow-lg 
        flex items-center justify-center transition-all active:scale-95
        disabled:opacity-70 disabled:cursor-not-allowed
        hover:shadow-xl hover:bg-primary z-40
        ${className}
      `}
      title="Refresh data"
      id="refresh-button"
    >
      <RefreshCw 
        size={20} 
        className={`${loading ? 'animate-spin' : 'hover:rotate-180'} transition-transform duration-500`} 
      />
    </button>
  );
}
