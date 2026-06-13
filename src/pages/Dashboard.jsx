import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Data ─────────────────────────────────────────────────────────
const salesPurchaseData = [
  { month: "Jan", sales: 520, purchase: 310 },
  { month: "Feb", sales: 610, purchase: 380 },
  { month: "Mar", sales: 490, purchase: 290 },
  { month: "Apr", sales: 720, purchase: 460 },
  { month: "May", sales: 680, purchase: 410 },
  { month: "Jun", sales: 842, purchase: 518 },
];

const partyData = [
  { name: "Mehta Traders", value: 28 },
  { name: "Patel Enterprises", value: 22 },
  { name: "Kumar & Co", value: 18 },
  { name: "Sharma Pvt Ltd", value: 17 },
  { name: "Others", value: 15 },
];
const PIE_COLORS = ["#1E4D96", "#2563C4", "#4A80D8", "#A3BEF0", "#DBEAFE"];

const recentSales = [
  {
    party: "Mehta Traders",
    invoice: "INV-2024",
    items: 3,
    amount: "₹42,500",
    status: "Paid",
  },
  {
    party: "Patel Enterprises",
    invoice: "INV-2023",
    items: 5,
    amount: "₹28,200",
    status: "Pending",
  },
  {
    party: "Kumar & Co",
    invoice: "INV-2022",
    items: 2,
    amount: "₹15,800",
    status: "Paid",
  },
  {
    party: "Sharma Pvt Ltd",
    invoice: "INV-2021",
    items: 7,
    amount: "₹63,100",
    status: "Overdue",
  },
];

const lowStockItems = [
  { name: "USB-C Hub Pro", qty: 3 },
  { name: "Wireless Keyboard", qty: 5 },
  { name: "Monitor Stand XL", qty: 2 },
  { name: "HDMI Cable 2m", qty: 8 },
  { name: "Laptop Stand Pro", qty: 4 },
];

// ── Nav ───────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    section: "Main",
    items: [
      { label: "Dashboard", icon: HomeIcon },
      { label: "Parties", icon: UsersIcon },
      { label: "Items", icon: BoxIcon },
    ],
  },
  {
    section: "Transactions",
    items: [
      { label: "Sales", icon: ReceiptIcon, badge: 3 },
      { label: "Purchase", icon: CartIcon },
    ],
  },
  {
    section: "More",
    items: [
      { label: "Reports", icon: ChartIcon },
      { label: "Settings", icon: SettingsIcon },
    ],
  },
];

// ── Metric config ─────────────────────────────────────────────────
const METRICS = [
  {
    label: "Total Sales",
    value: "₹8,42,500",
    trend: "+12.4%",
    trendUp: true,
    sub: "vs last month",
    Icon: TrendingUpIcon,
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    valueClass: "text-slate-900",
  },
  {
    label: "Total Purchase",
    value: "₹5,18,200",
    trend: "+6.1%",
    trendUp: true,
    sub: "vs last month",
    Icon: CartIcon,
    accentBg: "bg-green-100",
    accentText: "text-green-700",
    valueClass: "text-slate-900",
  },
  {
    label: "Stock Value",
    value: "₹12,65,000",
    trend: "-2.3%",
    trendUp: false,
    sub: "this week",
    Icon: BoxIcon,
    accentBg: "bg-purple-100",
    accentText: "text-purple-700",
    valueClass: "text-slate-900",
  },
  {
    label: "Profit / Loss",
    value: "₹3,24,300",
    trend: "+18.7%",
    trendUp: true,
    sub: "vs last month",
    Icon: CashIcon,
    accentBg: "bg-green-100",
    accentText: "text-green-700",
    valueClass: "text-green-700",
  },
  {
    label: "Pending Payments",
    value: "₹1,08,400",
    trend: null,
    trendUp: null,
    sub: "From 7 parties",
    Icon: ClockIcon,
    accentBg: "bg-amber-100",
    accentText: "text-amber-700",
    valueClass: "text-amber-700",
  },
  {
    label: "Low Stock Alerts",
    value: "5 Items",
    trend: null,
    trendUp: null,
    sub: "Need immediate reorder",
    Icon: AlertIcon,
    accentBg: "bg-red-100",
    accentText: "text-red-600",
    valueClass: "text-red-600",
  },
];

const STATUS_CLASS = {
  Paid: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-700",
};

