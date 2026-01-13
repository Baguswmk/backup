import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '@/modules/auth/store/authStore';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import LoginPage from '@/pages/LoginPage';
import { ROLE_CONFIG } from '@/shared/permissions/roleConfig';
import LoadingOverlay from '@/shared/components/LoadingOverlay';

const APP_COMPONENTS = {
  'timbangan-internal': lazy(() => import('@/pages/TimbanganInternalPage')),
};

const AppHub = lazy(() => 
  import('@/pages/AppHubPage').catch(error => {
    console.error('Failed to load App Hub:', error);
    return { default: () => <AppLoadError appName="Application Hub" /> };
  })
);

const AppLoadError = ({ appName }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Failed to load {appName}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        There was an error loading the application. This might be due to a network issue or temporary server problem.
      </p>
      <div className="space-y-2">
        <button 
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
        <button
          onClick={() => window.location.href = '/timbangan-internal/hub'}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Hub
        </button>
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ 
  children, 
  requiredRoles = null, 
  appKey = null,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const { hasAppAccess, hasRole } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/timbangan-internal/login" replace />;
  }

  if (appKey && !hasAppAccess(appKey)) {
    console.warn(`Access denied to app: ${appKey} for role: ${user?.role}`);
    return <Navigate to="/timbangan-internal/hub" replace />;
  }
  
  if (requiredRoles && !hasRole(...requiredRoles)) {
    console.warn(`Role access denied. Required: ${requiredRoles.join(', ')}, User: ${user?.role}`);
    return <Navigate to="/timbangan-internal/hub" replace />;
  }
  
  return children;
};

const ExternalAppRedirect = ({ appKey, url, requiredRoles }) => {
  const { user } = useAuthStore();
  const { hasRole } = useAuth();
  
  React.useEffect(() => {
    if (!hasRole(...requiredRoles)) {
      console.warn(`Access denied to external app: ${appKey}`);
      window.location.href = '/timbangan-internal/hub';
      return;
    }
    
    const urlWithContext = new URL(url);
    window.location.href = urlWithContext.toString();
  }, [appKey, url, requiredRoles, user, hasRole]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Redirecting to {ROLE_CONFIG.metadata[appKey]?.name}...
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          If you're not redirected automatically, 
          <a href={url} className="text-blue-600 hover:underline ml-1">
            click here
          </a>
        </p>
      </div>
    </div>
  );
};

const AuthenticatedUserRedirect = () => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/timbangan-internal/login" replace />;
  }
  
  return <Navigate to="/timbangan-internal/hub" replace />;
};

// Dynamic route generator untuk internal apps
const generateInternalRoutes = () => {
  return Object.entries(ROLE_CONFIG.metadata)
    .filter(([_, config]) => config.type === 'internal')
    .map(([appKey, config]) => {
      const Component = APP_COMPONENTS[appKey];
      
      if (!Component) {
        console.warn(`No component found for app: ${appKey}`);
        return null;
      }
      
      return (
        <Route 
          key={appKey}
          path={`${config.path}/*`}
          element={
            <ProtectedRoute 
              requiredRoles={ROLE_CONFIG.apps[appKey]}
              appKey={appKey}
            >
              <Suspense fallback={<LoadingOverlay message={config.loadingMessage} />}>
                <Component />
              </Suspense>
            </ProtectedRoute>
          } 
        />
      );
    })
    .filter(Boolean);
};

// Dynamic route generator untuk external apps
const generateExternalRoutes = () => {
  return Object.entries(ROLE_CONFIG.metadata)
    .filter(([_, config]) => config.type === 'external')
    .map(([appKey, config]) => (
      <Route 
        key={appKey}
        path={`/timbangan-internal/apps/${appKey}`}
        element={
          <ProtectedRoute 
            requiredRoles={ROLE_CONFIG.apps[appKey]}
            appKey={appKey}
          >
            <ExternalAppRedirect 
              appKey={appKey}
              url={config.url}
              requiredRoles={ROLE_CONFIG.apps[appKey]}
            />
          </ProtectedRoute>
        } 
      />
    ));
};

export const AppRouter = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Authentication Routes */}
        <Route 
          path="/timbangan-internal/login" 
          element={
            <Suspense fallback={<LoadingOverlay message="Loading authentication..." />}>
              <LoginPage />
            </Suspense>
          } 
        />
        
        {/* Application Hub */}
        <Route 
          path="/timbangan-internal/hub" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingOverlay message="Loading application hub..." />}>
                <AppHub />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Dynamic Internal Routes */}
        {generateInternalRoutes()}
        
        {/* Dynamic External Routes */}
        {generateExternalRoutes()}
        
        {/* Root redirect */}
        <Route path="/" element={<AuthenticatedUserRedirect />} />
        
        {/* Legacy redirects */}
        <Route path="/timbangan-internal/dashboard" element={<Navigate to="/timbangan-internal/hub" replace />} />
        <Route path="/timbangan-internal" element={<Navigate to="/timbangan-internal/hub" replace />} />
        
        {/* 404 handling */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </ErrorBoundary>
  );
};

export { ROLE_CONFIG };