import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName && user) {
            // Send navigation event to backend analytics endpoint
            trackNavigation(pageName, pathname);
        }
    }, [location, isAuthenticated, Pages, mainPageKey, user]);

    const trackNavigation = async (pageName, pathname) => {
        try {
            // TODO: Implement analytics endpoint in backend
            // await apiClient.post('/analytics/track', {
            //     userId: user?.id,
            //     pageName,
            //     pathname,
            //     timestamp: new Date().toISOString()
            // });
            
            // Temporarily disabled - analytics endpoint not implemented
            console.debug('Navigation tracked (client-side only):', { pageName, pathname });
        } catch (error) {
            // Silently fail - don't break navigation if logging fails
        }
    };

    return null;
}