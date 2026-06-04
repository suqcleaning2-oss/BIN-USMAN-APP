import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft, Home, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { RefreshButton } from '../components/RefreshButton';

export default function PaymentStatus() {
  const { status: initialStatus } = useParams<{ status: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(initialStatus);
  const [isVerifying, setIsVerifying] = useState(initialStatus === 'processing');
  const navigate = useNavigate();
  const bookingId = searchParams.get('id');

  const checkStatus = async () => {
    if (!bookingId) return;
    try {
      const response = await fetch(`/api/bookings/status/${bookingId}`);
      const data = await response.json();

      if (data.status === 'confirmed') {
        setStatus('success');
        setIsVerifying(false);
        toast.success('Payment Done!');
        return true;
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
    return false;
  };

  useEffect(() => {
    if (initialStatus !== 'processing' || !bookingId) return;

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total (2s intervals)
    
    const pollStatus = async () => {
      const confirmed = await checkStatus();
      if (confirmed) {
        clearInterval(pollInterval);
      } else if (attempts >= maxAttempts) {
        setStatus('failed');
        setIsVerifying(false);
        toast.error('Verification timed out. Check your bookings later.');
        clearInterval(pollInterval);
      }
      attempts++;
    };

    const pollInterval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial check

    return () => clearInterval(pollInterval);
  }, [initialStatus, bookingId]);

  const handleRefresh = async () => {
    await checkStatus();
  };

  const getStatusConfig = () => {
    if (isVerifying) {
      return {
        icon: <Loader2 className="text-primary animate-spin" size={64} />,
        title: 'Confirming Payment...',
        message: 'We are checking your payment with PayFast. Please wait.',
        bg: 'bg-primary/10',
        border: 'border-primary/20'
      };
    }

    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="text-green-500" size={64} />,
          title: 'Payment Done 🎉',
          message: 'Your stay is booked! You can see it in My Bookings.',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20'
        };
      case 'failed':
        return {
          icon: <XCircle className="text-red-500" size={64} />,
          title: 'Payment Failed ❌',
          message: 'Your payment did not work. Please try again.',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        };
      case 'cancelled':
        return {
          icon: <AlertCircle className="text-yellow-500" size={64} />,
          title: 'Payment Cancelled',
          message: 'You cancelled the payment. No money was taken.',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20'
        };
      default:
        return {
          icon: <AlertCircle className="text-zinc-500" size={64} />,
          title: 'Something went wrong',
          message: 'We are not sure if the payment worked.',
          bg: 'bg-zinc-500/10',
          border: 'border-zinc-500/20'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="max-w-xl mx-auto py-32 text-center animate-in zoom-in duration-1000 relative">
      <div className="absolute top-0 right-0 z-50">
        <RefreshButton onRefresh={handleRefresh} />
      </div>
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        key={status}
        className={`w-32 h-32 ${config.bg} rounded-[2rem] flex items-center justify-center mx-auto mb-12 transition-all duration-1000 border-2 ${config.border} shadow-2xl relative overflow-hidden group`}
      >
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
        {config.icon}
      </motion.div>

      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tighter uppercase text-heading leading-tight">Payment <span className="text-primary-dark italic font-normal">Status</span></h1>
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/40 mb-4">{config.title}</p>
          <p className="text-[11px] text-body/60 font-medium max-w-sm mx-auto leading-relaxed uppercase tracking-wider">
            {config.message}
          </p>
        </div>
      </div>

      {!isVerifying && (
        <div className="pt-16 flex flex-col sm:flex-row gap-6 justify-center">
          <button 
            onClick={() => navigate('/my-bookings')} 
            className="primary-button px-12 h-16 text-[11px]"
          >
            My Bookings
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="secondary-button px-12 h-16 text-[11px]"
          >
            Go Home
          </button>
        </div>
      )}
    </div>
  );
}