// ── Custom tooltip ────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mb-0.5" style={{ color: p.fill }}>
          {p.name}: ₹{p.value.toLocaleString("en-IN")}k
        </p>
      ))}
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  const handleNav = (label) => {
    setActiveNav(label);
    setMobileOpen(false);
  };

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
              {items.map(({ label, icon: Icon, badge }) => {
                const active = activeNav === label;
                return (
                  <button
                    key={label}
                    onClick={() => handleNav(label)}
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
        <div className="border-t border-white/10 p-2 flex-shrink-0">
          <div
            className={[
              "flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.07] cursor-pointer",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <div className="w-7 h-7 min-w-[1.75rem] rounded-full bg-[#1E4D96] flex items-center justify-center text-[11px] font-semibold text-blue-200 flex-shrink-0">
              RK
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-blue-200 truncate">
                  Raj Kumar
                </p>
                <p className="text-[11px] text-blue-300/40 truncate">Admin</p>
              </div>
            )}
          </div>
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
                {activeNav}
              </h1>
              <p className="text-[13px] text-slate-400 hidden sm:block leading-tight mt-0.5">
                Good morning, Raj — here's your business at a glance
              </p>
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

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {METRICS.map(
              ({
                label,
                value,
                trend,
                trendUp,
                sub,
                Icon,
                accentBg,
                accentText,
                valueClass,
              }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden"
                >
                  <p className="text-[11px] text-slate-500 font-medium mb-1.5 pr-9 leading-tight">
                    {label}
                  </p>
                  <p
                    className={`text-[17px] font-bold tracking-tight leading-tight ${valueClass}`}
                  >
                    {value}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {trend && (
                      <span
                        className={`text-[10px] font-semibold ${trendUp ? "text-green-600" : "text-red-500"}`}
                      >
                        {trend}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{sub}</span>
                  </div>
                  <div
                    className={`absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center ${accentBg} ${accentText}`}
                  >
                    <span className="w-4 h-4">
                      <Icon />
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Bar chart */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-[#0A1628]">
                  Sales vs Purchase
                </h2>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  Last 6 months
                </span>
              </div>
              <div className="flex gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1E4D96]" />
                  Sales
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#5DCAA5]" />
                  Purchase
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={salesPurchaseData}
                  barCategoryGap="30%"
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}k`}
                  />
                  <Tooltip
                    content={<BarTooltip />}
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  />
                  <Bar
                    dataKey="sales"
                    name="Sales"
                    fill="#1E4D96"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="purchase"
                    name="Purchase"
                    fill="#5DCAA5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut chart */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-[#0A1628]">
                  Party-wise Sales
                </h2>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  Top 5
                </span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={partyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {partyData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
                {partyData.map((p, i) => (
                  <span
                    key={p.name}
                    className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate"
                  >
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: PIE_COLORS[i] }}
                    />
                    <span className="truncate">
                      {p.name.split(" ")[0]} {p.value}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
            {/* Recent sales */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-[#0A1628]">
                  Recent Sales
                </h2>
                <button className="text-[11px] text-[#1E4D96] font-semibold hover:underline">
                  View all →
                </button>
              </div>
              {recentSales.map((s) => (
                <div
                  key={s.invoice}
                  className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[11px] font-bold text-[#1E4D96] flex-shrink-0">
                      {s.party.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#0A1628] truncate">
                        {s.party}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {s.invoice} · {s.items} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="text-[13px] font-bold text-[#0A1628]">
                      {s.amount}
                    </p>
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 ${STATUS_CLASS[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Low stock */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-[#0A1628]">
                  Low Stock Alerts
                </h2>
                <button className="text-[11px] text-[#1E4D96] font-semibold hover:underline">
                  Reorder →
                </button>
              </div>
              {lowStockItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 text-red-500">
                    <span className="w-4 h-4">
                      <AlertIcon />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#0A1628] truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-red-500 mt-0.5">
                      Only {item.qty} units left
                    </p>
                  </div>
                  <button className="text-[11px] font-semibold text-[#1E4D96] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                    Order
                  </button>
                </div>
              ))}
            </div>
          </div>
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
function TrendingUpIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      width="18"
      height="18"
    >
      <polyline points="1,14 7,8 11,12 19,4" />
      <polyline points="13,4 19,4 19,10" />
    </svg>
  );
}
function CashIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <rect x="1" y="4" width="18" height="12" rx="2" />
      <circle cx="10" cy="10" r="2.5" />
      <path d="M5 10h.01M15 10h.01" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 5.5V10l3 2" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      width="18"
      height="18"
    >
      <path d="M10 2L1.5 17h17L10 2z" />
      <path d="M10 8v4M10 14.5v.5" />
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
