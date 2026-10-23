import { useCallback, useEffect, useState } from 'react';

const routes = { analyze: 'analyze', methodology: 'about', models: 'models', history: 'history' };
const paths = { analyze: 'analyze', about: 'methodology', models: 'models', history: 'history' };
const currentRoute = () => typeof window === 'undefined' ? 'analyze' : routes[window.location.hash.slice(1)] || 'analyze';

export function useHashNavigation() {
  const [activeNav, setActiveNav] = useState(currentRoute);
  useEffect(() => {
    const onHashChange = () => { const route = routes[window.location.hash.slice(1)]; if (route) setActiveNav(route); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = useCallback(route => {
    if (!paths[route]) return;
    setActiveNav(route);
    if (window.location.hash !== `#${paths[route]}`) window.location.hash = paths[route];
  }, []);
  return { activeNav, navigate };
}
