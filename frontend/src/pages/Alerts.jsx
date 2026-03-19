import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  X,
  Bell,
  BellOff,
  Clock,
  RefreshCw,
} from "lucide-react";
import { fetchDashboardData, fetchAllCropHistories } from "../api/farmApi";
import { extractSensors, formatOutcome } from "../utils/dataUtils";
import Sidebar from "../components/Sidebar";

function timeAgo(isoString) {
  if (!isoString) return "unknown";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

/**
 * Derive real alerts from stored Qdrant points.
 * Rules:
 *   critical  — pH < 4.5 | pH > 7.5 | EC > 3.5 | temp < 10 | temp > 35
 *               outcome contains 'fail' / 'critical' / 'disease' / 'error'
 *               action_taken contains 'DISEASE' / 'PEST' / 'FUNGAL'
 *   warning   — pH 4.5–5.4 | pH 6.6–7.5 | EC 2.5–3.5 | temp 10–17 | temp 30–35
 *               outcome contains 'deteriorat' / 'negative' / 'attention'
 *               action_taken contains 'FLUSH' / 'PRUNE' / 'BOOST'
 *   info      — completed cycles (sequence_number present), strategy changes
 */
function generateAlerts(points) {
  const alerts = [];
  let id = 1;

  for (const p of points) {
    const payload = p.payload || {};
    const s = extractSensors(payload);
    const ph = parseFloat(s.ph) || 0;
    const ec = parseFloat(s.ec) || 0;
    const temp = parseFloat(s.temp) || 0;
    const ts = payload.timestamp;
    const cropId = payload.crop_id || "UNKNOWN";
    const cropName = payload.crop || "Crop";
    const action = (payload.action_taken || "").toUpperCase();
    const outcome = (payload.outcome || "").toLowerCase();
    const strategy = (payload.strategic_intent || "").toUpperCase();
    const seq = payload.sequence_number;

    // Critical: pH
    if (ph > 0 && ph < 4.5) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "pH critically low",
        desc: `${cropName} (${cropId}): pH at ${ph} — well below safe range. Immediate base dosing required.`,
        time: timeAgo(ts),
        ts,
        agent: "WATER",
        crop: cropName,
        ack: false,
      });
    } else if (ph > 7.5) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "pH critically high",
        desc: `${cropName} (${cropId}): pH at ${ph} — far above optimal. Acid dosing required immediately.`,
        time: timeAgo(ts),
        ts,
        agent: "WATER",
        crop: cropName,
        ack: false,
      });
    }

    // Critical: EC
    if (ec > 3.5) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "EC dangerously high",
        desc: `${cropName} (${cropId}): EC at ${ec} dS/m — severe nutrient burn risk. Flush immediately.`,
        time: timeAgo(ts),
        ts,
        agent: "WATER",
        crop: cropName,
        ack: false,
      });
    }

    // Critical: Temp
    if (temp > 0 && temp < 10) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "Temperature too cold",
        desc: `${cropName} (${cropId}): Air temp at ${temp}°C — plant stress and root damage risk.`,
        time: timeAgo(ts),
        ts,
        agent: "ATMOSPHERIC",
        crop: cropName,
        ack: false,
      });
    } else if (temp > 35) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "Temperature too hot",
        desc: `${cropName} (${cropId}): Air temp at ${temp}°C — heat stress and root rot risk.`,
        time: timeAgo(ts),
        ts,
        agent: "ATMOSPHERIC",
        crop: cropName,
        ack: false,
      });
    }

    // Critical: disease keywords in outcome/action
    if (
      /disease|fungal|pest|mildew|blight|mite|rot/.test(outcome) ||
      /DISEASE|FUNGAL|PEST/.test(action)
    ) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "Disease or pest detected",
        desc: `${cropName} (${cropId}): Visual anomaly in stored record. Outcome: "${formatOutcome(payload.outcome)}"`,
        time: timeAgo(ts),
        ts,
        agent: "DOCTOR",
        crop: cropName,
        ack: false,
      });
    }

    // Critical: fail/critical outcome
    if (/fail|critical|error/.test(outcome)) {
      alerts.push({
        id: id++,
        severity: "critical",
        title: "Cycle failure recorded",
        desc: `${cropName} (${cropId}): Sequence #${seq} outcome: "${formatOutcome(payload.outcome)}"`,
        time: timeAgo(ts),
        ts,
        agent: "JUDGE",
        crop: cropName,
        ack: false,
      });
    }

    // Warning: pH mild drift
    if (ph >= 4.5 && ph < 5.5) {
      alerts.push({
        id: id++,
        severity: "warning",
        title: "pH below optimal range",
        desc: `${cropName} (${cropId}): pH at ${ph}. Target 5.5–6.5 — gentle base adjustment recommended.`,
        time: timeAgo(ts),
        ts,
        agent: "WATER",
        crop: cropName,
        ack: false,
      });
    } else if (ph > 6.6 && ph <= 7.5) {
      alerts.push({
        id: id++,
        severity: "warning",
        title: "pH above optimal range",
        desc: `${cropName} (${cropId}): pH at ${ph}. Target 5.5–6.5 — gentle acid adjustment recommended.`,
        time: timeAgo(ts),
        ts,
        agent: "WATER",
        crop: cropName,
        ack: false,
      });
    }

    // Warning: EC elevated
    if (ec >= 2.5 && ec <= 3.5) {
      alerts.push({
        id: id++,
        severity: "warning",
        title: "EC approaching high limit",
        desc: `${cropName} (${cropId}): EC at ${ec} dS/m — nutrient burn risk increasing.`,
        time: timeAgo(ts),
        ts,
        agent: "SUPERVISOR",
        crop: cropName,
        ack: false,
      });
    }

    // Warning: temp mild
    if (temp >= 10 && temp < 17) {
      alerts.push({
        id: id++,
        severity: "warning",
        title: "Temperature on the low side",
        desc: `${cropName} (${cropId}): ${temp}°C — slow growth and reduced nutrient uptake expected.`,
        time: timeAgo(ts),
        ts,
        agent: "ATMOSPHERIC",
        crop: cropName,
        ack: false,
      });
    } else if (temp >= 30 && temp <= 35) {
      alerts.push({
        id: id++,
        severity: "warning",
        title: "Temperature elevated",
        desc: `${cropName} (${cropId}): ${temp}°C — heat stress likely. Increase ventilation.`,
        time: timeAgo(ts),
        ts,
        agent: "ATMOSPHERIC",
        crop: cropName,
        ack: false,
      });
    }

    // Warning: deterioration outcome
    if (/deteriorat|negative|attention|decline/.test(outcome)) {
      alerts.push({
        id: id++,
        severity: "warning",
        title: "Condition deteriorating",
        desc: `${cropName} (${cropId}): Sequence #${seq} — "${formatOutcome(payload.outcome)}"`,
        time: timeAgo(ts),
        ts,
        agent: "JUDGE",
        crop: cropName,
        ack: false,
      });
    }

    // Info: completed cycle
    if (seq && !/fail|critical|error|deteriorat|negative/.test(outcome)) {
      alerts.push({
        id: id++,
        severity: "info",
        title: `Cycle #${seq} completed`,
        desc: `${cropName} (${cropId}): Sequence stored. ${
          strategy ? `Strategy: ${strategy}.` : ""
        } ${payload.reward_score != null ? `Reward: ${payload.reward_score}` : ""}`.trim(),
        time: timeAgo(ts),
        ts,
        agent: strategy ? "SUPERVISOR" : "JUDGE",
        crop: cropName,
        ack: true,
      });
    }
  }

  // De-duplicate: keep at most 3 alerts of same severity+title+crop
  const seen = new Map();
  const deduped = [];
  for (const a of alerts) {
    const key = `${a.severity}|${a.title}|${a.crop}`;
    const count = seen.get(key) || 0;
    if (count < 3) {
      deduped.push(a);
      seen.set(key, count + 1);
    }
  }

  // Sort: critical first, then by time descending
  deduped.sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    if (sevOrder[a.severity] !== sevOrder[b.severity])
      return sevOrder[a.severity] - sevOrder[b.severity];
    return new Date(b.ts || 0) - new Date(a.ts || 0);
  });

  return deduped;
}

