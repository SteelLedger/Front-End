import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/apiServices";

const BLUE = {
  900: "#0A1628",
  800: "#0D2140",
  700: "#0F2D5A",
  600: "#1A3F7A",
  500: "#1E4D96",
  400: "#2563C4",
  300: "#4A80D8",
  200: "#A3BEF0",
  100: "#D6E4FA",
  50: "#EEF4FD",
};

const INVENTORY_ITEMS = [
  { name: "HDMI Cables (1m)", qty: "124 units", amt: "₹12,400" },
  { name: "USB-C Hub Pro", qty: "38 units", amt: "₹34,200" },
  { name: "Wireless Kbd", qty: "72 units", amt: "₹57,600" },
  { name: "Monitor Stand", qty: "19 units", amt: "₹28,500" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoverBtn, setHoverBtn] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

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
      const data = await login({ email, password });
      localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Invalid email or password. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes spin { to { transform: rotate(360deg); } }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input::placeholder { color: #C0C0C0; }
        input:focus { outline: none; }

        .lp-page {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background-color: #fff;
        }

        /* ── Left panel ── */
        .lp-left {
          flex: 0 0 45%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 4rem;
          background-color: #fff;
          position: relative;
          z-index: 1;
        }

        /* ── Right panel ── */
        .lp-right {
          flex: 1;
          background-color: ${BLUE[800]};
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3rem;
          position: relative;
          overflow: hidden;
        }

        .lp-right-inner {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .lp-circle-top {
          position: absolute;
          top: -80px;
          right: -80px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background-color: ${BLUE[700]};
          opacity: 0.5;
        }
        .lp-circle-bottom {
          position: absolute;
          bottom: -100px;
          left: -60px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background-color: ${BLUE[700]};
          opacity: 0.4;
        }

        /* Tablet: stack panels vertically, show both */
        @media (max-width: 1024px) {
          .lp-page { flex-direction: column; }

          .lp-left {
            flex: none;
            width: 100%;
            padding: 3rem 3rem;
            justify-content: flex-start;
          }

          .lp-right {
            flex: none;
            width: 100%;
            padding: 3rem 2.5rem 3.5rem;
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .lp-left {
            padding: 2rem 1.5rem;
          }

          .lp-right {
            padding: 2.5rem 1.5rem;
          }

          .lp-brand-headline {
            font-size: 24px !important;
          }

          .lp-mockup {
            max-width: 100% !important;
          }

          .lp-stats-row {
            gap: 1.25rem !important;
          }

          .lp-stat-num {
            font-size: 22px !important;
          }
        }

        /* Very small phones */
        @media (max-width: 380px) {
          .lp-left {
            padding: 1.5rem 1.25rem;
          }
        }

        /* Input focus */
        .lp-input {
          width: 100%;
          padding: 11px 42px 11px 16px;
          font-size: 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          outline: none;
          color: ${BLUE[900]};
          background-color: #FAFAFA;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }

        .lp-submit-btn {
          width: 100%;
          padding: 13px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background-color: ${BLUE[500]};
          border: none;
          border-radius: 10px;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: background-color 0.15s, transform 0.1s;
          font-family: inherit;
          margin-bottom: 1.5rem;
        }
        .lp-submit-btn:hover:not(:disabled) {
          background-color: ${BLUE[600]};
          transform: translateY(-1px);
        }
        .lp-submit-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .lp-google-btn {
          width: 100%;
          padding: 11px;
          font-size: 14px;
          font-weight: 500;
          color: ${BLUE[800]};
          background-color: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: inherit;
          transition: background-color 0.15s;
        }
        .lp-google-btn:hover { background-color: #F9FAFB; }
      `}</style>

      <div className="lp-page">
        {/* ── Left: Form ── */}
        <div className="lp-left">
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: "3rem",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: BLUE[500],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect
                  x="2"
                  y="3"
                  width="6"
                  height="2.5"
                  rx="1"
                  fill="white"
                  fillOpacity="0.9"
                />
                <rect
                  x="2"
                  y="7.5"
                  width="10"
                  height="2.5"
                  rx="1"
                  fill="white"
                />
                <rect
                  x="2"
                  y="12"
                  width="8"
                  height="2.5"
                  rx="1"
                  fill="white"
                  fillOpacity="0.75"
                />
                <circle
                  cx="15"
                  cy="14.5"
                  r="3.5"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M15 13.2v1.3l.8.8"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: BLUE[900],
                letterSpacing: "-0.5px",
              }}
            >
              Ledgr<span style={{ color: BLUE[400] }}>.</span>
            </span>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: BLUE[900],
              letterSpacing: "-0.5px",
              marginBottom: 6,
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#6B7280",
              marginBottom: "2.5rem",
              lineHeight: 1.5,
            }}
          >
            Sign in to manage your inventory, invoices, and more.
          </p>

          <form onSubmit={handleLogin} noValidate>
            {error && (
              <div
                style={{
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#B91C1C",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="#B91C1C"
                    strokeWidth="1.5"
                  />
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
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: BLUE[800],
                  marginBottom: 6,
                  letterSpacing: "0.01em",
                }}
                htmlFor="email"
              >
                Email address
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  className="lp-input"
                  style={{
                    borderColor: focusEmail ? BLUE[400] : "#E5E7EB",
                    boxShadow: focusEmail ? `0 0 0 3px ${BLUE[100]}` : "none",
                    backgroundColor: focusEmail ? "#fff" : "#FAFAFA",
                  }}
                  autoComplete="email"
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                  }}
                >
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
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: BLUE[800],
                  marginBottom: 6,
                  letterSpacing: "0.01em",
                }}
                htmlFor="password"
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusPass(true)}
                  onBlur={() => setFocusPass(false)}
                  className="lp-input"
                  style={{
                    borderColor: focusPass ? BLUE[400] : "#E5E7EB",
                    boxShadow: focusPass ? `0 0 0 3px ${BLUE[100]}` : "none",
                    backgroundColor: focusPass ? "#fff" : "#FAFAFA",
                  }}
                  autoComplete="current-password"
                />
                <span
                  onClick={() => setShowPass(!showPass)}
                  title={showPass ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {showPass ? (
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
                      <path
                        d="M3 3l10 10"
                        stroke="#9CA3AF"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
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
                    </svg>
                  )}
                </span>
              </div>
            </div>

            {/* Forgot */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: -8,
                marginBottom: "1.5rem",
              }}
            >
              <a
                href="#"
                style={{
                  fontSize: 13,
                  color: BLUE[400],
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Forgot password?
              </a>
            </div>

            <button type="submit" className="lp-submit-btn" disabled={loading}>
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ animation: "spin 0.8s linear infinite" }}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
                or continue with
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </div>

            <button type="button" className="lp-google-btn">
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

          <p
            style={{
              textAlign: "center",
              marginTop: "1.75rem",
              fontSize: 13,
              color: "#6B7280",
            }}
          >
            Don't have an account?{" "}
            <a
              href="#"
              style={{
                color: BLUE[400],
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Request access
            </a>
          </p>
        </div>

        {/* ── Right: Branding ── */}
        <div className="lp-right">
          <div className="lp-circle-top" />
          <div className="lp-circle-bottom" />

          <div className="lp-right-inner">
            <h2
              className="lp-brand-headline"
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.5px",
                lineHeight: 1.25,
                textAlign: "center",
                maxWidth: 380,
                marginBottom: 16,
              }}
            >
              Run your business from one place
            </h2>
            <p
              style={{
                fontSize: 15,
                color: BLUE[200],
                textAlign: "center",
                maxWidth: 340,
                lineHeight: 1.6,
                marginBottom: "3rem",
              }}
            >
              Inventory tracking, smart invoicing, and custom calculations —
              built for Indian businesses.
            </p>

            {/* Stats */}
            <div
              className="lp-stats-row"
              style={{ display: "flex", gap: "2rem", marginBottom: "3.5rem" }}
            >
              {[
                { num: "12K+", label: "Businesses" },
                { num: "98%", label: "Uptime" },
                { num: "4.9★", label: "Rating" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div
                    className="lp-stat-num"
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: BLUE[200],
                      marginTop: 2,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Mockup */}
            <div
              className="lp-mockup"
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                padding: "1rem 1.25rem",
                width: "100%",
                maxWidth: 360,
                boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: BLUE[900] }}
                >
                  Today's Inventory
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: "#DCFCE7",
                    color: "#166534",
                    padding: "3px 8px",
                    borderRadius: 20,
                  }}
                >
                  Live
                </span>
              </div>

              {INVENTORY_ITEMS.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #F9FAFB",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#374151",
                        fontWeight: 500,
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {item.qty}
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: BLUE[700] }}
                  >
                    {item.amt}
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid #F3F4F6",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                  Total stock value
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: BLUE[600] }}
                >
                  ₹1,32,700
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
