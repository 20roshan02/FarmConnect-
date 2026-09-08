/**
 * MLInsights.tsx  v2 — Advanced Admin ML Dashboard
 *
 * Tabs:
 *   1. Overview        — ML health summary cards + segment breakdown + CF coverage
 *   2. Churn           — Ensemble risk table + feature importance bars + sub-model scores + trend badges
 *   3. Segments        — K-Means pie + RFM radar spider chart + silhouette score + customer drill-down
 *   4. Recommendations — Hybrid CF popularity chart + category breakdown donut + product grid
 */

import { useEffect, useState, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from "recharts";
import {
  fetchMLOverview, fetchChurnPredictions, fetchCustomerSegments,
  fetchPlatformRecommendations,
  type MLOverview, type ChurnPrediction, type ChurnSummary,
  type ChurnResponse, type SegmentSummary, type RadarData,
  type Recommendation, type PlatformFeatureImportance, type SegmentsResponse,
} from "../../services/mlApi";

// ─── Palette ─────────────────────────────────────────────────────────────────
const SEG_COLORS  = ["#4b6b4c","#b9861f","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];
const RISK_COLOR: Record<string,string> = { High:"#a8502f", Medium:"#b9861f", Low:"#4b6b4c" };
const TREND_COLOR: Record<string,string> = { worsening:"#ef4444", stable:"#b9861f", improving:"#4b6b4c" };
const TREND_ICON:  Record<string,string> = { worsening:"↑", stable:"→", improving:"↓" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtRs = (n: number) =>
  n >= 1_000_000 ? `Rs ${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `Rs ${(n/1_000).toFixed(1)}K`
  : `Rs ${n.toFixed(0)}`;

// ─── Shared primitives ────────────────────────────────────────────────────────
function Card({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#e4dfd3] bg-white/90 p-5 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ${className}`}>
      {children}
    </div>
  );
}
function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#6b7368]">
      <span className="inline-block h-3 w-1 rounded-full bg-[#b9861f]" />{children}
    </p>
  );
}
function Spinner() {
  return <div className="flex h-40 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#b9861f]/25 border-t-[#b9861f]" /></div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-[#a8502f]/40 bg-[#fff5f0] p-4 text-sm text-[#a8502f]">{msg}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <p className="rounded-xl border border-dashed border-[#e4dfd3] p-6 text-center text-sm text-[#6b7368]">{msg}</p>;
}
function MetricPill({ label, value, color }: { label:string; value:string|number; color:string }) {
  return (
    <div className="rounded-xl border bg-white p-4 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth:3, borderColor:"#e4dfd3" }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b7368]">{label}</p>
    </div>
  );
}
const TTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#e4dfd3] bg-white px-4 py-3 shadow-lg text-sm">
      <p className="mb-1 font-semibold text-[#1f2a22]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill||p.color||p.stroke }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Tab 1 — ML Overview
// ═════════════════════════════════════════════════════════════════════════════
function OverviewPanel() {
  const [data, setData] = useState<MLOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  useEffect(() => {
    fetchMLOverview()
      .then(r => setData(r.data.overview))
      .catch(() => setError("Failed to load ML overview."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error || !data) return <Err msg={error ?? "No data."} />;

  const { churn, segments, cf } = data;
  const riskPie = [
    { name:"High",   value: churn.high,   fill: RISK_COLOR.High   },
    { name:"Medium", value: churn.medium, fill: RISK_COLOR.Medium },
    { name:"Low",    value: churn.low,    fill: RISK_COLOR.Low    },
  ];
  const segPie = segments.breakdown.map((s, i) => ({
    name: s.label, value: s.count, fill: SEG_COLORS[i % SEG_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Top stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricPill label="Total Customers"    value={churn.total}               color="#3b82f6" />
        <MetricPill label="High Churn Risk"    value={churn.high}                color={RISK_COLOR.High} />
        <MetricPill label="CF Coverage"        value={`${cf.cfCoverage}%`}       color="#4b6b4c" />
        <MetricPill label="Cluster Quality"    value={segments.silhouette.toFixed(2)} color="#8b5cf6" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Churn risk donut */}
        <Card>
          <ChartTitle>Churn Risk Distribution</ChartTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={4}>
                {riskPie.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip formatter={(v:number,n:string) => [v,n]} />
              <Legend iconType="circle" iconSize={9} />
            </PieChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-[11px] text-[#6b7368]">
            Avg score: <span className="font-bold" style={{ color: RISK_COLOR.High }}>{(churn.avgChurnScore * 100).toFixed(0)}%</span>
          </p>
        </Card>

        {/* Segment breakdown donut */}
        <Card>
          <ChartTitle>Customer Segments (k={segments.optimalK})</ChartTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={segPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={4} label={({name,value}) => `${name.split(" ")[0]}: ${value}`} labelLine={false}>
                {segPie.map((_,i) => <Cell key={i} fill={SEG_COLORS[i%SEG_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={9} />
            </PieChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-[11px] text-[#6b7368]">
            Silhouette: <span className="font-bold text-[#3b82f6]">{segments.silhouette.toFixed(3)}</span>
          </p>
        </Card>

        {/* CF coverage stats */}
        <Card>
          <ChartTitle>Collaborative Filtering Coverage</ChartTitle>
          <div className="mt-4 space-y-4">
            {[
              { label:"Active Buyers",      value: cf.activeCustomers,          total: cf.totalCustomers, color:"#4b6b4c" },
              { label:"Products Purchased", value: cf.uniqueProductsPurchased,  total: cf.uniqueProductsPurchased, color:"#3b82f6" },
            ].map(({ label, value, total, color }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-[#6b7368]">{label}</span>
                  <span className="font-bold" style={{ color }}>{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eef0ec]">
                  <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(100,(value/Math.max(total,1))*100)}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
            <div className="mt-4 rounded-xl border border-[#e4dfd3] bg-[#f8f7f2] p-3">
              <p className="text-[11px] text-[#6b7368]">Top category by volume</p>
              <p className="mt-1 text-lg font-bold capitalize text-[#1f2a22]">{data.catalog.topCategory}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 2 — Churn Prediction
// ═════════════════════════════════════════════════════════════════════════════
function ChurnPanel() {
  const [resp, setResp]     = useState<ChurnResponse | null>(null);
  const [loading, setL]     = useState(true);
  const [error, setErr]     = useState<string|null>(null);
  const [filter, setFilter] = useState<"All"|"High"|"Medium"|"Low">("All");
  const [expanded, setExp]  = useState<string|null>(null);

  useEffect(() => {
    fetchChurnPredictions()
      .then(r => setResp(r.data))
      .catch(() => setErr("Failed to load churn predictions."))
      .finally(() => setL(false));
  }, []);

  if (loading) return <Spinner />;
  if (error || !resp) return <Err msg={error ?? "No data."} />;

  const { predictions, summary, trendDist, platformFeatureImportance } = resp;
  const visible = filter === "All" ? predictions : predictions.filter(p => p.churnRisk === filter);

  const riskBar = [
    { risk:"High",   count: summary.high,   fill: RISK_COLOR.High   },
    { risk:"Medium", count: summary.medium, fill: RISK_COLOR.Medium },
    { risk:"Low",    count: summary.low,    fill: RISK_COLOR.Low    },
  ];
  const trendBar = Object.entries(trendDist||{}).map(([trend, count]) => ({
    trend, count, fill: TREND_COLOR[trend] || "#94a3b8",
  }));

  return (
    <div className="space-y-5">
      {/* Summary pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricPill label="Total"  value={summary.total}                      color="#3b82f6" />
        <MetricPill label="High"   value={summary.high}                       color={RISK_COLOR.High}   />
        <MetricPill label="Medium" value={summary.medium}                     color={RISK_COLOR.Medium} />
        <MetricPill label="Low"    value={summary.low}                        color={RISK_COLOR.Low}    />
        <MetricPill label="Avg Score" value={`${((summary.avgScore||0)*100).toFixed(0)}%`} color="#8b5cf6" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Risk distribution bar */}
        <Card>
          <ChartTitle>Risk Distribution</ChartTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={riskBar} margin={{ top:4, right:8, bottom:4, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
              <XAxis dataKey="risk" tick={{ fontSize:12, fill:"#6b7368" }} />
              <YAxis tick={{ fontSize:11, fill:"#6b7368" }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="count" name="Customers" radius={[6,6,0,0]} maxBarSize={56}>
                {riskBar.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Trend distribution */}
        <Card>
          <ChartTitle>Behaviour Trend</ChartTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendBar} margin={{ top:4, right:8, bottom:4, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
              <XAxis dataKey="trend" tick={{ fontSize:12, fill:"#6b7368" }} />
              <YAxis tick={{ fontSize:11, fill:"#6b7368" }} allowDecimals={false} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="count" name="Customers" radius={[6,6,0,0]} maxBarSize={56}>
                {trendBar.map((e,i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Feature importance */}
        <Card>
          <ChartTitle>Feature Importance</ChartTitle>
          {platformFeatureImportance && platformFeatureImportance.length > 0 ? (
            <div className="space-y-2 mt-1">
              {platformFeatureImportance.map((f: PlatformFeatureImportance) => (
                <div key={f.feature}>
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="text-[#6b7368] truncate max-w-[70%]">{f.feature}</span>
                    <span className="font-bold text-[#b9861f]">{(f.importance*100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f0ec]">
                    <div className="h-full rounded-full bg-[#b9861f] transition-all" style={{ width:`${(f.importance*100).toFixed(1)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No feature importance data yet." />}
        </Card>
      </div>

      {/* Filter tabs + advanced table */}
      {predictions.length === 0 ? <Empty msg="No customer data available yet." /> : (
        <Card>
          <div className="mb-4 flex flex-wrap gap-2 border-b border-[#e4dfd3] pb-3">
            {(["All","High","Medium","Low"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  filter === f
                    ? "border-[#b9861f] bg-[#fff6df] font-semibold text-[#1f2a22]"
                    : "border-transparent text-[#6b7368] hover:border-[#e4dfd3] hover:bg-white"
                }`}>
                {f}{f !== "All" && summary ? ` (${summary[f.toLowerCase() as keyof ChurnSummary]})` : ""}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#f8f7f2]">
                <tr>
                  {["Customer","Recency","Orders","Spend","Score","Risk","Trend","Action"].map(h => (
                    <th key={h} className="border-b border-[#e4dfd3] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6b7368] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 60).map((p, i) => (
                  <>
                    <tr key={p.userId}
                      className={`cursor-pointer transition-colors ${i%2===0?"bg-white":"bg-[#fafaf8]"} hover:bg-[#fff6df]`}
                      onClick={() => setExp(expanded === p.userId ? null : p.userId)}>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5">
                        <div className="font-medium text-[#1f2a22]">{p.name}</div>
                        <div className="font-mono text-[10px] text-[#6b7368]">{p.email}</div>
                      </td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5 whitespace-nowrap text-[#6b7368]">
                        {p.recencyDays === 0 ? "Today" : `${p.recencyDays}d ago`}
                      </td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5 text-center">{p.orderCount}</td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5 whitespace-nowrap">{fmtRs(p.totalSpend)}</td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#eef0ec]">
                            <div className="h-full rounded-full" style={{ width:`${Math.round(p.churnScore*100)}%`, backgroundColor: RISK_COLOR[p.churnRisk] }} />
                          </div>
                          <span className="text-[11px] text-[#6b7368]">{Math.round(p.churnScore*100)}%</span>
                        </div>
                      </td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5">
                        <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ color: RISK_COLOR[p.churnRisk], backgroundColor: RISK_COLOR[p.churnRisk]+"20" }}>
                          {p.churnRisk}
                        </span>
                      </td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5">
                        <span className="text-[12px] font-bold" style={{ color: TREND_COLOR[p.trendSignal] }}>
                          {TREND_ICON[p.trendSignal]} {p.trendSignal}
                        </span>
                      </td>
                      <td className="border-b border-[#e4dfd3] px-3 py-2.5 text-[11px] text-[#6b7368] max-w-[160px]">
                        {p.recommendedAction}
                      </td>
                    </tr>
                    {expanded === p.userId && (
                      <tr key={`${p.userId}-exp`} className="bg-[#fff6df]">
                        <td colSpan={8} className="border-b border-[#e4dfd3] px-4 py-3">
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            {/* Sub-model scores */}
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase text-[#6b7368]">Sub-Model Scores</p>
                              {Object.entries(p.subModelScores).map(([k,v]) => (
                                <div key={k} className="flex justify-between text-[12px]">
                                  <span className="text-[#6b7368] capitalize">{k.replace("Model"," Model")}</span>
                                  <span className="font-bold text-[#b9861f]">{(v*100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                            {/* Feature contributions */}
                            <div className="col-span-2">
                              <p className="mb-1 text-[11px] font-semibold uppercase text-[#6b7368]">Feature Contributions</p>
                              <div className="space-y-1">
                                {p.featureContributions.slice(0,4).map(fc => (
                                  <div key={fc.feature}>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-[#6b7368] truncate">{fc.feature}</span>
                                      <span className="font-semibold text-[#1f2a22]">{(fc.contribution*100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1 overflow-hidden rounded-full bg-[#eef0ec]">
                                      <div className="h-full rounded-full bg-[#b9861f]" style={{ width:`${(fc.contribution*100).toFixed(1)}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {visible.length > 60 && <p className="mt-2 text-center text-[11px] text-[#6b7368]">Showing top 60 of {visible.length}</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 3 — Customer Segments
// ═════════════════════════════════════════════════════════════════════════════
function SegmentsPanel() {
  const [resp, setResp]     = useState<SegmentsResponse|null>(null);
  const [loading, setL]     = useState(true);
  const [error, setErr]     = useState<string|null>(null);
  const [kOverride, setKO]  = useState<number|undefined>(undefined);
  const [activeSegment, setActiveSeg] = useState<string|null>(null);

  const load = useCallback((k?: number) => {
    setL(true); setErr(null);
    fetchCustomerSegments(k)
      .then(r => { setResp(r.data); setKO(k); })
      .catch(() => setErr("Failed to load segments."))
      .finally(() => setL(false));
  }, []);

  useEffect(() => { load(undefined); }, [load]);

  if (loading) return <Spinner />;
  if (error || !resp) return <Err msg={error ?? "No data."} />;

  const { summary, radarData, silhouette, optimalK, inertia, segments } = resp;
  const pieData = summary.map((s,i) => ({ name:s.label, value:s.count, fill:SEG_COLORS[i%SEG_COLORS.length] }));

  const activeSeg = activeSegment ? segments.find(s => s.label === activeSegment) : null;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#6b7368]">Override k:</span>
          <span className="text-[12px] text-[#6b7368]">(auto = {optimalK})</span>
          {[3,4,5,6].map(n => (
            <button key={n} onClick={() => load(n)}
              className={`h-8 w-8 rounded-full border text-[13px] font-semibold transition-colors ${
                kOverride===n ? "border-[#b9861f] bg-[#fff6df] text-[#1f2a22]" : "border-[#e4dfd3] text-[#6b7368] hover:bg-white"
              }`}>{n}</button>
          ))}
          {kOverride !== undefined && (
            <button onClick={() => load(undefined)} className="text-[11px] text-[#a8502f] underline">Reset to auto</button>
          )}
        </div>
        <div className="ml-auto flex gap-4 text-[12px] text-[#6b7368]">
          <span>Silhouette: <strong className="text-[#3b82f6]">{silhouette.toFixed(3)}</strong></span>
          <span>Inertia: <strong className="text-[#8b5cf6]">{inertia.toFixed(0)}</strong></span>
        </div>
      </div>

      {summary.length === 0 ? <Empty msg="No customer data yet." /> : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            {/* Pie */}
            <Card>
              <ChartTitle>Segment Distribution</ChartTitle>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={95} innerRadius={50} paddingAngle={4}
                    label={({name,value}) => `${name.split(" ")[0]}: ${value}`} labelLine={false}
                    onClick={(d) => setActiveSeg(d.name === activeSegment ? null : d.name)}>
                    {pieData.map((_,i) => <Cell key={i} fill={SEG_COLORS[i%SEG_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v:number,n:string) => [v,n]} />
                  <Legend iconType="circle" iconSize={9} />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-[11px] text-[#6b7368]">Click a segment to drill down</p>
            </Card>

            {/* RFM Radar */}
            <Card>
              <ChartTitle>RFM Radar — All Segments</ChartTitle>
              {radarData && radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={[
                    { axis:"Recency",   ...Object.fromEntries(radarData.map((r:RadarData) => [r.label, r.recency]))   },
                    { axis:"Frequency", ...Object.fromEntries(radarData.map((r:RadarData) => [r.label, r.frequency])) },
                    { axis:"Monetary",  ...Object.fromEntries(radarData.map((r:RadarData) => [r.label, r.monetary]))  },
                    { axis:"Retention", ...Object.fromEntries(radarData.map((r:RadarData) => [r.label, r.retention])) },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize:11, fill:"#6b7368" }} />
                    <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9 }} />
                    {radarData.map((r:RadarData,i:number) => (
                      <Radar key={r.label} name={r.label} dataKey={r.label}
                        stroke={SEG_COLORS[i%SEG_COLORS.length]} fill={SEG_COLORS[i%SEG_COLORS.length]} fillOpacity={0.12} />
                    ))}
                    <Legend iconType="circle" iconSize={9} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <Empty msg="Radar data unavailable." />}
            </Card>
          </div>

          {/* Segment stat cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((seg,i) => (
              <Card key={seg.label} className={`cursor-pointer transition-all ${activeSegment===seg.label?"ring-2 ring-[#b9861f]":""}`}
                onClick={() => setActiveSeg(activeSegment===seg.label ? null : seg.label)}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color:SEG_COLORS[i%SEG_COLORS.length], backgroundColor:SEG_COLORS[i%SEG_COLORS.length]+"18" }}>
                    {seg.label}
                  </span>
                  <span className="text-2xl font-bold" style={{ color:SEG_COLORS[i%SEG_COLORS.length] }}>{seg.count}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  {[
                    { l:"Avg Spend",   v: fmtRs(seg.avgSpend)  },
                    { l:"Avg Orders",  v: seg.avgOrders        },
                    { l:"Avg Recency", v: `${seg.avgRecency}d` },
                  ].map(({l,v}) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-[#6b7368]">{l}</span>
                      <span className="font-semibold text-[#1f2a22]">{v}</span>
                    </div>
                  ))}
                  {seg.radar && (
                    <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-[#f8f7f2] p-2 text-[11px]">
                      {Object.entries(seg.radar).map(([k,v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="capitalize text-[#6b7368]">{k}</span>
                          <span className="font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Drill-down customer list for active segment */}
          {activeSeg && activeSeg.customers.length > 0 && (
            <Card>
              <ChartTitle>Customers in "{activeSeg.label}" ({activeSeg.customers.length})</ChartTitle>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#f8f7f2]">
                    <tr>
                      {["Name","Email","Recency","Orders","Spend","Avg Order"].map(h => (
                        <th key={h} className="border-b border-[#e4dfd3] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6b7368]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSeg.customers.slice(0,30).map((c,i) => (
                      <tr key={c.userId} className={i%2===0?"bg-white":"bg-[#fafaf8]"}>
                        <td className="border-b border-[#e4dfd3] px-3 py-2 font-medium text-[#1f2a22]">{c.name}</td>
                        <td className="border-b border-[#e4dfd3] px-3 py-2 font-mono text-[11px] text-[#6b7368]">{c.email}</td>
                        <td className="border-b border-[#e4dfd3] px-3 py-2 text-[#6b7368]">{c.recencyDays}d</td>
                        <td className="border-b border-[#e4dfd3] px-3 py-2 text-center">{c.orderCount}</td>
                        <td className="border-b border-[#e4dfd3] px-3 py-2">{fmtRs(c.totalSpend)}</td>
                        <td className="border-b border-[#e4dfd3] px-3 py-2">{fmtRs(c.avgOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activeSeg.customers.length > 30 && <p className="mt-1 text-center text-[11px] text-[#6b7368]">Showing 30 of {activeSeg.customers.length}</p>}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tab 4 — Recommendations
// ═════════════════════════════════════════════════════════════════════════════
function RecommendationsPanel() {
  const [recs, setRecs]       = useState<Recommendation[]>([]);
  const [catBreak, setCatBreak] = useState<{category:string;count:number}[]>([]);
  const [loading, setL]       = useState(true);
  const [error, setErr]       = useState<string|null>(null);

  useEffect(() => {
    fetchPlatformRecommendations(16)
      .then(r => { setRecs(r.data.recommendations ?? []); setCatBreak(r.data.categoryBreakdown ?? []); })
      .catch(() => setErr("Failed to load recommendations."))
      .finally(() => setL(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Err msg={error} />;
  if (recs.length === 0) return <Empty msg="No purchase data yet — recommendations appear once orders are placed." />;

  const barData = recs.slice(0,10).map(r => ({
    name:  r.product?.title?.substring(0,18) ?? r.productId.slice(-6),
    score: r.score,
    buyers: r.uniqueBuyers ?? 0,
  }));
  const catPie = catBreak.map((c,i) => ({ ...c, fill: SEG_COLORS[i%SEG_COLORS.length] }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Popularity score bar */}
        <Card>
          <ChartTitle>Top 10 by Purchase Volume Score</ChartTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical" margin={{ top:4, right:16, bottom:4, left:8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:"#6b7368" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:"#1f2a22" }} width={120} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="score" name="CF Score" radius={[0,6,6,0]} maxBarSize={22}>
                {barData.map((_,i) => <Cell key={i} fill={SEG_COLORS[i%SEG_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Category breakdown donut */}
        <Card>
          <ChartTitle>Recommendations by Category</ChartTitle>
          {catPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={catPie} dataKey="count" nameKey="category" cx="50%" cy="50%"
                  outerRadius={95} innerRadius={50} paddingAngle={4}
                  label={({category,count}) => `${category}: ${count}`} labelLine={false}>
                  {catPie.map((_,i) => <Cell key={i} fill={SEG_COLORS[i%SEG_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v:number,n:string) => [v,n]} />
                <Legend iconType="circle" iconSize={9} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty msg="No category data." />}
        </Card>
      </div>

      {/* Buyers vs score comparison */}
      <Card>
        <ChartTitle>Unique Buyers vs Purchase Score (Top 10)</ChartTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top:4, right:16, bottom:24, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ec" />
            <XAxis dataKey="name" tick={{ fontSize:10, fill:"#6b7368" }} angle={-25} textAnchor="end" interval={0} />
            <YAxis yAxisId="l" tick={{ fontSize:11, fill:"#6b7368" }} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize:11, fill:"#6b7368" }} />
            <Tooltip content={<TTip />} />
            <Legend iconType="circle" iconSize={9} />
            <Bar yAxisId="l" dataKey="score"  name="CF Score"      fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={28} />
            <Bar yAxisId="r" dataKey="buyers" name="Unique Buyers" fill="#b9861f" radius={[4,4,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {recs.map((r,i) => {
          const p = r.product; if (!p) return null;
          return (
            <Card key={r.productId} className="flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ color:SEG_COLORS[i%SEG_COLORS.length], backgroundColor:SEG_COLORS[i%SEG_COLORS.length]+"18" }}>
                  #{i+1}
                </span>
                <div className="text-right text-[10px] text-[#6b7368]">
                  <div>{r.uniqueBuyers ?? 0} buyers</div>
                  <div>score {r.score.toFixed(1)}</div>
                </div>
              </div>
              {p.images ? (
                <img src={p.images} alt={p.title} className="h-20 w-full rounded-lg object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              ) : (
                <div className="flex h-20 w-full items-center justify-center rounded-lg bg-[#f1f0ec] text-2xl">🌿</div>
              )}
              <p className="text-[12px] font-semibold leading-tight text-[#1f2a22] line-clamp-2">{p.title}</p>
              <div className="mt-auto flex items-center justify-between text-[11px] text-[#6b7368]">
                <span className="capitalize rounded-full bg-[#f1f0ec] px-1.5 py-0.5">{p.category}</span>
                <span className="font-semibold text-[#4b6b4c]">Rs {p.price}/{p.unit}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#f1f0ec]">
                  <div className="h-full rounded-full bg-[#3b82f6]"
                    style={{ width:`${Math.min(100,(r.score/(recs[0]?.score||1))*100)}%` }} />
                </div>
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
type Tab = "overview" | "churn" | "segments" | "recommendations";

const TABS: { key: Tab; label: string; description: string }[] = [
  { key:"overview",        label:"Overview",        description:"Unified ML health summary — churn rates, segment quality, and CF coverage at a glance." },
  { key:"churn",           label:"Churn Prediction", description:"Ensemble of 3 logistic sub-models predicts churn probability with feature-level explanations and recommended actions." },
  { key:"segments",        label:"Customer Segments", description:"K-Means++ clustering on RFM+engagement features with automatic K selection via Silhouette scoring and RFM radar charts." },
  { key:"recommendations", label:"Recommendations",  description:"Hybrid collaborative filtering (user-based + item-based + category affinity) surfaces the most impactful products." },
];

export default function MLInsights() {
  const [tab, setTab] = useState<Tab>("overview");
  const active = TABS.find(t => t.key === tab)!;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e4dfd3] bg-gradient-to-br from-[#f3f8ed] to-[#eef5ec] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6b7368]">Machine Learning  •  Advanced</p>
        <h1 className="mt-1 text-2xl font-bold text-[#1f2a22]">ML Insights</h1>
        <p className="mt-1 text-[13px] text-[#6b7368]">
          Churn ensemble · K-Means++ segmentation · Hybrid CF · Gradient Boosting demand signals
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#e4dfd3] pb-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              tab === t.key
                ? "border-[#b9861f] bg-[#fff6df] font-semibold text-[#1f2a22]"
                : "border-transparent text-[#6b7368] hover:border-[#e4dfd3] hover:bg-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[#e4dfd3] bg-[#fafaf8] px-4 py-3">
        <span className="mt-0.5 text-[#b9861f]">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </span>
        <p className="text-[12px] text-[#6b7368]">{active.description}</p>
      </div>

      <div>
        {tab === "overview"        && <OverviewPanel />}
        {tab === "churn"           && <ChurnPanel />}
        {tab === "segments"        && <SegmentsPanel />}
        {tab === "recommendations" && <RecommendationsPanel />}
      </div>
    </div>
  );
}
