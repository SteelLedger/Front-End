import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { AuthError, AuthButton } from "../components/AuthShell";
import { AUTH_INPUT_CLASS, AUTH_LINK_CLASS } from "../../utils/authStyles";
import { login } from "../../services/apiServices";
import { decodeToken } from "../../utils/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both fields to continue.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email, password });
      // Tolerate a few response shapes: { data: { accessToken, user } } or
      // { accessToken, user } / { token }.
      const body = res?.data ?? {};
      const payload = body?.data ?? body;
      const token = payload?.accessToken ?? payload?.token;
      const user = payload?.user;

      if (!token) {
        throw new Error("No access token in response.");
      }

      localStorage.setItem("token", token);
      // Store a user object merging JWT claims (email/role) with any user
      // object the API returned (which may carry a name).
      const claims = decodeToken(token) || {};
      localStorage.setItem(
        "user",
        JSON.stringify({ ...claims, ...(user || {}) }),
      );
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Invalid email or password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="mb-1.5 text-[28px] font-bold tracking-tight text-[#0A1628]">
        Welcome back
      </h1>
      <p className="mb-10 text-[15px] leading-relaxed text-slate-500">
        Sign in to manage your inventory, invoices, and more.
      </p>

      <form onSubmit={handleLogin} noValidate>
        <AuthError message={error} />

        {/* Email */}
        <div className="mb-5">
          <label
            htmlFor="email"
            className="mb-1.5 block text-[13px] font-semibold text-[#0D2140]"
          >
            Email address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={AUTH_INPUT_CLASS}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="1.5"
                  y="3.5"
                  width="13"
                  height="9"
                  rx="1.5"
                  stroke="#9CA3AF"
                  strokeWidth="1.3"
                />
                <path
                  d="M1.5 5.5l6.5 4 6.5-4"
                  stroke="#9CA3AF"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </div>

        {/* Password */}
        <div className="mb-5">
          <label
            htmlFor="password"
            className="mb-1.5 block text-[13px] font-semibold text-[#0D2140]"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={AUTH_INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              title={showPass ? "Hide password" : "Show password"}
              aria-label={showPass ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -mr-2 -translate-y-1/2 p-2 text-slate-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
                  stroke="#9CA3AF"
                  strokeWidth="1.3"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="1.8"
                  stroke="#9CA3AF"
                  strokeWidth="1.3"
                />
                {showPass && (
                  <path
                    d="M3 3l10 10"
                    stroke="#9CA3AF"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Forgot */}
        <div className="-mt-2 mb-6 flex justify-end">
          <Link to="/forgot-password" className={AUTH_LINK_CLASS}>
            Forgot password?
          </Link>
        </div>

        <AuthButton loading={loading} loadingLabel="Signing in…">
          Sign in
        </AuthButton>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">
            or continue with
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-slate-200 bg-white py-2.5 text-sm font-medium text-[#0D2140] transition hover:bg-slate-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M16.51 8.18h-7.4v3.13h4.27c-.19 1-.75 1.84-1.6 2.4v2h2.57c1.5-1.38 2.37-3.41 2.37-5.8 0-.47-.04-.93-.11-1.37l-.1-.36z"
            />
            <path
              fill="#34A853"
              d="M9.11 17c2.14 0 3.94-.7 5.25-1.9l-2.57-2c-.71.47-1.62.75-2.68.75-2.06 0-3.8-1.38-4.42-3.24H2.06v2.06A8 8 0 0 0 9.11 17z"
            />
            <path
              fill="#FBBC05"
              d="M4.69 10.61A4.78 4.78 0 0 1 4.44 9c0-.56.1-1.1.25-1.61V5.33H2.06A8 8 0 0 0 1.11 9c0 1.29.31 2.51.85 3.59l.1.18 2.63-2.16z"
            />
            <path
              fill="#EA4335"
              d="M9.11 3.98c1.16 0 2.2.4 3.02 1.18l2.26-2.25A7.97 7.97 0 0 0 9.11 1a8 8 0 0 0-7.05 4.21l.1.18 2.53 2C5.3 5.38 7.05 3.98 9.11 3.98z"
            />
          </svg>
          Sign in with Google
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-slate-500">
        Don't have an account?{" "}
        <a
          href="#"
          className="-my-1.5 inline-block py-1.5 align-baseline font-semibold text-[#2563C4] no-underline"
        >
          Request access
        </a>
      </p>
    </AuthShell>
  );
}
