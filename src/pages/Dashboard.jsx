import { Link } from "react-router-dom";
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
import {
  TrendingUp,
  ShoppingCart,
  Scissors,
  Trash2,
  Layers,
  Wallet,
  AlertTriangle,
  ArrowRight,
  FlaskConical,
} from "lucide-react";
import { gmToKgDisplay } from "../utils/units";
import { paymentTypeLabel } from "../utils/sales";
import {
  IS_MOCK,
  SUMMARY,
  MATERIAL_FLOW,
  YIELD_BREAKDOWN,
  RECENT_SALES,
  STOCK_ALERTS,
  TOP_PRODUCTS,
} from "../utils/dashboardMock";

const formatINR = (n) => `₹ ${(Number(n) || 0).toLocaleString("en-IN")}`;
const kg = (grams) => `${gmToKgDisplay(grams)} kg`;

/* -------------------------------- pieces ---------------------------------- */

function KpiCard({ icon: Icon, label, value, sub, tone, to }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#BBD0EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4D96]/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold leading-tight tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
        {sub}
        <ArrowRight
          size={12}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        />
      </p>
    </Link>
  );
}

function Panel({ title, action, to, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {action && (
          <Link
            to={to}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E4D96] hover:underline"
          >
            {action} <ArrowRight size={13} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-bold text-slate-800">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="mb-0.5" style={{ color: p.fill ?? p.color }}>
          {p.name}: {kg(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function Dashboard() {
  const { sales, purchases, production, rawMaterial, parties } = SUMMARY;

  const yieldTotal = YIELD_BREAKDOWN.reduce((sum, d) => sum + d.value, 0);
  const wastePct = yieldTotal
    ? ((production.wasteQty / yieldTotal) * 100).toFixed(1)
    : "0";
  const topMax = Math.max(...TOP_PRODUCTS.map((p) => p.quantity), 1);

  const kpis = [
    {
      icon: TrendingUp,
      label: "Sold this month",
      value: kg(sales.totalQuantity),
      sub: `${sales.invoiceCount} invoices`,
      tone: "bg-blue-50 text-blue-600",
      to: "/sales",
    },
    {
      icon: ShoppingCart,
      label: "Purchased this month",
      value: kg(purchases.totalQuantity),
      sub: `${purchases.billCount} bills`,
      tone: "bg-emerald-50 text-emerald-600",
      to: "/purchase",
    },
    {
      icon: Scissors,
      label: "Produced this month",
      value: kg(production.productQty),
      sub: `${production.runCount} production runs`,
      tone: "bg-violet-50 text-violet-600",
      to: "/product",
    },
    {
      icon: Trash2,
      label: "Waste this month",
      value: kg(production.wasteQty),
      sub: `${wastePct}% of material cut`,
      tone: "bg-amber-50 text-amber-600",
      to: "/product",
    },
    {
      icon: Layers,
      label: "Raw material in stock",
      value: kg(rawMaterial.totalQuantity),
      sub: `${rawMaterial.totalTypes} sheet types`,
      tone: "bg-sky-50 text-sky-600",
      to: "/inventory",
    },
    {
      icon: Wallet,
      label: "To receive",
      value: formatINR(parties.toReceive),
      sub: `from ${parties.receivableCount} parties`,
      tone: "bg-rose-50 text-rose-600",
      to: "/parties",
    },
  ];

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
      <div className="mx-auto max-w-[1400px] space-y-4 lg:space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Material moving through the business — bought, cut, sold, and
              what's left.
            </p>
          </div>
          {IS_MOCK && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <FlaskConical size={13} />
              Sample data — dashboard APIs in progress
            </span>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Panel
            title="Material flow (kg)"
            action="Purchases"
            to="/purchase"
            className="lg:col-span-3"
          >
            <div className="mb-3 flex flex-wrap gap-4">
              {[
                ["Purchased", "#5DCAA5"],
                ["Produced", "#1E4D96"],
                ["Sold", "#4A80D8"],
              ].map(([name, color]) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 text-xs text-slate-500"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: color }}
                  />
                  {name}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={MATERIAL_FLOW} barCategoryGap="28%" barGap={3}>
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
                  tickFormatter={(v) => (v / 1000).toLocaleString("en-IN")}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                {/* Animation off: recharts draws shapes via requestAnimationFrame,
                    which browsers suspend in hidden/throttled tabs — that leaves
                    the chart blank. Rendering final geometry immediately is also
                    the right call for a dashboard. */}
                <Bar
                  dataKey="purchased"
                  name="Purchased"
                  fill="#5DCAA5"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="produced"
                  name="Produced"
                  fill="#1E4D96"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="sold"
                  name="Sold"
                  fill="#4A80D8"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel
            title="Production yield"
            action="Production"
            to="/product"
            className="lg:col-span-2"
          >
            <div className="relative">
              <ResponsiveContainer width="100%" height={185}>
                <PieChart>
                  <Pie
                    data={YIELD_BREAKDOWN}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {YIELD_BREAKDOWN.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-900">
                  {gmToKgDisplay(yieldTotal)}
                </span>
                <span className="text-xs text-slate-400">kg cut</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {YIELD_BREAKDOWN.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-500">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ background: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {kg(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-4 pb-2 lg:grid-cols-3">
          <Panel
            title="Recent sales"
            action="View all"
            to="/sales"
            className="lg:col-span-2"
          >
            <div className="-my-1 divide-y divide-slate-100">
              {RECENT_SALES.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#1E4D96]">
                      {s.partyName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {s.partyName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {s.invoiceNumber} · {s.productName}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {kg(s.quantity)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {paymentTypeLabel(s.paymentType)} · {s.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Stock alerts" action="Inventory" to="/product-inventory">
            <div className="-my-1 divide-y divide-slate-100">
              {STOCK_ALERTS.map((item) => {
                const out = item.status === "out_of_stock";
                return (
                  <Link
                    key={`${item.kind}-${item.name}`}
                    to={item.href}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-50/70"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        out
                          ? "bg-rose-50 text-rose-500"
                          : "bg-amber-50 text-amber-500"
                      }`}
                    >
                      <AlertTriangle size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.kind}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                        out
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {out ? "Out of stock" : kg(item.quantity)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Top products */}
        <div className="pb-4">
          <Panel title="Top products sold this month" action="View all" to="/sales">
            <div className="space-y-3">
              {TOP_PRODUCTS.map((p) => (
                <div key={p.productName}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {p.productName}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {kg(p.quantity)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#1E4D96]"
                      style={{ width: `${(p.quantity / topMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
