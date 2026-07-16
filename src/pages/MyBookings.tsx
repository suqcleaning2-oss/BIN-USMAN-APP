import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, CheckCircle2, XCircle, Calendar, CreditCard, Star, MessageSquare, Send, X, MapPin, ChevronLeft, ChevronRight, Hash, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { collection, query, where, doc, updateDoc, addDoc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { RefreshButton } from '../components/RefreshButton';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from '../components/OptimizedImage';
import { safeOpenExternalApp, useScrollRestoration } from '../lib/lifecycle-utils';

interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  location?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
  status: 'pending' | 'confirmed' | 'approved' | 'rejected' | 'cancelled' | 'failed' | 'refund_pending' | 'refunded' | 'completed';
  amount: number;
  price?: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  createdAt: any;
  confirmedAt?: any;
  approvedAt?: any;
  cancelledAt?: any;
  refundRequestedAt?: any;
  penaltyAmount?: number;
  refundAmount?: number;
}

export default function MyBookings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useScrollRestoration('/my-bookings', !loading);

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any | null>(null);
  const [selectedListingDetails, setSelectedListingDetails] = useState<any | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBookingsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bookingsPath = 'bookings';
      const q = query(
        collection(db, bookingsPath),
        where('userId', '==', user.uid)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, bookingsPath);
      }
      
      const bookingsData: Booking[] = [];
      snapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() } as Booking);
      });
      
      bookingsData.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });
      setBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings data:", error);
      toast.error('Failed to update bookings history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingsData();
  }, [user]);

  const handleRefresh = async () => {
    await fetchBookingsData();
  };

  const handleViewDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setFetchingDetails(true);
    setSelectedBookingDetails(null);
    setSelectedListingDetails(null);
    setActiveImageIndex(0);

    try {
      const bookingPath = `bookings/${booking.id}`;
      let bookingSnap;
      try {
        bookingSnap = await getDoc(doc(db, 'bookings', booking.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, bookingPath);
        return;
      }

      if (bookingSnap && bookingSnap.exists()) {
        const bData = { id: bookingSnap.id, ...bookingSnap.data() };
        setSelectedBookingDetails(bData);

        const listingId = bookingSnap.data().listingId;
        if (listingId) {
          try {
            const listingSnap = await getDoc(doc(db, 'listings', listingId));
            if (listingSnap.exists()) {
              setSelectedListingDetails({ id: listingSnap.id, ...listingSnap.data() });
            }
          } catch (err) {
            console.error("Listing fetch failed but keeping booking context:", err);
          }
        }
      } else {
        toast.error("Booking record not found.");
      }
    } catch (error) {
      console.error("Error loading complete details:", error);
      toast.error("Failed to load details.");
    } finally {
      setFetchingDetails(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return { label: 'Confirmed', className: 'bg-green-50 text-green-600 border-green-100' };
      case 'refund_pending':
        return { label: 'Refunding', className: 'bg-orange-50 text-orange-600 border-orange-100' };
      case 'refunded':
        return { label: 'Refunded', className: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'rejected':
      case 'failed':
        return { label: 'Rejected', className: 'bg-red-50 text-red-600 border-red-100' };
      case 'cancelled':
        return { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
      case 'completed':
        return { label: 'Completed', className: 'bg-primary/10 text-primary-dark border-primary/20' };
      default:
        return { label: 'Waiting', className: 'bg-background text-body/40 border-secondary' };
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    const confirmationTimestamp = booking.confirmedAt || booking.approvedAt;
    if (!confirmationTimestamp) return;

    const confirmationDate = confirmationTimestamp.seconds ? new Date(confirmationTimestamp.seconds * 1000) : new Date(confirmationTimestamp);
    if (!confirmationDate || isNaN(confirmationDate.getTime())) return;
    
    if ((new Date().getTime() - confirmationDate.getTime()) / (1000 * 60 * 60) > 24) {
      toast.error("Amendment window closed.");
      return;
    }

    try {
      const bookingPath = `bookings/${booking.id}`;
      try {
        await updateDoc(doc(db, 'bookings', booking.id), { 
          status: 'refund_pending',
          cancelledAt: new Date().toISOString(),
          refundRequestedAt: new Date().toISOString(),
          penaltyAmount: booking.amount * 0.2,
          refundAmount: booking.amount * 0.8
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, bookingPath);
      }
      fetchBookingsData();
      toast.success("Reservation voided. Reclamation logic initiated.");
    } catch (error) {
      toast.error("Failed to void reservation.");
    }
  };

  const isWithinCancellationWindow = (confirmedAt: any) => {
    if (!confirmedAt) return false;
    const confirmationDate = confirmedAt.seconds ? new Date(confirmedAt.seconds * 1000) : new Date(confirmedAt);
    if (isNaN(confirmationDate.getTime())) return false;
    return (now.getTime() - confirmationDate.getTime()) / (1000 * 60 * 60) < 24;
  };

  function CancellationCountdown({ confirmedAt, now }: { confirmedAt: any, now: Date }) {
    const confirmationDate = confirmedAt?.seconds ? new Date(confirmedAt.seconds * 1000) : new Date(confirmedAt);
    if (!confirmationDate || isNaN(confirmationDate.getTime())) return null;
    const diff = (new Date(confirmationDate.getTime() + 24 * 60 * 60 * 1000)).getTime() - now.getTime();
    if (diff <= 0) return null;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return (
      <div className="text-[10px] font-black text-primary-dark uppercase tracking-[0.2em] bg-primary/5 px-4 py-2 rounded-full border border-primary/20 inline-flex items-center gap-2">
        <Clock size={12} className="animate-pulse" />
        Void Window: {h}h {m}m {s}s
      </div>
    );
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="flex items-center justify-between z-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-secondary text-[10px] font-black uppercase tracking-[0.2em] text-heading hover:bg-neutral-50 hover:text-primary-dark transition-all duration-300 shadow-sm active:scale-95 cursor-pointer group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
          <span>Back</span>
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-secondary pb-10">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading leading-none">My <span className="text-primary-dark italic font-normal">Bookings</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30 max-w-xs">Your past and upcoming stays.</p>
        </div>
      </div>

      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-secondary overflow-hidden animate-pulse">
            <div className="p-5 sm:p-10 space-y-6 sm:space-y-10">
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="h-7 w-2/3 bg-neutral-200 rounded-lg" />
                  <div className="h-4 w-1/3 bg-neutral-200 rounded-md" />
                  <div className="h-4 w-1/4 bg-neutral-200 rounded-md" />
                </div>
                <div className="h-16 w-48 bg-neutral-100 rounded-2xl" />
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-200 rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-neutral-200 rounded-full" />
                    <div className="h-5 w-24 bg-neutral-200 rounded-lg" />
                  </div>
                </div>
                <div className="h-11 w-28 bg-neutral-200 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="flex items-center justify-between z-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-secondary text-[10px] font-black uppercase tracking-[0.2em] text-heading hover:bg-neutral-50 hover:text-primary-dark transition-all duration-300 shadow-sm active:scale-95 cursor-pointer group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
          <span>Back</span>
        </button>
        <RefreshButton onRefresh={handleRefresh} />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-secondary pb-10">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading leading-none">My <span className="text-primary-dark italic font-normal">Bookings</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30 max-w-xs">Your past and upcoming stays.</p>
        </div>
        <div className="bg-white px-6 py-2.5 rounded-full border border-secondary shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-heading">{bookings.length} BOOKINGS</span>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 backdrop-blur-sm text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary-dark border border-secondary shadow-sm shrink-0">
          <Clock size={24} strokeWidth={1.5} />
        </div>
        <div className="space-y-1 sm:space-y-2">
          <p className="text-[10px] font-black text-heading uppercase tracking-[0.2em]">Cancellation Policy</p>
          <p className="text-[11px] text-body/60 font-medium leading-relaxed uppercase tracking-wider">You can cancel within 24 hours of booking. A 20% fee applies to refunds.</p>
        </div>
      </div>

      {bookings.length > 0 ? (
        <div className="grid gap-6 sm:gap-10">
          {bookings.map((booking) => {
            const status = getStatusInfo(booking.status);
            return (
              <div key={booking.id} className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-secondary overflow-hidden hover:shadow-2xl transition-all duration-1000 group hover:-translate-y-1">
                <div className="p-5 sm:p-10 space-y-6 sm:space-y-10">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 sm:gap-10">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          <h3 className="text-2xl sm:text-3xl font-semibold text-heading uppercase tracking-tighter group-hover:text-primary-dark transition-colors">{booking.listingTitle}</h3>
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${status.className}`}>
                            {status.label}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {booking.location && (
                            <p className="text-[10px] text-body/50 font-bold uppercase tracking-widest">{booking.location}</p>
                          )}
                          {booking.locationName && (
                            <p className="text-[10px] text-primary-dark font-black uppercase tracking-widest">{booking.locationName}</p>
                          )}
                          <div className="pt-1.5">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (booking.latitude && booking.longitude) {
                                  safeOpenExternalApp(`https://www.google.com/maps?q=${booking.latitude},${booking.longitude}`);
                                } else {
                                  toast.error("Location not available");
                                }
                              }}
                              title="Open Location in Google Maps"
                              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 w-full sm:w-auto justify-center active:scale-95 shadow-md shadow-emerald-600/10 min-h-[44px]"
                            >
                              <MapPin size={12} strokeWidth={2.5} />
                              View Location
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] font-black tracking-[0.3em] text-body/20 uppercase">Order ID: {booking.id.toUpperCase()}</p>
                      </div>
                    
                    <div className="flex flex-row justify-around xl:justify-start items-center gap-4 sm:gap-10 bg-neutral-50 px-6 py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] border border-secondary/50 w-full xl:w-auto">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-body/40 mb-1.5">Check-In</p>
                        <p className="text-xs sm:text-sm font-bold text-heading">
                          {(() => {
                            if (typeof booking.checkIn !== 'string') return 'N/A';
                            const d = new Date(booking.checkIn);
                            return isNaN(d.getTime()) ? String(booking.checkIn) : format(d, 'MMM d, yyyy');
                          })()}
                        </p>
                      </div>
                      <div className="w-px h-8 sm:h-10 bg-secondary" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-body/40 mb-1.5">Check-Out</p>
                        <p className="text-xs sm:text-sm font-bold text-heading">
                          {(() => {
                            if (typeof booking.checkOut !== 'string') return 'N/A';
                            const d = new Date(booking.checkOut);
                            return isNaN(d.getTime()) ? String(booking.checkOut) : format(d, 'MMM d, yyyy');
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {(booking.status === 'confirmed' || booking.status === 'approved') && 
                      isWithinCancellationWindow(booking.confirmedAt || booking.approvedAt) && (
                      <CancellationCountdown confirmedAt={booking.confirmedAt || booking.approvedAt} now={now} />
                    )}
                    
                    {(booking.status === 'refund_pending' || booking.status === 'refunded') && (
                       <div className="flex flex-wrap gap-3 sm:gap-4">
                         <div className="bg-red-50/50 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-red-100/50 flex flex-col flex-1 min-w-[120px]">
                           <span className="text-[8px] font-black text-red-300 uppercase tracking-widest mb-1">Cancellation Fee</span>
                           <span className="text-xs font-bold text-red-500">Rs. {booking.penaltyAmount?.toLocaleString()}</span>
                         </div>
                         <div className="bg-green-50/50 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-green-100/50 flex flex-col flex-1 min-w-[120px]">
                           <span className="text-[8px] font-black text-green-300 uppercase tracking-widest mb-1">Refund Amount</span>
                           <span className="text-xs font-bold text-green-600">Rs. {booking.refundAmount?.toLocaleString()}</span>
                         </div>
                       </div>
                     )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 sm:pt-10 border-t border-secondary gap-6 sm:gap-8">
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1rem] sm:rounded-[1.25rem] bg-background border border-secondary flex items-center justify-center text-primary-dark shadow-sm shrink-0">
                        <CreditCard size={22} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-body/40 mb-1">Total Price</p>
                        <p className="text-xl sm:text-2xl font-semibold text-heading tracking-tighter">Rs. {(typeof booking.amount === 'number' ? booking.amount : 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      {(booking.status === 'confirmed' || booking.status === 'approved') && (
                        isWithinCancellationWindow(booking.confirmedAt || booking.approvedAt) ? (
                          <button 
                            onClick={() => handleCancelBooking(booking)}
                            className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 hover:text-red-600 transition-colors border border-red-200 hover:border-red-600 rounded-xl px-5 py-3 text-center min-h-[44px] flex items-center justify-center cursor-pointer select-none"
                          >
                            Cancel Booking
                          </button>
                        ) : (
                          <span className="text-[9px] text-body/30 font-black uppercase tracking-[0.2em] bg-secondary/10 px-6 py-3 rounded-full border border-secondary/20 text-center min-h-[44px] flex items-center justify-center select-none">
                            Completed
                          </span>
                        )
                      )}

                      <button 
                        onClick={() => handleViewDetails(booking)}
                        className="text-[10px] font-semibold uppercase tracking-widest text-[#111111] bg-[#D4AF37] hover:bg-[#c29e2e] transition-all hover:shadow-md px-6 py-3 rounded-2xl active:scale-95 cursor-pointer flex items-center justify-center min-h-[44px] text-center"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[4rem] border border-secondary border-dashed flex flex-col items-center">
          <Calendar className="text-secondary/20 mb-10" size={80} strokeWidth={0.5} />
          <h3 className="text-sm font-black text-heading uppercase tracking-[0.4em] mb-6">No bookings yet</h3>
          <p className="text-[11px] text-body/30 font-medium tracking-[0.2em] leading-relaxed max-w-xs mx-auto mb-12 uppercase">You have no bookings. Start searching for apartments!</p>
          <button onClick={() => navigate('/')} className="primary-button px-12 py-5">Search Apartments</button>
        </div>
      )}

      <div className="pt-12 text-center">
        <a 
          href="https://binusmen.wordpress.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-body/20 hover:text-primary-dark transition-all duration-300"
        >
          Privacy Policy
        </a>
      </div>

      {/* Details Dialog Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-8 border border-neutral-150 animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-neutral-100 bg-neutral-50/50">
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="text-lg sm:text-xl font-bold text-neutral-950 uppercase tracking-tight truncate">Booking Details</h3>
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mt-0.5 truncate">Order ID: {selectedBooking.id.toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 px-4 sm:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 max-h-[70vh] overflow-y-auto touch-scroll-container">
              {fetchingDetails ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">Retrieving Safe Ledger...</span>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  
                  {/* Grid Layout: Apartment Info/Photos vs Booking Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    
                    {/* Apartment Details Section */}
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 text-center sm:text-left">
                        <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest font-mono">Apartment Information</span>
                        <h4 className="text-xl sm:text-2xl font-bold text-neutral-900 uppercase tracking-tighter leading-tight">
                          {selectedListingDetails?.title || selectedBookingDetails?.listingTitle || selectedBooking.listingTitle}
                        </h4>
                        <p className="text-xs text-neutral-500 font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                          <MapPin size={14} className="text-neutral-400 shrink-0" />
                          {selectedListingDetails?.location || selectedBookingDetails?.location || selectedBooking.location || 'Location Details N/A'}
                        </p>
                      </div>

                      {/* Photo Gallery Viewer */}
                      {(() => {
                        const photos = selectedListingDetails?.images || [];
                        if (photos.length === 0) {
                          return (
                            <div className="aspect-[4/3] bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 gap-2">
                              <XCircle size={32} strokeWidth={1} />
                              <span className="text-[10px] font-black uppercase tracking-wider">No photos available</span>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3 animate-in fade-in duration-500">
                            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-150 shadow-subtle group">
                              <OptimizedImage 
                                src={photos[activeImageIndex]} 
                                alt={`${selectedBooking.listingTitle} photo ${activeImageIndex + 1}`}
                                widthSize={600}
                                qualitySize={75}
                                className="w-full h-full object-cover select-none"
                              />
                              {photos.length > 1 && (
                                <>
                                  <button 
                                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-neutral-800 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
                                  >
                                    <ChevronLeft size={18} strokeWidth={2.5} />
                                  </button>
                                  <button 
                                    onClick={() => setActiveImageIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-neutral-800 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
                                  >
                                    <ChevronRight size={18} strokeWidth={2.5} />
                                  </button>
                                  <div className="absolute bottom-3 right-3 px-3 py-1 bg-neutral-900/65 text-white text-[9px] font-black tracking-widest uppercase rounded-full select-none">
                                    {activeImageIndex + 1} / {photos.length}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Slider Thumbnails List */}
                            <div className="flex gap-2 overflow-x-auto touch-scroll-x pb-1 scrollbar-thin scrollbar-thumb-neutral-200">
                              {photos.map((img: string, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveImageIndex(idx)}
                                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all border-2 cursor-pointer ${idx === activeImageIndex ? 'border-[#D4AF37] scale-95 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                  <OptimizedImage src={img} alt="thumbnail" widthSize={120} qualitySize={60} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Booking Attributes */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="text-center sm:text-left">
                        <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest font-mono">Status Badge</span>
                        {(() => {
                          const status = getStatusInfo(selectedBookingDetails?.status || selectedBooking.status);
                          return (
                            <div className="mt-1 flex items-center justify-center sm:justify-start">
                              <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Dates Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Check-In Date</span>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-neutral-400shrink-0" />
                            <span className="text-xs font-bold text-neutral-900">
                              {(() => {
                                const dateStr = selectedBookingDetails?.checkIn || selectedBookingDetails?.startDate || selectedBooking.checkIn;
                                if (typeof dateStr !== 'string') return 'N/A';
                                const d = new Date(dateStr);
                                return isNaN(d.getTime()) ? String(dateStr) : format(d, 'MMM d, yyyy');
                              })()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Check-Out Date</span>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-neutral-400 shrink-0" />
                            <span className="text-xs font-bold text-neutral-900">
                              {(() => {
                                const dateStr = selectedBookingDetails?.checkOut || selectedBookingDetails?.endDate || selectedBooking.checkOut;
                                if (typeof dateStr !== 'string') return 'N/A';
                                const d = new Date(dateStr);
                                return isNaN(d.getTime()) ? String(dateStr) : format(d, 'MMM d, yyyy');
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Details & Arrival Window */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Stay Duration</span>
                          <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">
                            {selectedBookingDetails?.nights || selectedBooking.nights} Night
                            {(selectedBookingDetails?.nights || selectedBooking.nights) !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Arrival Time</span>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-neutral-400 shrink-0" />
                            <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">
                              {selectedBookingDetails?.startTime || selectedBookingDetails?.startTimeStr || '10:00 AM'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price Matrix Details */}
                      <div className="bg-neutral-50 p-4 sm:p-5 rounded-2xl border border-neutral-100 space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] block font-mono">Invoice Ledger</span>
                        
                        <div className="flex justify-between items-center text-xs font-medium text-neutral-500">
                          <span>Daily Base Rate</span>
                          <span className="font-bold text-neutral-800">
                            Rs. {(selectedBookingDetails?.price || selectedBooking.price || (selectedBookingDetails?.amount ? Math.round(selectedBookingDetails.amount / (selectedBookingDetails.nights || 1)) : 0)).toLocaleString()} / night
                          </span>
                        </div>

                        {selectedBookingDetails?.penaltyAmount ? (
                          <div className="flex justify-between items-center text-xs font-medium text-red-500">
                            <span>Cancellation Penalty</span>
                            <span className="font-bold">Rs. {selectedBookingDetails.penaltyAmount.toLocaleString()}</span>
                          </div>
                        ) : null}

                        {selectedBookingDetails?.refundAmount ? (
                          <div className="flex justify-between items-center text-xs font-medium text-emerald-600">
                            <span>Refund Balance Disbursements</span>
                            <span className="font-bold">Rs. {selectedBookingDetails.refundAmount.toLocaleString()}</span>
                          </div>
                        ) : null}
                        
                        <div className="h-px bg-neutral-200 my-1" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Total Aggregate</span>
                          <span className="text-lg sm:text-xl font-bold text-neutral-950 font-mono">
                            Rs. {(selectedBookingDetails?.amount || selectedBooking.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Booking Holder Bio */}
                  <div className="bg-neutral-50 p-4 sm:p-6 rounded-2xl border border-neutral-100 space-y-4">
                    <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest font-mono block text-center sm:text-left">Registered Guest Verification</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
                      <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left duration-300">
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Full Name</span>
                        <span className="text-xs font-bold text-neutral-800">{selectedBookingDetails?.userName || profile?.fullName || 'Guest'}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left duration-300 delay-100">
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Email Address</span>
                        <span className="text-xs font-bold text-neutral-800 select-all truncate">{selectedBookingDetails?.userEmail || user?.email || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left duration-300 delay-200">
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Contact Number</span>
                        <span className="text-xs font-bold text-neutral-800 select-all">{selectedBookingDetails?.userPhone || profile?.phone || 'Contact Private'}</span>
                      </div>
                    </div>

                    {(selectedBookingDetails?.hostCode || selectedBookingDetails?.listingCode) && (
                      <div className="pt-3 border-t border-neutral-200/50 flex flex-wrap justify-center sm:justify-start gap-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        {selectedBookingDetails?.listingCode && (
                          <div className="flex items-center gap-1.5">
                            <Hash size={12} className="text-[#D4AF37]" />
                            <span>Room Code: <span className="font-black text-neutral-800 font-mono select-all ml-1 bg-white border border-neutral-200 px-2 py-0.5 rounded shadow-sm">{selectedBookingDetails.listingCode}</span></span>
                          </div>
                        )}
                        {selectedBookingDetails?.hostCode && (
                          <div className="flex items-center gap-1.5">
                            <Hash size={12} className="text-[#D4AF37]" />
                            <span>Pass Key: <span className="font-black text-neutral-800 font-mono select-all ml-1 bg-white border border-neutral-200 px-2 py-0.5 rounded shadow-sm">{selectedBookingDetails.hostCode}</span></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-8 py-5 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest leading-relaxed text-center sm:text-left">
                Please present verification passkeys during physical check-in.
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedBooking.latitude && selectedBooking.longitude && (
                  <button 
                    onClick={() => safeOpenExternalApp(`https://www.google.com/maps?q=${selectedBooking.latitude},${selectedBooking.longitude}`)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 border border-neutral-200 text-neutral-700 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95 min-h-[44px]"
                  >
                    <MapPin size={12} />
                    Map Guide
                  </button>
                )}
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="primary-button text-[10px] tracking-widest font-semibold px-6 py-3 bg-[#D4AF37] hover:bg-[#c29e2e] text-neutral-900 min-h-[44px] flex items-center justify-center"
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
