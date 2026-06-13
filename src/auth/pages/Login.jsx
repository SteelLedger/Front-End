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

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    backgroundColor: "#fff",
  },

  // ── LEFT: Form panel ──────────────────────────────────────────
  leftPanel: {
    flex: "0 0 45%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "3rem 4rem",
    backgroundColor: "#fff",
    position: "relative",
    zIndex: 1,
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "3rem",
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: BLUE[500],
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: BLUE[900],
    letterSpacing: "-0.5px",
  },
  logoDot: {
    color: BLUE[400],
  },

  heading: {
    fontSize: 28,
    fontWeight: 700,
    color: BLUE[900],
    letterSpacing: "-0.5px",
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: "2.5rem",
    lineHeight: 1.5,
  },

  formGroup: {
    marginBottom: "1.25rem",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: BLUE[800],
    marginBottom: 6,
    letterSpacing: "0.01em",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 42px 11px 16px",
    fontSize: 14,
    border: `1.5px solid #E5E7EB`,
    borderRadius: 10,
    outline: "none",
    color: BLUE[900],
    backgroundColor: "#FAFAFA",
    transition: "border-color 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
  },
  inputIcon: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9CA3AF",
    cursor: "pointer",
    fontSize: 16,
    userSelect: "none",
  },

  forgotRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: -8,
    marginBottom: "1.5rem",
  },
  forgotLink: {
    fontSize: 13,
    color: BLUE[400],
    textDecoration: "none",
    fontWeight: 500,
    cursor: "pointer",
  },

  submitBtn: {
    width: "100%",
    padding: "13px",
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    backgroundColor: BLUE[500],
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    letterSpacing: "0.01em",
    transition: "background-color 0.15s, transform 0.1s",
    fontFamily: "inherit",
    marginBottom: "1.5rem",
  },

  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: "1.5rem",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: 500,
  },

  googleBtn: {
    width: "100%",
    padding: "11px",
    fontSize: 14,
    fontWeight: 500,
    color: BLUE[800],
    backgroundColor: "#fff",
    border: `1.5px solid #E5E7EB`,
    borderRadius: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "inherit",
    transition: "background-color 0.15s",
  },

  signupRow: {
    textAlign: "center",
    marginTop: "1.75rem",
    fontSize: 13,
    color: "#6B7280",
  },
  signupLink: {
    color: BLUE[400],
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
  },

  errorBox: {
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
  },

  // ── RIGHT: Branding panel ──────────────────────────────────────
  rightPanel: {
    flex: 1,
    backgroundColor: BLUE[800],
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "3rem",
    position: "relative",
    overflow: "hidden",
  },

  brandHeadline: {
    fontSize: 32,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.5px",
    lineHeight: 1.25,
    textAlign: "center",
    maxWidth: 380,
    marginBottom: 16,
  },
  brandSub: {
    fontSize: 15,
    color: BLUE[200],
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 1.6,
    marginBottom: "3rem",
  },

  statsRow: {
    display: "flex",
    gap: "2rem",
    marginBottom: "3.5rem",
  },
  statCard: {
    textAlign: "center",
  },
  statNum: {
    fontSize: 28,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  statLabel: {
    fontSize: 12,
    color: BLUE[200],
    marginTop: 2,
    letterSpacing: "0.02em",
  },

  // mini dashboard mockup
  mockup: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: "1rem 1.25rem",
    width: "100%",
    maxWidth: 360,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  mockupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid #F3F4F6",
  },
  mockupTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: BLUE[900],
  },
  mockupBadge: {
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: "#DCFCE7",
    color: "#166534",
    padding: "3px 8px",
    borderRadius: 20,
  },
  mockupRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #F9FAFB",
  },
  mockupItem: {
    fontSize: 12,
    color: "#374151",
    fontWeight: 500,
  },
  mockupQty: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  mockupAmt: {
    fontSize: 12,
    fontWeight: 600,
    color: BLUE[700],
  },
  mockupFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mockupFooterLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  mockupFooterTotal: {
    fontSize: 14,
    fontWeight: 700,
    color: BLUE[600],
  },
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
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

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
    <div style={styles.page}>
      {/* ── Left: Login Form ── */}
      <div style={styles.leftPanel}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
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
              <rect x="2" y="7.5" width="10" height="2.5" rx="1" fill="white" />
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
          <span style={styles.logoText}>
            Ledgr<span style={styles.logoDot}>.</span>
          </span>
        </div>

        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.subheading}>
          Sign in to manage your inventory, invoices, and more.
        </p>

        <form onSubmit={handleLogin} noValidate>
          {error && (
            <div style={styles.errorBox}>
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

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="email">
              Email address
            </label>
            <div style={styles.inputWrapper}>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                style={{
                  ...styles.input,
                  borderColor: focusEmail ? BLUE[400] : "#E5E7EB",
                  boxShadow: focusEmail ? `0 0 0 3px ${BLUE[100]}` : "none",
                  backgroundColor: focusEmail ? "#fff" : "#FAFAFA",
                }}
                autoComplete="email"
              />
              <span style={styles.inputIcon}>
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

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <div style={styles.inputWrapper}>
              <input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                style={{
                  ...styles.input,
                  borderColor: focusPass ? BLUE[400] : "#E5E7EB",
                  boxShadow: focusPass ? `0 0 0 3px ${BLUE[100]}` : "none",
                  backgroundColor: focusPass ? "#fff" : "#FAFAFA",
                }}
                autoComplete="current-password"
              />
              <span
                style={styles.inputIcon}
                onClick={() => setShowPass(!showPass)}
                title={showPass ? "Hide password" : "Show password"}
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

          <div style={styles.forgotRow}>
            <a href="#" style={styles.forgotLink}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              backgroundColor: hoverBtn ? BLUE[600] : BLUE[500],
              transform: hoverBtn ? "translateY(-1px)" : "none",
              opacity: loading ? 0.8 : 1,
            }}
            onMouseEnter={() => setHoverBtn(true)}
            onMouseLeave={() => setHoverBtn(false)}
            disabled={loading}
          >
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

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or continue with</span>
            <div style={styles.dividerLine} />
          </div>

          <button
            type="button"
            style={styles.googleBtn}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#F9FAFB")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#fff")
            }
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

        <p style={styles.signupRow}>
          Don't have an account?{" "}
          <a href="#" style={styles.signupLink}>
            Request access
          </a>
        </p>
      </div>

      {/* ── Right: Branding Panel ── */}
      <div style={styles.rightPanel}>
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            backgroundColor: BLUE[700],
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 280,
            height: 280,
            borderRadius: "50%",
            backgroundColor: BLUE[700],
            opacity: 0.4,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2 style={styles.brandHeadline}>Run your business from one place</h2>
          <p style={styles.brandSub}>
            Inventory tracking, smart invoicing, and custom calculations — built
            for Indian businesses.
          </p>

          {/* Stats */}
          <div style={styles.statsRow}>
            {[
              { num: "12K+", label: "Businesses" },
              { num: "98%", label: "Uptime" },
              { num: "4.9★", label: "Rating" },
            ].map((s) => (
              <div key={s.label} style={styles.statCard}>
                <div style={styles.statNum}>{s.num}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mini inventory mockup */}
          <div style={styles.mockup}>
            <div style={styles.mockupHeader}>
              <span style={styles.mockupTitle}>Today's Inventory</span>
              <span style={styles.mockupBadge}>Live</span>
            </div>
            {INVENTORY_ITEMS.map((item) => (
              <div key={item.name} style={styles.mockupRow}>
                <div>
                  <div style={styles.mockupItem}>{item.name}</div>
                  <div style={styles.mockupQty}>{item.qty}</div>
                </div>
                <div style={styles.mockupAmt}>{item.amt}</div>
              </div>
            ))}
            <div style={styles.mockupFooter}>
              <span style={styles.mockupFooterLabel}>Total stock value</span>
              <span style={styles.mockupFooterTotal}>₹1,32,700</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input::placeholder { color: #C0C0C0; }
        input:focus { outline: none; }
        @media (max-width: 768px) {
          .right-panel { display: none; }
        }
      `}</style>
    </div>
  );
}
