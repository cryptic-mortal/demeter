import { useRef, useState } from "react";
import {
  Activity,
  Mic,
  Square,
  Brain,
  Search,
  Sparkles,
  ChevronRight,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
  Droplets,
  Thermometer,
  Wind,
  BookOpen,
} from "lucide-react";
import { agentService } from "../api/agentApi";
import { extractSensors } from "../utils/dataUtils";
import {
  AgentActionWidget,
  AgentOutcomeWidget,
} from "../components/AgentWidgets";
import Sidebar from "../components/Sidebar";
import { useFarmData } from "../hooks/useFarmData";
import { deriveCropStatus } from "../utils/dataUtils";

// Suggestion chips
const SUGGESTIONS = [
  "Show all Lettuce crops",
  "Which crops are in flowering stage?",
  "Find crops with negative outcomes",
  "List recent critical failures",
  "Show Tomato batches",
  "Find crops with high EC readings",
];

// INSIGHTS
function InsightCard({ result, idx }) {
  const p = result.payload || {};
  const s = extractSensors(p);
  const status = deriveCropStatus(p);

  const statusColors = {
    Healthy: {
      color: "var(--green)",
      bg: "rgba(74,222,128,0.1)",
      border: "rgba(74,222,128,0.25)",
    },
    Attention: {
      color: "var(--amber)",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.25)",
    },
    Critical: {
      color: "var(--red)",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.25)",
    },
  };
  const sc = statusColors[status] || statusColors.Healthy;

  return (
    <div
      className="card-hover animate-fade-up"
      style={{
        borderRadius: 14,
        padding: 18,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        animationDelay: `${idx * 60}ms`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
            {p.crop || "Unknown"}
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: "DM Mono, monospace",
              color: "var(--text-3)",
              marginTop: 2,
            }}
          >
            {p.crop_id || "—"} · Seq #{p.sequence_number || 1}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: "DM Mono, monospace",
              padding: "3px 8px",
              borderRadius: 20,
              background: sc.bg,
              color: sc.color,
              border: `1px solid ${sc.border}`,
            }}
          >
            {status.toUpperCase()}
          </span>
          {p.stage && (
            <span
              style={{
                fontSize: 9,
                fontFamily: "DM Mono, monospace",
                padding: "2px 7px",
                borderRadius: 4,
                background: "var(--bg-3)",
                color: "var(--text-3)",
                border: "1px solid var(--border)",
              }}
            >
              {p.stage}
            </span>
          )}
        </div>
      </div>

      {/* Sensors */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          { icon: Droplets, label: "pH", value: s.ph, color: "var(--green)" },
          { icon: Activity, label: "EC", value: s.ec, color: "var(--amber)" },
          {
            icon: Thermometer,
            label: "Temp",
            value: s.temp + "°",
            color: "var(--blue)",
          },
          {
            icon: Wind,
            label: "Humidity",
            value: s.humidity + "%",
            color: "#a78bfa",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            style={{
              borderRadius: 8,
              padding: "7px 8px",
              textAlign: "center",
              background: "var(--bg-3)",
            }}
          >
            <Icon
              size={10}
              style={{ color, margin: "0 auto 3px", display: "block" }}
            />
            <div className="sensor-label" style={{ marginBottom: 2 }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "DM Mono, monospace",
                color,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Outcome */}
      {p.outcome && p.outcome !== "PENDING_OBSERVATION" && (
        <AgentOutcomeWidget
          outcome={p.outcome}
          rewardScore={p.reward_score}
          strategicIntent={p.strategic_intent}
        />
      )}

      {/* Last action */}
      {p.action_taken && p.action_taken !== "PENDING_ACTION" && (
        <div style={{ marginTop: 12 }}>
          <div
            className="section-label"
            style={{ fontSize: 9, marginBottom: 8 }}
          >
            LAST COMMAND
          </div>
          <AgentActionWidget actionTaken={p.action_taken} compact />
        </div>
      )}
    </div>
  );
}

