import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/apiServices";
import { decodeToken } from "../../utils/auth";

const INVENTORY_ITEMS = [
  { name: "HDMI Cables (1m)", qty: "124 units", amt: "₹12,400" },
  { name: "USB-C Hub Pro", qty: "38 units", amt: "₹34,200" },
  { name: "Wireless Kbd", qty: "72 units", amt: "₹57,600" },
  { name: "Monitor Stand", qty: "19 units", amt: "₹28,500" },
];

const BRAND_STATS = [
  { num: "12K+", label: "Businesses" },
  { num: "98%", label: "Uptime" },
  { num: "4.9★", label: "Rating" },
];

// Shared input styling — keeps the email/password fields identical.
const INPUT_CLASS =
  "w-full rounded-[10px] border-[1.5px] border-slate-200 bg-[#FAFAFA] pl-4 pr-10 py-2.5 " +
  "text-sm text-[#0A1628] transition placeholder:text-[#C0C0C0] focus:border-[#2563C4] " +
  "focus:bg-white focus:ring-4 focus:ring-[#D6E4FA] focus:outline-none";

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
    <div
      className="flex min-h-screen flex-col bg-white lg:flex-row"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Left: Form ── */}
      <div className="flex flex-col justify-start px-6 py-8 max-[380px]:px-5 max-[380px]:py-6 sm:px-12 sm:py-12 lg:basis-[45%] lg:shrink-0 lg:grow-0 lg:justify-center lg:px-16">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E4D96]">
            <LedgrMark />
          </div>
          <span className="text-[22px] font-bold tracking-tight text-[#0A1628]">
            Ledgr<span className="text-[#2563C4]">.</span>
          </span>
        </div>

        <h1 className="mb-1.5 text-[28px] font-bold tracking-tight text-[#0A1628]">
          Welcome back
        </h1>
        <p className="mb-10 text-[15px] leading-relaxed text-slate-500">
          Sign in to manage your inventory, invoices, and more.
        </p>

        <form onSubmit={handleLogin} noValidate>
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#B91C1C" strokeWidth="1.5" />
                <path
                  d="M8 5v3.5M8 10.5v.5"
                  stroke="#B91C1C"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              {error}
            </div>
          )}

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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                title={showPass ? "Hide password" : "Show password"}
                aria-label={showPass ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
                    stroke="#9CA3AF"
                    strokeWidth="1.3"
                  />
                  <circle cx="8" cy="8" r="1.8" stroke="#9CA3AF" strokeWidth="1.3" />
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
            <a
              href="#"
              className="text-[13px] font-medium text-[#2563C4] no-underline"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mb-6 w-full rounded-[10px] bg-[#1E4D96] py-3 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="animate-spin"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 2a6 6 0 0 1 6 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">
              or continue with
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-slate-200 bg-white py-2.5 text-sm font-medium text-[#0D2140] transition hover:bg-slate-50"
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
            className="font-semibold text-[#2563C4] no-underline"
          >
            Request access
          </a>
        </p>
      </div>

      {/* ── Right: Branding ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#0D2140] px-6 py-10 sm:px-10 sm:pb-14 sm:pt-12 lg:p-12">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#0F2D5A] opacity-50" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#0F2D5A] opacity-40" />

        <div className="relative z-10 flex w-full flex-col items-center">
          <h2 className="mb-4 max-w-[380px] text-center text-2xl font-bold leading-tight tracking-tight text-white sm:text-[32px]">
            Run your business from one place
          </h2>
          <p className="mb-12 max-w-[340px] text-center text-[15px] leading-relaxed text-[#A3BEF0]">
            Inventory tracking, smart invoicing, and custom calculations — built
            for Indian businesses.
          </p>

          {/* Stats */}
          <div className="mb-14 flex gap-8 max-[640px]:gap-5">
            {BRAND_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[28px] font-bold tracking-tight text-white max-[640px]:text-[22px]">
                  {s.num}
                </div>
                <div className="mt-0.5 text-xs tracking-wide text-[#A3BEF0]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Mockup */}
          <div className="w-full max-w-[360px] rounded-[14px] bg-white px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-[640px]:max-w-full">
            <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-[13px] font-semibold text-[#0A1628]">
                Today's Inventory
              </span>
              <span className="rounded-full bg-green-100 px-2 py-[3px] text-[11px] font-semibold text-green-800">
                Live
              </span>
            </div>

            {INVENTORY_ITEMS.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between border-b border-slate-50 py-2"
              >
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{item.qty}</div>
                </div>
                <div className="text-xs font-semibold text-[#0F2D5A]">
                  {item.amt}
                </div>
              </div>
            ))}

            <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span className="text-[11px] text-slate-400">
                Total stock value
              </span>
              <span className="text-sm font-bold text-[#1A3F7A]">₹1,32,700</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgrMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="6" height="2.5" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="2" y="7.5" width="10" height="2.5" rx="1" fill="white" />
      <rect x="2" y="12" width="8" height="2.5" rx="1" fill="white" fillOpacity="0.75" />
      <circle cx="15" cy="14.5" r="3.5" stroke="white" strokeWidth="1.5" fill="none" />
      <path
        d="M15 13.2v1.3l.8.8"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
