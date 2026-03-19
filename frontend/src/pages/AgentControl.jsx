import { useRef, useState } from "react";
import {
  Upload,
  Save,
  Activity,
  Droplets,
  Thermometer,
  Wind,
  Sprout,
  Calendar,
  Leaf,
  Database,
  Mic,
  Square,
  Zap,
  Fan,
  FlaskConical,
  Waves,
  Brain,
  ChevronDown,
  Eye,
} from "lucide-react";
import { agentService } from "../api/agentApi";
import { extractSensors, formatOutcome } from "../utils/dataUtils";
import Sidebar from "../components/Sidebar";

const INPUT_FIELDS = [
  {
    label: "pH Level",
    name: "pH",
    icon: Droplets,
    color: "var(--green)",
    type: "number",
  },
  {
    label: "EC (mS/cm)",
    name: "EC",
    icon: Activity,
    color: "var(--amber)",
    type: "number",
  },
  {
    label: "Temp (°C)",
    name: "temp",
    icon: Thermometer,
    color: "var(--blue)",
    type: "number",
  },
  {
    label: "Humidity (%)",
    name: "humidity",
    icon: Wind,
    color: "#a78bfa",
    type: "number",
  },
  {
    label: "Crop",
    name: "crop",
    icon: Sprout,
    color: "var(--green)",
    type: "select",
    opts: ["Lettuce", "Tomato", "Cucumber", "Basil", "Spinach"],
  },
  {
    label: "Stage",
    name: "stage",
    icon: Calendar,
    color: "var(--text-3)",
    type: "select",
    opts: ["Seedling", "Vegetative", "Flowering", "Fruiting"],
  },
];

const ACTION_MAP = {
  acid_dosage_ml: {
    label: "Acid Dosage",
    icon: FlaskConical,
    unit: "ml",
    color: "var(--red)",
  },
  base_dosage_ml: {
    label: "Base Dosage",
    icon: FlaskConical,
    unit: "ml",
    color: "#a78bfa",
  },
  nutrient_dosage_ml: {
    label: "Nutrients",
    icon: Sprout,
    unit: "ml",
    color: "var(--green)",
  },
  fan_speed_pct: {
    label: "Fan Speed",
    icon: Fan,
    unit: "%",
    color: "var(--blue)",
  },
  water_refill_l: {
    label: "Water Refill",
    icon: Waves,
    unit: "L",
    color: "var(--blue)",
  },
};

