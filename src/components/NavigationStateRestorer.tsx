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
    // App start opens Home page directly without overriding with historical routes
  }, []);

  return null;
}
