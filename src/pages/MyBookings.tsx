import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, CheckCircle2, XCircle, Calendar, CreditCard, Star, MessageSquare, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { collection, query, where, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { updateListingRating } from '../services/listingService';
import { RefreshButton } from '../components/RefreshButton';
import { useNavigate } from 'react-router-dom';

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
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

      const reviewsPath = 'reviews';
      const reviewsQ = query(
        collection(db, reviewsPath),
        where('userId', '==', user.uid)
      );
      
      let reviewsSnapshot;
      try {
        reviewsSnapshot = await getDocs(reviewsQ);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, reviewsPath);
      }
      
      const reviewedIds = new Set<string>();
      reviewsSnapshot.forEach(doc => {
        reviewedIds.add(doc.data().bookingId);
      });
      setReviewedBookingIds(reviewedIds);
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBooking) return;
    if (!comment.trim()) {
      toast.error("Please add a comment");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewsPath = 'reviews';
      try {
        await addDoc(collection(db, reviewsPath), {
          userId: user.uid,
          userName: profile?.fullName || user.displayName || 'Guest',
          bookingId: selectedBooking.id,
          listingId: selectedBooking.listingId,
          listingTitle: selectedBooking.listingTitle,
          rating,
          text: comment.trim(),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, reviewsPath);
      }

      setReviewedBookingIds(prev => new Set([...prev, selectedBooking.id]));
      await updateListingRating(selectedBooking.listingId);
      
      toast.success("Review sent! Thank you.");
      setIsReviewModalOpen(false);
      setComment('');
      setRating(5);
    } catch (error) {
      console.error("Review failed:", error);
      toast.error("Failed to send review.");
    } finally {
      setIsSubmittingReview(false);
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
    <div className="h-96 flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-px bg-secondary animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30">Loading...</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="absolute top-0 right-0 z-50">
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

      <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 flex items-start gap-6 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary-dark border border-secondary shadow-sm shrink-0">
          <Clock size={24} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-heading uppercase tracking-[0.2em]">Cancellation Policy</p>
          <p className="text-[11px] text-body/60 font-medium leading-relaxed uppercase tracking-wider">You can cancel within 24 hours of booking. A 20% fee applies to refunds.</p>
        </div>
      </div>

      {bookings.length > 0 ? (
        <div className="grid gap-10">
          {bookings.map((booking) => {
            const status = getStatusInfo(booking.status);
            return (
              <div key={booking.id} className="bg-white rounded-[3rem] border border-secondary overflow-hidden hover:shadow-2xl transition-all duration-1000 group hover:-translate-y-1">
                <div className="p-10 space-y-10">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-3xl font-semibold text-heading uppercase tracking-tighter group-hover:text-primary-dark transition-colors">{booking.listingTitle}</h3>
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.className}`}>
                            {status.label}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {booking.location && (
                            <p className="text-[10px] text-body/50 font-bold uppercase tracking-widest">{booking.location}</p>
                          )}
                          {booking.locationName && (
                            <p className="text-[10px] text-primary-dark font-black uppercase tracking-widest">{booking.locationName}</p>
                          )}
                          {booking.latitude && booking.longitude && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`, '_blank');
                              }}
                              className="w-fit text-[9px] font-black text-primary-dark uppercase tracking-widest hover:underline mt-1"
                            >
                              View on Map
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] font-black tracking-[0.3em] text-body/20 uppercase">Order ID: {booking.id.toUpperCase()}</p>
                      </div>
                    
                    <div className="flex items-center gap-10 bg-background/50 px-8 py-6 rounded-[2rem] border border-secondary/50">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-body/40 mb-2">Check-In</p>
                        <p className="text-sm font-bold text-heading">
                          {(() => {
                            if (typeof booking.checkIn !== 'string') return 'N/A';
                            const d = new Date(booking.checkIn);
                            return isNaN(d.getTime()) ? String(booking.checkIn) : format(d, 'MMM d, yyyy');
                          })()}
                        </p>
                      </div>
                      <div className="w-px h-10 bg-secondary" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-body/40 mb-2">Check-Out</p>
                        <p className="text-sm font-bold text-heading">
                          {(() => {
                            if (typeof booking.checkOut !== 'string') return 'N/A';
                            const d = new Date(booking.checkOut);
                            return isNaN(d.getTime()) ? String(booking.checkOut) : format(d, 'MMM d, yyyy');
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(booking.status === 'confirmed' || booking.status === 'approved') && 
                      isWithinCancellationWindow(booking.confirmedAt || booking.approvedAt) && (
                      <CancellationCountdown confirmedAt={booking.confirmedAt || booking.approvedAt} now={now} />
                    )}
                    
                    {(booking.status === 'refund_pending' || booking.status === 'refunded') && (
                       <div className="flex flex-wrap gap-4">
                         <div className="bg-red-50/50 px-5 py-3 rounded-2xl border border-red-100/50 flex flex-col">
                           <span className="text-[8px] font-black text-red-300 uppercase tracking-widest mb-1">Cancellation Fee</span>
                           <span className="text-xs font-bold text-red-500">Rs. {booking.penaltyAmount?.toLocaleString()}</span>
                         </div>
                         <div className="bg-green-50/50 px-5 py-3 rounded-2xl border border-green-100/50 flex flex-col">
                           <span className="text-[8px] font-black text-green-300 uppercase tracking-widest mb-1">Refund Amount</span>
                           <span className="text-xs font-bold text-green-600">Rs. {booking.refundAmount?.toLocaleString()}</span>
                         </div>
                       </div>
                     )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between pt-10 border-t border-secondary gap-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[1.25rem] bg-background border border-secondary flex items-center justify-center text-primary-dark shadow-sm">
                        <CreditCard size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-body/40 mb-1">Total Price</p>
                        <p className="text-2xl font-semibold text-heading tracking-tighter">Rs. {(typeof booking.amount === 'number' ? booking.amount : 0).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {(booking.status === 'confirmed' || booking.status === 'approved') && (
                        isWithinCancellationWindow(booking.confirmedAt || booking.approvedAt) ? (
                          <button 
                            onClick={() => handleCancelBooking(booking)}
                            className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400 hover:text-red-600 transition-colors border-b border-red-100 hover:border-red-600 pb-1"
                          >
                            Cancel Booking
                          </button>
                        ) : (
                          <span className="text-[9px] text-body/30 font-black uppercase tracking-[0.2em] bg-secondary/10 px-6 py-2.5 rounded-full border border-secondary/20">
                            Completed
                          </span>
                        )
                      )}

                      {(() => {
                        const canReview = (now > new Date(booking.checkOut) || booking.status === 'completed') && 
                                          !['cancelled', 'refunded', 'rejected', 'pending', 'failed'].includes(booking.status);
                        
                        if (!canReview) return null;

                        if (reviewedBookingIds.has(booking.id)) {
                          return (
                            <div className="flex items-center gap-3 px-6 py-3 bg-green-50 text-green-600 border border-green-100 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                              <CheckCircle2 size={12} />
                              Review Sent
                            </div>
                          );
                        }

                        return (
                          <button 
                            onClick={() => {
                              setSelectedBooking(booking);
                              setIsReviewModalOpen(true);
                            }}
                            className="primary-button py-4 px-10 text-[10px]"
                          >
                            Leave a Review
                          </button>
                        );
                      })()}
                      
                      <button className="text-[10px] font-black uppercase tracking-widest text-body/60 hover:text-heading transition-colors bg-white px-6 py-3.5 rounded-2xl border border-secondary shadow-sm">
                        Details
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

      {/* Review Modal */}
      {isReviewModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl animate-in fade-in duration-700">
          <div className="bg-white rounded-[3.5rem] w-full max-w-xl overflow-hidden shadow-[0_80px_160px_rgba(0,0,0,0.12)] border border-secondary animate-in zoom-in-95 duration-500">
            <div className="p-12 border-b border-secondary flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-heading uppercase tracking-tighter leading-tight">Your <span className="text-primary-dark italic font-normal">Review</span></h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30">{selectedBooking.listingTitle}</p>
              </div>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="w-14 h-14 rounded-full border border-secondary flex items-center justify-center hover:bg-background transition-all hover:rotate-90 duration-500"
              >
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-12 space-y-12">
              <div className="space-y-5">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-body/40 ml-1">Rate your stay</label>
                <div className="flex justify-between items-center bg-background/50 px-12 py-8 rounded-[2.5rem] border border-secondary">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`transition-all transform hover:scale-125 duration-500 ${star <= rating ? 'text-primary-dark' : 'text-secondary'}`}
                    >
                      <Star size={36} fill={star <= rating ? "currentColor" : "none"} strokeWidth={0.5} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-body/40 ml-1">Write a comment</label>
                <textarea
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you think of this place?"
                  className="w-full bg-background/30 border border-secondary rounded-[2.5rem] p-10 h-48 text-sm focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all resize-none italic font-medium leading-relaxed placeholder:text-body/20"
                />
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="primary-button w-full h-20 text-[11px] shadow-[0_30px_60px_rgba(166,124,82,0.15)]"
                >
                  {isSubmittingReview ? "Waiting..." : "Send Review"}
                </button>
              </div>
            </form>
          </div>
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
    </div>
  );
}
