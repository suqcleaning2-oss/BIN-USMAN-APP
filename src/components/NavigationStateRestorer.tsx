import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function NavigationStateRestorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRestored = useRef(false);

  // 1. Continuous navigation tracking and state backup
  useEffect(() => {
    // Avoid saving transient or error screens as a target to prevent loops
    if (
      location.pathname.startsWith('/payment/status/') ||
      location.pathname === '/login' ||
      location.pathname === '/register'
    ) {
      // Just save the homepage fallback or previous valid screens instead of forcing processing loops
      return;
    }

    const routeData = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state
    };

    try {
      localStorage.setItem('binusman_last_route', JSON.stringify(routeData));
    } catch (e) {
      // Silent catch
    }
  }, [location]);

  // 2. High-precision cold-start restoration on initial mount
  useEffect(() => {
    if (isRestored.current) return;
    isRestored.current = true;

    // Only restore if the user starts at the root '/' page.
    // If they have a deep link or external callback URL (like /payment/status/... or /listing/xyz),
    // we MUST respect that immediately and avoid overriding it!
    if (window.location.pathname === '/') {
      try {
        const saved = localStorage.getItem('binusman_last_route');
        if (saved) {
          const routeData = JSON.parse(saved);
          if (routeData && routeData.pathname && routeData.pathname !== '/') {
            console.log(`Restoring previous screen: ${routeData.pathname}${routeData.search || ''}`);
            navigate(
              {
                pathname: routeData.pathname,
                search: routeData.search || '',
                hash: routeData.hash || ''
              },
              {
                state: routeData.state,
                replace: true
              }
            );
          }
        }
      } catch (err) {
        console.error("Error restoring navigation state:", err);
      }
    }
  }, [navigate]);

  return null;
}
