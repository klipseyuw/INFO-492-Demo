"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

type Step = "input" | "verify";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Logistics Defense <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-gray-600">Loading login…</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="h-40 bg-gray-100 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = useState<Step>("input");

  // Form states
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const redirect = useMemo(() => search.get("redirect") || "/dashboard", [search]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post("/api/auth/send-code", {
        email: email.trim(),
        password: password,
      });

      if (response.data?.success) {
        setMessage("Verification code sent to your email!");
        setStep("verify");

        // Show code in dev/test if returned by API
        if (response.data?.testCode) {
          alert(`Your verification code is: ${response.data.testCode}`);
        }
      } else {
        setError(response.data?.error || "Invalid credentials or failed to send code");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid credentials or failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post("/api/auth/verify-code", {
        email: email.trim(),
        code: code.trim(),
      });

      if (response.data?.success) {
        setMessage("Login successful! Redirecting...");
        setTimeout(() => {
          router.replace(redirect || "/dashboard");
          router.refresh();
        }, 400);
      } else {
        setError(response.data?.error || "Invalid verification code");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMethod = () => {
    setStep("input");
    setCode("");
    setPassword("");
    setError("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Logistics Defense <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            )}

            {/* Step 1: Input Email + Password */}
            {step === "input" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? "Sending code..." : "Continue"}
                </button>
                <div className="text-xs text-gray-500 text-center">
                  A verification code will be sent to your email
                </div>
              </form>
            )}

            {/* Step 2: Verify Code */}
            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Code sent to {email}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    loading || code.length !== 6
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>

                <button
                  type="button"
                  onClick={handleChangeMethod}
                  className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-900 transition-all"
                >
                  ← Back to login
                </button>
              </form>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">🔐 Two-Factor Authentication</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 6-digit code expires in 5 minutes</li>
                <li>• Your role is determined by your credentials</li>
                <li>• Check browser console for test code (dev mode)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Secure authentication for warehouse logistics operations
        </p>
      </div>
    </div>
  );
}