// STYLES

const SEV = {
  critical: {
    icon: AlertTriangle,
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.3)",
    text: "var(--red)",
    label: "CRITICAL",
  },
  warning: {
    icon: Zap,
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    text: "var(--amber)",
    label: "WARNING",
  },
  info: {
    icon: Info,
    bg: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.25)",
    text: "var(--blue)",
    label: "INFO",
  },
};

const AGENT_COLORS = {
  WATER: "var(--blue)",
  ATMOSPHERIC: "#a78bfa",
  SUPERVISOR: "var(--green)",
  JUDGE: "var(--amber)",
  DOCTOR: "var(--red)",
  HISTORIAN: "var(--text-3)",
};

function AlertCard({ alert, onAck, onDismiss }) {
  const s = SEV[alert.severity];
  const Icon = s.icon;

  return (
    <div
      className="rounded-xl p-4 transition-all card-hover"
      style={{
        background: alert.ack ? "var(--surface)" : s.bg,
        border: `1px solid ${alert.ack ? "var(--border)" : s.border}`,
        opacity: alert.ack ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: s.bg, border: `1px solid ${s.border}` }}
        >
          <Icon size={15} style={{ color: s.text }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold text-sm"
              style={{ color: alert.ack ? "var(--text-2)" : "var(--text)" }}
            >
              {alert.title}
            </span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: s.bg,
                color: s.text,
                border: `1px solid ${s.border}`,
              }}
            >
              {s.label}
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(0,0,0,0.3)",
                color: AGENT_COLORS[alert.agent] || "var(--text-3)",
              }}
            >
              {alert.agent}
            </span>
          </div>
          <p
            className="text-xs mt-1 leading-relaxed"
            style={{ color: "var(--text-3)" }}
          >
            {alert.desc}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: "var(--text-3)" }}
            >
              <Clock size={9} /> {alert.time}
            </div>
            <div
              className="text-[10px] font-mono"
              style={{ color: "var(--text-3)" }}
            >
              Crop: {alert.crop}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!alert.ack && (
            <button
              onClick={() => onAck(alert.id)}
              title="Acknowledge"
              className="p-1.5 rounded-lg transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
              }}
            >
              <CheckCircle2 size={13} />
            </button>
          )}
          <button
            onClick={() => onDismiss(alert.id)}
            title="Dismiss"
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-3)",
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// MAIN

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAcked, setShowAcked] = useState(false);

  const load = async () => {
    setLoading(true);
    const dash = await fetchDashboardData();
    const hist = await fetchAllCropHistories(dash);
    const generated = generateAlerts(hist);
    setAlerts(generated);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const ack = (id) =>
    setAlerts((a) => a.map((al) => (al.id === id ? { ...al, ack: true } : al)));
  const dismiss = (id) => setAlerts((a) => a.filter((al) => al.id !== id));
  const ackAll = () => setAlerts((a) => a.map((al) => ({ ...al, ack: true })));

  const counts = useMemo(
    () => ({
      critical: alerts.filter((a) => a.severity === "critical" && !a.ack)
        .length,
      warning: alerts.filter((a) => a.severity === "warning" && !a.ack).length,
      info: alerts.filter((a) => a.severity === "info" && !a.ack).length,
      total: alerts.filter((a) => !a.ack).length,
    }),
    [alerts],
  );

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (!showAcked && a.ack) return false;
        if (filter !== "all" && a.severity !== filter) return false;
        return true;
      }),
    [alerts, filter, showAcked],
  );

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
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--text)" }}>
              Alerts
            </h1>
            <p className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
              {loading
                ? "Analyzing sensor history…"
                : `${counts.total} unacknowledged · ${alerts.length} total`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={load}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
              }}
              title="Reload"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowAcked(!showAcked)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
              style={{
                background: showAcked
                  ? "rgba(74,222,128,0.1)"
                  : "var(--surface)",
                border: `1px solid ${showAcked ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
                color: showAcked ? "var(--green)" : "var(--text-3)",
              }}
            >
              {showAcked ? <Bell size={12} /> : <BellOff size={12} />}
              {showAcked ? "All" : "Unacked only"}
            </button>
            <button
              onClick={ackAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
              }}
            >
              <CheckCircle2 size={12} /> Ack all
            </button>
          </div>
        </header>

        {/* Filter bar */}
        <div
          className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-3 overflow-x-auto"
          style={{ borderColor: "var(--border)", background: "var(--bg-3)" }}
        >
          {[
            { key: "all", label: "All", count: alerts.length, color: null },
            {
              key: "critical",
              label: "Critical",
              count: counts.critical,
              color: "var(--red)",
            },
            {
              key: "warning",
              label: "Warning",
              count: counts.warning,
              color: "var(--amber)",
            },
            {
              key: "info",
              label: "Info",
              count: counts.info,
              color: "var(--blue)",
            },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono flex-shrink-0 transition-all"
              style={{
                background: filter === key ? "var(--surface-2)" : "transparent",
                border: `1px solid ${filter === key ? "var(--border-bright)" : "transparent"}`,
                color:
                  filter === key ? color || "var(--text)" : "var(--text-3)",
              }}
            >
              {count > 0 && (
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                  style={{
                    background: color ? `${color}30` : "var(--border)",
                    color: color || "var(--text-3)",
                  }}
                >
                  {count}
                </span>
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3 max-w-2xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl shimmer"
                  style={{ border: "1px solid var(--border)" }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <CheckCircle2 size={28} style={{ color: "var(--green)" }} />
              </div>
              <div style={{ color: "var(--text-2)" }}>
                {alerts.length === 0
                  ? "No data loaded — connect your farm and run some cycles"
                  : "All clear for the selected filter"}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {/* Unacked */}
              {filtered.filter((a) => !a.ack).length > 0 && (
                <div>
                  <div
                    className="text-[10px] font-mono mb-3"
                    style={{ color: "var(--text-3)" }}
                  >
                    UNACKNOWLEDGED · {filtered.filter((a) => !a.ack).length}
                  </div>
                  <div className="space-y-2">
                    {filtered
                      .filter((a) => !a.ack)
                      .map((a) => (
                        <AlertCard
                          key={a.id}
                          alert={a}
                          onAck={ack}
                          onDismiss={dismiss}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Acked */}
              {showAcked && filtered.filter((a) => a.ack).length > 0 && (
                <div className="mt-6">
                  <div
                    className="text-[10px] font-mono mb-3"
                    style={{ color: "var(--text-3)" }}
                  >
                    ACKNOWLEDGED · {filtered.filter((a) => a.ack).length}
                  </div>
                  <div className="space-y-2">
                    {filtered
                      .filter((a) => a.ack)
                      .map((a) => (
                        <AlertCard
                          key={a.id}
                          alert={a}
                          onAck={ack}
                          onDismiss={dismiss}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
