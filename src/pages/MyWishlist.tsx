import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Heart, RefreshCw } from 'lucide-react';
import { getUserWishlist } from '../services/wishlistService';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import { RefreshButton } from '../components/RefreshButton';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  city: string;
  images: string[];
}

export default function MyWishlist() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlistData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { listingIds } = await getUserWishlist(user.uid);
      
      if (listingIds.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      // Fetch full listing details for each ID
      const listingsData: Listing[] = [];
      for (const id of listingIds) {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          listingsData.push({ id: docSnap.id, ...docSnap.data() } as Listing);
        }
      }
      
      setListings(listingsData);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistData();
  }, [user]);

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-px bg-secondary animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30">Loading...</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="absolute top-0 right-0 z-50">
        <RefreshButton onRefresh={fetchWishlistData} />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-secondary pb-10">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading leading-none">My <span className="text-primary-dark italic font-normal">Wishlist</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30 max-w-xs">Your saved apartments.</p>
        </div>
        <div className="bg-white px-6 py-2.5 rounded-full border border-secondary shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-heading">{listings.length} FAVOURITES</span>
        </div>
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map((listing) => (
            <ListingCard key={listing.id} {...listing} />
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[4rem] border border-secondary border-dashed flex flex-col items-center">
          <Heart className="text-secondary/20 mb-10" size={80} strokeWidth={0.5} />
          <h3 className="text-sm font-black text-heading uppercase tracking-[0.4em] mb-6">Wishlist is empty</h3>
          <p className="text-[11px] text-body/30 font-medium tracking-[0.2em] leading-relaxed max-w-xs mx-auto mb-12 uppercase">You haven't saved any apartments yet. Start searching to add favorites!</p>
          <Link to="/" className="primary-button px-12 py-5 inline-flex">Search Apartments</Link>
        </div>
      )}
    </div>
  );
}
