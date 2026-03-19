import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchCropDetails } from "../api/farmApi";
import {
  ArrowLeft,
  Thermometer,
  Droplet,
  Wind,
  Zap,
  Activity,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  extractSensors,
  parsePythonString,
  formatNumber,
  formatOutcome,
} from "../utils/dataUtils";
import Sidebar from "../components/Sidebar";

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

function StatBox({ icon: Icon, label, value, color, unit }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon size={13} style={{ color }} />
        </div>
        <span
          className="text-[10px] font-mono uppercase"
          style={{ color: "var(--text-3)" }}
        >
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>
        {value}
        <span
          className="text-sm font-normal ml-0.5"
          style={{ color: "var(--text-3)" }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

export default function CropDetails() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchCropDetails(cropId).then((data) => {
      if (data?.length) {
        const sorted = [...data].sort(
          (a, b) =>
            (a.payload?.sequence_number || 0) -
            (b.payload?.sequence_number || 0),
        );
        const processed = sorted.map((item) => {
          const p = item.payload || {};
          const sensors = extractSensors(p);
          return {
            ...item,
            cleanSensors: sensors,
            parsedAction: parsePythonString(p.action_taken),
          };
        });
        setHistory(processed);
        setLatest(processed[processed.length - 1]);
      }
      setLoading(false);
    });
  }, [cropId]);

  if (loading)
    return (
      <div className="flex h-screen" style={{ background: "var(--bg)" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
            Loading crop data…
          </div>
        </div>
      </div>
    );

  if (!latest)
    return (
      <div className="flex h-screen" style={{ background: "var(--bg)" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div style={{ color: "var(--text-3)" }}>Crop not found</div>
        </div>
      </div>
    );

  const p = latest.payload || {};
  const sensors = latest.cleanSensors || {};

  const chartData = history.map((h) => ({
    t: h.payload?.timestamp
      ? new Date(h.payload.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--",
    temp: formatNumber(h.cleanSensors?.temp),
    ph: formatNumber(h.cleanSensors?.ph),
    ec: formatNumber(h.cleanSensors?.ec),
    humidity: formatNumber(h.cleanSensors?.humidity),
  }));

  const TABS = ["overview", "sensors", "log"];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex-shrink-0 px-6 py-4 border-b flex items-center gap-4"
          style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-3)",
            }}
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1
              className="font-bold text-base"
              style={{ color: "var(--text)" }}
            >
              {p.crop || "Unknown"}{" "}
              <span style={{ color: "var(--text-3)" }}>
                #{p.sequence_number || 0}
              </span>
            </h1>
            <p
              className="text-[11px] font-mono"
              style={{ color: "var(--text-3)" }}
            >
              {cropId} · {p.stage}
            </p>
          </div>

          {/* Status */}
          <div
            className="flex items-center gap-1.5 ml-4 px-3 py-1.5 rounded-full text-[11px] font-mono"
            style={{
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.25)",
              color: "var(--green)",
            }}
          >
            <span
              className="status-dot w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--green)" }}
            />
            LIVE
          </div>

          {/* Tabs */}
          <div className="ml-auto flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono capitalize transition-all"
                style={{
                  background:
                    activeTab === tab ? "var(--surface-2)" : "transparent",
                  color: activeTab === tab ? "var(--text)" : "var(--text-3)",
                  border: `1px solid ${activeTab === tab ? "var(--border-bright)" : "transparent"}`,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "overview" && (
            <>
              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox
                  icon={Thermometer}
                  label="Temperature"
                  value={formatNumber(sensors.temp)}
                  unit="°C"
                  color="var(--blue)"
                />
                <StatBox
                  icon={Droplet}
                  label="pH Level"
                  value={formatNumber(sensors.ph)}
                  unit=""
                  color="var(--green)"
                />
                <StatBox
                  icon={Activity}
                  label="EC"
                  value={formatNumber(sensors.ec)}
                  unit="dS/m"
                  color="var(--amber)"
                />
                <StatBox
                  icon={Wind}
                  label="Humidity"
                  value={formatNumber(sensors.humidity)}
                  unit="%"
                  color="#a78bfa"
                />
              </div>

              {/* Main chart */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-[10px] font-mono mb-4"
                  style={{ color: "var(--text-3)" }}
                >
                  // HISTORICAL pH TRACE
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="phGrad2" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="t"
                      tick={{
                        fontSize: 9,
                        fill: "var(--text-3)",
                        fontFamily: "DM Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[5, 7.5]}
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
                      fill="url(#phGrad2)"
                      strokeWidth={2}
                      dot={false}
                      name="pH"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* AI Analysis */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-[10px] font-mono mb-3"
                  style={{ color: "var(--text-3)" }}
                >
                  // LATEST AI ANALYSIS
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.2)",
                    }}
                  >
                    <Zap size={14} style={{ color: "var(--green)" }} />
                  </div>
                  <div
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-2)" }}
                  >
                    {formatOutcome(p.outcome) ||
                      "System monitoring active. No anomalies detected."}
                  </div>
                </div>
                {p.action_taken && p.action_taken !== "PENDING_ACTION" && (
                  <div
                    className="mt-3 p-3 rounded-lg font-mono text-xs"
                    style={{
                      background: "var(--bg-3)",
                      border: "1px solid var(--border)",
                      color: "var(--text-3)",
                    }}
                  >
                    <span style={{ color: "var(--green)" }}>ACTION: </span>
                    {p.action_taken?.substring(0, 200)}...
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "sensors" && (
            <div className="space-y-6">
              {/* Temp + Humidity */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-[10px] font-mono mb-4"
                  style={{ color: "var(--text-3)" }}
                >
                  // TEMP & HUMIDITY
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
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
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={false}
                      name="Temp °C"
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={false}
                      name="Humidity %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* EC */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-[10px] font-mono mb-4"
                  style={{ color: "var(--text-3)" }}
                >
                  // EC CONCENTRATION
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="ecGrad2" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="t"
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
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="ec"
                      stroke="var(--amber)"
                      fill="url(#ecGrad2)"
                      strokeWidth={2}
                      dot={false}
                      name="EC dS/m"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "log" && (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="p-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="text-[10px] font-mono"
                  style={{ color: "var(--text-3)" }}
                >
                  // EVENT LOG — {history.length} ENTRIES
                </div>
              </div>
              <div
                className="divide-y"
                style={{ borderColor: "var(--border)" }}
              >
                {[...history]
                  .reverse()
                  .slice(0, 20)
                  .map((h, i) => (
                    <div
                      key={i}
                      className="flex gap-4 px-5 py-3 hover:bg-opacity-50 transition-colors"
                      style={{
                        background:
                          i % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.01)",
                      }}
                    >
                      <div
                        className="flex items-center gap-1 text-[10px] font-mono flex-shrink-0 w-16"
                        style={{ color: "var(--text-3)" }}
                      >
                        <Clock size={9} />
                        {h.payload?.timestamp
                          ? new Date(h.payload.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "--"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-mono"
                          style={{ color: "var(--text-2)" }}
                        >
                          pH {formatNumber(h.cleanSensors?.ph)} ·{" "}
                          {formatNumber(h.cleanSensors?.temp)}°C · EC{" "}
                          {formatNumber(h.cleanSensors?.ec)}
                        </div>
                        <div
                          className="text-[11px] mt-0.5 truncate"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatOutcome(h.payload?.outcome) ||
                            h.payload?.action_taken ||
                            "Routine check"}
                        </div>
                      </div>
                      <div
                        className="text-[10px] font-mono flex-shrink-0"
                        style={{ color: "var(--text-3)" }}
                      >
                        #{h.payload?.sequence_number || i}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
