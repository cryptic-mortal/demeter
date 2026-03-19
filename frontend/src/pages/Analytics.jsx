import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import { fetchDashboardData, fetchAllCropHistories } from "../api/farmApi";
import { extractSensors } from "../utils/dataUtils";
import { TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import Sidebar from "../components/Sidebar";

// HELPERS

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function safePct(current, previous) {
  if (!previous) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

// Group history points into buckets.
// range = '24h' → group by hour (last 24 entries)
// range = '7d'  → group by day  (last 7 days)
// range = '30d' → group by day  (last 30 days)
function bucketHistory(points, range) {
  if (!points.length) return [];

  const now = Date.now();
  const MS = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = now - (MS[range] || MS["24h"]);

  const filtered = points.filter((p) => {
    const t = new Date(p.payload?.timestamp || 0).getTime();
    return t >= cutoff;
  });

  if (!filtered.length) return [];

  // Build buckets
  const bucketSize =
    range === "24h"
      ? 60 * 60 * 1000 // 1 hour
      : 24 * 60 * 60 * 1000; // 1 day

  const buckets = new Map();
  for (const p of filtered) {
    const t = new Date(p.payload?.timestamp || 0).getTime();
    const key = Math.floor(t / bucketSize) * bucketSize;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ts, pts]) => {
      const date = new Date(ts);
      const label =
        range === "24h"
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString([], { month: "short", day: "numeric" });

      const sensors = pts.map((p) => extractSensors(p.payload));
      return {
        label,
        ph: parseFloat(
          avg(sensors.map((s) => parseFloat(s.ph) || 0)).toFixed(2),
        ),
        ec: parseFloat(
          avg(sensors.map((s) => parseFloat(s.ec) || 0)).toFixed(2),
        ),
        temp: parseFloat(
          avg(sensors.map((s) => parseFloat(s.temp) || 0)).toFixed(1),
        ),
        humidity: parseFloat(
          avg(sensors.map((s) => parseFloat(s.humidity) || 0)).toFixed(1),
        ),
        count: pts.length,
      };
    });
}

// Build per-day crop count for "sequences per day" bar chart
function dailyCropActivity(points) {
  const map = new Map();
  for (const p of points) {
    const ts = p.payload?.timestamp;
    if (!ts) continue;
    const day = new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    map.set(day, (map.get(day) || 0) + 1);
  }
  const last7 = Array.from(map.entries()).slice(-7);
  const maxVal = Math.max(...last7.map((e) => e[1]), 1);
  return last7.map(([d, count]) => ({
    d,
    count,
    target: Math.ceil(maxVal * 1.2),
  }));
}

// Build radar: how close each param is to ideal range
function buildRadar(points) {
  if (!points.length) return [];
  const sensors = points.map((p) => extractSensors(p.payload));

  const check = (vals, lo, hi) => {
    const inRange = vals.filter((v) => v >= lo && v <= hi).length;
    return Math.round((inRange / vals.length) * 100);
  };

  return [
    {
      metric: "pH",
      value: check(
        sensors.map((s) => parseFloat(s.ph)),
        5.5,
        6.5,
      ),
    },
    {
      metric: "EC",
      value: check(
        sensors.map((s) => parseFloat(s.ec)),
        0.8,
        2.5,
      ),
    },
    {
      metric: "Temp",
      value: check(
        sensors.map((s) => parseFloat(s.temp)),
        18,
        28,
      ),
    },
    {
      metric: "Humidity",
      value: check(
        sensors.map((s) => parseFloat(s.humidity)),
        40,
        80,
      ),
    },
  ];
}

