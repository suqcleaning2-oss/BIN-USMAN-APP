import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminListingEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    locationName: '',
    latitude: '',
    longitude: '',
    city: 'Islamabad',
    images: [''],
    hostCode: '',
    listingCode: '',
    bookingType: 'both',
    price12hrs: '',
    price24hrs: ''
  });

  const PAKISTAN_CITIES = [
    'Islamabad', 'Karachi', 'Lahore', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Sialkot', 'Murree'
  ];
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      const fetchListing = async () => {
        try {
          const listingPath = `listings/${id}`;
          let docSnap;
          try {
            docSnap = await getDoc(doc(db, 'listings', id));
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, listingPath);
          }
          
          if (docSnap && docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              title: data.title || '',
              description: data.description || '',
              price: data.price ? String(data.price) : '',
              location: data.location || '',
              locationName: data.locationName || '',
              latitude: data.latitude ? String(data.latitude) : '',
              longitude: data.longitude ? String(data.longitude) : '',
              city: data.city || 'Islamabad',
              images: data.images && data.images.length > 0 ? data.images : [''],
              hostCode: data.hostCode || '',
              listingCode: data.listingCode || '',
              bookingType: data.bookingType || 'both',
              price12hrs: data.price12hrs ? String(data.price12hrs) : '',
              price24hrs: data.price24hrs ? String(data.price24hrs) : ''
            });
          }
        } catch (error) {
          toast.error('Failed to fetch listing');
        } finally {
          setFetching(false);
        }
      };
      fetchListing();
    }
  }, [id, isEdit]);

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const addImageField = () => {
    setFormData({ ...formData, images: [...formData.images, ''] });
  };

  const removeImageField = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages.length > 0 ? newImages : [''] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const basePrice = parseFloat(formData.price) || 0;
    const dataToSave = {
      ...formData,
      price: basePrice,
      price12hrs: formData.price12hrs ? parseFloat(formData.price12hrs) : basePrice,
      price24hrs: formData.price24hrs ? parseFloat(formData.price24hrs) : basePrice,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      images: formData.images.filter(img => img.trim() !== '')
    };

    try {
      if (isEdit) {
        const listingPath = `listings/${id}`;
        try {
          await updateDoc(doc(db, 'listings', id), dataToSave);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, listingPath);
        }
        toast.success('Updated successfully!');
      } else {
        const listingsPath = 'listings';
        try {
          await addDoc(collection(db, listingsPath), dataToSave);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, listingsPath);
        }
        toast.success('Created successfully!');
      }
      navigate('/admin');
    } catch (error) {
      toast.error('Failed to save');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="h-96 flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-secondary pb-10">
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-body/40 hover:text-primary-dark transition-all duration-500 group pr-4 border-r border-secondary"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Admin
          </button>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading">
            {isEdit ? 'Edit' : 'New'} <span className="text-primary-dark italic font-normal">Apartment</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30">Last updated</p>
          <p className="text-xs font-bold text-heading">{format(new Date(), 'MMM d, yyyy')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] border border-secondary p-12 space-y-12 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Apartment Name</label>
            <input 
              type="text" 
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. Dream View Apartment"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Address</label>
            <input 
              type="text" 
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. Gulberg, Lahore"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Location Name (Optional)</label>
            <input 
              type="text" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. Near Liberty Market"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Latitude (Optional)</label>
            <input 
              type="text" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. 33.7294"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Longitude (Optional)</label>
            <input 
              type="text" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. 73.0397"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Price (Rs / Night - Default)</label>
            <input 
              type="number" 
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-black text-primary-dark focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. 10000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Booking Type Allowed</label>
            <select
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer italic"
              value={formData.bookingType}
              onChange={(e) => setFormData({ ...formData, bookingType: e.target.value })}
            >
              <option value="both">Both (12 Hours & 24 Hours)</option>
              <option value="12hrs">12 Hours Only</option>
              <option value="24hrs">24 Hours Only</option>
            </select>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Price for 12 Hours (Rs)</label>
            <input 
              type="number" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="Omit to use Default Price"
              value={formData.price12hrs}
              onChange={(e) => setFormData({ ...formData, price12hrs: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Price for 24 Hours (Rs)</label>
            <input 
              type="number" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="Omit to use Default Price"
              value={formData.price24hrs}
              onChange={(e) => setFormData({ ...formData, price24hrs: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">City</label>
            <select
              required
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer italic"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            >
              {PAKISTAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Host Code</label>
            <input 
              type="text" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. BU-HOST"
              value={formData.hostCode}
              onChange={(e) => setFormData({ ...formData, hostCode: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Listing Code</label>
            <input 
              type="text" 
              className="w-full bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
              placeholder="e.g. LST-101"
              value={formData.listingCode}
              onChange={(e) => setFormData({ ...formData, listingCode: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.25em] ml-1">Description</label>
          <textarea 
            required
            rows={5}
            className="w-full bg-background/30 border border-secondary rounded-[2rem] p-8 text-sm font-medium leading-relaxed focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all resize-none italic placeholder:text-body/20"
            placeholder="Describe your apartment here..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-secondary pb-4">
            <label className="text-[10px] uppercase font-black text-body/40 tracking-[0.3em] flex items-center gap-3">
              <ImageIcon size={16} strokeWidth={1.5} className="text-primary-dark" />
              Photo Links
            </label>
            <button 
              type="button" 
              onClick={addImageField}
              className="text-[9px] uppercase font-black text-primary-dark hover:text-white bg-primary/5 hover:bg-primary-dark px-6 py-2 rounded-full transition-all border border-primary/20 duration-500"
            >
              Add Link
            </button>
          </div>
          <div className="space-y-4">
            {formData.images.map((img, index) => (
              <div key={index} className="flex gap-4 animate-in slide-in-from-right-4 duration-500">
                <input 
                  type="url" 
                  required
                  className="flex-1 bg-background/30 border border-secondary rounded-2xl px-6 py-4 text-[10px] font-mono focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all italic placeholder:text-body/20"
                  placeholder="https://visual-repository.com/asset..."
                  value={img}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => removeImageField(index)}
                  className="w-12 h-12 flex items-center justify-center bg-white text-body/30 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-secondary hover:border-red-200"
                >
                  <X size={20} strokeWidth={1} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8">
          <button 
            type="submit" 
            disabled={loading}
            className="primary-button w-full h-20 text-[11px] shadow-[0_30px_60px_rgba(166,124,82,0.15)] flex items-center justify-center gap-4 group"
          >
            <Save size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
            {loading ? 'Saving...' : 'Save Apartment'}
          </button>
        </div>
      </form>
    </div>
  );
}
