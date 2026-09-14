import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getWishlistStatus, addToWishlist, removeFromWishlist } from '../services/wishlistService';
import { toast } from 'sonner';
import OptimizedImage from './OptimizedImage';
import { formatCityName } from '../lib/city-utils';

interface ListingProps {
  id: string;
  title: string;
  price: number;
  location: string;
  locationName?: string;
  city: string;
  images: string[];
  description?: string;
}

export default function ListingCard({ id, title, price, location, locationName, city, images, description }: ListingProps) {
  const { user } = useAuth();
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Sanitized images list - ensuring all property images from props/array are displayed
  const validImages = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      const filtered = images.filter((img) => typeof img === 'string' && img.trim().length > 0);
      if (filtered.length > 0) return filtered;
    }
    return ['https://picsum.photos/seed/house/800/600'];
  }, [images]);

  // Card carousel state
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const didSwipeRef = useRef(false);

  // Fullscreen Viewer state
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isViewerGesturing, setIsViewerGesturing] = useState(false);

  // Viewer gesture refs
  const viewerTouchRef = useRef<{
    initialDist: number;
    initialScale: number;
    startX: number;
    startY: number;
    lastPan: { x: number; y: number };
    lastTap: number;
  }>({
    initialDist: 0,
    initialScale: 1,
    startX: 0,
    startY: 0,
    lastPan: { x: 0, y: 0 },
    lastTap: 0,
  });

  const displayCity = formatCityName(city || location);

  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        const storedId = await getWishlistStatus(user.uid, id);
        setWishlistId(storedId);
      }
    };
    checkStatus();
  }, [user, id]);

  // Carousel navigation handlers
  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentImgIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentImgIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  // Touch handlers for card carousel swipe
  const onCardTouchStart = (e: React.TouchEvent) => {
    if (validImages.length <= 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    didSwipeRef.current = false;
    setIsSwiping(true);
  };

  const onCardTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || validImages.length <= 1) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
      didSwipeRef.current = true;
    }
  };

  const onCardTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping || validImages.length <= 1) return;
    setIsSwiping(false);
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Detect horizontal swipe
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) && elapsed < 800) {
      if (diffX < 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
      setTimeout(() => {
        didSwipeRef.current = false;
      }, 100);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to save this apartment.');
      return;
    }

    setIsToggling(true);
    try {
      if (wishlistId) {
        await removeFromWishlist(wishlistId);
        setWishlistId(null);
      } else {
        const newId = await addToWishlist(user.uid, id);
        setWishlistId(newId);
      }
    } catch (error) {
      console.error("Wishlist toggle error:", error);
    } finally {
      setIsToggling(false);
    }
  };

  // Open full-screen viewer
  const openViewer = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setViewerIndex(index);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Keyboard controls for full screen viewer
  useEffect(() => {
    if (!isViewerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowRight') setViewerIndex((prev) => (prev + 1) % validImages.length);
      if (e.key === 'ArrowLeft') setViewerIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
      if (e.key === '+' || e.key === '=') setZoomScale((prev) => Math.min(prev + 0.5, 4));
      if (e.key === '-') setZoomScale((prev) => Math.max(prev - 0.5, 1));
      if (e.key === '0') {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewerOpen, validImages.length]);

  // Lock background scroll when viewer is open
  useEffect(() => {
    if (isViewerOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isViewerOpen]);

  // Pinch-to-zoom and pan gesture logic for viewer
  const handleViewerTouchStart = (e: React.TouchEvent) => {
    setIsViewerGesturing(true);
    if (e.touches.length === 2) {
      // 2 fingers: pinch zoom initiation
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      viewerTouchRef.current.initialDist = dist;
      viewerTouchRef.current.initialScale = zoomScale;
    } else if (e.touches.length === 1) {
      // 1 finger: pan if zoomed, or track swipe/double-tap
      const touch = e.touches[0];
      const now = Date.now();
      const lastTap = viewerTouchRef.current.lastTap;

      // Check double tap
      if (now - lastTap < 300) {
        if (zoomScale > 1) {
          setZoomScale(1);
          setPanOffset({ x: 0, y: 0 });
        } else {
          setZoomScale(2.5);
        }
        viewerTouchRef.current.lastTap = 0;
        return;
      }
      viewerTouchRef.current.lastTap = now;

      viewerTouchRef.current.startX = touch.clientX;
      viewerTouchRef.current.startY = touch.clientY;
      viewerTouchRef.current.lastPan = { ...panOffset };
    }
  };

  const handleViewerTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (viewerTouchRef.current.initialDist > 0) {
        const ratio = dist / viewerTouchRef.current.initialDist;
        const newScale = Math.min(Math.max(viewerTouchRef.current.initialScale * ratio, 1), 4);
        setZoomScale(newScale);
        if (newScale <= 1) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && zoomScale > 1) {
      // Pan zoomed image
      const touch = e.touches[0];
      const deltaX = touch.clientX - viewerTouchRef.current.startX;
      const deltaY = touch.clientY - viewerTouchRef.current.startY;
      setPanOffset({
        x: viewerTouchRef.current.lastPan.x + deltaX,
        y: viewerTouchRef.current.lastPan.y + deltaY,
      });
    }
  };

  const handleViewerTouchEnd = (e: React.TouchEvent) => {
    setIsViewerGesturing(false);
    if (e.touches.length === 0) {
      if (zoomScale <= 1) {
        setPanOffset({ x: 0, y: 0 });
        // Handle horizontal swipe when not zoomed
        if (viewerTouchRef.current.startX) {
          const touch = e.changedTouches[0];
          const diffX = touch.clientX - viewerTouchRef.current.startX;
          const diffY = touch.clientY - viewerTouchRef.current.startY;
          if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) {
              setViewerIndex((prev) => (prev + 1) % validImages.length);
            } else {
              setViewerIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
            }
          }
        }
      }
      viewerTouchRef.current.initialDist = 0;
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -8 }}
        className="overflow-hidden group cursor-pointer border border-[#E5E5E5] dark:border-zinc-800 bg-white dark:bg-[#151515] p-0 rounded-[2.5rem] shadow-subtle hover:shadow-xl transition-all duration-700 font-sans"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[2.5rem]">
          {/* Card Image carousel container */}
          <div 
            className="w-full h-full relative select-none touch-pan-y"
            onTouchStart={onCardTouchStart}
            onTouchMove={onCardTouchMove}
            onTouchEnd={onCardTouchEnd}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImgIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <OptimizedImage 
                  src={validImages[currentImgIndex]} 
                  alt={`${title} - image ${currentImgIndex + 1}`}
                  widthSize={600}
                  qualitySize={75}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

            {/* Top Left: 1/4 counter badge + Pinch/Zoom button */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white text-[10px] font-black tracking-widest uppercase shadow-lg">
                {currentImgIndex + 1}/{validImages.length}
              </div>
              <button
                type="button"
                onClick={(e) => openViewer(currentImgIndex, e)}
                title="Pinch to zoom / Full screen"
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-[#D4AF37] hover:text-black backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all duration-300 shadow-lg active:scale-90"
              >
                <Maximize2 size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Top Right: Wishlist button */}
            <div className="absolute top-6 right-6 z-20">
              <motion.button
                type="button"
                whileTap={{ scale: 0.8 }}
                onClick={toggleWishlist}
                disabled={isToggling}
                className={`w-12 h-12 rounded-[1.25rem] backdrop-blur-xl border flex items-center justify-center transition-all duration-500 shadow-lg ${
                  wishlistId 
                  ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                  : 'bg-white/80 dark:bg-black/60 border-neutral-200/60 dark:border-white/20 text-neutral-900 dark:text-white hover:bg-white dark:hover:bg-black/80'
                }`}
              >
                <Heart 
                  size={22} 
                  strokeWidth={1.5} 
                  fill={wishlistId ? "currentColor" : "none"} 
                  className={isToggling ? "animate-pulse" : ""}
                />
              </motion.button>
            </div>

            {/* Carousel navigation arrows (visible when > 1 image) */}
            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md flex items-center justify-center opacity-80 hover:opacity-100 transition-all active:scale-90 shadow-md"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md flex items-center justify-center opacity-80 hover:opacity-100 transition-all active:scale-90 shadow-md"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* Bottom Left: Price tag badge */}
            <div className="absolute bottom-6 left-6 z-20 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-[10px] font-black text-neutral-900 dark:text-white shadow-xl uppercase tracking-widest border border-neutral-200/80 dark:border-zinc-700">
              Rs. {price.toLocaleString()}
            </div>

            {/* Bottom Center: Dot indicators */}
            {validImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                {validImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentImgIndex(idx);
                    }}
                    className={`transition-all duration-300 rounded-full ${
                      idx === currentImgIndex
                        ? 'w-4 h-1.5 bg-[#D4AF37]'
                        : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/90'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card Content & Details (Navigates to detail page) */}
        <Link 
          to={`/listing/${id}`}
          onClick={(e) => {
            if (didSwipeRef.current) {
              e.preventDefault();
            }
          }}
          className="block p-8 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37] opacity-95">{displayCity}</span>
            <div className="flex items-center gap-2">
              <MapPin size={12} strokeWidth={1.5} className="text-[#D4AF37] shrink-0" />
              <span className="text-[9px] font-black text-neutral-600 dark:text-zinc-400 uppercase tracking-widest">{location}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 uppercase tracking-tight">{title}</h3>
            </div>
            {locationName && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] italic">{locationName}</p>
            )}
            {description && (
              <p className="text-xs text-neutral-600 dark:text-zinc-400 line-clamp-2 leading-relaxed font-normal">{description}</p>
            )}
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500 dark:text-zinc-400">Verified Property</p>
          </div>
        </Link>
      </motion.div>

      {/* Full-Screen Pinch-To-Zoom & Swipe Image Viewer Modal */}
      {isViewerOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeViewer();
          }}
        >
          {/* Top Control Bar */}
          <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md z-30">
            <div className="flex flex-col">
              <span className="text-white text-xs sm:text-sm font-black uppercase tracking-wider line-clamp-1">
                {title}
              </span>
              <span className="text-[10px] text-[#D4AF37] font-black tracking-widest uppercase">
                Rs. {price.toLocaleString()} • {displayCity}
              </span>
            </div>

            {/* Counter */}
            <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-black tracking-widest uppercase">
              {viewerIndex + 1} / {validImages.length}
            </div>

            {/* Zoom Controls & Close Button */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(prev + 0.5, 4))}
                title="Zoom In"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-95"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomScale((prev) => {
                    const next = Math.max(prev - 0.5, 1);
                    if (next <= 1) setPanOffset({ x: 0, y: 0 });
                    return next;
                  });
                }}
                title="Zoom Out"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-95"
              >
                <ZoomOut size={16} />
              </button>
              {zoomScale > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  title="Reset Zoom"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#D4AF37] hover:text-black text-white flex items-center justify-center transition-colors active:scale-95"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={closeViewer}
                title="Close (Esc)"
                className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors active:scale-95 border border-red-500/30 ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Center Stage: Pinch to Zoom and Pan area */}
          <div 
            className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6"
            onTouchStart={handleViewerTouchStart}
            onTouchMove={handleViewerTouchMove}
            onTouchEnd={handleViewerTouchEnd}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setZoomScale((prev) => Math.min(prev + 0.25, 4));
              } else {
                setZoomScale((prev) => {
                  const next = Math.max(prev - 0.25, 1);
                  if (next <= 1) setPanOffset({ x: 0, y: 0 });
                  return next;
                });
              }
            }}
          >
            <div 
              className="relative max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `scale(${zoomScale}) translate(${panOffset.x / zoomScale}px, ${panOffset.y / zoomScale}px)`,
                transition: isViewerGesturing ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                cursor: zoomScale > 1 ? 'grab' : 'zoom-in',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (zoomScale > 1) {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                } else {
                  setZoomScale(2.5);
                }
              }}
            >
              <img
                src={validImages[viewerIndex]}
                alt={`${title} - view ${viewerIndex + 1}`}
                className="max-h-[75vh] sm:max-h-[82vh] max-w-[95vw] sm:max-w-[90vw] object-contain rounded-2xl shadow-2xl pointer-events-none"
              />
            </div>

            {/* Previous & Next Viewer Buttons (visible when not zoomed deep) */}
            {validImages.length > 1 && zoomScale <= 1.2 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-[#D4AF37] hover:text-black text-white border border-white/20 backdrop-blur-xl flex items-center justify-center transition-all active:scale-95 shadow-xl z-20"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((prev) => (prev + 1) % validImages.length);
                    setZoomScale(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-[#D4AF37] hover:text-black text-white border border-white/20 backdrop-blur-xl flex items-center justify-center transition-all active:scale-95 shadow-xl z-20"
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Controls & Thumbnail Strip */}
          <div className="px-4 py-3 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-col items-center gap-2 z-30">
            <div className="text-[10px] text-white/60 font-bold uppercase tracking-widest flex items-center gap-2">
              <span>Pinch or double-tap to zoom ({zoomScale.toFixed(1)}x)</span>
              <span>•</span>
              <span>Swipe left / right to browse</span>
            </div>

            {/* Thumbnails */}
            {validImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1 px-2 no-scrollbar">
                {validImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setViewerIndex(idx);
                      setZoomScale(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      idx === viewerIndex
                        ? 'border-[#D4AF37] scale-105 shadow-md shadow-[#D4AF37]/30'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