// Derive which agents appear in action_taken fields and how many times
function buildAgentStats(points) {
  const AGENTS = ["SUPERVISOR", "WATER", "ATMOSPHERIC", "JUDGE", "DOCTOR"];
  const counts = Object.fromEntries(AGENTS.map((a) => [a, 0]));

  for (const p of points) {
    const action =
      (p.payload?.action_taken || "") +
      " " +
      (p.payload?.strategic_intent || "");
    for (const agent of AGENTS) {
      if (action.toUpperCase().includes(agent)) counts[agent]++;
    }
    // every stored point = at least one supervisor decision
    counts["SUPERVISOR"]++;
  }

  const total = Math.max(points.length, 1);
  return AGENTS.map((name) => ({
    name,
    decisions: counts[name],
    // accuracy = % of points where outcome is NOT negative
    accuracy: points.length
      ? Math.round(
          (points.filter((p) => {
            const o = (p.payload?.outcome || "").toLowerCase();
            return (
              !o.includes("fail") &&
              !o.includes("negative") &&
              !o.includes("critical")
            );
          }).length /
            total) *
            100,
        )
      : 0,
  })).filter((a) => a.decisions > 0);
}

// COMPONENTS

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs font-mono"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

function MetricCard({ label, value, unit, change, color, loading }) {
  const up = change > 0,
    flat = change === 0;
  return (
    <div
      className="rounded-xl p-5 card-hover"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="text-[11px] font-mono mb-3"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded shimmer" />
      ) : (
        <div
          className="text-3xl font-bold font-mono"
          style={{ color: color || "var(--text)" }}
        >
          {value}
          <span
            className="text-base font-normal ml-1"
            style={{ color: "var(--text-3)" }}
          >
            {unit}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1 mt-2 text-[11px] font-mono">
        {flat ? (
          <Minus size={11} style={{ color: "var(--text-3)" }} />
        ) : up ? (
          <TrendingUp size={11} style={{ color: "var(--green)" }} />
        ) : (
          <TrendingDown size={11} style={{ color: "var(--red)" }} />
        )}
        <span
          style={{
            color: flat ? "var(--text-3)" : up ? "var(--green)" : "var(--red)",
          }}
        >
          {Math.abs(change)}% vs prior period
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>
        // {sub}
      </div>
      <h2
        className="font-bold text-base mt-0.5"
        style={{ color: "var(--text)" }}
      >
        {children}
      </h2>
    </div>
  );
}

function EmptyChart({ height = 180, message = "No data yet" }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        height,
        background: "var(--bg-3)",
        border: "1px dashed var(--border)",
      }}
    >
      <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
        {message}
      </span>
    </div>
  );
}

// MAIN

