import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
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
  AlertTriangle,
  ArrowRight,
  Inbox,
  RotateCw,
} from "lucide-react";
import { usePageHeader } from "../context/pageHeader";
import { isoToDMY } from "../utils/party";
import { gmToKgDisplay } from "../utils/units";
import {
  paymentTypeLabel,
  byProductLabel,
  normalizeSale,
  extractSales,
} from "../utils/sales";
import { rangeForPeriod } from "../utils/dateRange";
import {
  normalizeSummary,
  normalizeMaterialFlow,
  normalizeTopProducts,
  normalizeOutOfStock,
  yieldBreakdown,
  trendRange,
} from "../utils/dashboard";
import {
  GetDashboardSummary,
  GetDashboardMaterialFlow,
  GetDashboardTopProducts,
  GetDashboardOutOfStock,
  GetSales,
} from "../services/apiServices";

const kg = (grams) => `${gmToKgDisplay(grams)} kg`;

const RECENT_SALES_LIMIT = 5;

const EMPTY_SUMMARY = {
  soldQty: 0,
  invoiceCount: 0,
  purchaseQty: 0,
  purchaseBillCount: 0,
  producedQty: 0,
  productionRunCount: 0,
  wasteQty: 0,
  wastePercentage: 0,
  rawMaterialQty: 0,
  rawMaterialTypes: 0,
  byProductQty: 0,
  byProductTypes: 0,
  period: null,
};

/** The items on a sale, as one line: "10X120P M5 +2 more". */
function saleItemsLabel(sale) {
  const names = [
    ...sale.products.map((p) => p.name),
    ...sale.byProducts.map((b) => byProductLabel(b.name, b.rawMaterialName)),
  ].filter(Boolean);
  if (!names.length) return "—";
  return names.length === 1
    ? names[0]
    : `${names[0]} +${names.length - 1} more`;
}

/* -------------------------------- pieces ---------------------------------- */

function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />
  );
}

