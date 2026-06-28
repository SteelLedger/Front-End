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
  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
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
              <p className="text-[12px] text-slate-500 font-medium mb-1.5 pr-9 leading-tight">
                {label}
              </p>
              <p
                className={`text-[19px] font-bold tracking-tight leading-tight ${valueClass}`}
              >
                {value}
              </p>
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {trend && (
                  <span
                    className={`text-[11px] font-semibold ${trendUp ? "text-green-600" : "text-red-500"}`}
                  >
                    {trend}
                  </span>
                )}
                <span className="text-[11px] text-slate-400">{sub}</span>
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
            <h2 className="text-[15px] font-bold text-[#0A1628]">
              Sales vs Purchase
            </h2>
            <span className="text-[12px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              Last 6 months
            </span>
          </div>
          <div className="flex gap-4 mb-3">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1E4D96]" />
              Sales
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#5DCAA5]" />
              Purchase
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesPurchaseData} barCategoryGap="30%" barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
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
            <h2 className="text-[15px] font-bold text-[#0A1628]">
              Party-wise Sales
            </h2>
            <span className="text-[12px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
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
                className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate"
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
            <h2 className="text-[15px] font-bold text-[#0A1628]">
              Recent Sales
            </h2>
            <button className="text-[12px] text-[#1E4D96] font-semibold hover:underline">
              View all →
            </button>
          </div>
          {recentSales.map((s) => (
            <div
              key={s.invoice}
              className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[12px] font-bold text-[#1E4D96] flex-shrink-0">
                  {s.party.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#0A1628] truncate">
                    {s.party}
                  </p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    {s.invoice} · {s.items} items
                  </p>
                </div>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="text-[15px] font-bold text-[#0A1628]">
                  {s.amount}
                </p>
                <span
                  className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold mt-0.5 ${STATUS_CLASS[s.status]}`}
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
            <h2 className="text-[15px] font-bold text-[#0A1628]">
              Low Stock Alerts
            </h2>
            <button className="text-[12px] text-[#1E4D96] font-semibold hover:underline">
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
                <p className="text-[14px] font-semibold text-[#0A1628] truncate">
                  {item.name}
                </p>
                <p className="text-[12px] text-red-500 mt-0.5">
                  Only {item.qty} units left
                </p>
              </div>
              <button className="text-[12px] font-semibold text-[#1E4D96] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                Order
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Icons used only by this page's metric cards ────────────────────
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
