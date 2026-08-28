import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { clearSession, getDisplayUser, isAdmin } from "../utils/auth";
import { PageHeaderContext } from "../context/pageHeader";
import DateFilterBar from "../components/DateFilterBar";
import ChangePasswordModal from "../components/ChangePasswordModal";

// ── Nav ───────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", icon: HomeIcon, path: "/dashboard" },
      { label: "Parties", icon: UsersIcon, path: "/parties" },
    ],
  },
  {
    section: "Transactions",
    items: [
      { label: "Purchase", icon: CartIcon, path: "/purchase" },
      { label: "Production", icon: CartIcon, path: "/product" },
      {
        label: "Inventory",
        icon: BoxIcon,
        children: [
          { label: "Raw Material", path: "/inventory" },
          { label: "Product", path: "/product-inventory" },
        ],
      },
      { label: "Sales", icon: ReceiptIcon, badge: 3, path: "/sales" },
    ],
  },
  {
    section: "More",
    items: [
      { label: "Reports", icon: ChartIcon, path: "/reports", adminOnly: true },
      // Every /users endpoint is admin-only, so the item is too.
      { label: "Members", icon: TeamIcon, path: "/members", adminOnly: true },
      {
        label: "Action Log",
        icon: HistoryIcon,
        path: "/action-logs",
        adminOnly: true,
      },
      { label: "Settings", icon: SettingsIcon, path: "/settings" },
    ],
  },
];

// Subtitle shown under the page title in the topbar, keyed by path.
const PAGE_SUBTITLES = {
  "/dashboard":
    "Material moving through the business bought, cut, sold, and what's left",
  "/parties": "All your customers and suppliers in one place",
  "/product": "Cut products from sheets and track production & byproduct stock",
  "/product-inventory": "Product stock on hand by product name",
  "/sales": "Track invoices and payments received",
  "/purchase": "Track purchase bills and payments made",
  "/inventory": "Raw material stock on hand by specification",
  "/reports": "Insights into your business performance",
  "/members": "Invite teammates and manage what they can access",
  "/action-logs": "Who changed what, across the last 30 days",
  "/settings": "Your account details and sign-in security",
};

/**
 * Nav matching. A detail route (`/inventory/<id>`) has to keep lighting up its
 * parent item, so a path also matches anything nested under it. `/product`
 * deliberately does NOT match `/product-inventory` — only a `/` boundary counts.
 */
function matchesPath(pathname, path) {
  return !!path && (pathname === path || pathname.startsWith(`${path}/`));
}

function getActiveLabel(pathname) {
  for (const { items } of NAV_SECTIONS) {
    for (const item of items) {
      if (matchesPath(pathname, item.path)) return item.label;
      const child = item.children?.find((c) => matchesPath(pathname, c.path));
      if (child) return child.label;
    }
  }
  return "Dashboard";
}

