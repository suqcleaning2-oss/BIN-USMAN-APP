import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  widthSize?: number;
  qualitySize?: number;
}

export function getOptimizedImageUrl(url: string, width: number = 600, quality: number = 75): string {
  if (!url) return 'https://picsum.photos/seed/house/400/300';
  
  // Handle Unsplash image optimizations
  if (url.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('q', quality.toString());
      urlObj.searchParams.set('auto', 'format'); // Dynamically serve modern formats like WebP or AVIF
      urlObj.searchParams.set('fit', 'crop');
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  // Handle Picsum image optimizations
  if (url.includes('picsum.photos')) {
    const height = Math.round(width * 0.75);
    // Replace width/height matching in url (e.g. /800/600) with optimized target dimensions
    return url.replace(/\/\d+\/\d+/, `/${width}/${height}`);
  }
  
  return url;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  widthSize = 600, 
  qualitySize = 75,
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Generate the low-res placeholder image (extremely small size, e.g., 20px width, low quality)
  const placeholderUrl = getOptimizedImageUrl(src, 20, 10);
  
  // Generate the high-res optimized image URL
  const optimizedUrl = getOptimizedImageUrl(src, widthSize, qualitySize);

  useEffect(() => {
    // Reset state when source changes
    setIsLoaded(false);
    setError(false);

    const img = new Image();
    img.src = optimizedUrl;
    img.onload = () => {
      setIsLoaded(true);
    };
    img.onerror = () => {
      setError(true);
    };
  }, [optimizedUrl]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blurred Low-Resolution Placeholder */}
      {!isLoaded && !error && (
        <img
          src={placeholderUrl}
          alt={alt}
          className="w-full h-full object-cover blur-md scale-105 transition-all duration-300"
          {...props}
        />
      )}

      {/* Optimized High-Resolution Image */}
      <motion.img
        src={error ? 'https://picsum.photos/seed/house/400/300' : optimizedUrl}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`w-full h-full object-cover absolute inset-0 ${isLoaded ? 'relative' : ''}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
}
