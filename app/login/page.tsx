"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

type LoginMethod = "email" | "phone" | "password";
type Step = "input" | "verify";
type Role = "ANALYST" | "OPERATOR" | "ADMIN";

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

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [step, setStep] = useState<Step>("input");

  // Form states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Role selection (now ALWAYS visible in UI, dev & prod)
  const [role, setRole] = useState<Role>("ANALYST");

  const redirect = useMemo(() => search.get("redirect") || "/dashboard", [search]);

  useEffect(() => {
    // Clear any leftover dev override cookie so it doesn't surprise you locally
    if (process.env.NODE_ENV !== "production") {
      try {
        document.cookie = `devRole=; Max-Age=0; Path=/`;
      } catch {}
    }
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
  
    try {
      const payload =
        loginMethod === "email" ? { email: email.trim() } : { phone: phone.trim() };
  
      const response = await axios.post("/api/auth/send-code", payload);
  
      if (response.data?.success) {
        setMessage("Verification code sent!");
        setStep("verify");
  
        // ✅ Show code if API returned it (dev OR prod with ALLOW_TEST_CODES=true)
        if (response.data?.testCode) {
          alert(`Your verification code is: ${response.data.testCode}`);
        } else {
          // Fallback: tell yourself where to look if code isn't returned
          console.log(
            "Verification code not returned by API. If running on Render, enable ALLOW_TEST_CODES=true or check server logs."
          );
        }
      } else {
        setError(response.data?.error || "Failed to send verification code");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", {
        email: email.trim(),
        password: password,
      });
      if (response.data?.success) {
        const roleFromServer = response.data?.user?.role as Role | undefined;
        // Optional dev cookie to preview dashboards
        if (process.env.NODE_ENV !== "production" && roleFromServer) {
          try {
            document.cookie = `devRole=${roleFromServer}; Max-Age=${60 * 60 * 12}; Path=/`;
          } catch {}
        }
        setMessage("Login successful! Redirecting...");
        setTimeout(() => {
          router.replace(redirect || "/dashboard");
          router.refresh();
        }, 300);
      } else {
        setError(response.data?.error || "Invalid credentials");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };


  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Send the selected role to the server in ALL environments.
      // Server can gate honoring it with ALLOW_DEMO_ROLE_SELECTOR=true.
      const payload =
        loginMethod === "email"
          ? { email: email.trim(), code: code.trim(), desiredRole: role }
          : { phone: phone.trim(), code: code.trim(), desiredRole: role };

      const response = await axios.post("/api/auth/verify-code", payload);

      if (response.data?.success) {
        setMessage("Login successful! Redirecting...");

        // Local dev cookie to let your middleware preview dashboards by role
        if (process.env.NODE_ENV !== "production") {
          try {
            document.cookie = `devRole=${role}; Max-Age=${60 * 60 * 12}; Path=/`;
          } catch {}
        }

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
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setLoginMethod("email");
                handleChangeMethod();
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                loginMethod === "email"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              type="button"
            >
              Email Login
            </button>
            <button
              onClick={() => {
                setLoginMethod("phone");
                handleChangeMethod();
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                loginMethod === "phone"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              type="button"
            >
              Phone Login
            </button>
            <button
              onClick={() => {
                setLoginMethod("password");
                setStep("input");
                setCode("");
                setError("");
                setMessage("");
              }}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                loginMethod === "password"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              type="button"
            >
              Demo Accounts
            </button>
          </div>

          <div className="p-8">
            {/* Role picker — visible for code login only (server can override) */}
            {loginMethod !== "password" && (
            <div className="mb-6 p-3 rounded-md border border-blue-200 bg-blue-50">
              <div className="text-xs font-semibold text-blue-900 mb-2">
                Choose a role for this session
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="ANALYST"
                    checked={role === "ANALYST"}
                    onChange={() => setRole("ANALYST")}
                  />
                  Analyst
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="OPERATOR"
                    checked={role === "OPERATOR"}
                    onChange={() => setRole("OPERATOR")}
                  />
                  Operator
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={role === "ADMIN"}
                    onChange={() => setRole("ADMIN")}
                  />
                  Admin
                </label>
              </div>
              <div className="mt-1 text-[11px] text-blue-800">
                In production, the server may ignore this unless{" "}
                <code className="px-1 bg-blue-100 rounded">ALLOW_DEMO_ROLE_SELECTOR=true</code> is set.
              </div>
            </div>
            )}

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

            {/* Password-based Demo Account Login */}
            {loginMethod === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="demo-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="demo-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="demo-password"
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
                  {loading ? "Signing in..." : "Sign in"}
                </button>
                <div className="text-xs text-gray-500 text-center">
                  Use the demo credentials provided for this environment.
                </div>
              </form>
            )}

            {/* Step 1: Input Email/Phone for code login */}
            {loginMethod !== "password" && step === "input" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                {loginMethod === "email" ? (
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
                ) : (
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="1234567890"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter 10-15 digits without spaces or dashes</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            )}

            {/* Step 2: Verify Code */}
            {loginMethod !== "password" && step === "verify" && (
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
                    Code sent to {loginMethod === "email" ? email : phone}
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
                  ← Back to input
                </button>
              </form>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">🔐 Verification Code Info</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 6-digit code expires in 5 minutes</li>
                <li>• Limited to 3 code requests per minute</li>
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
