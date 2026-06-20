import { useState, useEffect, useMemo, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { getDisplayUser } from "../utils/auth";

// ── Nav ───────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", icon: HomeIcon, path: "/dashboard" },
      { label: "Parties", icon: UsersIcon, path: "/parties" },
      { label: "Items", icon: BoxIcon, path: "/items" },
    ],
  },
  {
    section: "Transactions",
    items: [
      { label: "Sales", icon: ReceiptIcon, badge: 3, path: "/sales" },
      { label: "Purchase", icon: CartIcon, path: "/purchase" },
    ],
  },
  {
    section: "More",
    items: [
      { label: "Reports", icon: ChartIcon, path: "/reports" },
      { label: "Settings", icon: SettingsIcon, path: "/settings" },
    ],
  },
];

// Subtitle shown under the page title in the topbar, keyed by path.
const PAGE_SUBTITLES = {
  "/dashboard": "Good morning, Raj — here's your business at a glance",
  "/parties": "All your customers and suppliers in one place",
  "/items": "Manage your product catalog and stock",
  "/sales": "Track invoices and payments received",
  "/purchase": "Track purchase bills and payments made",
  "/reports": "Insights into your business performance",
  "/settings": "Manage your account and preferences",
};

function getActiveLabel(pathname) {
  for (const { items } of NAV_SECTIONS) {
    const match = items.find((i) => i.path === pathname);
    if (match) return match.label;
  }
  return "Dashboard";
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Logged-in user — merged from the stored user object and the JWT claims.
  const user = useMemo(() => getDisplayUser(), []);
  const userName = user.name;
  // Show the role under the name; fall back to the email if no role.
  const userRole = user.role || user.email || "Member";

  // Close the user menu on any outside click.
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const activeLabel = getActiveLabel(location.pathname);
  const subtitle = PAGE_SUBTITLES[location.pathname];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col flex-shrink-0",
          "bg-[#0D2140] transition-all duration-200 ease-in-out h-full",
          collapsed ? "w-16" : "w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div
          className={[
            "flex items-center h-14 border-b border-white/10 flex-shrink-0",
            collapsed ? "justify-center px-0" : "justify-between px-4",
          ].join(" ")}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 min-w-[2rem] rounded-lg bg-[#1E4D96] flex items-center justify-center flex-shrink-0">
              <LedgrLogo />
            </div>
            {!collapsed && (
              <span className="text-[17px] font-bold text-white tracking-tight whitespace-nowrap select-none">
                Ledgr<span className="text-blue-400">.</span>
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-blue-300 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon />
            </button>
          )}
        </div>

        {/* Expand button (collapsed mode) */}
        {collapsed && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-blue-300 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          {NAV_SECTIONS.map(({ section, items }) => (
            <div key={section}>
              {!collapsed ? (
                <p className="px-2 pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-blue-300/40 select-none">
                  {section}
                </p>
              ) : (
                <div className="h-3" />
              )}
              {items.map(({ label, icon: Icon, badge, path }) => {
                const active = location.pathname === path;
                return (
                  <button
                    key={label}
                    onClick={() => handleNav(path)}
                    title={collapsed ? label : undefined}
                    className={[
                      "w-full flex items-center rounded-lg text-[13px] font-medium transition-colors duration-100 mb-0.5",
                      collapsed
                        ? "justify-center px-0 py-2.5 gap-0"
                        : "gap-3 px-3 py-2.5",
                      active
                        ? "bg-[#1E4D96] text-white"
                        : "text-blue-200/70 hover:bg-white/[0.07] hover:text-blue-200",
                    ].join(" ")}
                  >
                    <span className="w-[18px] h-[18px] flex-shrink-0">
                      <Icon />
                    </span>
                    {!collapsed && (
                      <span className="flex-1 text-left whitespace-nowrap">
                        {label}
                      </span>
                    )}
                    {!collapsed && badge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-2 flex-shrink-0 relative" ref={userMenuRef}>
          {userMenuOpen && (
            <div
              className={[
                "absolute z-50 rounded-lg bg-white border border-slate-200 shadow-xl py-1",
                collapsed
                  ? "left-full bottom-2 ml-2 w-40"
                  : "bottom-full left-2 right-2 mb-2",
              ].join(" ")}
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogoutIcon />
                Logout
              </button>
            </div>
          )}
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            title={collapsed ? userName : undefined}
            className={[
              "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.07] transition-colors",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <div className="w-7 h-7 min-w-[1.75rem] rounded-full bg-[#1E4D96] flex items-center justify-center text-[11px] font-semibold text-blue-200 flex-shrink-0">
              {user.initials}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[13px] font-medium text-blue-200 truncate">
                    {userName}
                  </p>
                  <p className="text-[11px] text-blue-300/40 truncate">
                    {userRole}
                  </p>
                </div>
                <span className="text-blue-300/50 flex-shrink-0">
                  <ChevronUpDownIcon />
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <MenuIcon />
            </button>
            <div>
              <h1 className="text-[16px] font-bold text-[#0A1628] leading-tight">
                {activeLabel}
              </h1>
              {subtitle && (
                <p className="text-[13px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              <CalendarIcon />
              June 2026
            </span>
            <button
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors relative"
              aria-label="Notifications"
            >
              <BellIcon />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <button className="flex items-center gap-1.5 bg-[#1E4D96] hover:bg-[#1A3F7A] text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors">
              <PlusIcon />
              <span className="hidden sm:inline">New Sale</span>
            </button>
          </div>
        </header>

        {/* Scrollable content — each page renders here */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────
function LedgrLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
  );
}
function HomeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M7 18v-6h6v6" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <circle cx="7" cy="7" r="3" />
      <path d="M1 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M13 3.5a3 3 0 010 5.5M19 17c0-2.7-2-5-4.5-5.5" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path d="M16.5 7l-6.5-4L3.5 7l6.5 4 6.5-4z" />
      <path d="M3.5 7v6l6.5 4 6.5-4V7" />
      <path d="M10 11v6M6.5 5.25L10 7.5l3.5-2.25" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path d="M4 2h12v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V2z" />
      <path d="M7 7h6M7 10h4M7 13h5" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path d="M1 1h2.5l2 9.5h9l2-7H5.5" />
      <circle cx="8" cy="17" r="1.3" />
      <circle cx="15" cy="17" r="1.3" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <rect x="2" y="11" width="3" height="7" rx="1" />
      <rect x="8.5" y="7" width="3" height="11" rx="1" />
      <rect x="15" y="3" width="3" height="15" rx="1" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      width="18"
      height="18"
    >
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="17"
      height="17"
    >
      <path d="M10 2a6 6 0 016 6c0 4 1.5 5 1.5 5h-15s1.5-1 1.5-5a6 6 0 016-6z" />
      <path d="M8.5 17a1.5 1.5 0 003 0" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="14"
      height="14"
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="13"
      height="13"
    >
      <rect x="2" y="3" width="16" height="15" rx="2" />
      <path d="M6 1v4M14 1v4M2 8h16" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="16"
      height="16"
    >
      <path d="M8 17H4a1 1 0 01-1-1V4a1 1 0 011-1h4" />
      <path d="M13 14l4-4-4-4M17 10H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronUpDownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="14"
      height="14"
    >
      <path d="M7 8l3-3 3 3M7 12l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="14"
      height="14"
    >
      <path d="M13 4l-6 6 6 6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="14"
      height="14"
    >
      <path d="M7 4l6 6-6 6" />
    </svg>
  );
}
