import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { Check, X, Edit, Trash2, Plus, Users, Landmark, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { RefreshButton } from '../components/RefreshButton';

interface Booking {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  listingId: string;
  listingTitle: string; // From UI
  title: string;        // Requirement
  status: 'pending' | 'approved' | 'rejected';
  amount: number;       // Current total
  price: number;        // per night requirement
  createdAt: any;
}

interface Listing {
  id: string;
  title: string;
  price: number;
  location: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'listings'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [counts, setCounts] = useState({ users: 1, revenue: 0 });
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch bookings
      const bookingsPath = 'bookings';
      const bookingsQuery = query(collection(db, bookingsPath), orderBy('createdAt', 'desc'));
      let bookingsSnap;
      try {
        bookingsSnap = await getDocs(bookingsQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, bookingsPath);
      }
      const bookingsData = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(bookingsData);

      // 2. Calculate revenue
      const totalRevenue = bookingsData
        .filter(b => b.status === 'approved')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      // 3. Fetch listings
      const listingsPath = 'listings';
      const listingsQuery = query(collection(db, listingsPath), orderBy('title', 'asc'));
      let listingsSnap;
      try {
        listingsSnap = await getDocs(listingsQuery);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, listingsPath);
      }
      const listingsData = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      setListings(listingsData);

      // 4. Fetch user count
      const usersPath = 'users';
      let usersSnap;
      try {
        usersSnap = await getDocs(collection(db, usersPath));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, usersPath);
      }
      
      setCounts({
        users: usersSnap.size,
        revenue: totalRevenue
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error('Failed to update dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRefresh = async () => {
    await fetchAdminData();
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const docRef = doc(db, 'bookings', id);
      const updates: any = { status };
      
      if (status === 'approved') {
        updates.approvedAt = serverTimestamp();
      }
      
      try {
        await updateDoc(docRef, updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`);
      }
      toast.success(`Booking ${status}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      try {
        await deleteDoc(doc(db, 'listings', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `listings/${id}`);
      }
      toast.success("Deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete.");
    }
  };

  const handleSeedData = async () => {
    const SAMPLE_DATA = [
      {
        title: 'Luxury Villa with Mountain View',
        description: 'A beautiful villa located in the heart of Murree with breathtaking views of the Himalayas. Perfect for families.',
        price: 25000,
        location: 'Murree',
        city: 'Murree',
        images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800']
      },
      {
        title: 'Modern Apartment in Blue Area',
        description: 'Stay in the business hub of Islamabad. This modern apartment offers high-speed internet and all luxury amenities.',
        price: 12000,
        location: 'Islamabad',
        city: 'Islamabad',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800']
      }
    ];

    try {
      setLoading(true);
      for (const item of SAMPLE_DATA) {
        await addDoc(collection(db, 'listings'), item);
      }
      toast.success("Sample data added!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to seed data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="absolute top-0 right-0 z-50">
        <RefreshButton onRefresh={handleRefresh} />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-secondary pb-10">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading">Admin <span className="text-primary-dark italic font-normal">Area</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-body/30">Manage your bookings and apartments.</p>
        </div>
        
        <div className="flex flex-wrap gap-6">
          <div className="bg-white px-8 py-5 rounded-[2rem] border border-secondary shadow-sm flex items-center gap-6 min-w-[200px] hover:shadow-md transition-shadow group">
             <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center text-primary-dark border border-secondary group-hover:bg-primary-dark group-hover:text-white transition-colors">
                <Users size={24} strokeWidth={1.5} />
             </div>
             <div>
                <p className="text-[9px] uppercase font-black text-body/40 tracking-[0.2em] mb-1">Total Users</p>
                <p className="text-2xl font-semibold text-heading tracking-tighter">{counts.users}</p>
             </div>
          </div>
          <div className="bg-white px-8 py-5 rounded-[2rem] border border-secondary shadow-sm flex items-center gap-6 min-w-[240px] hover:shadow-md transition-shadow group">
             <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center text-green-600 border border-secondary group-hover:bg-green-600 group-hover:text-white transition-colors">
                <Landmark size={24} strokeWidth={1.5} />
             </div>
             <div>
                <p className="text-[9px] uppercase font-black text-body/40 tracking-[0.2em] mb-1">Total Earnings</p>
                <p className="text-2xl font-semibold text-heading tracking-tighter">Rs. {counts.revenue.toLocaleString()}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-secondary/20 backdrop-blur-md border border-secondary rounded-full w-fit">
        <button 
          onClick={() => setActiveTab('bookings')}
          className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'bookings' ? 'bg-primary-dark text-white shadow-xl' : 'text-body/40 hover:text-heading'}`}
        >
          Bookings
        </button>
        <button 
          onClick={() => setActiveTab('listings')}
          className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'listings' ? 'bg-primary-dark text-white shadow-xl' : 'text-body/40 hover:text-heading'}`}
        >
          Apartments
        </button>
      </div>

      {activeTab === 'bookings' ? (
        <div className="space-y-8">
          <div className="overflow-hidden rounded-[2.5rem] border border-secondary shadow-2xl bg-white">
            <table className="w-full text-left">
              <thead className="bg-background border-b border-secondary">
                <tr>
                  <th className="px-10 py-6 text-[9px] uppercase font-black tracking-[0.2em] text-body/40">Property / User</th>
                  <th className="px-10 py-6 text-[9px] uppercase font-black tracking-[0.2em] text-body/40">Total</th>
                  <th className="px-10 py-6 text-[9px] uppercase font-black tracking-[0.2em] text-body/40">Status</th>
                  <th className="px-10 py-6 text-[9px] uppercase font-black tracking-[0.2em] text-body/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/50">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-background transition-colors group">
                    <td className="px-10 py-8">
                      <div className="space-y-1.5">
                        <span className="font-semibold text-heading text-lg uppercase tracking-tight block">
                          {String(booking.listingTitle || booking.title || 'Untitled')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-body/60 font-medium">
                            {String(booking.userName || 'Unknown Identity')}
                          </span>
                          <span className="text-secondary">•</span>
                          <span className="text-[10px] text-body/40 font-bold lowercase tracking-wide">
                            {String(booking.userEmail || 'no-email')}
                          </span>
                          {booking.userPhone && (
                            <>
                              <span className="text-secondary">•</span>
                              <span className="text-[10px] text-body/40 font-bold tracking-wide">
                                {booking.userPhone}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-[9px] text-primary-dark/40 font-black tracking-widest uppercase block pt-1">
                          {(() => {
                            if (booking.createdAt?.seconds) {
                              try {
                                return format(new Date(booking.createdAt.seconds * 1000), 'p, PPP');
                              } catch (e) {
                                return 'Recent';
                              }
                            }
                            if (typeof booking.createdAt === 'string') {
                              try {
                                const d = new Date(booking.createdAt);
                                return isNaN(d.getTime()) ? 'Recent' : format(d, 'p, PPP');
                              } catch (e) {
                                return 'Recent';
                              }
                            }
                            return 'Just now';
                          })()}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8 font-semibold text-heading text-base whitespace-nowrap">
                      Rs. {(typeof booking.amount === 'number' ? booking.amount : 0).toLocaleString()}
                    </td>
                    <td className="px-10 py-8">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm ${
                        booking.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                        booking.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                        booking.status === 'cancelled' ? 'bg-zinc-50 text-zinc-500 border-zinc-200' :
                        'bg-primary/5 text-primary-dark border-primary/20 animate-pulse'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex gap-3">
                        {booking.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(booking.id, 'approved')}
                              className="w-10 h-10 bg-white text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all border border-secondary shadow-sm flex items-center justify-center group/btn"
                              title="Authorize"
                            >
                              <Check size={18} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(booking.id, 'rejected')}
                              className="w-10 h-10 bg-white text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-secondary shadow-sm flex items-center justify-center group/btn"
                              title="Decline"
                            >
                              <X size={18} strokeWidth={2.5} />
                            </button>
                          </>
                        )}
                        <span className="text-[9px] text-body/20 font-black self-center uppercase tracking-widest">ID:{booking.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-secondary shadow-sm">
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold text-heading uppercase tracking-tighter">Collection <span className="text-primary-dark italic font-normal">Inventory</span></h3>
              <p className="text-[10px] font-black text-body/30 uppercase tracking-[0.2em]">{listings.length} APARTMENTS</p>
            </div>
            <Link to="/admin/listing/new" className="primary-button flex items-center gap-3">
              <Plus size={20} strokeWidth={2.5} />
              Add Apartment
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.length === 0 && (
              <div className="col-span-full text-center py-32 bg-white rounded-[3rem] border border-secondary border-dashed flex flex-col items-center">
                <Landmark className="text-secondary/20 mb-8" size={64} strokeWidth={0.5} />
                <p className="text-body font-black uppercase text-xs tracking-widest opacity-30 mb-8">No apartments found</p>
                <button 
                  onClick={handleSeedData}
                  className="secondary-button"
                >
                  Add Sample Apartments
                </button>
              </div>
            )}
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-[2.5rem] border border-secondary p-8 space-y-8 hover:shadow-2xl transition-all duration-1000 group">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xl font-semibold text-heading uppercase tracking-tight group-hover:text-primary-dark transition-colors">{listing.title}</h4>
                    <p className="text-[10px] text-body/40 font-black uppercase tracking-widest flex items-center gap-2">
                      <Home size={12} strokeWidth={2.5} className="text-primary-dark" />
                      {listing.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-heading tracking-tighter">Rs. {listing.price.toLocaleString()}</p>
                    <p className="text-[8px] text-body/30 font-black uppercase tracking-[0.2em] mt-1">PER NIGHT</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-8 border-t border-secondary">
                  <Link 
                    to={`/admin/listing/edit/${listing.id}`}
                    className="flex-1 bg-background hover:bg-primary-dark hover:text-white py-3.5 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-heading transition-all border border-secondary shadow-sm"
                  >
                    <Edit size={16} strokeWidth={2} />
                    Edit
                  </Link>
                  <button 
                    onClick={() => handleDeleteListing(listing.id)}
                    className="w-12 h-12 bg-white text-red-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all border border-secondary shadow-sm flex items-center justify-center group/del"
                  >
                    <Trash2 size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="pt-20 text-center">
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