// FLEET SUMMARY
function FleetStat({ label, value, color, icon: Icon }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 18px",
        borderRadius: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "DM Mono, monospace",
            color,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// MAIN
export default function FarmIntelligence() {
  const [textQuery, setTextQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [transcription, setTranscription] = useState("");
  const [hasQueried, setHasQueried] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [showExplain, setShowExplain] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [toast, setToast] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const { dashboard } = useFarmData();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fleetStats = {
    total: dashboard?.length || 0,
    healthy: (dashboard || []).filter(
      (d) => deriveCropStatus(d.payload) === "Healthy",
    ).length,
    attention: (dashboard || []).filter(
      (d) => deriveCropStatus(d.payload) === "Attention",
    ).length,
    critical: (dashboard || []).filter(
      (d) => deriveCropStatus(d.payload) === "Critical",
    ).length,
  };

  const handleQuery = async (q) => {
    const query = q || textQuery;
    if (!query.trim()) return;
    setLoading(true);
    setHasQueried(true);
    setTextQuery(query);
    setResults([]);
    setExplanation("");
    try {
      const data = await agentService.queryText(query);
      if (data.results) {
        setResults(
          data.results.map((r) => ({
            id: r.id,
            score: r.score || 1,
            payload: r.payload,
          })),
        );
      }
    } catch {
      showToast("Query failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLoading(true);
        try {
          const data = await agentService.queryAudio(blob);
          if (data.transcription) {
            setTranscription(data.transcription);
            setTextQuery(data.transcription);
          }
          if (data.results) {
            setResults(
              data.results.map((r) => ({
                id: r.id,
                score: r.score || 1,
                payload: r.payload,
              })),
            );
            setHasQueried(true);
          }
        } finally {
          setLoading(false);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      showToast("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <Sidebar />

      {toast && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 50,
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontFamily: "DM Mono, monospace",
            background:
              toast.type === "error"
                ? "rgba(248,113,113,0.15)"
                : "rgba(74,222,128,0.15)",
            border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.4)" : "rgba(74,222,128,0.4)"}`,
            color: toast.type === "error" ? "var(--red)" : "var(--green)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <header
          style={{
            flexShrink: 0,
            padding: "0 24px",
            height: 64,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-2)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="page-title">Farm Intelligence</h1>
            <p className="page-subtitle">
              Query your crops · Explore patterns · Ask anything
            </p>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Fleet summary */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <FleetStat
              label="Total Crops"
              value={fleetStats.total}
              color="var(--text-2)"
              icon={Database}
            />
            <FleetStat
              label="Healthy"
              value={fleetStats.healthy}
              color="var(--green)"
              icon={TrendingUp}
            />
            <FleetStat
              label="Needs Attention"
              value={fleetStats.attention}
              color="var(--amber)"
              icon={Minus}
            />
            <FleetStat
              label="Critical"
              value={fleetStats.critical}
              color="var(--red)"
              icon={TrendingDown}
            />
          </div>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 8,
              borderRadius: 14,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                flexShrink: 0,
                cursor: "pointer",
                background: isRecording
                  ? "rgba(248,113,113,0.15)"
                  : "var(--bg-3)",
                border: `1px solid ${isRecording ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
                color: isRecording ? "var(--red)" : "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isRecording ? <Square size={14} /> : <Mic size={14} />}
            </button>
            <input
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              placeholder="Ask anything — 'Show all Tomato crops', 'Which batches are critical?', 'Find failed cycles'…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontFamily: "DM Mono, monospace",
                color: "var(--text)",
                caretColor: "#a78bfa",
              }}
            />
            <button
              onClick={() => handleQuery()}
              disabled={loading}
              style={{
                padding: "8px 22px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: loading ? "var(--bg-3)" : "#a78bfa",
                color: loading ? "var(--text-3)" : "#1a0a2e",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              {loading ? (
                <Activity size={13} className="animate-spin" />
              ) : (
                "Search"
              )}
            </button>
          </div>

          {/* Transcription badge */}
          {transcription && (
            <div
              className="animate-fade-in"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
                fontSize: 12,
                fontFamily: "DM Mono, monospace",
                color: "#a78bfa",
              }}
            >
              🎙 Heard: "{transcription}"
            </div>
          )}

          {/* Suggestion chips */}
          {!hasQueried && (
            <div>
              <div className="section-label">QUICK QUERIES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleQuery(s)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontFamily: "DM Mono, monospace",
                      cursor: "pointer",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(167,139,250,0.4)";
                      e.currentTarget.style.color = "#a78bfa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-2)";
                    }}
                  >
                    <Search size={10} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))",
                gap: 14,
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shimmer"
                  style={{
                    height: 200,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && hasQueried && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="section-label" style={{ margin: 0 }}>
                  {results.length > 0
                    ? `${results.length} RESULT${results.length !== 1 ? "S" : ""} FOUND`
                    : "NO RESULTS"}
                </div>
                {results.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "DM Mono, monospace",
                      color: "var(--text-3)",
                    }}
                  >
                    for "{textQuery}"
                  </span>
                )}
                {results.length > 0 && (
                  <button
                    onClick={() => setShowExplain(!showExplain)}
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontFamily: "DM Mono, monospace",
                      padding: "4px 10px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-3)",
                    }}
                  >
                    <BookOpen size={11} /> {showExplain ? "Hide" : "View"} query
                    logic
                  </button>
                )}
              </div>

              {/* Show query interpretation */}
              {showExplain && explanation && (
                <div
                  className="animate-fade-in"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "var(--bg-3)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="section-label">
                    SUPERVISOR QUERY INTERPRETATION
                  </div>
                  <pre
                    style={{
                      fontSize: 12,
                      fontFamily: "DM Mono, monospace",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      color: "var(--text-2)",
                      margin: 0,
                    }}
                  >
                    {explanation}
                  </pre>
                </div>
              )}

              {results.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 48,
                    gap: 16,
                    borderRadius: 14,
                    background: "var(--surface)",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: "var(--bg-3)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Brain size={22} style={{ color: "var(--text-3)" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-2)",
                      }}
                    >
                      No crops matched
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-3)",
                        marginTop: 6,
                      }}
                    >
                      Try a different query or add crops from the Dashboard.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    {SUGGESTIONS.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleQuery(s)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontFamily: "DM Mono, monospace",
                          cursor: "pointer",
                          background: "var(--bg-3)",
                          border: "1px solid var(--border)",
                          color: "var(--text-3)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))",
                    gap: 14,
                  }}
                >
                  {results.map((r, i) => (
                    <InsightCard key={r.id} result={r} idx={i} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Empty state before first query */}
          {!hasQueried && !loading && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 48,
                gap: 20,
                minHeight: 200,
                borderRadius: 16,
                background: "var(--surface)",
                border: "1px dashed var(--border)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={28} style={{ color: "#a78bfa" }} />
              </div>
              <div style={{ textAlign: "center", maxWidth: 380 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--text)",
                  }}
                >
                  Ask Demeter anything about your farm
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-3)",
                    marginTop: 8,
                    lineHeight: 1.6,
                  }}
                >
                  Use natural language — English, Hindi, or Hinglish — to search
                  your crop database. The AI Supervisor translates your query
                  into precise filters.
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {[
                  "Show all crops",
                  "Find critical plants",
                  "Tomato flowering stage",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleQuery(s)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontFamily: "DM Mono, monospace",
                      cursor: "pointer",
                      background: "rgba(167,139,250,0.08)",
                      border: "1px solid rgba(167,139,250,0.2)",
                      color: "#a78bfa",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <ChevronRight size={10} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
