import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook that works exactly like useState, but automatically
 * synchronizes state with localStorage to survive activity recreation and app restarts.
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`Error writing localStorage key "${key}":`, e);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Safely opens any external application link (Google Maps, Cashmaal Pay, WhatsApp, Phone, Email)
 * preventing crashes and handling missing application errors gracefully.
 */
export function safeOpenExternalApp(url: string): boolean {
  if (!url) {
    toast.error("Invalid external application link.");
    return false;
  }

  try {
    console.log(`Initiating safe external launch for: ${url}`);
    
    // Check for common link types to show a tailored helpful toast
    if (url.startsWith('tel:')) {
      toast.info("Opening Phone Dialer...");
    } else if (url.startsWith('mailto:')) {
      toast.info("Opening Email App...");
    } else if (url.includes('api.whatsapp.com') || url.includes('wa.me') || url.startsWith('whatsapp:')) {
      toast.info("Opening WhatsApp...");
    } else if (url.includes('google.com/maps') || url.includes('maps.google')) {
      toast.info("Opening Google Maps...");
    } else if (url.includes('cashmaal.com')) {
      toast.info("Redirecting to Cashmaal Payment Gateway...");
    }

    // Creating a sandboxed dynamic anchor element is the safest way to trigger deep links / external redirects
    // in both standard browsers and mobile WebViews without breaking the active navigation history.
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    
    document.body.appendChild(anchor);
    anchor.click();
    
    // Clean up
    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
    }, 150);

    return true;
  } catch (error) {
    console.error("Critical failure during external app launch:", error);
    toast.error("Could not launch the external application. Please ensure it is installed on your device.");
    return false;
  }
}

/**
 * Robustly manages window scroll positions per pathname to enable seamless transition
 * when returning to the application.
 */
export function useScrollRestoration(pathname: string, dependencyLoaded: boolean = true) {
  const scrollKey = `binusman_scroll_pos_${pathname}`;

  useEffect(() => {
    if (!dependencyLoaded) return;

    // Retrieve and restore scroll position after elements have rendered
    const savedPosition = localStorage.getItem(scrollKey);
    if (savedPosition) {
      const { x, y } = JSON.parse(savedPosition);
      // Stagger slightly to allow browser layout calculation to settle
      const timer = setTimeout(() => {
        window.scrollTo({
          left: x,
          top: y,
          behavior: 'auto'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, dependencyLoaded, scrollKey]);

  useEffect(() => {
    const handleScroll = () => {
      const position = { x: window.scrollX, y: window.scrollY };
      try {
        localStorage.setItem(scrollKey, JSON.stringify(position));
      } catch (e) {
        // Ignore quota/storage warnings silently
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollKey]);
}

/**
 * Set up listeners for standard hybrid application lifecycle states (pause/resume)
 * to perform proactive data synchronization and state locking.
 */
export function useAppLifecycle(onPause?: () => void, onResume?: () => void) {
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);

  useEffect(() => {
    onPauseRef.current = onPause;
    onResumeRef.current = onResume;
  }, [onPause, onResume]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("App moved to background (hidden). Saving state...");
        if (onPauseRef.current) onPauseRef.current();
      } else if (document.visibilityState === 'visible') {
        console.log("App returned to foreground (visible). Restoring state...");
        if (onResumeRef.current) onResumeRef.current();
      }
    };

    // Standard Android/iOS WebView pause & resume events
    const handlePause = () => {
      console.log("Activity pause event triggered.");
      if (onPauseRef.current) onPauseRef.current();
    };

    const handleResume = () => {
      console.log("Activity resume event triggered.");
      if (onResumeRef.current) onResumeRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pause', handlePause);
    document.addEventListener('resume', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pause', handlePause);
      document.removeEventListener('resume', handleResume);
    };
  }, []);
}
