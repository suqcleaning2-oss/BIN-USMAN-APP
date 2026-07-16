import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, Building, Send, Sparkles, Phone, Mail, User, ShieldCheck, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const PAKISTAN_CITIES = [
  'Islamabad', 'Karachi', 'Lahore', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Sialkot', 'Murree'
];

export default function ListProperty() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    contactNumber: profile?.phone || '',
    email: user?.email || '',
    totalProperties: '',
    price: '',
    city: PAKISTAN_CITIES[0],
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName.trim() || !formData.contactNumber.trim() || !formData.email.trim() || 
        !formData.totalProperties || !formData.price || !formData.city) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    setLoading(true);
    try {
      const appCollection = collection(db, 'lister_applications');
      await addDoc(appCollection, {
        fullName: formData.fullName.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
        totalProperties: Number(formData.totalProperties),
        price: Number(formData.price),
        city: formData.city,
        description: formData.description.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Error submitting lister application:", error);
      toast.error("Failed to submit your application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 animate-in fade-in duration-700">
        <div className="bg-white rounded-[3rem] border border-secondary p-12 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary-dark via-[#D4AF37] to-primary-dark" />
          <div className="w-24 h-24 bg-green-50 text-[#D4AF37] border-2 border-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-4">
            <span className="text-[11px] font-black tracking-[0.35em] text-[#D4AF37] uppercase">
              Application Confirmed
            </span>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter uppercase text-heading">
              Thank <span className="text-primary-dark italic font-normal">You!</span>
            </h1>
            <p className="text-body max-w-lg mx-auto font-medium text-base leading-relaxed">
              Your application has been successfully submitted. Our team will review your request and contact you shortly.
            </p>
          </div>
          <div className="pt-8 border-t border-secondary">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.25em] hover:bg-[#D4AF37] hover:text-[#111111] transition-all duration-300 shadow-xl active:scale-95 cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="flex items-center justify-between z-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-secondary text-[10px] font-black uppercase tracking-[0.2em] text-heading hover:bg-neutral-50 hover:text-primary-dark transition-all duration-300 shadow-sm active:scale-95 cursor-pointer group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-secondary pb-10">
        <div className="space-y-3">
          <span className="text-[11px] font-black tracking-[0.3em] text-[#D4AF37] uppercase bg-primary-dark/5 px-4 py-1.5 rounded-full inline-block">
            ELEGANT PARTNERSHIP
          </span>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading">
            List Your <span className="text-primary-dark italic font-normal">Property</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-body/30">
            Apply to list your elite property in Pakistan with Bin Usman.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] border border-secondary p-8 md:p-12 space-y-12 shadow-2xl relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary-dark via-[#D4AF37] to-primary-dark rounded-t-[3rem]" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Full Name */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1 flex items-center gap-1.5">
              <User size={12} className="text-primary-dark" />
              Full Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. Muhammad Usman"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1 flex items-center gap-1.5">
              <Phone size={12} className="text-primary-dark" />
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input 
              type="tel" 
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. +92 300 1234567"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            />
          </div>

          {/* Email Address */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1 flex items-center gap-1.5">
              <Mail size={12} className="text-primary-dark" />
              Email Address <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. usman@domain.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* How Many Properties Do You Have? */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1 flex items-center gap-1.5">
              <Building size={12} className="text-primary-dark" />
              How Many Properties Do You Have? <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              min="1"
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. 1"
              value={formData.totalProperties}
              onChange={(e) => setFormData({ ...formData, totalProperties: e.target.value })}
            />
          </div>

          {/* Price */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1 flex items-center gap-1.5">
              <DollarSign size={12} className="text-primary-dark" />
              Expected Price (Rs. / night) <span className="text-red-500">*</span>
            </label>
            <input 
              type="number" 
              min="0"
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. 15000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          {/* City */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1 flex items-center gap-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all text-heading uppercase tracking-widest cursor-pointer"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            >
              {PAKISTAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">
              Description <span className="text-body/30 italic">(Optional)</span>
            </label>
            <textarea 
              rows={4}
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic resize-none"
              placeholder="Describe your properties, outstanding features, luxury facilities, size, view, or exact location..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-secondary">
          <div className="flex items-center gap-2.5 text-body/50 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={16} className="text-green-600 animate-pulse" />
            <span>Secure & Direct review process</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-primary-dark text-white text-[11px] font-black uppercase tracking-[0.25em] hover:bg-[#D4AF37] hover:text-[#111111] transition-all duration-300 shadow-xl disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {loading ? 'Submitting Application...' : 'Submit Application'}
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
