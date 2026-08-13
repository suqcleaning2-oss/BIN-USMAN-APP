import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  MessageSquare, 
  User, 
  Phone, 
  Mail, 
  Users, 
  BedDouble, 
  CheckCircle2, 
  Clock, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { RefreshButton } from '../components/RefreshButton';
import { usePersistentState, useScrollRestoration } from '../lib/lifecycle-utils';
import { 
  BIN_USMAN_WHATSAPP_NUMBER, 
  BIN_USMAN_WHATSAPP_DISPLAY,
  generateWhatsAppBookingMessage, 
  openWhatsAppChat,
  getWhatsAppClickToChatUrl 
} from '../lib/whatsapp-utils';
import { formatCityName } from '../lib/city-utils';

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
  locationName?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  hostCode?: string;
  listingCode?: string;
  bookingType?: '12hrs' | '24hrs' | 'both';
  price12hrs?: number;
  price24hrs?: number;
  guests?: number;
  bedrooms?: number;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [preparedWhatsAppMessage, setPreparedWhatsAppMessage] = useState<string>('');

  const [hostCode, setHostCode] = usePersistentState(`binusman_booking_host_code_${id}`, '');
  const [listingCode, setListingCode] = usePersistentState(`binusman_booking_listing_code_${id}`, '');
  
  // Custom Date Time and Duration State
  const [selectedDates, setSelectedDates] = usePersistentState<string[]>(`binusman_booking_dates_${id}`, []);
  const [startTime, setStartTime] = usePersistentState(`binusman_booking_start_time_${id}`, '10:00');
  const [durationType, setDurationType] = usePersistentState<'12h' | '24h'>(`binusman_booking_duration_${id}`, '12h');
  const [newDateInput, setNewDateInput] = useState('');
  const [adminBlockedDates, setAdminBlockedDates] = useState<string[]>([]);
  const [reservedDates, setReservedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Guest details form state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [roomCount, setRoomCount] = useState<number>(1);

  useScrollRestoration(`/booking/${id}`, !loading);

  // Initialize guest info from authenticated profile
  useEffect(() => {
    if (user) {
      setGuestEmail(user.email || '');
      setGuestName(profile?.fullName || profile?.name || user.displayName || '');
      setGuestPhone(profile?.phone || '');
    }
  }, [user, profile]);

  // Get booking details from navigation state
  const bookingData = location.state || {
    checkIn: new Date().toISOString(),
    checkOut: new Date(Date.now() + 86400000).toISOString(),
    nights: 1,
    totalPrice: 0
  };

  // Populate selectedDates dynamically based on initial checkIn/checkOut transition
  useEffect(() => {
    if (selectedDates && selectedDates.length > 0) return;

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
  }, [bookingData?.checkIn, bookingData?.checkOut, id]);

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

  // Helper to generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }
    
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
      toast.error('This date is already reserved.');
      return;
    }

    if (durationType === '12h') {
      setSelectedDates([dateStr]);
      toast.success(`Date set to ${format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')}`);
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
        where('status', 'in', ['confirmed', 'approved', 'completed', 'pending', 'whatsapp_pending'])
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
            console.error("Interval calculation error:", e);
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
  }, [id]);

  const handleRefresh = async () => {
    await fetchListing();
  };

  const handleConfirmBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !listing) return;

    if (isSubmitting) return; // Prevent duplicate clicks

    // Validation
    if (!guestName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!guestPhone.trim()) {
      toast.error('Please provide a contact phone number.');
      return;
    }
    if (selectedDates.length === 0) {
      toast.error('Please select at least one booking date.');
      return;
    }

    const hasBlockedDate = selectedDates.some(d => adminBlockedDates.includes(d));
    if (hasBlockedDate) {
      toast.error('One or more of your selected dates is blocked by the administrator.');
      return;
    }

    const hasReservedDate = selectedDates.some(d => reservedDates.includes(d));
    if (hasReservedDate) {
      toast.error('One or more of your selected dates is already reserved. Please choose different dates.');
      return;
    }

    const activeDailyPrice = durationType === '12h' ? (listing.price12hrs || listing.price) : (listing.price24hrs || listing.price);
    const currentTotalPrice = durationType === '12h' ? activeDailyPrice : activeDailyPrice * selectedDates.length;
    
    if (isNaN(currentTotalPrice) || currentTotalPrice <= 0) {
      toast.error('Invalid booking calculation. Please select valid dates.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Double check for overlaps in Firestore before saving
      const overlapQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', listing.id),
        where('status', 'in', ['confirmed', 'approved', 'completed', 'pending', 'whatsapp_pending'])
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
        
        if (existingDates.length > 0 && selectedDates.length > 0) {
          return selectedDates.some(d => existingDates.includes(d));
        }

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
        setIsSubmitting(false);
        return;
      }

      const displayCity = formatCityName(listing.city || listing.location);
      const displayLocation = listing.location ? `${listing.location}, ${displayCity}` : displayCity;

      const checkInFormatted = calculated.startDate 
        ? format(new Date(calculated.startDate + 'T00:00:00'), 'MMM d, yyyy') + (calculated.startTimeStr ? ` (${calculated.startTimeStr})` : '')
        : 'N/A';
      const checkOutFormatted = calculated.endDate 
        ? format(new Date(calculated.endDate + 'T00:00:00'), 'MMM d, yyyy') + (calculated.endTime ? ` (${calculated.endTime})` : '')
        : 'N/A';

      // 2. Create the Firestore booking with status "whatsapp_pending"
      let bookingRef;
      try {
        bookingRef = await addDoc(collection(db, 'bookings'), {
          userId: user.uid,
          userName: guestName.trim(),
          guestName: guestName.trim(),
          userEmail: user.email || guestEmail.trim(),
          userPhone: guestPhone.trim(),
          phone: guestPhone.trim(),
          listingId: listing.id,
          listingTitle: listing.title,
          title: listing.title,
          location: listing.location,
          locationName: listing.locationName || null,
          city: displayCity,
          amount: currentTotalPrice,
          totalPrice: currentTotalPrice,
          price: activeDailyPrice,
          checkIn: calculated.startDate,
          checkOut: calculated.endDate,
          nights: selectedDates.length,
          status: 'whatsapp_pending',
          whatsappNumber: BIN_USMAN_WHATSAPP_NUMBER,
          hostCode: hostCode,
          listingCode: listingCode,
          guests: guestCount,
          rooms: roomCount,
          
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

      console.log("Firestore booking created with whatsapp_pending status:", bookingRef.id);

      // 3. Create Admin Notification
      try {
        await addDoc(collection(db, 'notifications'), {
          title: "New WhatsApp Booking Request",
          message: `${guestName.trim()} requested to book ${listing.title} for ${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'}. Total: Rs. ${currentTotalPrice.toLocaleString()}`,
          timestamp: serverTimestamp(),
          read: false,
          bookingId: bookingRef.id,
          listingId: listing.id
        });
      } catch (notifErr) {
        console.error("Notification warning:", notifErr);
      }

      // 4. Generate the official WhatsApp message
      const message = generateWhatsAppBookingMessage({
        propertyName: listing.title,
        location: displayLocation,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted,
        guests: guestCount,
        rooms: roomCount,
        nights: selectedDates.length,
        totalAmount: currentTotalPrice,
        guestName: guestName.trim(),
        phone: guestPhone.trim(),
        email: user.email || guestEmail.trim(),
        listingId: listing.id,
        durationType: durationType === '12h' ? '12 Hours (Half Day)' : '24 Hours (Full Day)',
        startTime: calculated.startTimeStr
      });

      setPreparedWhatsAppMessage(message);
      setConfirmedBookingId(bookingRef.id);

      // 5. Open WhatsApp via official click-to-chat URL
      openWhatsAppChat(message, BIN_USMAN_WHATSAPP_NUMBER);

      // 6. Show clear user confirmation toast
      toast.success("Your booking request has been prepared. Please send the WhatsApp message to complete your booking.", {
        duration: 8000
      });

    } catch (error) {
      console.error("Booking submission error:", error);
      toast.error('Booking request could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary-dark" size={36} />
        <span className="text-xs font-black uppercase tracking-widest text-body/40">Loading Booking Information...</span>
      </div>
    );
  }

  if (!listing) return null;

  const displayCheckIn = calculated.startDate ? format(new Date(calculated.startDate + 'T00:00:00'), 'PPP') : 'Select Date';
  const displayCheckOut = calculated.endDate ? format(new Date(calculated.endDate + 'T00:00:00'), 'PPP') : 'Select Date';
  const activeDailyPrice = durationType === '12h' ? (listing.price12hrs || listing.price) : (listing.price24hrs || listing.price);
  const currentTotalPrice = durationType === '12h' ? activeDailyPrice : activeDailyPrice * selectedDates.length;
  const displayCity = formatCityName(listing.city || listing.location);

  // If already confirmed and prepared, show clean success screen with WhatsApp action
  if (confirmedBookingId) {
    const whatsAppUrl = getWhatsAppClickToChatUrl(preparedWhatsAppMessage, BIN_USMAN_WHATSAPP_NUMBER);

    return (
      <div className="max-w-2xl mx-auto py-12 space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-500/10 border-2 border-green-500/30 rounded-[2rem] flex items-center justify-center mx-auto text-green-600 shadow-xl"
        >
          <CheckCircle2 size={48} />
        </motion.div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-black uppercase tracking-widest">
            <MessageSquare size={12} />
            <span>Booking Request Prepared</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-heading">
            WhatsApp <span className="text-primary-dark italic font-normal">Confirmation</span>
          </h1>
          <p className="text-body text-sm max-w-md mx-auto leading-relaxed font-medium">
            Your booking request has been prepared. Please send the WhatsApp message to complete your booking.
          </p>
        </div>

        {/* WhatsApp Direct Action Button */}
        <div className="p-8 bg-white rounded-[2.5rem] border border-secondary shadow-lg space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-secondary/40 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-body/40">Official Concierge</p>
              <p className="text-sm font-black text-heading tracking-wide">{BIN_USMAN_WHATSAPP_DISPLAY}</p>
            </div>
            <span className="text-[9px] font-black uppercase px-3 py-1 bg-primary/10 text-primary-dark rounded-full">
              ID: {confirmedBookingId.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="bg-zinc-50 p-4 rounded-2xl border border-secondary/30 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-body/50">Property Details</p>
            <p className="text-base font-bold text-heading">{listing.title}</p>
            <p className="text-xs text-body/70 font-medium">{listing.location}, {displayCity}</p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-heading">
              <span>🗓️ {displayCheckIn} — {displayCheckOut}</span>
              <span>👤 {guestCount} Guests • {roomCount} Room</span>
              <span>💰 Total: Rs. {currentTotalPrice.toLocaleString()}</span>
            </div>
          </div>

          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              toast.info("Opening WhatsApp...");
            }}
            className="w-full py-5 px-8 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] cursor-pointer"
          >
            <MessageSquare size={18} />
            <span>Open WhatsApp Chat</span>
            <ExternalLink size={14} className="opacity-70" />
          </a>

          <p className="text-center text-[10px] text-body/40 font-bold uppercase tracking-wider">
            If WhatsApp didn't open automatically, click the button above to send your message.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => navigate('/my-bookings')}
            className="primary-button px-10 py-4 text-[10px] font-black uppercase tracking-widest"
          >
            View My Bookings
          </button>
          <button
            onClick={() => navigate('/')}
            className="secondary-button px-10 py-4 text-[10px] font-black uppercase tracking-widest"
          >
            Browse More Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Top Bar */}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Property Summary & Guest Information (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary-dark">
              <Calendar size={20} />
              <h2 className="text-xl font-black uppercase tracking-tight text-heading">Reservation Summary</h2>
            </div>
            <p className="text-body font-medium text-xs">Review the property details and your stay calculation.</p>
          </div>

          {/* Property Card */}
          <div className="bg-white rounded-[2rem] border border-secondary p-6 space-y-6 shadow-sm relative overflow-hidden">
            <div className="space-y-3">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary-dark opacity-80">{displayCity}</span>
              <h3 className="text-xl font-bold text-heading uppercase tracking-tight leading-snug">{listing.title}</h3>
              <p className="text-xs font-medium text-body/60">{listing.location}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-secondary/40">
              <div className="space-y-1">
                <p className="text-[9px] text-body/50 uppercase font-black tracking-widest">Check-In</p>
                <p className="font-bold text-heading text-xs">{displayCheckIn}</p>
                {calculated.startTimeStr && (
                  <p className="text-[10px] text-primary-dark font-semibold">{calculated.startTimeStr}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-body/50 uppercase font-black tracking-widest">Check-Out</p>
                <p className="font-bold text-heading text-xs">{displayCheckOut}</p>
                {calculated.endTime && (
                  <p className="text-[10px] text-body/50 font-medium truncate" title={calculated.endTime}>{calculated.endTime}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-body/70 font-medium">
                <span>Duration</span>
                <span className="font-bold text-heading">
                  {selectedDates.length} {selectedDates.length === 1 ? 'Day' : 'Days'} ({calculated.totalHours} hrs)
                </span>
              </div>
              <div className="flex justify-between items-center text-body/70 font-medium">
                <span>Rate</span>
                <span className="font-bold text-heading">
                  Rs. {activeDailyPrice.toLocaleString()} {durationType === '12h' ? '/ 12h' : '/ day'}
                </span>
              </div>
              <div className="flex justify-between items-center text-body/70 font-medium">
                <span>Guests & Rooms</span>
                <span className="font-bold text-heading">{guestCount} Guests • {roomCount} Room</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-secondary/40">
              <span className="text-body font-black uppercase text-[10px] tracking-widest">Estimated Total</span>
              <span className="text-2xl font-black text-primary-dark">Rs. {currentTotalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* WhatsApp Guarantee Box */}
          <div className="p-5 bg-green-500/5 border border-green-500/20 rounded-2xl flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0">
              <MessageSquare size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-heading">Direct WhatsApp Booking</h4>
              <p className="text-[11px] text-body/70 leading-relaxed font-medium">
                No online payment required. Clicking <strong>Confirm Booking</strong> reserves your dates and connects you directly with our concierge at <strong className="text-heading">{BIN_USMAN_WHATSAPP_DISPLAY}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Schedule & Guest Details Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary-dark">
              <User size={20} />
              <h2 className="text-xl font-black uppercase tracking-tight text-heading">Guest & Schedule Setup</h2>
            </div>
            <p className="text-body font-medium text-xs">Verify your personal details and customize dates before confirming.</p>
          </div>

          <form onSubmit={handleConfirmBooking} className="bg-white rounded-[2rem] border border-secondary p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Guest Information Section */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary-dark">1. Guest Contact Information</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                    <User size={11} />
                    <span>Guest Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-background/50 border border-secondary rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-2 focus:ring-primary-dark/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                    <Phone size={11} />
                    <span>WhatsApp / Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +92 300 1234567"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-background/50 border border-secondary rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-2 focus:ring-primary-dark/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                    <Mail size={11} />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={user?.email || guestEmail}
                    className="w-full bg-zinc-100 border border-secondary/40 rounded-xl px-4 py-3 text-xs font-bold text-body/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                    <Users size={11} />
                    <span>Total Guests</span>
                  </label>
                  <div className="flex items-center border border-secondary rounded-xl overflow-hidden bg-background/50">
                    <button
                      type="button"
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="px-3 py-2.5 text-heading font-black hover:bg-neutral-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xs text-heading">{guestCount}</span>
                    <button
                      type="button"
                      onClick={() => setGuestCount(guestCount + 1)}
                      className="px-3 py-2.5 text-heading font-black hover:bg-neutral-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                    <BedDouble size={11} />
                    <span>Rooms</span>
                  </label>
                  <div className="flex items-center border border-secondary rounded-xl overflow-hidden bg-background/50">
                    <button
                      type="button"
                      onClick={() => setRoomCount(Math.max(1, roomCount - 1))}
                      className="px-3 py-2.5 text-heading font-black hover:bg-neutral-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xs text-heading">{roomCount}</span>
                    <button
                      type="button"
                      onClick={() => setRoomCount(roomCount + 1)}
                      className="px-3 py-2.5 text-heading font-black hover:bg-neutral-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Calendar & Dates Section */}
            <div className="space-y-4 pt-4 border-t border-secondary/40">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary-dark">2. Date & Schedule Selection</span>

              <div className="space-y-3 bg-background/40 border border-secondary/50 p-5 rounded-2xl relative">
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
                      className="p-1 px-2.5 bg-white border border-secondary rounded-lg text-xs font-black text-heading hover:bg-primary-dark/5 transition-colors cursor-pointer"
                    >
                      ←
                    </button>
                    <span className="text-xs font-black uppercase text-heading px-2 min-w-[100px] text-center">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(currentMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCurrentMonth(next);
                      }}
                      className="p-1 px-2.5 bg-white border border-secondary rounded-lg text-xs font-black text-heading hover:bg-primary-dark/5 transition-colors cursor-pointer"
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-body/40 mb-1">
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
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
                      titleStr += " - Blocked by Admin";
                    } else if (isReserved) {
                      cellStyle += "border-2 border-dashed border-red-500 bg-red-50 text-red-600 font-bold line-through cursor-not-allowed";
                      isDisabled = true;
                      titleStr += " - Already Reserved";
                    } else if (isSelected) {
                      cellStyle += "bg-primary-dark text-white font-black scale-105 shadow-sm";
                    } else {
                      cellStyle += "bg-white hover:bg-primary-dark/10 text-heading border border-secondary/40 hover:scale-105 active:scale-95";
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
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-between gap-1 pt-3 border-t border-secondary/30 text-[9px] font-black text-body/50 uppercase tracking-widest mt-2 px-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-white border border-secondary/40 rounded-md inline-block shadow-sm" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-primary-dark rounded-md inline-block" />
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

              {/* Selected Dates Display */}
              <div className="space-y-2">
                <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">
                  Selected Stay Dates ({selectedDates.length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-background/50 rounded-xl border border-secondary/50 max-h-28 overflow-y-auto">
                  {selectedDates.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1.5 bg-white border border-secondary px-3 py-1 rounded-lg text-[10px] font-bold text-heading shadow-sm">
                      {format(new Date(d + 'T00:00:00'), 'MMM d, yyyy')}
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(d)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedDates.length === 0 && (
                    <p className="text-[10px] text-body/40 italic p-1">No dates selected. Please select dates from the calendar.</p>
                  )}
                </div>
              </div>

              {/* Start Time and Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1 flex items-center gap-1.5">
                    <Clock size={11} />
                    <span>Estimated Arrival Time</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-background/50 border border-secondary rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-2 focus:ring-primary-dark/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-body/60 uppercase font-black tracking-widest ml-1">
                    Daily Duration Type
                  </label>
                  {listing.bookingType === '12hrs' || listing.bookingType === '24hrs' ? (
                    <div className="w-full bg-zinc-100 border border-secondary/50 rounded-xl px-4 py-3 text-xs font-bold text-heading">
                      {listing.bookingType === '12hrs' ? '12 Hours (Single-Day Only)' : '24 Hours (Full Stay)'}
                    </div>
                  ) : (
                    <select
                      value={durationType}
                      onChange={(e) => setDurationType(e.target.value as '12h' | '24h')}
                      className="w-full bg-background/50 border border-secondary rounded-xl px-4 py-3 text-xs font-bold text-heading focus:outline-none focus:ring-2 focus:ring-primary-dark/20 transition-all cursor-pointer"
                    >
                      <option value="12h">12 Hours Stay (Single Day)</option>
                      <option value="24h">24 Hours Stay (Multi-Day)</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Final Action Button */}
            <div className="pt-4 border-t border-secondary/40 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting || selectedDates.length === 0}
                className="w-full py-5 px-8 rounded-2xl bg-primary-dark hover:bg-heading text-white font-black text-xs uppercase tracking-[0.25em] shadow-xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Preparing Booking Request...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <MessageSquare size={16} />
                    Confirm Booking
                  </span>
                )}
              </button>

              <p className="text-center text-[10px] text-body/50 font-bold uppercase tracking-wider">
                No credit card or online payment required • Instant confirmation on WhatsApp
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
