import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@/routes/AppRouter';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'sonner';
import './App.css';
import { queryClient } from '@/shared/config/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;