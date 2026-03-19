import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  ArrowRight,
  Cpu,
  Database,
  Eye,
  Zap,
  Activity,
} from "lucide-react";
import { fetchDashboardData } from "../api/farmApi";
import { extractSensors } from "../utils/dataUtils";

const FEATURES = [
  {
    icon: Cpu,
    label: "Reinforcement Learning",
    desc: "Contextual bandit that learns with every cycle",
  },
  {
    icon: Eye,
    label: "Computer Vision",
    desc: "Azure CV-powered disease detection",
  },
  {
    icon: Database,
    label: "Vector Memory",
    desc: "Qdrant-backed long-term plant biographies",
  },
  {
    icon: Zap,
    label: "Physics Simulation",
    desc: "LLM-based digital twin before every action",
  },
];

// Compute fleet-wide averages from dashboard data
function computeFleetStats(dashData) {
  if (!dashData?.length) return null;
  const sensors = dashData.map((d) => extractSensors(d.payload));
  const avg = (arr) =>
    arr.reduce((s, v) => s + parseFloat(v || 0), 0) / arr.length;

  const ph = avg(sensors.map((s) => s.ph));
  const ec = avg(sensors.map((s) => s.ec));
  const temp = avg(sensors.map((s) => s.temp));
  const humidity = avg(sensors.map((s) => s.humidity));

  const totalSeqs = dashData.reduce(
    (s, d) => s + (d.payload?.sequence_number || 0),
    0,
  );
  const cropTypes = [
    ...new Set(dashData.map((d) => d.payload?.crop).filter(Boolean)),
  ];

  // Any active alert conditions?
  const alerts = sensors.filter(
    (s) =>
      parseFloat(s.ph) < 5.5 ||
      parseFloat(s.ph) > 6.5 ||
      parseFloat(s.ec) > 2.5 ||
      parseFloat(s.temp) > 30 ||
      parseFloat(s.temp) < 15,
  ).length;

  return {
    ph: ph.toFixed(2),
    ec: ec.toFixed(2),
    temp: temp.toFixed(1),
    humidity: humidity.toFixed(1),
    cropCount: dashData.length,
    totalSeqs,
    cropTypes,
    alerts,
  };
}

