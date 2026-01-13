// Unauthorized Page
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

export const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center">
        <h1 className="text-9xl font-bold text-gray-300">403</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Akses Ditolak
        </h2>
        <p className="text-gray-600 mb-6">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <Link to="/dashboard">
          <Button>Kembali ke Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};
