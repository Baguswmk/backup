import React from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Grid3x3 } from "lucide-react";
import LoginForm from "@/modules/auth/components/LoginForm";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import LoadingContent from "@/shared/components/LoadingContent";

const LoginPage = () => {
  const { login, isLoading, isAuthenticated, error, clearError } = useAuth();
  const [searchParams] = useSearchParams();
  const ssoError = searchParams.get("error");

  if (isLoading && isAuthenticated) {
    return (
      <LoadingOverlay
        isVisible={true}
        message="Redirecting to Application Hub..."
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-slate-900">
      <div className="max-w-md w-full mx-4">
        <Card className="shadow-xl border-0 dark:bg-slate-800">
          <CardHeader>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center">
                  <Grid3x3 className="w-12 h-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-200">
                Welcome Back
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2 dark:text-gray-400">
                Sign in to access your applications
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {ssoError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  SSO Login gagal: {decodeURIComponent(ssoError)}
                </p>
              </div>
            )}

            {isLoading && !isAuthenticated ? (
              <LoadingContent />
            ) : (
              <LoginForm
                onSubmit={login}
                isLoading={isLoading}
                error={error}
                clearError={clearError}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <LoadingOverlay
        isVisible={isLoading && !isAuthenticated}
        message="Signing in..."
      />
    </div>
  );
};

export default LoginPage;
