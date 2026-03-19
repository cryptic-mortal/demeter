import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Leaf,
  LayoutGrid,
  BarChart3,
  Bell,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { fetchDashboardData } from "../api/farmApi";
import { extractSensors } from "../utils/dataUtils";

function countLiveAlerts(dashData) {
  if (!dashData?.length) return 0;
  return dashData.filter((d) => {
    const s = extractSensors(d.payload);
    const ph = parseFloat(s.ph);
    const ec = parseFloat(s.ec);
    const temp = parseFloat(s.temp);
    const outcome = (d.payload?.outcome || "").toLowerCase();
    return (
      ph < 5.0 ||
      ph > 7.5 ||
      ec > 3.0 ||
      temp > 34 ||
      (temp > 0 && temp < 12) ||
      /fail|critical|disease|pest|fungal/.test(outcome)
    );
  }).length;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const loc = useLocation();

  useEffect(() => {
    fetchDashboardData().then((data) => {
      setAlertCount(countLiveAlerts(data));
    });
  }, []);

  const NAV = [
    { label: "Crops", icon: LayoutGrid, path: "/dashboard" },
    { label: "Analytics", icon: BarChart3, path: "/analytics" },
    { label: "Alerts", icon: Bell, path: "/alerts", badge: alertCount || null },
    { label: "Agent AI", icon: Brain, path: "/control" },
    { label: "Settings", icon: Settings, path: "#" },
  ];

  return (
    <aside
      className="flex flex-col border-r transition-all duration-300 relative"
      style={{
        width: collapsed ? 64 : 220,
        background: "var(--bg-2)",
        borderColor: "var(--border)",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2d7a44, #4ade80)" }}
        >
          <Leaf size={16} fill="white" color="white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-bold text-sm" style={{ color: "var(--text)" }}>
              Demeter
            </div>
            <div
              className="text-[10px] font-mono"
              style={{ color: "var(--text-3)" }}
            >
              AGRI·AI·v2
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      {!collapsed && (
        <div
          className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.2)",
          }}
        >
          <span
            className="status-dot w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--green)" }}
          />
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--green)" }}
          >
            SYSTEM ONLINE
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(({ label, icon: Icon, path, badge }) => {
          const active = loc.pathname === path;
          return (
            <Link
              key={label}
              to={path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group"
              style={{
                background: active ? "rgba(74,222,128,0.12)" : "transparent",
                color: active ? "var(--green)" : "var(--text-2)",
                border: active
                  ? "1px solid rgba(74,222,128,0.25)"
                  : "1px solid transparent",
              }}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
              {badge && !collapsed && (
                <span
                  className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded alert-pulse"
                  style={{
                    background: "rgba(248,113,113,0.2)",
                    color: "var(--red)",
                  }}
                >
                  {badge}
                </span>
              )}
              {badge && collapsed && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full alert-pulse"
                  style={{ background: "var(--red)" }}
                />
              )}
              {collapsed && (
                <div
                  className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System health */}
      {!collapsed && (
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div
            className="px-3 py-2 rounded-lg"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--text-3)" }}
              >
                ALERT STATUS
              </span>
              <Zap
                size={10}
                style={{
                  color: alertCount > 0 ? "var(--amber)" : "var(--green)",
                }}
              />
            </div>
            <div
              className="h-1 rounded-full"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width:
                    alertCount > 0
                      ? `${Math.min(alertCount * 20, 100)}%`
                      : "5%",
                  background: alertCount > 0 ? "var(--amber)" : "var(--green)",
                }}
              />
            </div>
            <div
              className="text-[10px] font-mono mt-1"
              style={{ color: "var(--text-3)" }}
            >
              {alertCount > 0
                ? `${alertCount} crop(s) need attention`
                : "All clear"}
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text-3)",
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--amber-dim)", color: "var(--amber)" }}
          >
            R
          </div>
          {!collapsed && (
            <div>
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--text)" }}
              >
                Rajesh Rai
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
                Farm Owner
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
