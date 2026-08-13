import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Info, ArrowLeft, Calendar as CalendarIcon, Info as InfoIcon, CheckCircle2, Star, User, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, differenceInDays, isBefore, startOfToday, addDays, eachDayOfInterval, areIntervalsOverlapping, parseISO, isSameDay } from 'date-fns';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { updateListingRating } from '../services/listingService';
import 'react-day-picker/dist/style.css';
import { RefreshButton } from '../components/RefreshButton';
import OptimizedImage from '../components/OptimizedImage';
import { safeOpenExternalApp, useScrollRestoration } from '../lib/lifecycle-utils';
import { formatCityName } from '../lib/city-utils';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  locationName?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: any;
}

export default function ListingDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const touchStartXRef = useRef<number>(0);

  const getActiveImageIndices = () => {
    if (!listing || !listing.images || listing.images.length === 0) {
      return { currentImage: 'https://picsum.photos/seed/house/1200/800', activeIndex: 0, totalImages: 0 };
    }
    const currentImage = activeImageUrl || listing.images[0];
    const activeIndex = Math.max(0, listing.images.indexOf(currentImage));
    return { currentImage, activeIndex, totalImages: listing.images.length };
  };

  const handleNextImage = () => {
    if (!listing || !listing.images || listing.images.length <= 1) return;
    const { activeIndex, totalImages } = getActiveImageIndices();
    const nextIndex = (activeIndex + 1) % totalImages;
    setActiveImageUrl(listing.images[nextIndex]);
  };

  const handlePrevImage = () => {
    if (!listing || !listing.images || listing.images.length <= 1) return;
    const { activeIndex, totalImages } = getActiveImageIndices();
    const prevIndex = (activeIndex - 1 + totalImages) % totalImages;
    setActiveImageUrl(listing.images[prevIndex]);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!listing || !listing.images || listing.images.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (diff > 50) {
      handleNextImage();
    } else if (diff < -50) {
      handlePrevImage();
    }
  };
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useScrollRestoration(`/listing/${id}`, !loading);

  // Write a Review States
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Date selection state
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfToday(),
    to: addDays(startOfToday(), 1)
  });

  const fetchListing = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docPath = `listings/${id}`;
      let docSnap;
      try {
        docSnap = await getDoc(doc(db, 'listings', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, docPath);
      }
      
      if (docSnap && docSnap.exists()) {
        setListing({ id: docSnap.id, ...docSnap.data() } as Listing);
      } else {
        toast.error('Listing not found');
        navigate('/');
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedDates = async () => {
    if (!id) return;
    
    try {
      const bookingsPath = 'bookings';
      const bookingsQuery = query(
        collection(db, bookingsPath),
        where('listingId', '==', id),
        where('status', 'in', ['confirmed', 'approved', 'completed', 'pending'])
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(bookingsQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, bookingsPath);
      }
      const dates: Date[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.checkIn || !data.checkOut) return;
        
        try {
          const start = parseISO(data.checkIn);
          const end = parseISO(data.checkOut);
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
          
          const interval = eachDayOfInterval({ start, end });
          dates.push(...interval);
        } catch (e) {
          console.error("Invalid interval for booking", doc.id, e);
        }
      });
      
      setBlockedDates(dates);
    } catch (error) {
      console.error("Error fetching blocked dates:", error);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const reviewsPath = 'reviews';
      const q = query(
        collection(db, reviewsPath),
        where('listingId', '==', id)
      );
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, reviewsPath);
      }
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];

      const sortedReviews = [...fetchedReviews].sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setReviews(sortedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to leave a review.');
      return;
    }
    if (!newReviewText.trim()) {
      toast.error('Please write some text for your review.');
      return;
    }

    setIsSubmittingReview(true);
    const reviewsPath = 'reviews';
    try {
      await addDoc(collection(db, reviewsPath), {
        userId: user.uid,
        userName: profile?.fullName || user.displayName || 'Guest',
        listingId: id,
        listingTitle: listing.title,
        rating: newReviewRating,
        text: newReviewText.trim(),
        createdAt: serverTimestamp()
      });

      toast.success('Review posted successfully!');
      setNewReviewText('');
      setNewReviewRating(5);

      if (id) {
        await updateListingRating(id);
      }

      await Promise.all([
        fetchListing(),
        fetchReviews()
      ]);
    } catch (err) {
      console.error('Error submitting review:', err);
      handleFirestoreError(err, OperationType.CREATE, reviewsPath);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }
    const reviewPath = `reviews/${reviewId}`;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      toast.success('Review deleted successfully!');

      if (id) {
        await updateListingRating(id);
      }

      await Promise.all([
        fetchListing(),
        fetchReviews()
      ]);
    } catch (err) {
      console.error('Error deleting review:', err);
      handleFirestoreError(err, OperationType.DELETE, reviewPath);
    }
  };

  useEffect(() => {
    setActiveImageUrl(null);
    fetchListing();
    fetchBlockedDates();
    fetchReviews();
  }, [id]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchListing(),
      fetchBlockedDates(),
      fetchReviews()
    ]);
  };

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center">Loading...</div>;
  if (!listing) return null;

  // Calculate total nights
  // As per requirements: same-day booking = 1 day charge
  const calculateNights = () => {
    if (!range?.from) return 0;
    if (!range?.to) return 1; // Start date selected but no end date yet
    
    const diff = differenceInDays(range.to, range.from);
    return diff === 0 ? 1 : diff;
  };

  const nights = calculateNights();
  const totalPrice = nights * listing.price;

  const handleBookNow = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!range?.from) {
      toast.error('Please select booking dates');
      return;
    }

    // Overlap validation
    const checkInISO = range.from.toISOString();
    const checkOutISO = (range.to || range.from).toISOString();
    
    // Server-side query for current status of all bookings for this listing
    const fetchCurrentBookings = async () => {
      const q = query(
        collection(db, 'bookings'),
        where('listingId', '==', id),
        where('status', 'in', ['confirmed', 'approved', 'completed', 'pending'])
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    };

    toast.promise(fetchCurrentBookings(), {
      loading: 'Wait...',
      success: (existingBookings) => {
        const hasOverlap = existingBookings.some((b: any) => 
          checkInISO <= b.checkOut && checkOutISO >= b.checkIn
        );

        if (hasOverlap) {
          throw new Error('These dates are already booked');
        }

        navigate(`/booking/${listing.id}`, { 
          state: { 
            checkIn: checkInISO, 
            checkOut: checkOutISO,
            nights,
            totalPrice
          } 
        });
        return 'Available!';
      },
      error: (err) => err.message || 'Could not check dates'
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 relative">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
        {/* Left: Images */}
        <div className="space-y-8">
          {(() => {
            const { currentImage, activeIndex, totalImages } = getActiveImageIndices();
            return (
              <>
                {/* Main Viewport Container */}
                <div 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="rounded-[2.5rem] overflow-hidden aspect-video border border-secondary shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative group select-none"
                >
                  <OptimizedImage 
                    src={currentImage} 
                    alt={listing.title} 
                    widthSize={1000}
                    qualitySize={80}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-103"
                  />
                  
                  {/* Badge Label */}
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest text-heading shadow-sm z-10">
                    Best Choice
                  </div>

                  {totalImages > 1 && (
                    <>
                      {/* Swipe / Navigation Left Button */}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          handlePrevImage();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/75 hover:bg-white text-heading md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer z-20 backdrop-blur-md"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft size={22} className="text-heading" strokeWidth={2.5} />
                      </button>

                      {/* Swipe / Navigation Right Button */}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          handleNextImage();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/75 hover:bg-white text-heading md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer z-20 backdrop-blur-md"
                        aria-label="Next Slide"
                      >
                        <ChevronRight size={22} className="text-heading" strokeWidth={2.5} />
                      </button>

                      {/* Interactive Bottom Dots Overlay */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full max-w-[80%] overflow-x-auto scrollbar-none">
                        {listing.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageUrl(listing.images[idx]);
                            }}
                            className={`w-2 h-2 rounded-full transition-all duration-300 shrink-0 ${
                              idx === activeIndex 
                                ? 'bg-[#D4AF37] w-5 shadow-[0_0_8px_rgba(212,175,55,0.8)]' 
                                : 'bg-white/50 hover:bg-white/80'
                            }`}
                            aria-label={`Go to slide ${idx + 1}`}
                          />
                        ))}
                      </div>

                      {/* Floating Counter Badge */}
                      <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest text-white shadow-md border border-white/10 z-20">
                        {activeIndex + 1} / {totalImages}
                      </div>
                    </>
                  )}
                </div>

                {/* Sub-thumb Grid listing all images completely */}
                {listing.images && listing.images.length > 0 && (
                  <div className="grid gap-3.5 grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 transition-all duration-500">
                    {listing.images.map((img, i) => {
                      const isActive = img === currentImage;
                      return (
                        <div 
                          key={i} 
                          id={`thumbnail-selection-${i}`}
                          onClick={() => setActiveImageUrl(img)}
                          className={`rounded-2xl overflow-hidden aspect-square border-2 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 ${
                            isActive ? 'border-primary-dark scale-95 ring-2 ring-primary-dark/20' : 'border-secondary/60 hover:border-body/30'
                          }`}
                        >
                          <OptimizedImage 
                            src={img} 
                            alt={`${listing.title} ${i+1}`} 
                            widthSize={150}
                            qualitySize={60}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}

          <div className="space-y-4 pt-4 border-t border-secondary">
            <div className="flex items-center gap-3 text-primary-dark">
              <div className="w-1 h-5 bg-primary-dark rounded-full" />
              <h3 className="font-black uppercase tracking-[0.2em] text-xs text-heading">About this place</h3>
            </div>
            <p className="text-body/80 leading-relaxed text-sm md:text-base font-medium">
              {listing.description}
            </p>
          </div>
        </div>

        {/* Right: Info & Pricing & Calendar */}
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter text-heading uppercase leading-tight">{listing.title}</h1>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-body/60 text-xs font-black uppercase tracking-widest">
                <MapPin size={14} className="text-primary-dark" />
                <span>{listing.location}</span>
                {listing.locationName && (
                  <>
                    <span className="text-secondary">•</span>
                    <span>{listing.locationName}</span>
                  </>
                )}
              </div>
              {listing.latitude && listing.longitude && (
                <button 
                  onClick={() => safeOpenExternalApp(`https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`)}
                  className="w-fit flex items-center gap-2 text-[10px] font-black text-primary-dark uppercase tracking-widest hover:underline transition-all"
                >
                  View on Map
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-secondary p-8 md:p-10 space-y-8 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.03)]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl -z-10 rounded-full" />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body/40 text-[9px] uppercase font-black tracking-[0.25em] mb-2 uppercase">Price per night</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-semibold text-heading tracking-tighter">Rs. {listing.price.toLocaleString()}</span>
                  <span className="text-body/40 text-xs font-bold uppercase tracking-widest">Included</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary-dark border border-primary/10">
                <CalendarIcon size={24} />
              </div>
            </div>

            {/* Calendar Integration */}
            <div className="space-y-6 pt-8 border-t border-secondary">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-heading/40">
                <span>Selected Dates</span>
                {range?.from && range?.to && !isNaN(range.from.getTime()) && !isNaN(range.to.getTime()) ? (
                  <span className="text-primary-dark">{format(range.from, 'MMM d')} — {format(range.to, 'MMM d')}</span>
                ) : range?.from && !isNaN(range.from.getTime()) ? (
                  <span className="text-primary-dark">Arrival {format(range.from, 'MMM d')}</span>
                ) : null}
              </div>
              
              <div className="flex justify-center bg-background rounded-[2rem] p-4 border border-secondary">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  disabled={[
                    { before: startOfToday() },
                    ...blockedDates
                  ]}
                  numberOfMonths={1}
                  className="mx-auto luxury-picker"
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-background/50 p-6 rounded-3xl border border-secondary/50 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-body/60">
                <span>{listing.price.toLocaleString()} x {nights} {nights === 1 ? 'day' : 'days'}</span>
                <span className="text-heading">Rs. {totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-secondary">
                <span className="text-xs font-black text-heading uppercase tracking-[0.2em]">Total Price</span>
                <span className="text-2xl font-semibold text-primary-dark tracking-tighter">Rs. {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={handleBookNow}
              disabled={!range?.from}
              className="primary-button w-full py-6 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(166,124,82,0.2)]"
            >
              Book Now
            </button>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-secondary flex gap-5 items-start shadow-sm">
             <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-primary-dark shrink-0">
               <InfoIcon size={20} />
             </div>
             <div className="space-y-1.5">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-heading">Direct WhatsApp Booking</h4>
               <p className="text-[11px] text-body/60 leading-relaxed font-medium tracking-wide">
                 No online payment required. Instantly connect with our team on WhatsApp to confirm your dates and reservation.
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-10 pt-20">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-px h-12 bg-secondary" />
          <h2 className="text-3xl font-semibold uppercase tracking-tighter text-heading">User <span className="text-primary-dark italic font-normal">Reviews</span></h2>
          <div className="flex items-center gap-4 text-[10px] text-body/40 font-black uppercase tracking-[0.25em]">
            <div className="flex items-center gap-1.5">
              <Star size={10} fill="currentColor" className="text-primary-dark" />
              <span>{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'No'} Avg</span>
            </div>
            <div className="w-1 h-1 bg-secondary rounded-full" />
            <span>{reviews.length} Reviews</span>
          </div>
        </div>

        {/* Dynamic Interactive Write a Review Form */}
        {user ? (
          <div className="max-w-xl mx-auto w-full bg-white p-8 md:p-10 rounded-[2.5rem] border border-secondary shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-heading text-center">
              Share Your <span className="text-primary-dark italic font-normal text-lg lowercase">Feedback</span>
            </h3>
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div className="space-y-2 flex flex-col items-center text-center">
                <label className="text-[9px] font-black uppercase tracking-widest text-body/40">Select Stars</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      className={`transition-all transform hover:scale-125 duration-300 ${
                        star <= newReviewRating ? 'text-primary-dark' : 'text-secondary/40'
                      }`}
                    >
                      <Star size={24} fill={star <= newReviewRating ? 'currentColor' : 'none'} strokeWidth={1} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-body/40 ml-1">Review Comment</label>
                <textarea
                  required
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="Tell others what you loved about your stay..."
                  className="w-full bg-background/30 border border-secondary rounded-[1.75rem] p-5 h-28 text-xs focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none italic font-medium leading-relaxed placeholder:text-body/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full bg-primary-dark text-white font-black uppercase tracking-widest py-4.5 rounded-[1.25rem] text-[9px] hover:bg-heading hover:shadow-md transition-all duration-300 cursor-pointer"
              >
                {isSubmittingReview ? 'Posting...' : 'Post Review'}
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-xl mx-auto w-full bg-zinc-50 border border-secondary border-dashed p-8 rounded-[2rem] text-center">
            <p className="text-[10px] text-body/40 font-black uppercase tracking-widest">
              Please log in to write a review.
            </p>
          </div>
        )}

        {reviewsLoading ? (
          <div className="h-40 flex flex-col items-center justify-center text-body gap-4">
            <div className="w-12 h-px bg-secondary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Accessing archives...</span>
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-8 rounded-[2rem] border border-secondary shadow-subtle hover:shadow-md transition-all duration-700">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background border border-secondary flex items-center justify-center text-primary-dark">
                      <User size={18} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black tracking-widest uppercase text-heading">{String(review.userName || 'Anonymous')}</h4>
                      <p className="text-[9px] text-body/40 font-medium uppercase tracking-widest pt-1">
                        {(() => {
                          if (review.createdAt?.seconds) {
                            const date = new Date(review.createdAt.seconds * 1000);
                            return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMMM yyyy');
                          }
                          return 'Recent';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={8} 
                          fill={star <= review.rating ? "currentColor" : "none"} 
                          className={star <= review.rating ? "text-primary-dark" : "text-secondary"} 
                        />
                      ))}
                    </div>
                    {user && user.uid === review.userId && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-[9px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest cursor-pointer hover:underline transition-colors mt-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-body/70 text-sm leading-relaxed italic font-medium tracking-wide">
                  "{review.text}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-secondary border-dashed rounded-[3rem] p-20 text-center flex flex-col items-center">
            <Star size={32} className="text-secondary mb-6" />
            <h3 className="text-xs font-black text-heading uppercase tracking-[0.3em] mb-2">No reviews yet</h3>
            <p className="text-[11px] text-body/40 font-medium tracking-wide">Be the first to leave a review.</p>
          </div>
        )}
      </div>

      {/* Booking Authentication Modal */}
      {showAuthModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowAuthModal(false)}
        >
          <div 
            className="bg-white rounded-[2.5rem] border border-secondary p-8 sm:p-10 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary-dark mx-auto border border-primary/20">
                <Lock size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-tight text-heading">
                Account <span className="text-primary-dark italic font-normal">Required</span>
              </h3>
              <p className="text-xs text-body/70 leading-relaxed font-medium">
                Please login or create an account to continue with your booking.
              </p>
            </div>

            {listing && (
              <div className="bg-background/60 p-4 rounded-2xl border border-secondary space-y-2 text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary-dark truncate">
                  {listing.title}
                </div>
                <div className="flex items-center justify-between text-xs text-body/60">
                  <span>{listing.location || 'Bin Usman Luxury'} • Rs. {listing.price?.toLocaleString()}/night</span>
                  {range?.from && (
                    <span className="font-bold text-heading">
                      {nights} {nights === 1 ? 'night' : 'nights'}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/login', {
                    state: {
                      from: `/booking/${listing.id}`,
                      bookingState: {
                        checkIn: range?.from ? range.from.toISOString() : new Date().toISOString(),
                        checkOut: range?.to ? range.to.toISOString() : (range?.from ? range.from.toISOString() : new Date(Date.now() + 86400000).toISOString()),
                        nights: nights > 0 ? nights : 1,
                        totalPrice: totalPrice > 0 ? totalPrice : listing.price
                      },
                      listingId: listing.id
                    }
                  });
                }}
                className="primary-button w-full h-14 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Login
              </button>

              <button
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/register', {
                    state: {
                      from: `/booking/${listing.id}`,
                      bookingState: {
                        checkIn: range?.from ? range.from.toISOString() : new Date().toISOString(),
                        checkOut: range?.to ? range.to.toISOString() : (range?.from ? range.from.toISOString() : new Date(Date.now() + 86400000).toISOString()),
                        nights: nights > 0 ? nights : 1,
                        totalPrice: totalPrice > 0 ? totalPrice : listing.price
                      },
                      listingId: listing.id
                    }
                  });
                }}
                className="w-full h-14 rounded-full border border-secondary bg-white text-heading hover:border-primary-dark hover:text-primary-dark text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center"
              >
                Create Account
              </button>

              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-body/40 hover:text-heading transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
