import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardData } from "../api/farmApi";
import { extractSensors, calculateMaturity } from "../utils/dataUtils";
import {
  Search,
  SlidersHorizontal,
  Thermometer,
  Droplet,
  ArrowUpRight,
  Clock,
  ChevronDown,
  X,
  RefreshCw,
  Leaf,
  Activity,
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const STAGES = ["All", "Seedling", "Vegetative", "Flowering", "Fruiting"];
const CROPS = ["All", "Lettuce", "Tomato", "Basil", "Spinach", "Cucumber"];
const STATUSES = ["All", "Healthy", "Attention", "Critical"];

const STATUS_COLORS = {
  Healthy: {
    bg: "rgba(74,222,128,0.12)",
    text: "var(--green)",
    border: "rgba(74,222,128,0.3)",
  },
  Attention: {
    bg: "rgba(245,158,11,0.12)",
    text: "var(--amber)",
    border: "rgba(245,158,11,0.3)",
  },
  Critical: {
    bg: "rgba(248,113,113,0.12)",
    text: "var(--red)",
    border: "rgba(248,113,113,0.3)",
  },
};

function CropCard({ data, onClick }) {
  const st = STATUS_COLORS[data.status] || STATUS_COLORS.Healthy;
  const maturity = data.maturity || 40;

  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden cursor-pointer card-hover"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Image / Gradient header */}
      <div
        className="relative h-36 overflow-hidden"
        style={{ background: "var(--bg-3)" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Leaf
            size={40}
            style={{ color: "var(--border-bright)", opacity: 0.4 }}
          />
        </div>
        {data.image && (
          <img
            src={data.image}
            alt={data.name}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--surface) 0%, transparent 60%)",
          }}
        />
        {/* Status badge */}
        <div
          className="absolute top-3 right-3 text-[10px] font-mono px-2 py-1 rounded-full"
          style={{
            background: st.bg,
            color: st.text,
            border: `1px solid ${st.border}`,
          }}
        >
          {data.status === "Healthy"
            ? "● "
            : data.status === "Critical"
              ? "▲ "
              : "◆ "}
          {data.status.toUpperCase()}
        </div>
        {/* Seq number */}
        <div
          className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded"
          style={{ background: "rgba(0,0,0,0.5)", color: "var(--text-3)" }}
        >
          #{data.seq || 1}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Name + stage */}
        <div>
          <div className="font-bold text-sm" style={{ color: "var(--text)" }}>
            {data.name}
          </div>
          <div
            className="text-[11px] mt-0.5 font-mono"
            style={{ color: "var(--text-3)" }}
          >
            {data.cropId} · {data.statusMsg}
          </div>
        </div>

        {/* Maturity bar */}
        <div>
          <div
            className="flex justify-between text-[10px] font-mono mb-1"
            style={{ color: "var(--text-3)" }}
          >
            <span>Maturity</span>
            <span style={{ color: "var(--green)" }}>{maturity}%</span>
          </div>
          <div
            className="h-1 rounded-full"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full progress-fill"
              style={{
                width: `${maturity}%`,
                background:
                  maturity > 70
                    ? "var(--green)"
                    : maturity > 40
                      ? "var(--amber)"
                      : "var(--text-3)",
              }}
            />
          </div>
        </div>

        {/* Sensor row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <Thermometer size={12} style={{ color: "var(--text-3)" }} />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-2)" }}
            >
              {data.sensors.temp}°C
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplet size={12} style={{ color: "var(--text-3)" }} />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-2)" }}
            >
              pH {data.sensors.ph}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-1 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "var(--text-3)" }}
          >
            <Clock size={10} />
            {data.daysLeft > 0 ? `${data.daysLeft}d left` : "Ready"}
          </div>
          <ArrowUpRight size={14} style={{ color: "var(--text-3)" }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const [filterCrop, setFilterCrop] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    const data = await fetchDashboardData();
    if (data?.length > 0) {
      setCrops(
        data.map((item) => {
          const p = item.payload || {};
          const sensors = extractSensors(p);
          return {
            id: p.crop_id || item.id,
            cropId: p.crop_id || "—",
            name: p.crop || "Unknown",
            statusMsg: p.stage || "Growing",
            image: getImg(p.crop),
            status:
              p.outcome === "CRITICAL"
                ? "Critical"
                : p.action_taken === "PENDING_ACTION"
                  ? "Attention"
                  : "Healthy",
            maturity: calculateMaturity(p.sequence_number),
            seq: p.sequence_number,
            daysLeft: 30 - (p.sequence_number || 0),
            sensors: { temp: sensors.temp, ph: sensors.ph },
            stage: p.stage || "",
            rawCrop: (p.crop || "").trim(),
          };
        }),
      );
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getImg = (name) => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes("tomato"))
      return "https://images.unsplash.com/photo-1591857177580-dc82b9e4e5c9?q=80&w=400";
    if (n.includes("basil"))
      return "https://images.unsplash.com/photo-1618164436241-4473940d1f5c?q=80&w=400";
    if (n.includes("spinach"))
      return "https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=400";
    return "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?q=80&w=400";
  };

  const filtered = useMemo(() => {
    return crops.filter((c) => {
      const q = search.toLowerCase();
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.cropId.toLowerCase().includes(q) &&
        !c.statusMsg.toLowerCase().includes(q)
      )
        return false;
      if (filterStage !== "All" && c.stage !== filterStage) return false;
      if (filterCrop !== "All" && c.rawCrop !== filterCrop) return false;
      if (filterStatus !== "All" && c.status !== filterStatus) return false;
      return true;
    });
  }, [crops, search, filterStage, filterCrop, filterStatus]);

  const activeFilters = [filterStage, filterCrop, filterStatus].filter(
    (f) => f !== "All",
  ).length;

  const summary = useMemo(
    () => ({
      total: crops.length,
      healthy: crops.filter((c) => c.status === "Healthy").length,
      attention: crops.filter((c) => c.status === "Attention").length,
      critical: crops.filter((c) => c.status === "Critical").length,
    }),
    [crops],
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
              Crops Overview
            </h1>
            <p className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
              {filtered.length} of {crops.length} crops shown
            </p>
          </div>

          {/* Summary chips */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            {[
              {
                label: "Healthy",
                count: summary.healthy,
                color: "var(--green)",
              },
              {
                label: "Attention",
                count: summary.attention,
                color: "var(--amber)",
              },
              {
                label: "Critical",
                count: summary.critical,
                color: "var(--red)",
              },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color,
                }}
              >
                <span>{count}</span>
                <span style={{ opacity: 0.6 }}>{label}</span>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
              }}
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </header>

        {/* Search + Filter bar */}
        <div
          className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-3"
          style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-3)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crops, IDs, stages…"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm font-mono outline-none transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                caretColor: "var(--green)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X size={12} style={{ color: "var(--text-3)" }} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              background: showFilters
                ? "rgba(74,222,128,0.1)"
                : "var(--surface)",
              border: `1px solid ${showFilters ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
              color: showFilters ? "var(--green)" : "var(--text-2)",
            }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilters > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "var(--green)", color: "#0c1a0e" }}
              >
                {activeFilters}
              </span>
            )}
          </button>

          {/* Quick category pills */}
          <div className="hidden lg:flex items-center gap-2">
            {STAGES.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStage(filterStage === s ? "All" : s)}
                className="px-3 py-1.5 rounded-full text-[11px] font-mono transition-all"
                style={{
                  background:
                    filterStage === s
                      ? "rgba(74,222,128,0.15)"
                      : "var(--surface)",
                  border: `1px solid ${filterStage === s ? "rgba(74,222,128,0.4)" : "var(--border)"}`,
                  color: filterStage === s ? "var(--green)" : "var(--text-3)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div
            className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-6 animate-fade-in"
            style={{ borderColor: "var(--border)", background: "var(--bg-3)" }}
          >
            {[
              {
                label: "Crop Type",
                value: filterCrop,
                set: setFilterCrop,
                opts: CROPS,
              },
              {
                label: "Stage",
                value: filterStage,
                set: setFilterStage,
                opts: STAGES,
              },
              {
                label: "Status",
                value: filterStatus,
                set: setFilterStatus,
                opts: STATUSES,
              },
            ].map(({ label, value, set, opts }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--text-3)" }}
                >
                  {label}
                </span>
                <div className="relative">
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-mono outline-none cursor-pointer"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-2)",
                    }}
                  >
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={10}
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--text-3)" }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setFilterStage("All");
                setFilterCrop("All");
                setFilterStatus("All");
                setSearch("");
              }}
              className="ml-auto text-[11px] font-mono transition-colors"
              style={{ color: "var(--text-3)" }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Crop grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl shimmer"
                    style={{ border: "1px solid var(--border)" }}
                  />
                ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((crop) => (
                <CropCard
                  key={crop.id}
                  data={crop}
                  onClick={() => navigate(`/crop/${crop.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <Activity size={28} style={{ color: "var(--text-3)" }} />
              </div>
              <div style={{ color: "var(--text-2)" }}>
                No crops match your filters
              </div>
              <button
                onClick={() => {
                  setSearch("");
                  setFilterStage("All");
                  setFilterCrop("All");
                  setFilterStatus("All");
                }}
                className="text-xs font-mono px-4 py-2 rounded-lg"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-3)",
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