// Build a real activity log from the last N payloads
function buildActivityLog(dashData) {
  if (!dashData?.length) return [];
  return dashData
    .slice(-5)
    .reverse()
    .map((d, i) => {
      const p = d.payload || {};
      const agent = (p.strategic_intent || "SUPERVISOR")
        .replace(/_/g, " ")
        .split(" ")[0];
      const msg = p.strategic_intent
        ? `Strategy: ${p.strategic_intent.replace(/_/g, " ")}`
        : `Monitoring ${p.crop || "crop"} — seq #${p.sequence_number || 1}`;
      const ts = p.timestamp
        ? new Date(p.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : `0${i}:0${i}`;
      return { agent, msg, time: ts };
    });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData().then((data) => {
      setStats(computeFleetStats(data));
      setLog(buildActivityLog(data));
      setLoading(false);
    });
  }, []);

  // Headline stats derived from real data, with friendly fallbacks
  const headlineStats = stats
    ? [
        { val: stats.cropCount.toString(), label: "Active Crops" },
        { val: stats.cropTypes.length.toString(), label: "Crop Types" },
        { val: stats.totalSeqs.toString(), label: "Total Cycles" },
        {
          val: stats.alerts > 0 ? stats.alerts.toString() : "0",
          label: "Active Alerts",
        },
      ]
    : [
        { val: "—", label: "Active Crops" },
        { val: "—", label: "Crop Types" },
        { val: "—", label: "Total Cycles" },
        { val: "—", label: "Active Alerts" },
      ];

  // Live sensor readings from real data
  const readings = stats
    ? [
        {
          label: "AVG pH",
          value: stats.ph,
          ok: parseFloat(stats.ph) >= 5.5 && parseFloat(stats.ph) <= 6.5,
        },
        {
          label: "AVG EC",
          value: `${stats.ec}`,
          ok: parseFloat(stats.ec) <= 2.5,
        },
        {
          label: "TEMP",
          value: `${stats.temp}°C`,
          ok: parseFloat(stats.temp) >= 18 && parseFloat(stats.temp) <= 30,
        },
        {
          label: "HUMIDITY",
          value: `${stats.humidity}%`,
          ok:
            parseFloat(stats.humidity) >= 40 &&
            parseFloat(stats.humidity) <= 80,
        },
      ]
    : [
        { label: "AVG pH", value: "—", ok: true },
        { label: "AVG EC", value: "—", ok: true },
        { label: "TEMP", value: "—", ok: true },
        { label: "HUMIDITY", value: "—", ok: true },
      ];

  return (
    <div
      className="min-h-screen grid-bg relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div className="scanline" />

      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(74,222,128,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-8 py-5 border-b"
        style={{ borderColor: "rgba(74,222,128,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a5c2d, #4ade80)" }}
          >
            <Leaf size={18} fill="white" color="white" />
          </div>
          <div>
            <div
              className="font-bold text-base tracking-tight"
              style={{ color: "var(--text)" }}
            >
              DEMETER
            </div>
            <div
              className="text-[9px] font-mono tracking-[0.2em]"
              style={{ color: "var(--text-3)" }}
            >
              AUTONOMOUS FARM INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-full"
            style={{
              border: "1px solid rgba(74,222,128,0.3)",
              color: "var(--green)",
              background: "rgba(74,222,128,0.05)",
            }}
          >
            <span
              className="status-dot w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--green)" }}
            />
            {loading ? "CONNECTING…" : stats ? "FARM ONLINE" : "NO DATA"}
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "var(--surface)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
            }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div
            className={`space-y-8 ${mounted ? "animate-fade-up" : "opacity-0"}`}
          >
            <div
              className="inline-flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-full"
              style={{
                border: "1px solid rgba(245,158,11,0.4)",
                color: "var(--amber)",
                background: "rgba(245,158,11,0.06)",
              }}
            >
              <Zap size={10} fill="currentColor" />
              MULTI-AGENT SYSTEM · LANGGRAPH · QDRANT
            </div>

            <h1
              className="text-6xl lg:text-7xl font-bold leading-[1.0] tracking-tight"
              style={{ color: "var(--text)" }}
            >
              The Farm
              <br />
              <span
                className="font-serif italic"
                style={{ color: "var(--green)" }}
              >
                Thinks
              </span>
              <br />
              For Itself.
            </h1>

            <p
              className="text-lg leading-relaxed max-w-md"
              style={{ color: "var(--text-2)", fontWeight: 300 }}
            >
              Demeter is a cognitive hydroponic system. Seven specialized AI
              agents collaborate to perceive, reason, and act — optimizing your
              crops 24/7 without human intervention.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="group flex items-center gap-3 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all glow-green"
                style={{ background: "var(--green)", color: "#0c1a0e" }}
              >
                Enter Dashboard
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
              <button
                onClick={() => navigate("/control")}
                className="flex items-center gap-3 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-2)",
                  background: "var(--surface)",
                }}
              >
                <Cpu size={16} />
                Agent Control
              </button>
            </div>

            {/* Live headline stats from DB */}
            <div
              className="grid grid-cols-4 gap-4 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {headlineStats.map(({ val, label }) => (
                <div key={label}>
                  <div
                    className="text-2xl font-bold font-mono"
                    style={{ color: "var(--green)" }}
                  >
                    {loading ? (
                      <span className="inline-block w-8 h-6 rounded shimmer" />
                    ) : (
                      val
                    )}
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: "var(--text-3)" }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — live HUD */}
          <div
            className={`relative ${mounted ? "animate-fade-in" : "opacity-0"}`}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-2)",
              }}
            >
              {/* Terminal header */}
              <div
                className="flex items-center gap-2 px-4 py-3 border-b"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-3)",
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#ff5f57" }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#ffbd2e" }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#28ca41" }}
                />
                <span
                  className="ml-2 text-[11px] font-mono"
                  style={{ color: "var(--text-3)" }}
                >
                  demeter://live-feed
                </span>
                <Activity
                  size={11}
                  className="ml-auto"
                  style={{ color: "var(--green)" }}
                />
              </div>

              <div className="p-6 space-y-5">
                {/* Live sensor grid */}
                <div className="grid grid-cols-2 gap-3">
                  {readings.map(({ label, value, ok }) => (
                    <div
                      key={label}
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="text-[10px] font-mono mb-2"
                        style={{ color: "var(--text-3)" }}
                      >
                        {label}
                      </div>
                      {loading ? (
                        <div className="h-7 w-16 rounded shimmer" />
                      ) : (
                        <div
                          className="text-2xl font-mono font-bold"
                          style={{ color: ok ? "var(--green)" : "var(--red)" }}
                        >
                          {value}
                        </div>
                      )}
                      <div
                        className="text-[9px] font-mono mt-1"
                        style={{
                          color: ok
                            ? "rgba(74,222,128,0.6)"
                            : "rgba(248,113,113,0.6)",
                        }}
                      >
                        {ok ? "● OPTIMAL" : "● ALERT"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agent activity feed */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="text-[10px] font-mono mb-3"
                    style={{ color: "var(--text-3)" }}
                  >
                    RECENT AGENT ACTIVITY
                  </div>
                  <div className="space-y-2">
                    {loading ? (
                      [1, 2, 3].map((i) => (
                        <div key={i} className="h-4 rounded shimmer" />
                      ))
                    ) : log.length > 0 ? (
                      log.slice(0, 3).map(({ agent, msg, time }, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 text-[11px] font-mono"
                        >
                          <span style={{ color: "var(--green)", opacity: 0.6 }}>
                            {time}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px]"
                            style={{
                              background: "rgba(74,222,128,0.12)",
                              color: "var(--green)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {agent.substring(0, 12)}
                          </span>
                          <span style={{ color: "var(--text-2)" }}>
                            {msg.substring(0, 40)}
                            {msg.length > 40 ? "…" : ""}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div
                        className="text-[11px] font-mono"
                        style={{ color: "var(--text-3)" }}
                      >
                        No cycles recorded yet. Run the agent loop to see
                        activity.
                      </div>
                    )}
                    <div
                      className="flex items-center gap-1 text-[11px] font-mono cursor-blink"
                      style={{ color: "var(--green)" }}
                    >
                      <span style={{ opacity: 0.4 }}>→ </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live crop count chip */}
            {stats && (
              <div
                className="absolute -top-4 -right-4 px-3 py-2 rounded-lg text-[11px] font-mono"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--amber)",
                }}
              >
                ⬆ {stats.cropCount} crop{stats.cropCount !== 1 ? "s" : ""}{" "}
                monitored
              </div>
            )}
          </div>
        </div>

        {/* Feature grid */}
        <div
          className="mt-24 pt-12 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="text-[11px] font-mono mb-8"
            style={{ color: "var(--text-3)" }}
          >
            // CORE CAPABILITIES
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-5 rounded-xl card-hover"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  <Icon size={18} style={{ color: "var(--green)" }} />
                </div>
                <div
                  className="font-semibold text-sm mb-1"
                  style={{ color: "var(--text)" }}
                >
                  {label}
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-3)" }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
