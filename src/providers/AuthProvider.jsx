import { createContext, useEffect, useContext } from 'react';
import  useAuthStore  from '@/modules/auth/store/authStore';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const { 
    user, 
    token, 
    isAuthenticated, 
    isLoading,
    login, 
    logout, 
    checkAuth,
    clearError 
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const contextValue = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};
