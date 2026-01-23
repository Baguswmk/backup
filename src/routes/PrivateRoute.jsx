import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/timbangan-internal/login" replace />
  );
};
