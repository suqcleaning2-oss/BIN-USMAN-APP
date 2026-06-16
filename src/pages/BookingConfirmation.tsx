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
  hostCode?: string;
  listingCode?: string;
  bookingType?: '12hrs' | '24hrs' | 'both';
  price12hrs?: number;
  price24hrs?: number;
}

export default function BookingConfirmation() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hostCode, setHostCode] = useState('');
  const [listingCode, setListingCode] = useState('');
  
  // Custom Date Time and Duration State
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('10:00');
  const [durationType, setDurationType] = useState<'12h' | '24h'>('12h');
  const [newDateInput, setNewDateInput] = useState('');
  const [adminBlockedDates, setAdminBlockedDates] = useState<string[]>([]);
  const [reservedDates, setReservedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Get booking details from navigation state
  const bookingData = location.state || {
    checkIn: new Date().toISOString(),
    checkOut: new Date(Date.now() + 86400000).toISOString(),
    nights: 1,
    totalPrice: 0
  };

  // Populate selectedDates dynamically based on initial checkIn/checkOut transition
  useEffect(() => {
    if (bookingData?.checkIn) {
      const dates: string[] = [];
      const start = new Date(bookingData.checkIn);
      const end = new Date(bookingData.checkOut || bookingData.checkIn);
      
      const current = new Date(start);
      let count = 0;
      while (current <= end && count < 60) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current.setDate(current.getDate() + 1);
        count++;
      }
      
      const uniqueDates = Array.from(new Set(dates)).sort();
      if (uniqueDates.length > 0) {
        setSelectedDates(uniqueDates);
      }
    } else {
      setSelectedDates([format(new Date(), 'yyyy-MM-dd')]);
    }
  }, [bookingData?.checkIn, bookingData?.checkOut]);

  // Enforce single date restriction for 12h duration
  useEffect(() => {
    if (durationType === '12h' && selectedDates.length > 1) {
      setSelectedDates([selectedDates[0]]);
      toast.warning('12 Hours duration is restricted to a single day.');
    }
  }, [durationType, selectedDates.length]);

  // Derived calculations helper
  const getCalculatedFields = () => {
    if (selectedDates.length === 0) {
      return {
        totalHours: 0,
        endTime: '',
        startDate: '',
        endDate: '',
        startTimeStr: ''
      };
    }

    const sortedDates = [...selectedDates].sort();
    const startDateStr = sortedDates[0];
    const endDateStr = sortedDates[sortedDates.length - 1];

    const days = sortedDates.length;
    const hoursPerDay = durationType === '12h' ? 12 : 24;
    const totalHours = days * hoursPerDay;

    // Parse start time (e.g. "10:00")
    let formattedEndTime = '';
    let formattedStartTime = '10:00 AM';
    try {
      const startDateTime = new Date(`${startDateStr}T${startTime.padStart(5, '0')}:00`);
      if (!isNaN(startDateTime.getTime())) {
        const endDateTime = new Date(startDateTime.getTime() + totalHours * 60 * 60 * 1000);
        formattedStartTime = format(startDateTime, 'hh:mm a');
        formattedEndTime = format(endDateTime, 'PPP, EEEE, hh:mm a');
      }
    } catch (e) {
      console.error(e);
      formattedEndTime = 'Error calculating endTime';
    }

    return {
      totalHours,
      endTime: formattedEndTime,
      startDate: startDateStr,
      endDate: endDateStr,
      startTimeStr: formattedStartTime
    };
  };

  const calculated = getCalculatedFields();

  // Helper to generate coordinates for visual monthly calendar
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Add empty placeholder objects or previous month's final days for offset
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }
    
    // Add current month's days
    for (let d = 1; d <= daysCount; d++) {
      const dayISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr: dayISO, dayNum: d, isCurrentMonth: true });
    }
    
    return days;
  };

  // Add date to selectedDates list
  const handleAddDate = (dateStr: string) => {
    if (!dateStr) {
      toast.error('Please select a valid date');
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateStr < todayStr) {
      toast.error('Cannot book a past date!');
      return;
    }

    if (adminBlockedDates.includes(dateStr)) {
      toast.error('This date is blocked by the administrator.');
      return;
    }

    if (reservedDates.includes(dateStr)) {
      toast.error('This date is already reserved/booked.');
      return;
    }

    if (durationType === '12h') {
      setSelectedDates([dateStr]);
      toast.success(`Date updated to ${format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')}`);
      return;
    }
    if (selectedDates.includes(dateStr)) {
      toast.warning('This date is already selected!');
      return;
    }
    const updated = [...selectedDates, dateStr].sort();
    setSelectedDates(updated);
    toast.success(`Date ${dateStr} added!`);
  };

  // Remove date from selectedDates list
  const handleRemoveDate = (dateStr: string) => {
    if (selectedDates.length <= 1) {
      toast.error('You must keep at least one booking date!');
      return;
    }
    const updated = selectedDates.filter(d => d !== dateStr);
    setSelectedDates(updated);
    toast.info('Date removed');
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
        const data = { id: docSnap.id, ...docSnap.data() } as any;
        setListing(data);
        setHostCode(data.hostCode || 'BU-HOST');
        setListingCode(data.listingCode || `LST-${docSnap.id.slice(-4).toUpperCase()}`);
        
        // Extract blockedDates from listing
        if (data.blockedDates && Array.isArray(data.blockedDates)) {
          const formattedBlocks = data.blockedDates.map((d: any) => {
            if (typeof d === 'string') {
              return d.slice(0, 10);
            } else if (d && d.toDate) {
              return format(d.toDate(), 'yyyy-MM-dd');
            } else if (d instanceof Date) {
              return format(d, 'yyyy-MM-dd');
            }
            return String(d);
          });
          setAdminBlockedDates(formattedBlocks);
        } else {
          setAdminBlockedDates([]);
        }

        if (data.bookingType === '12hrs') {
          setDurationType('12h');
        } else if (data.bookingType === '24hrs') {
          setDurationType('24h');
        }
      } else {
        toast.error('Listing not found');
        navigate('/');
        return;
      }

      // Fetch reserved dates from bookings query
      const bookingsPath = 'bookings';
      const bookingsQuery = query(
        collection(db, bookingsPath),
        where('listingId', '==', id),
        where('status', 'in', ['confirmed', 'approved', 'completed', 'pending'])
      );
      
      const snapshot = await getDocs(bookingsQuery);
      const reserved: string[] = [];
      snapshot.forEach(docSnap => {
        const dData = docSnap.data();
        if (dData.selectedDates && Array.isArray(dData.selectedDates)) {
          dData.selectedDates.forEach((dStr: string) => {
            reserved.push(dStr.slice(0, 10));
          });
        } else if (dData.checkIn && dData.checkOut) {
          // fallback
          try {
            const start = new Date(dData.checkIn);
            const end = new Date(dData.checkOut);
            const current = new Date(start);
            let count = 0;
            while (current <= end && count < 60) {
              reserved.push(format(current, 'yyyy-MM-dd'));
              current.setDate(current.getDate() + 1);
              count++;
            }
          } catch (e) {
            console.error("Interval calculation error in list fallback:", e);
          }
        }
      });
      setReservedDates(Array.from(new Set(reserved)));
      
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

    // Double check reserved and blocked dates to prevent force/bypass submit
    const hasBlockedDate = selectedDates.some(d => adminBlockedDates.includes(d));
    if (hasBlockedDate) {
      toast.error('One or more of your selected dates is blocked by the administrator.');
      return;
    }

    const hasReservedDate = selectedDates.some(d => reservedDates.includes(d));
    if (hasReservedDate) {
      toast.error('One or more of your selected dates is already reserved/booked.');
      return;
    }

    const activeDailyPrice = durationType === '12h' ? (listing.price12hrs || listing.price) : (listing.price24hrs || listing.price);
    const currentTotalPrice = durationType === '12h' ? activeDailyPrice : activeDailyPrice * selectedDates.length;
    
    if (isNaN(currentTotalPrice) || currentTotalPrice <= 0) {
      toast.error('Invalid Amount! Payment amount must be greater than 0. Please select at least one date.');
      return;
    }

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
      
      const isOverlapping = overlapSnapshot.docs.some(doc => {
        const existingData = doc.data();
        const existingDates = existingData.selectedDates || [];
        
        // Match specific dates if they overlap
        if (existingDates.length > 0 && selectedDates.length > 0) {
          return selectedDates.some(d => existingDates.includes(d));
        }

        // Fallback for older entries using ranges
        const existingCheckIn = existingData.checkIn || existingData.startDate;
        const existingCheckOut = existingData.checkOut || existingData.endDate;
        const newCheckIn = calculated.startDate;
        const newCheckOut = calculated.endDate;

        if (newCheckIn && newCheckOut && existingCheckIn && existingCheckOut) {
          return newCheckIn <= existingCheckOut && newCheckOut >= existingCheckIn;
        }
        return false;
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
          amount: currentTotalPrice,
          totalPrice: currentTotalPrice,
          price: activeDailyPrice, // Use active pricing rate
          checkIn: calculated.startDate,
          checkOut: calculated.endDate,
          nights: selectedDates.length,
          status: 'pending',
          paymentStatus: 'pending',
          hostCode: hostCode,
          listingCode: listingCode,
          
          // Enhanced parameters
          startDate: calculated.startDate,
          endDate: calculated.endDate,
          selectedDates: selectedDates,
          startTime: calculated.startTimeStr,
          endTime: calculated.endTime,
          totalHours: calculated.totalHours,
          durationType: durationType,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'bookings');
        throw err;
      }

      console.log("Booking document created in Firestore with status pending:", bookingRef.id);

      // Create admin notification (failsafe to not disrupt the main booking/payment flow if notifications fail)
      try {
        const displayDuration = durationType === '12h' ? '12hrs' : '24hrs';
        await addDoc(collection(db, 'notifications'), {
          title: "New Booking Request",
          message: `${listing.title} has been booked for ${displayDuration} by user.`,
          timestamp: serverTimestamp(),
          read: false
        });
        console.log("Admin notification created successfully in Firestore.");
      } catch (notifErr) {
        console.error("Safe notification warning: Failed to create admin notification in Firestore:", notifErr);
      }

      // Register with backend memory to allow checkout simulation flow
      try {
        await fetch('/api/bookings/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: bookingRef.id,
            userId: user.uid,
            listingId: listing.id,
            listingTitle: listing.title,
            amount: currentTotalPrice,
            checkIn: calculated.startDate,
            checkOut: calculated.endDate,
            nights: selectedDates.length
          })
        });
      } catch (err) {
        console.error("Backend track registration warning:", err);
      }

      toast.success("Booking Created! Redirecting to Cashmaal Payment Gateway..."); 
      
      // Submit form dynamically to Cashmaal as requested!
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.cashmaal.com/Pay/';

      const fields: Record<string, string> = {
        web_id: '11354',
        amount: String(currentTotalPrice),
        currency: 'PKR',
        track_id: bookingRef.id,
        client_email: user.email || '',
        success_url: `${window.location.origin}/payment/status/processing?id=${bookingRef.id}`,
        cancel_url: `${window.location.origin}/payment/status/cancelled?id=${bookingRef.id}`
      };

      Object.keys(fields).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      
    } catch (error) {
      console.error("Payment redirect error:", error);
      toast.error('Booking creation failed. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center">Loading...</div>;
  if (!listing) return null;

  const displayCheckIn = (() => {
    return calculated.startDate ? format(new Date(calculated.startDate + 'T00:00:00'), 'PPP') : 'Select Date';
  })();
  
  const displayCheckOut = (() => {
    return calculated.endDate ? format(new Date(calculated.endDate + 'T00:00:00'), 'PPP') : 'Select Date';
  })();

  const activeDailyPrice = durationType === '12h' ? (listing.price12hrs || listing.price) : (listing.price24hrs || listing.price);
  const currentTotalPrice = durationType === '12h' ? activeDailyPrice : activeDailyPrice * selectedDates.length;

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
    <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
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
                   <p className="text-[10px] text-body/60 uppercase font-black tracking-widest">Start Date</p>
                   <p className="font-black text-heading text-sm">{displayCheckIn}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] text-body/60 uppercase font-black tracking-widest">End Date (Estimate)</p>
                   <p className="font-black text-heading text-sm">{displayCheckOut}</p>
                 </div>
               </div>

               <div className="flex items-center justify-between py-2">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-body/60 uppercase font-black tracking-widest">Price Info</span>
                   <span className="font-bold text-body">
                     Rs. {activeDailyPrice.toLocaleString()} {durationType === '12h' ? 'per 12 hours' : `x ${selectedDates.length} days (${calculated.totalHours} hrs)`}
                   </span>
                 </div>
                 <span className="text-lg font-black text-heading">Rs. {currentTotalPrice.toLocaleString()}</span>
               </div>
             </div>

            <div className="flex items-center justify-between pt-4 border-t border-secondary/30">
              <span className="text-body font-black uppercase text-xs tracking-widest">Total to pay</span>
              <span className="text-3xl font-black text-primary">Rs. {currentTotalPrice.toLocaleString()}</span>
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
              <h2 className="text-xl font-black uppercase tracking-tight text-heading">Payment & Setup</h2>
            </div>
            <p className="text-body font-medium text-sm">Configure your booking duration and codes.</p>
          </div>

          <div className="glass-card flex flex-col items-center justify-center gap-8 py-10 relative overflow-hidden group bg-white/80">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handlePayRedirect();
              }}
              className="w-full relative z-10 px-6 space-y-5"
            >
              <div className="space-y-4 text-left border-b border-secondary/30 pb-4 mb-4">
                {/* Visual Premium Interactive Calendar with Blocked & Reserved Dates */}
                <div className="space-y-3 bg-zinc-50 border border-secondary/35 p-5 rounded-2xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Interactive Calendar</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(currentMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setCurrentMonth(prev);
                        }}
                        className="p-1 px-2.5 bg-white border border-secondary/40 rounded-lg text-xs font-black text-heading hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        ←
                      </button>
                      <span className="text-xs font-black uppercase text-heading px-2 min-w-[90px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(currentMonth);
                          next.setMonth(next.getMonth() + 1);
                          setCurrentMonth(next);
                        }}
                        className="p-1 px-2.5 bg-white border border-secondary/40 rounded-lg text-xs font-black text-heading hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-body/40 mb-1">
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 animate-in fade-in duration-300">
                    {getDaysInMonth(currentMonth).map((day, idx) => {
                      if (!day.isCurrentMonth) {
                        return <div key={`empty-${idx}`} className="h-8" />;
                      }

                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const isPast = day.dateStr < todayStr;
                      const isBlocked = adminBlockedDates.includes(day.dateStr);
                      const isReserved = reservedDates.includes(day.dateStr);
                      const isSelected = selectedDates.includes(day.dateStr);

                      let cellStyle = "h-8 w-full text-xs font-bold rounded-lg transition-all flex items-center justify-center relative cursor-pointer ";
                      let titleStr = format(new Date(day.dateStr + 'T00:00:00'), 'MMM d, yyyy');
                      let isDisabled = false;

                      if (isPast) {
                        cellStyle += "bg-zinc-100 text-zinc-300 opacity-40 cursor-not-allowed";
                        isDisabled = true;
                        titleStr += " - Past Date";
                      } else if (isBlocked) {
                        cellStyle += "bg-zinc-800 text-zinc-400 opacity-60 line-through cursor-not-allowed border border-secondary/30";
                        isDisabled = true;
                        titleStr += " - Manually Blocked by Admin";
                      } else if (isReserved) {
                        cellStyle += "border-2 border-dashed border-red-500 bg-red-50 text-red-600 font-bold line-through cursor-not-allowed";
                        isDisabled = true;
                        titleStr += " - Already Reserved";
                      } else if (isSelected) {
                        cellStyle += "bg-[#9c27b0] text-white font-black scale-105 shadow-sm hover:opacity-95";
                      } else {
                        cellStyle += "bg-white hover:bg-primary/10 text-heading border border-secondary/30 hover:scale-105 active:scale-95";
                      }

                      return (
                        <button
                          key={`day-${day.dateStr}`}
                          type="button"
                          disabled={isDisabled}
                          title={titleStr}
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveDate(day.dateStr);
                            } else {
                              handleAddDate(day.dateStr);
                            }
                          }}
                          className={cellStyle}
                        >
                          {day.dayNum}
                          {isReserved && (
                            <span className="absolute bottom-0.5 w-1 h-1 bg-red-500 rounded-full" />
                          )}
                          {isBlocked && (
                            <span className="absolute bottom-0.5 w-1 w-[3px] h-[3px] bg-zinc-600 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-3 border-t border-secondary/30 text-[9px] font-black text-body/50 uppercase tracking-widest mt-2 px-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-white border border-secondary/30 rounded-md inline-block shadow-sm" />
                      <span>Free</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#9c27b0] rounded-md inline-block" />
                      <span>Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-zinc-800 border border-secondary/40 rounded-md inline-block" />
                      <span>Blocked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-red-50 border border-red-400 rounded-md inline-block" />
                      <span className="text-red-500 font-bold">Booked</span>
                    </div>
                  </div>
                </div>

                {/* Date Picker Multi selection helper */}
                <div className="space-y-2 pt-2 border-t border-secondary/20">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Or Add Date Manually</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 bg-background/30 border border-secondary/50 rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      value={newDateInput}
                      onChange={(e) => setNewDateInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleAddDate(newDateInput);
                        setNewDateInput('');
                      }}
                      className="bg-primary/20 hover:bg-primary/30 text-primary font-black px-4 rounded-xl text-[10px] uppercase tracking-widest transition-colors border border-primary/20 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Selected list */}
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[9px] text-body/45 uppercase font-black tracking-wider">Selected Dates ({selectedDates.length}):</p>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 rounded-lg border border-secondary/30 max-h-32 overflow-y-auto">
                      {selectedDates.map((d) => (
                        <span key={d} className="inline-flex items-center gap-1.5 bg-white border border-secondary px-2.5 py-1 rounded-lg text-[10px] font-bold text-heading shadow-sm">
                          {format(new Date(d + 'T00:00:00'), 'MMM d, yyyy')}
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(d)}
                            className="text-red-500 hover:text-red-700 font-bold ml-1 transition-colors hover:scale-110"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {selectedDates.length === 0 && (
                        <p className="text-[10px] text-body/30 italic p-1">No dates selected. Please add dates.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Start Time (24h-format)</label>
                  <input
                    type="time"
                    required
                    className="w-full bg-background/30 border border-secondary/50 rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                {/* Duration selector */}
                {listing.bookingType === '12hrs' || listing.bookingType === '24hrs' ? (
                  <div className="space-y-1.5 bg-zinc-50 border border-secondary/20 p-4 rounded-xl">
                    <label className="text-[10px] text-body/40 uppercase font-black tracking-widest ml-1">Daily Duration Type</label>
                    <p className="text-xs font-black text-heading ml-1">
                      {listing.bookingType === '12hrs' ? '12 Hours Booking (Single Day Restrained)' : '24 Hours Booking (Multi-Day Allowed)'}
                    </p>
                    <p className="text-[9px] text-body/45 ml-1 leading-normal italic">
                      This property is strictly configured to accept {listing.bookingType === '12hrs' ? 'half-day (12 hours)' : 'full-day (24 hours)'} stays.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Daily Duration Type (Choose between 12h / 24h)</label>
                    <select
                      className="w-full bg-background/30 border border-secondary/50 rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all cursor-pointer"
                      value={durationType}
                      onChange={(e) => setDurationType(e.target.value as '12h' | '24h')}
                    >
                      <option value="12h">12 hours per day (Single-day only)</option>
                      <option value="24h">24 hours per day (Multi-day allowed)</option>
                    </select>
                  </div>
                )}

                {/* Calculated fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Total Hours</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-zinc-100 border border-secondary/50 rounded-xl px-4 py-3 text-xs font-bold text-body/60 cursor-not-allowed"
                      value={`${calculated.totalHours} hours`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Leave Time (Estimated)</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-zinc-100 border border-secondary/50 rounded-xl px-4 py-3 text-xs font-bold text-primary cursor-not-allowed overflow-hidden text-ellipsis whitespace-nowrap"
                      value={calculated.endTime || 'N/A'}
                      title={calculated.endTime}
                    />
                  </div>
                </div>

                {/* Host and Listing code */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Host Code (Auto-populated)</label>
                  <input
                    type="text"
                    required
                    disabled
                    readOnly
                    placeholder="BU-HOST"
                    className="w-full bg-zinc-100 border border-secondary/30 rounded-xl px-4 py-3 text-xs font-bold text-body/60 cursor-not-allowed transition-all"
                    value={hostCode}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">Listing Code (Auto-populated)</label>
                  <input
                    type="text"
                    required
                    disabled
                    readOnly
                    placeholder="LST-XXX"
                    className="w-full bg-zinc-100 border border-secondary/30 rounded-xl px-4 py-3 text-xs font-bold text-body/60 cursor-not-allowed transition-all"
                    value={listingCode}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isRedirecting}
                style={{
                  backgroundColor: '#9c27b0',
                  color: 'white',
                  padding: '16px 24px',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isRedirecting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 900,
                  width: '100%',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxShadow: '0 10px 25px -5px rgba(156, 39, 176, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                className="hover:translate-y-[-2px] active:translate-y-[1px] duration-300"
              >
                {isRedirecting ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </span>
                ) : (
                  "Pay with Cashmaal (EasyPaisa/JazzCash / bank transfer)"
                )}
              </button>
            </form>
            
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
