import { useEffect, useRef, useState } from "react";
import { verifyTokenWithBackend, storeAuthToken } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { config } from "@/lib/config";

const isDev = import.meta.env.DEV;

// Helper to log only in development
function devLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

function devError(...args: unknown[]) {
  if (isDev) {
    console.error(...args);
  }
}

/* Global type for Google Sign-In */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

interface LoginProps {
  onLoginSuccess: () => void;
  onLoginError?: (error: string) => void;
}

export default function Login({ onLoginSuccess, onLoginError }: LoginProps) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const isInitializing = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for Google library to load
    if (!window.google) {
      const timer = setTimeout(() => {
        initializeGoogleSignIn();
      }, 100);
      return () => clearTimeout(timer);
    }

    initializeGoogleSignIn();
  }, []);

  function initializeGoogleSignIn() {
    if (isInitializing.current) return;
    if (!window.google) return;

    isInitializing.current = true;

    window.google.accounts.id.initialize({
      client_id: config.google.clientId || "",
      callback: handleCredentialResponse,
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
      });
    }
  }

  async function handleCredentialResponse(response: { credential: string }) {
    try {
      setLoading(true);
      setError(null);

      devLog("🔐 Login attempt - verifying token with backend...");

      // Verify token with backend (most important step!)
      const verification = await verifyTokenWithBackend(response.credential);

      if (verification.authorized) {
        // ✅ Token verified AND user in whitelist
        devLog("✅ Authorization successful!");
        storeAuthToken(response.credential);
        onLoginSuccess();
      } else {
        // ❌ User not in whitelist
        const errorMsg =
          verification.error === "UNAUTHORIZED"
            ? "Your email is not authorized to access this dashboard."
            : verification.error || "Access denied. Please contact your administrator.";
        setError(errorMsg);
        onLoginError?.(errorMsg);
        devError("❌ Auth failed:", verification.error);
      }
    } catch (error) {
      const errorMsg = "Login failed. Please try again.";
      setError(errorMsg);
      devError("💥 Login error:", error);
      onLoginError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-sm mx-4">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <span className="text-lg font-bold text-white">S</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shahi Dashboard</h1>
          <p className="text-slate-400">Shipment Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 backdrop-blur-sm">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-950/50 border-red-900 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google Sign-In Button */}
          <div className="mb-6">
            {!config.google.clientId ? (
              <Alert variant="destructive" className="bg-red-950/50 border-red-900 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Environment variables not configured. Set VITE_GOOGLE_CLIENT_ID in .env
                </AlertDescription>
              </Alert>
            ) : (
              <div ref={googleBtnRef} className="flex justify-center" role="button" />
            )}
          </div>

          {/* Info Text */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Sign in with your authorized email account
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Only whitelisted users can access this dashboard
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500">
          <p>Secure authentication powered by Google OAuth 2.0</p>
        </div>
      </div>
    </div>
  );
}