export default function Analytics() {
  const [range, setRange] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [allPoints, setAllPoints] = useState([]); // every stored point from all crops
  const [dashboard, setDashboard] = useState([]); // latest snapshot per crop

  useEffect(() => {
    setLoading(true);
    fetchDashboardData().then(async (dash) => {
      setDashboard(dash || []);
      const hist = await fetchAllCropHistories(dash);
      setAllPoints(hist);
      setLoading(false);
    });
  }, []);

  // STATS

  const buckets = useMemo(
    () => bucketHistory(allPoints, range),
    [allPoints, range],
  );

  // Compute averages from latest snapshot
  const latestSensors = useMemo(() => {
    if (!dashboard.length) return { ph: 0, ec: 0, temp: 0 };
    const sensors = dashboard.map((d) => extractSensors(d.payload));
    return {
      ph: parseFloat(avg(sensors.map((s) => parseFloat(s.ph) || 0)).toFixed(2)),
      ec: parseFloat(avg(sensors.map((s) => parseFloat(s.ec) || 0)).toFixed(2)),
      temp: parseFloat(
        avg(sensors.map((s) => parseFloat(s.temp) || 0)).toFixed(1),
      ),
    };
  }, [dashboard]);

  // Compare first half vs second half of history to get "change"
  const prevSensors = useMemo(() => {
    if (allPoints.length < 2) return latestSensors;
    const half = Math.floor(allPoints.length / 2);
    const older = allPoints
      .slice(0, half)
      .map((p) => extractSensors(p.payload));
    return {
      ph: parseFloat(avg(older.map((s) => parseFloat(s.ph) || 0)).toFixed(2)),
      ec: parseFloat(avg(older.map((s) => parseFloat(s.ec) || 0)).toFixed(2)),
      temp: parseFloat(
        avg(older.map((s) => parseFloat(s.temp) || 0)).toFixed(1),
      ),
    };
  }, [allPoints, latestSensors]);

  const activityData = useMemo(() => dailyCropActivity(allPoints), [allPoints]);
  const radarData = useMemo(() => buildRadar(allPoints), [allPoints]);
  const agentStats = useMemo(() => buildAgentStats(allPoints), [allPoints]);

  // Export CSV of bucketed data
  const handleExport = () => {
    if (!buckets.length) return;
    const header = "time,ph,ec,temp,humidity,entries";
    const rows = buckets.map(
      (b) => `${b.label},${b.ph},${b.ec},${b.temp},${b.humidity},${b.count}`,
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `demeter-analytics-${range}.csv`;
    a.click();
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <header
          className="flex-shrink-0 px-6 py-4 border-b flex items-center gap-4"
          style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
        >
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--text)" }}>
              Analytics
            </h1>
            <p className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
              {loading
                ? "Loading…"
                : `${allPoints.length} data points across ${dashboard.length} crops`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                style={{
                  background:
                    range === r ? "rgba(74,222,128,0.12)" : "var(--surface)",
                  border: `1px solid ${range === r ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                  color: range === r ? "var(--green)" : "var(--text-3)",
                }}
              >
                {r}
              </button>
            ))}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
              }}
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* ── Metric cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              loading={loading}
              label="AVG pH"
              value={latestSensors.ph}
              unit=""
              change={safePct(latestSensors.ph, prevSensors.ph)}
              color="var(--green)"
            />
            <MetricCard
              loading={loading}
              label="AVG EC"
              value={latestSensors.ec}
              unit="dS/m"
              change={safePct(latestSensors.ec, prevSensors.ec)}
              color="var(--amber)"
            />
            <MetricCard
              loading={loading}
              label="AVG TEMP"
              value={latestSensors.temp}
              unit="°C"
              change={safePct(latestSensors.temp, prevSensors.temp)}
              color="var(--blue)"
            />
            <MetricCard
              loading={loading}
              label="TOTAL SEQUENCES"
              value={allPoints.length}
              unit=""
              change={safePct(
                allPoints.length,
                Math.max(allPoints.length - dashboard.length, 1),
              )}
              color="var(--text)"
            />
          </div>

          {/* ── pH + EC ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <SectionTitle sub={`${range.toUpperCase()} TRACE`}>
                pH Over Time
              </SectionTitle>
              {buckets.length < 2 ? (
                <EmptyChart
                  height={180}
                  message="Not enough data for this range"
                />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={buckets}>
                    <defs>
                      <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#4ade80"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#4ade80"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ph"
                      stroke="var(--green)"
                      fill="url(#phGrad)"
                      strokeWidth={2}
                      dot={false}
                      name="pH"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <SectionTitle sub={`${range.toUpperCase()} TRACE`}>
                EC Concentration
              </SectionTitle>
              {buckets.length < 2 ? (
                <EmptyChart
                  height={180}
                  message="Not enough data for this range"
                />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={buckets}>
                    <defs>
                      <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ec"
                      stroke="var(--amber)"
                      fill="url(#ecGrad)"
                      strokeWidth={2}
                      dot={false}
                      name="EC"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Temp + Humidity ── */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <SectionTitle sub={`${range.toUpperCase()} TRACE`}>
              Temperature & Humidity
            </SectionTitle>
            {buckets.length < 2 ? (
              <EmptyChart
                height={180}
                message="Not enough data for this range"
              />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={buckets}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                      fill: "var(--text-3)",
                      fontFamily: "DM Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 9,
                      fill: "var(--text-3)",
                      fontFamily: "DM Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tick={{
                      fontSize: 9,
                      fill: "var(--text-3)",
                      fontFamily: "DM Mono",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="temp"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                    name="Temp °C"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="humidity"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={false}
                    name="Humidity %"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Activity bar + Radar ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <SectionTitle sub="DAILY ACTIVITY">
                Sequences Logged per Day
              </SectionTitle>
              {activityData.length < 2 ? (
                <EmptyChart height={180} message="Need 2+ days of data" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={activityData} barGap={4}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="d"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      fill="#2d7a44"
                      radius={[4, 4, 0, 0]}
                      name="Sequences"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <SectionTitle sub="PARAMETER HEALTH">
                In-Range Score (%)
              </SectionTitle>
              {radarData.length < 2 ? (
                <EmptyChart height={180} message="Not enough data points" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart
                    data={radarData}
                    cx="50%"
                    cy="50%"
                    outerRadius="65%"
                  >
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="var(--green)"
                      fill="rgba(74,222,128,0.15)"
                      strokeWidth={2}
                      name="In-range %"
                    />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Crop breakdown table ── */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="p-5 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <SectionTitle sub="PER CROP">Latest Sensor Summary</SectionTitle>
            </div>
            {loading ? (
              <div className="p-8 flex justify-center">
                <span
                  className="text-xs font-mono"
                  style={{ color: "var(--text-3)" }}
                >
                  Loading…
                </span>
              </div>
            ) : dashboard.length === 0 ? (
              <div
                className="p-8 text-center text-xs font-mono"
                style={{ color: "var(--text-3)" }}
              >
                No crops in database
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      "Crop ID",
                      "Type",
                      "Stage",
                      "pH",
                      "EC",
                      "Temp",
                      "Sequences",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] font-mono"
                        style={{ color: "var(--text-3)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.map((item, i) => {
                    const p = item.payload || {};
                    const s = extractSensors(p);
                    return (
                      <tr
                        key={i}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--text)" }}
                        >
                          {p.crop_id || "—"}
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--text-2)" }}
                        >
                          {p.crop || "—"}
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--text-2)" }}
                        >
                          {p.stage || "—"}
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--green)" }}
                        >
                          {s.ph}
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--amber)" }}
                        >
                          {s.ec}
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--blue)" }}
                        >
                          {s.temp}°C
                        </td>
                        <td
                          className="px-5 py-3 font-mono text-xs"
                          style={{ color: "var(--text-2)" }}
                        >
                          {p.sequence_number || 1}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Agent activity derived from action_taken fields */}
          {agentStats.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="p-5 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <SectionTitle sub="DERIVED FROM STORED ACTIONS">
                  Agent Activity
                </SectionTitle>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      "Agent",
                      "Appearances in Log",
                      "Success Rate",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] font-mono"
                        style={{ color: "var(--text-3)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map(({ name, decisions, accuracy }) => (
                    <tr
                      key={name}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        className="px-5 py-3 font-mono text-xs"
                        style={{ color: "var(--text)" }}
                      >
                        {name}
                      </td>
                      <td
                        className="px-5 py-3 font-mono text-xs"
                        style={{ color: "var(--text-2)" }}
                      >
                        {decisions}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 w-24 rounded-full"
                            style={{ background: "var(--border)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${accuracy}%`,
                                background:
                                  accuracy > 80
                                    ? "var(--green)"
                                    : accuracy > 50
                                      ? "var(--amber)"
                                      : "var(--red)",
                              }}
                            />
                          </div>
                          <span
                            className="font-mono text-xs"
                            style={{ color: "var(--text-2)" }}
                          >
                            {accuracy}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(74,222,128,0.1)",
                            color: "var(--green)",
                            border: "1px solid rgba(74,222,128,0.2)",
                          }}
                        >
                          ONLINE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