/** Subtitle for the current route, falling back to the closest parent's. */
function getSubtitle(pathname) {
  if (PAGE_SUBTITLES[pathname]) return PAGE_SUBTITLES[pathname];
  const parent = Object.keys(PAGE_SUBTITLES)
    .filter((p) => matchesPath(pathname, p))
    .sort((a, b) => b.length - a.length)[0];
  return parent ? PAGE_SUBTITLES[parent] : undefined;
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Reachable from any screen via the user menu, so the modal lives here.
  const [passwordOpen, setPasswordOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Expandable nav groups (open the one whose child matches the current path).
  const [openMenus, setOpenMenus] = useState(() => {
    const open = {};
    NAV_SECTIONS.forEach((s) =>
      s.items.forEach((it) => {
        if (it.children?.some((c) => matchesPath(location.pathname, c.path))) {
          open[it.label] = true;
        }
      }),
    );
    return open;
  });

  // Logged-in user — merged from the stored user object and the JWT claims.
  const user = useMemo(() => getDisplayUser(), []);

  // Nav minus whatever this role can't reach. Dropping a section that empties
  // out keeps its heading from hanging over nothing.
  const navSections = useMemo(() => {
    const admin = isAdmin();
    return NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((it) => !it.adminOnly || admin),
    })).filter((s) => s.items.length > 0);
  }, []);

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
    clearSession();
    navigate("/login", { replace: true });
  };

  const activeLabel = getActiveLabel(location.pathname);
  const subtitle = getSubtitle(location.pathname);

  // Controls the current page hands up to the topbar (see context/pageHeader).
  const [header, setHeader] = useState({});
  const registerHeader = useCallback((next) => setHeader(next ?? {}), []);

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
              <span className="text-[19px] font-bold text-white tracking-tight whitespace-nowrap select-none">
                Ledgr<span className="text-blue-400">.</span>
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 lg:flex items-center justify-center text-blue-300 transition-colors"
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
        <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 py-2">
          {navSections.map(({ section, items }) => (
            <div key={section}>
              {!collapsed ? (
                <p className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-widest uppercase text-blue-300/40 select-none">
                  {section}
                </p>
              ) : (
                <div className="h-3" />
              )}
              {items.map((item) => {
                const { label, icon: Icon, badge, path, children } = item;

                // Expandable group (e.g. Production -> Raw Material, Product).
                if (children) {
                  const childActive = children.some((c) =>
                    matchesPath(location.pathname, c.path),
                  );
                  const isOpen = !!openMenus[label];
                  return (
                    <div key={label}>
                      <button
                        onClick={() =>
                          collapsed
                            ? handleNav(children[0].path)
                            : setOpenMenus((m) => ({
                                ...m,
                                [label]: !m[label],
                              }))
                        }
                        title={collapsed ? label : undefined}
                        className={[
                          "w-full flex items-center rounded-lg text-[15px] font-medium transition-colors duration-100 mb-0.5",
                          collapsed
                            ? "justify-center px-0 py-2.5 gap-0"
                            : "gap-3 px-3 py-2.5",
                          childActive
                            ? "text-white"
                            : "text-blue-200/70 hover:bg-white/[0.07] hover:text-blue-200",
                        ].join(" ")}
                      >
                        <span className="w-[18px] h-[18px] flex-shrink-0">
                          <Icon />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left whitespace-nowrap">
                              {label}
                            </span>
                            <span
                              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                            >
                              <CaretIcon />
                            </span>
                          </>
                        )}
                      </button>
                      {!collapsed && isOpen && (
                        <div className="ml-5 mb-1 border-l border-white/10 pl-2">
                          {children.map((c) => {
                            const active = matchesPath(
                              location.pathname,
                              c.path,
                            );
                            return (
                              <button
                                key={c.label}
                                onClick={() => handleNav(c.path)}
                                className={[
                                  "w-full flex items-center rounded-lg text-[14px] font-medium px-3 py-2 mb-0.5 transition-colors",
                                  active
                                    ? "bg-[#1E4D96] text-white"
                                    : "text-blue-200/60 hover:bg-white/[0.07] hover:text-blue-200",
                                ].join(" ")}
                              >
                                <span className="flex-1 text-left whitespace-nowrap">
                                  {c.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = matchesPath(location.pathname, path);
                return (
                  <button
                    key={label}
                    onClick={() => handleNav(path)}
                    title={collapsed ? label : undefined}
                    className={[
                      "w-full flex items-center rounded-lg text-[15px] font-medium transition-colors duration-100 mb-0.5",
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
                      <span className="bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
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
        <div
          className="border-t border-white/10 p-2 flex-shrink-0 relative"
          ref={userMenuRef}
        >
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
                onClick={() => {
                  setUserMenuOpen(false);
                  setPasswordOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-medium text-slate-700 hover:bg-blue-50 transition-colors"
              >
                <KeyIcon />
                Change password
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[15px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
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
            <div className="w-7 h-7 min-w-[1.75rem] rounded-full bg-[#1E4D96] flex items-center justify-center text-[12px] font-semibold text-blue-200 flex-shrink-0">
              {user.initials}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[15px] font-medium text-blue-200 truncate">
                    {userName}
                  </p>
                  <p className="text-[12px] text-blue-300/40 truncate">
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
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="lg:hidden h-10 w-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-bold text-[#0A1628] leading-tight">
                {activeLabel}
              </h1>
              {subtitle && (
                <p className="truncate text-[15px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {header.dateFilter && (
              <DateFilterBar
                /* Remount per route so one page's range never leaks to the next. */
                key={location.pathname}
                defaultPeriod={header.defaultPeriod}
                showLabel={false}
                showReset={false}
                onChange={header.onDateChange}
              />
            )}
            <button
              onClick={header.onAction ?? (() => handleNav("/sales"))}
              aria-label={header.actionLabel ?? "New Sale"}
              title={header.actionLabel ?? "New Sale"}
              className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1E4D96] px-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A3F7A]"
            >
              <PlusIcon />
              <span className="hidden sm:inline">
                {header.actionLabel ?? "New Sale"}
              </span>
            </button>
          </div>
        </header>

        {/* Scrollable content — each page renders here */}
        <main className="flex-1 overflow-y-auto">
          <PageHeaderContext.Provider value={registerHeader}>
            <Outlet />
          </PageHeaderContext.Provider>
        </main>
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
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
function CaretIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width="12"
      height="12"
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
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
// A person with a shield — distinct from Parties' UsersIcon, since this nav
// item is about access rather than contacts.
function TeamIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <circle cx="8" cy="6.5" r="3" />
      <path d="M2 17c0-3.3 2.7-6 6-6 1 0 1.9.2 2.7.6" />
      <path d="M15.5 10.5l3 1.1v2.2c0 1.7-1.2 3.2-3 3.7-1.8-.5-3-2-3-3.7v-2.2l3-1.1z" />
    </svg>
  );
}
// A clock winding backwards — the audit trail, not a schedule.
function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path
        d="M3 10a7 7 0 1 0 2.1-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.6 2.4v3.2h3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M10 6v4.3l2.8 1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
function KeyIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="16"
      height="16"
    >
      <circle cx="13.5" cy="6.5" r="3.5" />
      <path
        d="M11 9L3 17M5.5 14.5l2 2M8 12l2 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M13 14l4-4-4-4M17 10H8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M7 8l3-3 3 3M7 12l3 3 3-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
