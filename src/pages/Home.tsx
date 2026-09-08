import React, { useState, useEffect } from 'react';
import ListingCard from '../components/ListingCard';
import { Search, Loader2, MapPin, Building2, ChevronDown } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { RefreshButton } from '../components/RefreshButton';
import { usePersistentState, useScrollRestoration } from '../lib/lifecycle-utils';
import { useTheme } from '../contexts/ThemeContext';
import { getUniqueCitiesFromListings, doesListingMatchCity, areCitiesEqual } from '../lib/city-utils';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  locationName?: string;
  city: string;
  images: string[];
}

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = usePersistentState('binusman_home_selected_city', 'All');
  const [searchTerm, setSearchTerm] = usePersistentState('binusman_home_search_term', '');
  const [sortBy, setSortBy] = usePersistentState('binusman_home_sort_by', 'price-asc');
  const [displayLimit, setDisplayLimit] = useState(8); // Render only 8 initially for ultra-fast startup and scrolling

  useScrollRestoration('/', !loading);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const listingsPath = 'listings';
      const listingsRef = collection(db, listingsPath);
      const q = query(listingsRef);

      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, listingsPath);
      }
      
      const listingsData: Listing[] = [];
      snapshot!.forEach((doc) => {
        listingsData.push({ id: doc.id, ...doc.data() } as Listing);
      });
      setListings(listingsData);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleRefresh = async () => {
    await fetchListings();
  };

  // Helper to extract clean numeric price for accurate sorting (e.g. 3000, 5000, 7500, 10000, 15000)
  const getNumericPrice = (l: Listing): number => {
    if (typeof l.price === 'number' && !isNaN(l.price)) return l.price;
    if (typeof l.price === 'string') {
      const num = parseFloat(String(l.price).replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  // Dynamically extract all unique cities from existing Firestore listings + defaults
  const availableCities = React.useMemo(() => {
    return getUniqueCitiesFromListings(listings, true);
  }, [listings]);

  // Filter listings by City and Search Term
  const filteredListings = React.useMemo(() => {
    return listings.filter(l => {
      // Robust City Filter (Case-insensitive & whitespace trimmed, matching Firestore data)
      if (!doesListingMatchCity(l, selectedCity)) {
        return false;
      }

      // Search Term Filter
      if (searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        const titleMatch = (l.title || '').toLowerCase().includes(term);
        const locationMatch = (l.location || '').toLowerCase().includes(term);
        const locationNameMatch = (l.locationName || '').toLowerCase().includes(term);
        const cityMatch = (l.city || '').toLowerCase().includes(term);
        return titleMatch || locationMatch || locationNameMatch || cityMatch;
      }

      return true;
    });
  }, [listings, selectedCity, searchTerm]);

  // Sort filtered listings based on chosen sort option (Price: Low to High by default)
  const sortedListings = React.useMemo(() => {
    const list = [...filteredListings];
    if (sortBy === 'price-asc') {
      return list.sort((a, b) => getNumericPrice(a) - getNumericPrice(b));
    }
    if (sortBy === 'price-desc') {
      return list.sort((a, b) => getNumericPrice(b) - getNumericPrice(a));
    }
    return list;
  }, [filteredListings, sortBy]);

  // Reset rendering limit when filters or sort option change
  useEffect(() => {
    setDisplayLimit(8);
  }, [selectedCity, searchTerm, sortBy]);

  const listingsToRender = sortedListings.slice(0, displayLimit);
  const hasMore = sortedListings.length > displayLimit;

  // Set up high-performance infinite scroll observer for rendering
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Increment limit dynamically in the background
        setDisplayLimit((prev) => Math.min(prev + 8, sortedListings.length));
      }
    }, { threshold: 0.1, rootMargin: '200px' }); // Trigger ahead by 200px to ensure seamless scroll transition

    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, sortedListings.length]);

  // Premium skeleton loader matching ListingCard dimensions
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div 
          key={idx} 
          className="overflow-hidden border border-[#E5E5E5] dark:border-zinc-800 bg-white dark:bg-[#151515] rounded-[2.5rem] shadow-subtle animate-pulse"
        >
          <div className="relative aspect-[4/5] bg-neutral-200 dark:bg-zinc-800 rounded-t-[2.5rem]" />
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-3 w-20 bg-neutral-200 dark:bg-zinc-800 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-neutral-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-3.5 w-1/2 bg-neutral-200 dark:bg-zinc-800 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 relative">
      <div className="absolute top-0 right-0 z-20">
        <RefreshButton onRefresh={handleRefresh} />
      </div>

      {/* Hero Section */}
      <div className={`relative rounded-[2.5rem] overflow-hidden min-h-[460px] md:h-[500px] py-10 flex flex-col justify-center items-center text-center p-6 border transition-all duration-500 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-[#F3F0E9] border-secondary/50'} shadow-[0_10px_40px_rgba(0,0,0,0.02)]`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '60px 60px' }} />
        </div>
        
        <div className="space-y-6 relative z-10 w-full max-w-4xl px-2 md:px-6">
          <div className="text-center space-y-2">
            <span className="inline-block text-[11px] font-black tracking-[0.35em] text-primary-dark uppercase bg-primary-dark/10 px-4 py-1.5 rounded-full">
              BIN USMAN
            </span>
          </div>

          <h1 
            id="best-hotels-apartments-heading"
            style={{
              borderColor: isDark ? '#27272a' : '#E5E5E5',
              borderStyle: 'solid',
              borderWidth: '1px',
              backgroundColor: isDark ? '#18181b' : '#FFFFFF',
              textAlign: 'center',
              fontWeight: '800',
              fontFamily: '"Poppins", "Montserrat", sans-serif',
              color: isDark ? '#ffffff' : '#000033',
              minHeight: '140px',
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1.3',
              letterSpacing: '0.02em',
              width: '100%',
            }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] uppercase px-4 sm:px-8 py-6 sm:py-8 rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
          >
            <span className="leading-snug select-none">
              FIND THE BEST <span style={{ color: '#D4AF37' }}>HOTELS AND APARTMENTS</span> WITH US
            </span>
          </h1>
          <p className="text-body font-medium text-sm md:text-base max-w-md mx-auto tracking-wide leading-relaxed">
            Find the best apartments in Pakistan's top locations.
          </p>
          
          <div className="w-full max-w-md relative group mx-auto pt-4">
            <Search className={`absolute left-5 top-[60%] -translate-y-1/2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'} group-focus-within:text-primary-dark transition-colors`} size={18} />
            <input 
              type="text"
              placeholder="Search by city or area..."
              className={`w-full ${isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-400 focus:ring-primary-dark/20' : 'bg-white border-secondary text-heading placeholder:text-zinc-500 focus:ring-primary/10'} border rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:border-primary-dark focus:ring-4 transition-all font-medium text-sm`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* City Filter */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between border-b border-secondary pb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary-dark rounded-full" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-heading">Top Cities</h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-body">{listings.length} Places Available</span>
        </div>
        
        <div className="flex gap-3 overflow-x-auto touch-scroll-x pb-4 scrollbar-hide -mx-4 px-4 snap-x">
          {availableCities.map((city) => {
            const isSelected = areCitiesEqual(selectedCity, city);
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`
                  flex items-center gap-2 px-8 py-3.5 rounded-full whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all snap-start cursor-pointer
                  ${isSelected 
                    ? 'bg-primary-dark text-neutral-900 font-bold shadow-xl shadow-primary-dark/10 ring-4 ring-primary-dark/5' 
                    : isDark
                      ? 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-primary-dark/30 hover:text-white'
                      : 'bg-white text-zinc-700 border border-secondary hover:border-primary-dark/30 hover:text-heading'}
                `}
              >
                {city}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Listings */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight uppercase text-heading">
              Find an <span className="text-primary italic">Apartment</span>
            </h2>
            <span className="text-body font-bold text-xs uppercase tracking-widest">
              {sortedListings.length} results found
            </span>
          </div>

          {/* Clean Minimal Sort By Dropdown */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <label htmlFor="property-sort-select" className="text-[11px] font-black uppercase tracking-wider text-body whitespace-nowrap">
              Sort by:
            </label>
            <div className="relative">
              <select
                id="property-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`text-xs font-bold uppercase tracking-wider py-2.5 pl-3.5 pr-8 rounded-xl border transition-all cursor-pointer appearance-none ${
                  isDark 
                    ? 'bg-zinc-900 border-zinc-700 text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30' 
                    : 'bg-white border-secondary text-heading focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30'
                }`}
                aria-label="Sort listings"
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="featured">Featured / Default</option>
              </select>
              <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`} />
            </div>
          </div>
        </div>

        {loading ? (
          renderSkeletons()
        ) : listingsToRender.length > 0 ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
              {listingsToRender.map(listing => (
                <ListingCard key={listing.id} {...listing} />
              ))}
            </div>

            {/* Hidden Sentinel to trigger smooth background infinite scrolling */}
            {hasMore && (
              <div id="infinite-scroll-sentinel" className="py-6 flex justify-center">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className={`text-center py-20 rounded-[2.5rem] border border-dashed ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white/60 border-secondary'}`}>
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-heading">No apartments available</h3>
            <p className="text-body font-medium text-sm max-w-xs mx-auto">We found nothing in {selectedCity} for this search.</p>
            <button 
              onClick={() => { setSelectedCity('All'); setSearchTerm(''); }}
              className="mt-6 text-primary font-black uppercase text-[10px] tracking-widest hover:underline"
            >
              See All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
