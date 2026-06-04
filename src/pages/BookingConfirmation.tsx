import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, ArrowLeft, ShieldCheck, CreditCard, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { parseISO, areIntervalsOverlapping } from 'date-fns';
import { RefreshButton } from '../components/RefreshButton';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export default function BookingConfirmation() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get booking details from navigation state
  const bookingData = location.state || {
    checkIn: new Date().toISOString(),
    checkOut: new Date(Date.now() + 86400000).toISOString(),
    nights: 1,
    totalPrice: 0
  };

  const fetchListing = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'listings', id);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `listings/${id}`);
      }
      
      if (docSnap && docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Listing;
        setListing(data);
      } else {
        toast.error('Listing not found');
        navigate('/');
      }
    } catch (error) {
      console.error("Error fetching listing for booking:", error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id, navigate]);

  const handleRefresh = async () => {
    await fetchListing();
  };

  const handlePayRedirect = async () => {
    if (!user || !listing) return;

    setIsRedirecting(true);
    
    try {
      // 0. Double check for overlaps before proceeding (Server-side simulation)
      const overlapQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', listing.id),
        where('status', 'in', ['confirmed', 'approved', 'completed', 'pending'])
      );

      let overlapSnapshot;
      try {
        overlapSnapshot = await getDocs(overlapQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'bookings');
        throw err;
      }
      
      const newCheckIn = bookingData.checkIn;
      const newCheckOut = bookingData.checkOut;

      const isOverlapping = overlapSnapshot.docs.some(doc => {
        const existingData = doc.data();
        const existingCheckIn = existingData.checkIn;
        const existingCheckOut = existingData.checkOut;

        // Requirement: newCheckIn <= existingCheckOut AND newCheckOut >= existingCheckIn
        return newCheckIn <= existingCheckOut && newCheckOut >= existingCheckIn;
      });

      if (isOverlapping) {
        toast.error('These dates are already booked. Please choose different dates.');
        setIsRedirecting(false);
        return;
      }

      // 1. Create a Firestore booking document first (Requirements)
      let bookingRef;
      try {
        bookingRef = await addDoc(collection(db, 'bookings'), {
          userId: user.uid,
          userName: profile?.fullName || user.displayName || 'Guest',
          userEmail: user.email,
          userPhone: profile?.phone || '',
          listingId: listing.id,
          listingTitle: listing.title, // Keep consistent with UI
          title: listing.title, // As per requirement
          location: listing.location,
          locationName: listing.locationName || null,
          latitude: listing.latitude || null,
          longitude: listing.longitude || null,
          amount: bookingData.totalPrice,
          price: listing.price, // As per requirement
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          nights: bookingData.nights,
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'bookings');
        throw err;
      }

      console.log("Booking document created in Firestore with status pending:", bookingRef.id);

      toast.success("Booking Created! Redirecting to secure payment page..."); 
      setTimeout(() => {
        window.location.href = "https://cashmaal.com/payment-link";
      }, 1000);
    } catch (error) {
      console.error("Payment redirect error:", error);
      toast.error('Booking creation failed. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center">Loading...</div>;
  if (!listing) return null;

  const displayCheckIn = (() => {
    const d = new Date(bookingData.checkIn);
    return isNaN(d.getTime()) ? 'Select Date' : format(d, 'PPP');
  })();
  
  const displayCheckOut = (() => {
    const d = new Date(bookingData.checkOut);
    return isNaN(d.getTime()) ? 'Select Date' : format(d, 'PPP');
  })();

  if (isRedirecting) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CreditCard className="text-primary animate-pulse" size={32} />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tighter uppercase">Going to <span className="text-primary italic font-black">Cashmaal</span></h1>
          <p className="text-zinc-500 font-medium">Please wait...</p>
        </div>
        <div className="pt-4 flex items-center justify-center gap-2 text-primary font-bold text-sm">
          <ShieldCheck size={18} />
          <span>Safe Payment with Cashmaal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="absolute top-0 right-0 z-50">
        <RefreshButton onRefresh={handleRefresh} />
      </div>
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-body/60 hover:text-heading transition-colors group font-bold text-sm uppercase tracking-widest"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Summary */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Calendar size={20} />
              <h2 className="text-xl font-black uppercase tracking-tight text-heading">Booking Details</h2>
            </div>
            <p className="text-body font-medium text-sm">Check your dates and apartment info.</p>
          </div>

          <div className="glass-card bg-primary/5 border-primary/20 space-y-6 relative overflow-hidden bg-white/80">
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl -z-10 rounded-full" />
             <div className="space-y-4">
               <div>
                 <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-1">Apartment</p>
                 <h3 className="text-xl font-black text-heading uppercase">{listing.title}</h3>
                 <p className="text-body font-bold text-sm italic">{listing.location}</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4 py-4 border-y border-secondary/30">
                 <div className="space-y-1">
                   <p className="text-[10px] text-body/60 uppercase font-black tracking-widest">Check-In</p>
                   <p className="font-black text-heading text-sm">{displayCheckIn}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] text-body/60 uppercase font-black tracking-widest">Check-Out</p>
                   <p className="font-black text-heading text-sm">{displayCheckOut}</p>
                 </div>
               </div>

               <div className="flex items-center justify-between py-2">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-body/60 uppercase font-black tracking-widest">Price Info</span>
                   <span className="font-bold text-body">Rs. {listing.price.toLocaleString()} x {bookingData.nights} nights</span>
                 </div>
                 <span className="text-lg font-black text-heading">Rs. {bookingData.totalPrice.toLocaleString()}</span>
               </div>
             </div>

            <div className="flex items-center justify-between pt-4 border-t border-secondary/30">
              <span className="text-body font-black uppercase text-xs tracking-widest">Total to pay</span>
              <span className="text-3xl font-black text-primary">Rs. {bookingData.totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <ShieldCheck className="text-primary shrink-0" size={20} />
            <p className="text-xs text-body font-medium leading-relaxed">
              We are taking you to Cashmaal. Your info is safe and we don't save your card details.
            </p>
          </div>
        </div>

        {/* Right: Payment Action */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <CreditCard size={20} />
              <h2 className="text-xl font-black uppercase tracking-tight text-heading">Payment</h2>
            </div>
            <p className="text-body font-medium text-sm">Quick and safe payment.</p>
          </div>

          <div className="glass-card flex flex-col items-center justify-center gap-8 py-12 relative overflow-hidden group bg-white/80">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-center space-y-4 relative z-10">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20 transition-transform group-hover:scale-110 shadow-inner">
                <CreditCard size={32} />
              </div>
              <div>
                <h4 className="font-black text-xl uppercase tracking-tighter text-heading">Safety First</h4>
                <p className="text-body text-sm font-medium">By Cashmaal</p>
              </div>
            </div>

            <button 
              onClick={handlePayRedirect}
              disabled={isRedirecting}
              className="primary-button w-full py-4 text-lg font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-primary/20 relative z-10 uppercase tracking-widest"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  Pay Now
                </>
              )}
            </button>
            
            <div className="flex items-center justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all relative z-10">
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
