/**
 * MLFarmerInsights.tsx  v2 — Advanced Farmer ML Dashboard
 *
 * Tabs:
 *   1. Demand Forecast   — GB area chart with CI bands + stock alert card + seasonality bar +
 *                          feature importance + trend direction + training loss sparkline
 *   2. Portfolio         — all products stock status table + forecast revenue bar
 *   3. Market Signals    — Hybrid CF platform-wide popular products + category breakdown
 */

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
  BarChart, Bar, LineChart, Line, Cell, ComposedChart, ErrorBar,
} from "recharts";
import {
  fetchFarmerDemandForecasts, fetchPlatformRecommendations,
  type DemandForecastResult, type Recommendation, type FarmerDemandResponse, type StockStatus,
} from "../../services/mlApi";

// ─── Palette ─────────────────────────────────────────────────────────────────
const ACCENT  = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#14b8a6"];
const STOCK_COLOR: Record<StockStatus, string> = {
  healthy:     "#10b981",
  low:         "#f59e0b",
  critical:    "#ef4444",
  out_of_stock:"#7f1d1d",
};
const STOCK_BG: Record<StockStatus, string> = {
  healthy:     "#f0fdf4",
  low:         "#fffbeb",
  critical:    "#fef2f2",
  out_of_stock:"#fef2f2",
};
const STOCK_LABEL: Record<StockStatus, string> = {
  healthy: "Healthy", low: "Low Stock", critical: "Critical", out_of_stock: "Out of Stock",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtRs = (n: number) =>
  n >= 1_000_000 ? `Rs ${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `Rs ${(n/1_000).toFixed(1)}K`
  : `Rs ${n.toFixed(0)}`;

function monthLabel(iso: string) {
  const [y, m] = iso.split("-");
  return new Date(Number(y), Number(m)-1).toLocaleString("default", { month:"short", year:"2-digit" });
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Card({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}
function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
      <span className="inline-block h-3 w-1 rounded-full bg-emerald-500" />{children}
    </p>
  );
}
function Spinner() {
  return <div className="flex h-40 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-300/40 border-t-emerald-500" /></div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{msg}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <p className="rounded-xl border border-dashed border-emerald-100 p-6 text-center text-sm text-slate-500">{msg}</p>;
}
const TTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="mb-1 font-semibold text-slate-800">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke||p.color||p.fill }}>
          {p.name}: {typeof p.value === "number" ? p.value : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Stock Alert Banner ────────────────────────────────────────────────────────
function StockAlertBanner({ forecasts }: { forecasts: DemandForecastResult[] }) {
  const alerts = forecasts.filter(f => f.stockStatus === "critical" || f.stockStatus === "out_of_stock");
  const warnings = forecasts.filter(f => f.stockStatus === "low");
  if (alerts.length === 0 && warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="mt-0.5 text-lg">🚨</span>
          <div>
            <p className="text-sm font-semibold text-red-700">{alerts.length} product{alerts.length>1?"s":""} need immediate restocking</p>
            <p className="text-[12px] text-red-600">{alerts.map(f=>f.product.title).join(", ")}</p>
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-700">{warnings.length} product{warnings.length>1?"s":""} running low</p>
            <p className="text-[12px] text-amber-600">{warnings.map(f=>f.product.title).join(", ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 1 — Demand Forecast (single product deep-dive)
// ═════════════════════════════════════════════════════════════════════════════
function DemandForecastPanel({ forecasts }: { forecasts: DemandForecastResult[] }) {
  const [selected, setSelected] = useState<string>(forecasts[0]?.product._id?.toString() ?? "");

  const current = forecasts.find(f => f.product._id.toString() === selected) ?? forecasts[0];
  if (!current) return <Empty msg="No product selected." />;

  // Build merged chart data with confidence band
  const hist = (current.historicalSales ?? []).map(h => ({
    label: monthLabel(h.month), actual: h.unitsSold,
    predicted: null as number|null, lower: null as number|null, upper: null as number|null,
  }));
  const fcast = (current.forecast ?? []).map(f => ({
    label: monthLabel(f.month), actual: null as number|null,
    predicted: f.predictedUnits, lower: f.lowerBound, upper: f.upperBound,
  }));
  // bridge
  if (hist.length > 0 && fcast.length > 0) {
    fcast[0] = { ...fcast[0], actual: hist[hist.length-1].actual };
  }
  const chartData = [...hist, ...fcast];
  const splitLabel = hist.length > 0 ? hist[hist.length-1].label : null;

  const totalFcDemand = current.forecast.reduce((s,f) => s+f.predictedUnits, 0);
  const stockDiff = current.product.stock - totalFcDemand;
  const sc = current.stockStatus;

  // Feature importance data
  const fiData = Object.entries(current.featureImportance ?? {})
    .map(([name, imp]) => ({ name: name.substring(0,14), imp: parseFloat((imp*100).toFixed(1)) }))
    .sort((a,b) => b.imp - a.imp)
    .slice(0,8);

  // Seasonality data
  const seasonData = (current.seasonality ?? []).slice(-12).map(s => ({
    month: monthLabel(s.month), index: s.seasonalIndex,
  }));

  // Training loss sparkline
  const lossData = (current.trainLoss ?? []).map((l, i) => ({ round: i+1, loss: l }));

  return (
    <div className="space-y-5">
      {/* Product selector + horizon */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Product</label>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {forecasts.map(f => <option key={f.product._id.toString()} value={f.product._id.toString()}>{f.product.title}</option>)}
          </select>
        </div>
        {/* Model badge */}
        <div className="flex items-end">
          <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
            current.method==="gradient_boosting"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-amber-200 bg-amber-50 text-amber-700"
          }`}>
            {current.method==="gradient_boosting" ? "⚡ Gradient Boosting" : "📊 Moving Average"}
          </span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Stock</p>
          <p className="text-xl font-bold text-emerald-700">{current.product.stock}</p>
          <p className="text-[10px] text-slate-400">{current.product.unit}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Forecast</p>
          <p className="text-xl font-bold text-blue-600">{totalFcDemand}</p>
          <p className="text-[10px] text-slate-400">{current.product.unit}</p>
        </div>
        <div className="rounded-xl border p-3 text-center"
          style={{ borderColor: STOCK_COLOR[sc]+"40", backgroundColor: STOCK_BG[sc] }}>
          <p className="text-[10px] font-semibold uppercase text-slate-500">After Demand</p>
          <p className="text-xl font-bold" style={{ color: STOCK_COLOR[sc] }}>
            {stockDiff >= 0 ? `+${stockDiff}` : stockDiff}
          </p>
          <p className="text-[10px] font-semibold" style={{ color: STOCK_COLOR[sc] }}>{STOCK_LABEL[sc]}</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Model R²</p>
          <p className="text-xl font-bold text-violet-600">
            {current.modelAccuracy !== null ? `${(current.modelAccuracy*100).toFixed(0)}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">RMSE</p>
          <p className="text-xl font-bold text-amber-600">{current.rmse ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Trend</p>
          <p className="text-xl font-bold" style={{ color: current.trend?.direction==="increasing"?"#10b981":current.trend?.direction==="decreasing"?"#ef4444":"#94a3b8" }}>
            {current.trend?.direction==="increasing"?"↑":current.trend?.direction==="decreasing"?"↓":"→"}
          </p>
          <p className="text-[10px] capitalize text-slate-400">{current.trend?.direction ?? "—"}</p>
        </div>
      </div>

      {/* Forecast chart with CI bands */}
      <Card>
        <ChartTitle>Historical Sales + Forecast with Confidence Interval</ChartTitle>
        {chartData.length < 2 ? <Empty msg="Not enough data to render chart." /> : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top:8, right:16, bottom:4, left:0 }}>
              <defs>
                <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="label" tick={{ fontSize:11, fill:"#6b7280" }} />
              <YAxis tick={{ fontSize:11, fill:"#6b7280" }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Legend iconType="circle" iconSize={9} />
              {splitLabel && (
                <ReferenceLine x={splitLabel} stroke="#94a3b8" strokeDasharray="6 3"
                  label={{ value:"Forecast →", position:"insideTopRight", fontSize:10, fill:"#94a3b8" }} />
              )}
              {/* CI upper band */}
              <Area type="monotone" dataKey="upper" name="Upper CI" stroke="none"
                fill="#3b82f6" fillOpacity={0.08} connectNulls legendType="none" />
              {/* CI lower band */}
              <Area type="monotone" dataKey="lower" name="Lower CI" stroke="none"
                fill="#ffffff" fillOpacity={1} connectNulls legendType="none" />
              {/* Actual */}
              <Area type="monotone" dataKey="actual" name="Actual Sales"
                stroke="#10b981" strokeWidth={2} fill="url(#gAct)"
                dot={{ r:3, fill:"#10b981" }} connectNulls />
              {/* Predicted */}
              <Area type="monotone" dataKey="predicted" name="Predicted"
                stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="6 3" fill="url(#gFc)"
                dot={{ r:4, fill:"#3b82f6" }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Feature importance */}
        {fiData.length > 0 && (
          <Card>
            <ChartTitle>Feature Importance (GB Model)</ChartTitle>
            <div className="space-y-2">
              {fiData.map((f,i) => (
                <div key={f.name}>
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="text-slate-500 capitalize">{f.name}</span>
                    <span className="font-bold text-emerald-600">{f.imp}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${f.imp}%`, backgroundColor: ACCENT[i%ACCENT.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Seasonality */}
        {seasonData.length > 0 && (
          <Card>
            <ChartTitle>Seasonal Index</ChartTitle>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={seasonData} margin={{ top:4, right:4, bottom:20, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="month" tick={{ fontSize:9, fill:"#6b7280" }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize:9, fill:"#6b7280" }} domain={[0,"auto"]} />
                <Tooltip content={<TTip />} />
                <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 2" />
                <Bar dataKey="index" name="Seasonal Index" radius={[4,4,0,0]} maxBarSize={20}>
                  {seasonData.map((s,i) => (
                    <Cell key={i} fill={s.index >= 1.05 ? "#10b981" : s.index <= 0.95 ? "#ef4444" : "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-[10px] text-slate-400">Green = above average, Red = below average</p>
          </Card>
        )}

        {/* Training loss sparkline */}
        {lossData.length > 2 && (
          <Card>
            <ChartTitle>Model Training Loss</ChartTitle>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={lossData} margin={{ top:4, right:4, bottom:4, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="round" tick={{ fontSize:9, fill:"#6b7280" }} />
                <YAxis tick={{ fontSize:9, fill:"#6b7280" }} />
                <Tooltip content={<TTip />} />
                <Line type="monotone" dataKey="loss" name="MSE Loss" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-center text-[10px] text-slate-400">Converged in {lossData.length} rounds (early stopping)</p>
          </Card>
        )}
      </div>

      {/* Forecast detail table */}
      {current.forecast.length > 0 && (
        <Card>
          <ChartTitle>Monthly Forecast Detail</ChartTitle>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-emerald-50">
                <tr>
                  {["Month","Predicted","Low (95% CI)","High (95% CI)","Est. Revenue","Seasonal","Method"].map(h => (
                    <th key={h} className="border-b border-emerald-100 px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.forecast.map((f,i) => (
                  <tr key={f.month} className={i%2===0?"bg-white":"bg-emerald-50/30"}>
                    <td className="border-b border-emerald-100 px-3 py-2 font-medium text-slate-700">{monthLabel(f.month)}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 font-bold text-blue-600">{f.predictedUnits} {current.product.unit}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 text-slate-500">{f.lowerBound}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 text-slate-500">{f.upperBound}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 text-emerald-700">{fmtRs(f.predictedUnits * current.product.price)}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 text-slate-500">{f.seasonalIndex?.toFixed(2) ?? "—"}</td>
                    <td className="border-b border-emerald-100 px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${f.method==="gradient_boosting"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>
                        {f.method==="gradient_boosting"?"GB Model":"Moving Avg"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 2 — Portfolio View (all products)
// ═════════════════════════════════════════════════════════════════════════════
function PortfolioPanel({ data }: { data: FarmerDemandResponse }) {
  const { forecasts, portfolio } = data;
  if (forecasts.length === 0) return <Empty msg="No products found." />;

  const revenueBar = forecasts.map((f,i) => ({
    name:    f.product.title.substring(0,16),
    revenue: parseFloat((f.forecast.reduce((s,fp) => s + fp.predictedUnits * f.product.price, 0)).toFixed(0)),
    fill:    ACCENT[i % ACCENT.length],
  })).sort((a,b) => b.revenue - a.revenue);

  return (
    <div className="space-y-5">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Products</p>
          <p className="text-2xl font-bold text-emerald-700">{forecasts.length}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Stock Alerts</p>
          <p className="text-2xl font-bold text-red-600">{portfolio.alertCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Trending Up</p>
          <p className="text-2xl font-bold text-emerald-600">↑ {portfolio.trendingUp}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Forecast Revenue</p>
          <p className="text-xl font-bold text-blue-600">{fmtRs(portfolio.totalForecastRevenue)}</p>
        </div>
      </div>

      {/* Forecast revenue bar chart */}
      <Card>
        <ChartTitle>Forecast Revenue by Product</ChartTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={revenueBar} layout="vertical" margin={{ top:4, right:16, bottom:4, left:8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize:11, fill:"#6b7280" }} tickFormatter={v => `Rs${(v/1000).toFixed(0)}K`} />
            <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:"#1e293b" }} width={110} />
            <Tooltip content={<TTip />} formatter={(v: number) => [fmtRs(v), "Forecast Revenue"]} />
            <Bar dataKey="revenue" name="Forecast Revenue" radius={[0,6,6,0]} maxBarSize={24}>
              {revenueBar.map((_,i) => <Cell key={i} fill={ACCENT[i%ACCENT.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Product status table */}
      <Card>
        <ChartTitle>Product Forecast Summary</ChartTitle>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-emerald-50">
              <tr>
                {["Product","Category","Stock","Fcst Demand","Net Stock","Fcst Rev","Trend","Status"].map(h => (
                  <th key={h} className="border-b border-emerald-100 px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f,i) => {
                const totalDemand = f.forecast.reduce((s,fp) => s+fp.predictedUnits, 0);
                const netStock    = f.product.stock - totalDemand;
                const fcRev       = f.forecast.reduce((s,fp) => s + fp.predictedUnits * f.product.price, 0);
                const sc          = f.stockStatus;
                const trend       = f.trend?.direction ?? "stable";
                return (
                  <tr key={f.product._id.toString()} className={i%2===0?"bg-white":"bg-emerald-50/30"}>
                    <td className="border-b border-emerald-100 px-3 py-2 font-medium text-slate-800">{f.product.title}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 capitalize text-slate-500">{f.product.category}</td>
                    <td className="border-b border-emerald-100 px-3 py-2">{f.product.stock} {f.product.unit}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 font-bold text-blue-600">{totalDemand}</td>
                    <td className="border-b border-emerald-100 px-3 py-2 font-bold"
                      style={{ color: netStock >= 0 ? "#059669" : "#dc2626" }}>
                      {netStock >= 0 ? `+${netStock}` : netStock}
                    </td>
                    <td className="border-b border-emerald-100 px-3 py-2 text-emerald-700">{fmtRs(fcRev)}</td>
                    <td className="border-b border-emerald-100 px-3 py-2">
                      <span style={{ color: trend==="increasing"?"#10b981":trend==="decreasing"?"#ef4444":"#94a3b8" }}>
                        {trend==="increasing"?"↑ Rising":trend==="decreasing"?"↓ Falling":"→ Stable"}
                      </span>
                    </td>
                    <td className="border-b border-emerald-100 px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: STOCK_COLOR[sc], backgroundColor: STOCK_COLOR[sc]+"20" }}>
                        {STOCK_LABEL[sc]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 3 — Market Signals (CF)
// ═════════════════════════════════════════════════════════════════════════════
function MarketSignalsPanel() {
  const [recs, setRecs]         = useState<Recommendation[]>([]);
  const [catBreak, setCatBreak] = useState<{category:string;count:number}[]>([]);
  const [loading, setL]         = useState(true);
  const [error, setErr]         = useState<string|null>(null);

  useEffect(() => {
    fetchPlatformRecommendations(16)
      .then(r => { setRecs(r.data.recommendations ?? []); setCatBreak(r.data.categoryBreakdown ?? []); })
      .catch(() => setErr("Failed to load market signals."))
      .finally(() => setL(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <Err msg={error} />;
  if (recs.length === 0) return <Empty msg="No purchase data yet — market signals appear once customers start ordering." />;

  const barData = recs.slice(0,10).map(r => ({
    name:   r.product?.title?.substring(0,16) ?? r.productId.slice(-6),
    score:  r.score,
    buyers: r.uniqueBuyers ?? 0,
  }));

  const catBar = catBreak.map((c,i) => ({ ...c, fill: ACCENT[i%ACCENT.length] }));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-[12px] text-slate-600">
        Collaborative filtering shows which products drive the most purchases platform-wide. Use this to identify
        <strong className="text-emerald-700"> what crops or items are in demand</strong> so you can plan your inventory accordingly.
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <ChartTitle>Top Products by Purchase Score</ChartTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ top:4, right:12, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:"#6b7280" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:"#1e293b" }} width={110} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="score" name="CF Score" radius={[0,6,6,0]} maxBarSize={22}>
                {barData.map((_,i) => <Cell key={i} fill={ACCENT[i%ACCENT.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <ChartTitle>Demand by Category</ChartTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catBar} margin={{ top:4, right:12, bottom:24, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="category" tick={{ fontSize:11, fill:"#6b7280" }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize:11, fill:"#6b7280" }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="count" name="Products" radius={[6,6,0,0]} maxBarSize={36}>
                {catBar.map((_,i) => <Cell key={i} fill={ACCENT[i%ACCENT.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {recs.map((r,i) => {
          const p = r.product; if (!p) return null;
          return (
            <Card key={r.productId} className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ color:ACCENT[i%ACCENT.length], backgroundColor:ACCENT[i%ACCENT.length]+"18" }}>
                  #{i+1} Popular
                </span>
                <span className="text-[10px] text-slate-400">{r.uniqueBuyers ?? 0} buyers</span>
              </div>
              {p.images ? (
                <img src={p.images} alt={p.title} className="h-20 w-full rounded-lg object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              ) : (
                <div className="flex h-20 w-full items-center justify-center rounded-lg bg-emerald-50 text-2xl">🌾</div>
              )}
              <p className="text-[12px] font-semibold leading-tight text-slate-800 line-clamp-2">{p.title}</p>
              <div className="mt-auto flex items-center justify-between text-[11px] text-slate-500">
                <span className="capitalize rounded-full bg-slate-100 px-1.5 py-0.5">{p.category}</span>
                <span className="font-semibold text-emerald-600">Rs {p.price}/{p.unit}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{
                    width:`${Math.min(100,(r.score/(recs[0]?.score||1))*100)}%`,
                    backgroundColor: ACCENT[i%ACCENT.length],
                  }} />
                </div>
                <span className="text-[10px] text-slate-400">{r.score.toFixed(0)}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Root
// ═════════════════════════════════════════════════════════════════════════════
type Tab = "demand" | "portfolio" | "market";

const TABS: { key: Tab; label: string; description: string }[] = [
  { key:"demand",    label:"Demand Forecast",  description:"Gradient Boosting Trees forecast demand per product with 95% confidence intervals, seasonality decomposition, and feature importance." },
  { key:"portfolio", label:"Portfolio View",   description:"All products at a glance — stock alerts, trend directions, and forecast revenue for your entire catalogue." },
  { key:"market",    label:"Market Signals",   description:"Collaborative filtering reveals which products are most in demand across the platform — use it to guide your planting and stocking decisions." },
];

export default function MLFarmerInsights() {
  const [tab, setTab]           = useState<Tab>("demand");
  const [fcData, setFcData]     = useState<FarmerDemandResponse | null>(null);
  const [loading, setL]         = useState(true);
  const [error, setErr]         = useState<string|null>(null);
  const [months, setMonths]     = useState(3);

  const loadForecasts = useCallback((m: number) => {
    setL(true); setErr(null);
    fetchFarmerDemandForecasts(m)
      .then(r => setFcData(r.data))
      .catch(() => setErr("Failed to load demand forecasts."))
      .finally(() => setL(false));
  }, []);

  useEffect(() => { loadForecasts(months); }, [months]);

  const active = TABS.find(t => t.key === tab)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50/60 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Machine Learning  •  Advanced</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">ML Insights</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Gradient Boosting demand forecasting · Confidence intervals · Seasonality decomposition · Market signals
        </p>
      </div>

      {/* Stock alert banner */}
      {fcData && fcData.forecasts.length > 0 && <StockAlertBanner forecasts={fcData.forecasts} />}

      {/* Horizon selector (only relevant for demand/portfolio) */}
      {(tab === "demand" || tab === "portfolio") && (
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-slate-500">Forecast horizon:</span>
          {[1,2,3,6].map(m => (
            <button key={m} onClick={() => setMonths(m)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                months===m ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-emerald-100 text-slate-500 hover:bg-emerald-50"
              }`}>{m}mo</button>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-emerald-100 pb-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              tab===t.key
                ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700"
                : "border-transparent text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/50"
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Description */}
      <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
        <span className="mt-0.5 text-emerald-500">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </span>
        <p className="text-[12px] text-slate-500">{active.description}</p>
      </div>

      {/* Panels */}
      <div>
        {tab === "market" && <MarketSignalsPanel />}
        {(tab === "demand" || tab === "portfolio") && (
          loading ? <Spinner /> : error ? <Err msg={error} /> : !fcData || fcData.forecasts.length === 0
            ? <Empty msg="No products found. Add products to see ML insights." />
            : tab === "demand"
              ? <DemandForecastPanel forecasts={fcData.forecasts} />
              : <PortfolioPanel data={fcData} />
        )}
      </div>
    </div>
  );
}
