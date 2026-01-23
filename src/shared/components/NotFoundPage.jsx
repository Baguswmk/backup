import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-gray-600 mb-6">
          Maaf, halaman yang Anda cari tidak dapat ditemukan.
        </p>
        <Link to="/dashboard">
          <Button>Kembali ke Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};
