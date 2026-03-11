import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "@/modules/auth/store/authStore";

const SSOCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const completeSSOLogin = useAuthStore((state) => state.completeSSOLogin);

  useEffect(() => {
    let isMounted = true;

    const processSSOCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const status = searchParams.get("status");
      const token = searchParams.get("token");
      const ssoToken = searchParams.get("sso_token");
      const error = searchParams.get("error");
      const message = searchParams.get("message");

      if (error) {
        const finalMessage = message || error;
        if (isMounted) {
          navigate(
            `/timbangan-internal/login?error=${encodeURIComponent(finalMessage)}`,
            { replace: true },
          );
        }
        return;
      }

      const result = await completeSSOLogin({
        code,
        state,
        status,
        token,
        ssoToken,
      });

      if (!isMounted) {
        return;
      }

      if (result.success) {
        navigate("/timbangan-internal/hub", { replace: true });
      } else {
        navigate(
          `/timbangan-internal/login?error=${encodeURIComponent(
            result.error || "SSO login failed",
          )}`,
          { replace: true },
        );
      }
    };

    processSSOCallback();

    return () => {
      isMounted = false;
    };
  }, [completeSSOLogin, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-lg shadow-md p-6 text-center max-w-md w-full">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-lg font-semibold text-gray-900">Completing login...</h1>
        <p className="text-sm text-gray-600 mt-2">
          Please wait while we verify your SSO session.
        </p>
      </div>
    </div>
  );
};

export default SSOCallbackPage;