/** Panel-sized placeholder for a failed fetch or an empty period. */
function PanelState({ icon: Icon, message, onRetry, height = "h-40" }) {
  return (
    <div
      className={`flex ${height} flex-col items-center justify-center gap-2 text-slate-300`}
    >
      <Icon size={30} />
      <p className="text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1E4D96] transition-colors hover:bg-blue-50"
        >
          <RotateCw size={13} /> Try again
        </button>
      )}
    </div>
  );
}

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

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-5 w-20" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
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
            className="-my-2 -mr-2 inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-[#1E4D96] hover:underline"
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
  // ISO from/to, driven by the topbar filter. The trend window does date
  // maths, so this keeps the ISO pair rather than the DD/MM/YYYY one.
  const [{ from, to }, setRange] = useState(() => rangeForPeriod("this_month"));

  usePageHeader({
    dateFilter: true,
    defaultPeriod: "this_month",
    onDateChange: (range) => setRange({ from: range.from, to: range.to }),
  });

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [materialFlow, setMaterialFlow] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);

  const [loading, setLoading] = useState(true);
  // Which panels failed, so one dead endpoint doesn't blank the whole page.
  const [failed, setFailed] = useState({});

  const fromDMY = isoToDMY(from);
  const toDMY = isoToDMY(to);
  // The chart keeps a 6-month window even when the filter is a single month.
  const trend = trendRange(from, to);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const range = {
      fromDate: fromDMY || undefined,
      toDate: toDMY || undefined,
    };

    const [summaryRes, flowRes, topRes, salesRes, stockRes] =
      await Promise.allSettled([
        GetDashboardSummary(range),
        GetDashboardMaterialFlow({
          fromDate: isoToDMY(trend.from) || undefined,
          toDate: isoToDMY(trend.to) || undefined,
        }),
        GetDashboardTopProducts(range),
        GetSales({
          ...range,
          sortBy: "date",
          sortOrder: "desc",
          page: 1,
          limit: RECENT_SALES_LIMIT,
        }),
        GetDashboardOutOfStock(),
      ]);

    const next = {};
    const ok = (result, panel, apply) => {
      if (result.status === "fulfilled") {
        apply(result.value);
      } else {
        next[panel] = true;
      }
    };

    ok(summaryRes, "summary", (res) => setSummary(normalizeSummary(res)));
    ok(flowRes, "materialFlow", (res) =>
      setMaterialFlow(normalizeMaterialFlow(res)),
    );
    ok(topRes, "topProducts", (res) =>
      setTopProducts(normalizeTopProducts(res)),
    );
    ok(salesRes, "recentSales", (res) =>
      setRecentSales(extractSales(res).list.map(normalizeSale)),
    );
    ok(stockRes, "outOfStock", (res) =>
      setOutOfStock(normalizeOutOfStock(res)),
    );

    if (summaryRes.status === "rejected") setSummary(EMPTY_SUMMARY);

    setFailed(next);
    setLoading(false);

    const broken = Object.keys(next).length;
    if (broken) {
      const first = [summaryRes, flowRes, topRes, salesRes, stockRes].find(
        (r) => r.status === "rejected",
      );
      toast.error(
        first?.reason?.response?.data?.message ||
          (broken === 5
            ? "Failed to load the dashboard"
            : "Some dashboard data couldn't be loaded"),
      );
    }
  }, [fromDMY, toDMY, trend.from, trend.to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, [fetchDashboard]);

  /* ------------------------------- handlers ------------------------------- */

  /* -------------------------------- derived ------------------------------- */

  const yieldSlices = yieldBreakdown(summary);
  const yieldTotal = yieldSlices.reduce((sum, d) => sum + d.value, 0);
  const topMax = Math.max(...topProducts.map((p) => p.quantity), 1);
  const flowHasData = materialFlow.some(
    (m) => m.purchased || m.produced || m.sold,
  );

  const kpis = [
    {
      icon: TrendingUp,
      label: "Sold",
      value: kg(summary.soldQty),
      sub: `${summary.invoiceCount} invoices`,
      tone: "bg-blue-50 text-blue-600",
      to: "/sales",
    },
    {
      icon: ShoppingCart,
      label: "Purchased",
      value: kg(summary.purchaseQty),
      sub: `${summary.purchaseBillCount} bills`,
      tone: "bg-emerald-50 text-emerald-600",
      to: "/purchase",
    },
    {
      icon: Scissors,
      label: "Produced",
      value: kg(summary.producedQty),
      sub: `${summary.productionRunCount} production runs`,
      tone: "bg-violet-50 text-violet-600",
      to: "/product",
    },
    {
      icon: Trash2,
      label: "Waste",
      value: kg(summary.wasteQty),
      sub: `${summary.wastePercentage}% of material cut`,
      tone: "bg-amber-50 text-amber-600",
      to: "/product",
    },
    {
      icon: Layers,
      label: "Raw material in stock",
      value: kg(summary.rawMaterialQty),
      sub: `${summary.rawMaterialTypes} sheet types`,
      tone: "bg-sky-50 text-sky-600",
      to: "/inventory",
    },
  ];

  return (
    <div className="min-h-full bg-[#F7F8FB] p-4 lg:p-5">
      <div className="mx-auto max-w-[1400px] space-y-4 lg:space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {loading
            ? Array.from({ length: kpis.length }, (_, i) => (
                <KpiSkeleton key={i} />
              ))
            : kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Panel
            title="Material flow (kg)"
            action="Purchases"
            to="/purchase"
            className="lg:col-span-3"
          >
            {loading ? (
              <Skeleton className="h-[262px] w-full" />
            ) : failed.materialFlow ? (
              <PanelState
                icon={AlertTriangle}
                message="Couldn't load material flow."
                onRetry={fetchDashboard}
                height="h-[262px]"
              />
            ) : !flowHasData ? (
              <PanelState
                icon={Inbox}
                message="No material movement in this period."
                height="h-[262px]"
              />
            ) : (
              <>
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
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: color }}
                      />
                      {name}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={materialFlow} barCategoryGap="28%" barGap={3}>
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
              </>
            )}
          </Panel>

          <Panel
            title="Production yield"
            action="Production"
            to="/product"
            className="lg:col-span-2"
          >
            {loading ? (
              <Skeleton className="h-[262px] w-full" />
            ) : failed.summary ? (
              <PanelState
                icon={AlertTriangle}
                message="Couldn't load production yield."
                onRetry={fetchDashboard}
                height="h-[262px]"
              />
            ) : !yieldTotal ? (
              <PanelState
                icon={Inbox}
                message="Nothing cut in this period."
                height="h-[262px]"
              />
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={185}>
                    <PieChart>
                      <Pie
                        data={yieldSlices}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={80}
                        dataKey="value"
                        paddingAngle={3}
                        isAnimationActive={false}
                      >
                        {yieldSlices.map((d) => (
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
                    <span className="text-xs text-slate-400">kg total</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {yieldSlices.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2 text-slate-500">
                        <span
                          className="h-2 w-2 rounded-full"
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
              </>
            )}
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
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: RECENT_SALES_LIMIT }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : failed.recentSales ? (
              <PanelState
                icon={AlertTriangle}
                message="Couldn't load recent sales."
                onRetry={fetchDashboard}
              />
            ) : !recentSales.length ? (
              <PanelState icon={Inbox} message="No sales in this period." />
            ) : (
              <div className="-my-1 divide-y divide-slate-100">
                {recentSales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#1E4D96]">
                        {(s.partyName || "—").charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {s.partyName || "—"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {s.invoiceNumber} · {saleItemsLabel(s)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {kg(s.totalQuantity)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {paymentTypeLabel(s.paymentType)} · {s.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Out of stock"
            action="Inventory"
            to="/product-inventory"
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : failed.outOfStock ? (
              <PanelState
                icon={AlertTriangle}
                message="Couldn't load stock alerts."
                onRetry={fetchDashboard}
              />
            ) : !outOfStock.length ? (
              <PanelState icon={Inbox} message="Everything is in stock." />
            ) : (
              <div className="-my-1 divide-y divide-slate-100">
                {outOfStock.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-50/70"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
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
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                      Out of stock
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Top products */}
        <div className="pb-4">
          <Panel title="Top products sold" action="View all" to="/sales">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : failed.topProducts ? (
              <PanelState
                icon={AlertTriangle}
                message="Couldn't load top products."
                onRetry={fetchDashboard}
              />
            ) : !topProducts.length ? (
              <PanelState
                icon={Inbox}
                message="No products sold in this period."
              />
            ) : (
              <div className="space-y-3">
                {topProducts.map((p) => (
                  <div key={p.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {p.name}
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
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