export default function AgentControl() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loadingIngest, setLoadingIngest] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [textQuery, setTextQuery] = useState("");

  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [decision, setDecision] = useState(null);
  const [toast, setToast] = useState(null);

  const [sensors, setSensors] = useState({
    pH: "6.0",
    EC: "1.2",
    temp: "24.0",
    humidity: "60",
    crop: "Lettuce",
    stage: "Vegetative",
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
      setDecision(null);
    }
  };

  const handleIngest = async () => {
    if (!file) return showToast("Select an image first", "error");
    setLoadingIngest(true);
    try {
      await agentService.uploadFMU(file, sensors);
      showToast("Memory stored successfully");
    } catch {
      showToast("Ingest failed", "error");
    } finally {
      setLoadingIngest(false);
    }
  };

  const handleSearch = async () => {
    if (!file) return showToast("Select an image to analyze", "error");
    setLoadingSearch(true);
    setDecision(null);
    try {
      const res = await agentService.searchFMU(file, sensors);
      if (res.explanation) setExplanationText(res.explanation);
      if (res.agent_decision) setDecision(res.agent_decision);
      setSearchResults(res.search_results || []);
    } catch {
      showToast("Analysis failed", "error");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleTextQuery = async () => {
    if (!textQuery) return;
    setLoadingSearch(true);
    try {
      const data = await agentService.queryText(textQuery);
      if (data.results)
        setSearchResults(
          data.results.map((r) => ({
            id: r.id,
            score: r.score || 1,
            payload: r.payload,
          })),
        );
    } catch {
      showToast("Query failed", "error");
    } finally {
      setLoadingSearch(false);
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
        setLoadingSearch(true);
        try {
          const data = await agentService.queryAudio(blob);
          if (data.transcription) setTextQuery(data.transcription);
          if (data.results)
            setSearchResults(
              data.results.map((r) => ({
                id: r.id,
                score: r.score || 1,
                payload: r.payload,
              })),
            );
        } finally {
          setLoadingSearch(false);
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
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-mono animate-fade-in"
          style={{
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

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex-shrink-0 px-6 py-4 border-b flex items-center gap-3"
          style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.2)",
            }}
          >
            <Brain size={15} style={{ color: "var(--green)" }} />
          </div>
          <div>
            <h1
              className="font-bold text-base"
              style={{ color: "var(--text)" }}
            >
              Agent Control
            </h1>
            <p
              className="text-[11px] font-mono"
              style={{ color: "var(--text-3)" }}
            >
              Ingest memories · Query the Supervisor · Run analysis
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Search bar */}
          <div
            className="flex gap-2 mb-6 p-2 rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className="p-2 rounded-lg transition-all"
              style={{
                background: isRecording
                  ? "rgba(248,113,113,0.15)"
                  : "var(--bg-3)",
                border: `1px solid ${isRecording ? "rgba(248,113,113,0.4)" : "var(--border)"}`,
                color: isRecording ? "var(--red)" : "var(--text-3)",
              }}
            >
              {isRecording ? <Square size={14} /> : <Mic size={14} />}
            </button>
            <input
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextQuery()}
              placeholder="Ask Demeter: 'Show all failed Lettuce crops'…"
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono px-2"
              style={{ color: "var(--text)", caretColor: "var(--green)" }}
            />
            <button
              onClick={handleTextQuery}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "var(--green)", color: "#0c1a0e" }}
            >
              Ask
            </button>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Image upload */}
            <div className="lg:col-span-2">
              <label
                className="relative block rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  height: 320,
                  background: "var(--surface)",
                  border: "2px dashed var(--border)",
                }}
              >
                <input
                  type="file"
                  onChange={handleFile}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "var(--bg-3)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Upload size={22} style={{ color: "var(--text-3)" }} />
                    </div>
                    <div className="text-center">
                      <div
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-2)" }}
                      >
                        Drop crop image
                      </div>
                      <div
                        className="text-xs mt-1"
                        style={{ color: "var(--text-3)" }}
                      >
                        PNG, JPG up to 10MB
                      </div>
                    </div>
                  </div>
                )}
                {/* Overlay gradient */}
                {preview && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(12,26,14,0.6) 0%, transparent 60%)",
                    }}
                  />
                )}
              </label>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={handleIngest}
                  disabled={loadingIngest || loadingSearch}
                  className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-2)",
                  }}
                >
                  {loadingIngest ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={14} /> Store
                    </>
                  )}
                </button>
                <button
                  onClick={handleSearch}
                  disabled={loadingIngest || loadingSearch}
                  className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: "var(--green)", color: "#0c1a0e" }}
                >
                  {loadingSearch ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Brain size={14} /> Analyze
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sensor inputs */}
            <div
              className="lg:col-span-3 rounded-2xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="text-[10px] font-mono mb-4"
                style={{ color: "var(--text-3)" }}
              >
                // SENSOR PARAMETERS
              </div>
              <div className="grid grid-cols-2 gap-4">
                {INPUT_FIELDS.map(
                  ({ label, name, icon: Icon, color, type, opts }) => (
                    <div key={name}>
                      <label
                        className="text-[10px] font-mono mb-1 block"
                        style={{ color }}
                      >
                        {label.toUpperCase()}
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                          <Icon size={13} style={{ color }} />
                        </div>
                        {type === "select" ? (
                          <div className="relative">
                            <select
                              value={sensors[name]}
                              onChange={(e) =>
                                setSensors({
                                  ...sensors,
                                  [name]: e.target.value,
                                })
                              }
                              className="w-full appearance-none pl-8 pr-8 py-2.5 rounded-lg text-sm font-mono outline-none"
                              style={{
                                background: "var(--bg-3)",
                                border: "1px solid var(--border)",
                                color: "var(--text)",
                              }}
                            >
                              {opts.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={11}
                              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ color: "var(--text-3)" }}
                            />
                          </div>
                        ) : (
                          <input
                            value={sensors[name]}
                            onChange={(e) =>
                              setSensors({ ...sensors, [name]: e.target.value })
                            }
                            type="number"
                            step="0.1"
                            className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                            style={{
                              background: "var(--bg-3)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Decision output */}
          {decision && (
            <div
              className="mt-6 rounded-2xl overflow-hidden animate-fade-up"
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{
                  borderColor: "var(--border)",
                  background: "rgba(74,222,128,0.05)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Brain size={16} style={{ color: "var(--green)" }} />
                  <span
                    className="font-semibold text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    Supervisor Command
                  </span>
                </div>
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-3)",
                  }}
                >
                  <Eye size={11} /> {showExplanation ? "Hide" : "View"} logic
                </button>
              </div>

              <div className="p-5 grid grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(decision).map(([key, value]) => {
                  const meta = ACTION_MAP[key] || {
                    label: key,
                    icon: Zap,
                    unit: "",
                    color: "var(--text-3)",
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={key}
                      className="rounded-xl p-4 text-center"
                      style={{
                        background: "var(--bg-3)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                        style={{ background: `${meta.color}15` }}
                      >
                        <Icon size={14} style={{ color: meta.color }} />
                      </div>
                      <div
                        className="font-bold font-mono text-xl"
                        style={{ color: meta.color }}
                      >
                        {value}
                      </div>
                      <div
                        className="text-[9px] font-mono mt-0.5"
                        style={{ color: "var(--text-3)" }}
                      >
                        {meta.unit}
                      </div>
                      <div
                        className="text-[10px] mt-1"
                        style={{ color: "var(--text-3)" }}
                      >
                        {meta.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showExplanation && explanationText && (
                <div
                  className="border-t p-5"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-3)",
                  }}
                >
                  <div
                    className="text-[10px] font-mono mb-2"
                    style={{ color: "var(--text-3)" }}
                  >
                    // SUPERVISOR REASONING
                  </div>
                  <pre
                    className="text-xs font-mono leading-relaxed whitespace-pre-wrap"
                    style={{ color: "var(--text-2)" }}
                  >
                    {explanationText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Database size={14} style={{ color: "var(--text-3)" }} />
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--text-3)" }}
                >
                  MEMORY MATCHES · {searchResults.length} FOUND
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((res) => {
                  const s = extractSensors(res.payload);
                  return (
                    <div
                      key={res.id}
                      className="rounded-xl p-4 card-hover"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Leaf size={13} style={{ color: "var(--green)" }} />
                          <span
                            className="font-semibold text-sm"
                            style={{ color: "var(--text)" }}
                          >
                            {res.payload.crop || "Unknown"}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded"
                          style={{
                            background: "rgba(74,222,128,0.1)",
                            color: "var(--green)",
                          }}
                        >
                          {((res.score || 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div
                          className="rounded-lg p-2 text-center"
                          style={{ background: "var(--bg-3)" }}
                        >
                          <div
                            className="text-[9px] font-mono"
                            style={{ color: "var(--text-3)" }}
                          >
                            pH
                          </div>
                          <div
                            className="font-mono font-bold text-sm"
                            style={{ color: "var(--green)" }}
                          >
                            {s.ph}
                          </div>
                        </div>
                        <div
                          className="rounded-lg p-2 text-center"
                          style={{ background: "var(--bg-3)" }}
                        >
                          <div
                            className="text-[9px] font-mono"
                            style={{ color: "var(--text-3)" }}
                          >
                            EC
                          </div>
                          <div
                            className="font-mono font-bold text-sm"
                            style={{ color: "var(--amber)" }}
                          >
                            {s.ec}
                          </div>
                        </div>
                      </div>
                      {res.payload.outcome && (
                        <div
                          className="mt-2 text-[11px]"
                          style={{ color: "var(--text-3)" }}
                        >
                          {formatOutcome(res.payload.outcome)?.substring(0, 80)}
                          …
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
