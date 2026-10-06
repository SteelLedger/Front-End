import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { AuthError, AuthButton } from "../components/AuthShell";
import { AUTH_INPUT_CLASS, AUTH_LINK_CLASS } from "../../utils/authStyles";
import { login } from "../../services/apiServices";
import { decodeToken, mustSetPassword } from "../../utils/auth";

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
      // `isPasswordReset: false` means this is still the temporary password an
      // admin issued, so the account isn't usable until it's replaced. Read it
      // back through mustSetPassword() so the polarity lives in one place —
      // ProtectedRoute enforces the same check on every other route.
      navigate(mustSetPassword() ? "/set-password" : "/dashboard", {
        replace: true,
      });
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

      </form>

      <p className="mt-7 text-center text-[13px] text-slate-500">
        Don't have an account? Ask an admin on your team to invite you.
      </p>
    </AuthShell>
  );
}
