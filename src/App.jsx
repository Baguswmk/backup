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
          <Toaster
          position="top-right"
          toastOptions={{
            className: cn(
              "bg-neutral-50 dark:bg-slate-800",
              "text-gray-900 dark:text-gray-100",
            ),
          }}
        />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;