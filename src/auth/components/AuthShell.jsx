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

/**
 * AuthShell
 * The signed-out split screen: form on the left, branding on the right.
 * Login and the password-reset flow both sit inside it, so the marketing
 * panel is written once.
 */
export default function AuthShell({ children }) {
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

        {children}
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

/** The red banner both auth pages use for API and validation errors. */
export function AuthError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        className="mt-0.5 shrink-0"
      >
        <circle cx="8" cy="8" r="7" stroke="#B91C1C" strokeWidth="1.5" />
        <path
          d="M8 5v3.5M8 10.5v.5"
          stroke="#B91C1C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {message}
    </div>
  );
}

/** The submit button on the auth screens, with its spinner state. */
export function AuthButton({ loading, loadingLabel, children, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-[10px] bg-[#1E4D96] py-3 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-[#1A3F7A] disabled:cursor-not-allowed disabled:opacity-80"
      {...props}
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
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function LedgrMark() {
  return (
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
