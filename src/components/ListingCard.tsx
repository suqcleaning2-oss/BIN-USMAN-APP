import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getWishlistStatus, addToWishlist, removeFromWishlist } from '../services/wishlistService';
import { toast } from 'sonner';
import OptimizedImage from './OptimizedImage';
import { formatCityName } from '../lib/city-utils';

interface ListingProps {
  id: string;
  title: string;
  price: number;
  location: string;
  locationName?: string;
  city: string;
  images: string[];
}

export default function ListingCard({ id, title, price, location, locationName, city, images }: ListingProps) {
  const { user } = useAuth();
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const displayCity = formatCityName(city || location);

  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        const storedId = await getWishlistStatus(user.uid, id);
        setWishlistId(storedId);
      }
    };
    checkStatus();
  }, [user, id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to save this apartment.');
      return;
    }

    setIsToggling(true);
    try {
      if (wishlistId) {
        await removeFromWishlist(wishlistId);
        setWishlistId(null);
      } else {
        const newId = await addToWishlist(user.uid, id);
        setWishlistId(newId);
      }
    } catch (error) {
      console.error("Wishlist toggle error:", error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="overflow-hidden group cursor-pointer border border-[#E5E5E5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0 rounded-[2.5rem] shadow-subtle hover:shadow-xl transition-all duration-700 font-sans"
    >
      <Link to={`/listing/${id}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[2.5rem]">
          <OptimizedImage 
            src={(images && images.length > 0) ? images[0] : 'https://picsum.photos/seed/house/800/600'} 
            alt={title}
            widthSize={500}
            qualitySize={70}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="absolute top-6 right-6">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={toggleWishlist}
              disabled={isToggling}
              className={`w-12 h-12 rounded-[1.25rem] backdrop-blur-xl border flex items-center justify-center transition-all duration-500 ${
                wishlistId 
                ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                : 'bg-white/40 border-white/20 text-white hover:bg-white/60 hover:text-heading'
              }`}
            >
              <Heart 
                size={22} 
                strokeWidth={1.5} 
                fill={wishlistId ? "currentColor" : "none"} 
                className={isToggling ? "animate-pulse" : ""}
              />
            </motion.button>
          </div>

          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-[10px] font-black text-heading shadow-xl uppercase tracking-widest border border-secondary/50">
            Rs. {price.toLocaleString()}
          </div>
        </div>

        <div className="p-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary-dark opacity-60">{displayCity}</span>
            <div className="flex items-center gap-2">
              <MapPin size={12} strokeWidth={1} className="text-secondary" />
              <span className="text-[9px] font-black text-body/40 uppercase tracking-widest">{location}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-heading group-hover:text-primary-dark transition-colors line-clamp-1 uppercase tracking-tight">{title}</h3>
            </div>
            {locationName && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-dark/60 italic">{locationName}</p>
            )}
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-body/20">Verified Property</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
