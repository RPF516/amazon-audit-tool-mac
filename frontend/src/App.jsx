import { useState, useRef, useCallback } from "react";
import meshBg from "./assets/mesh.png";
import logo from "./assets/logo.png";

// ─── Utility ─────────────────────────────────────────────────────────────────
const fmt = (n, decimals = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtUSD = (n) => `$${fmt(n)}`;
const fmtPct = (n) => `${fmt(n, 1)}%`;

const API_BASE = "http://127.0.0.1:8000";

function acosColor(acos, target) {
  if (!acos || acos === 0) return "#6b7280";
  if (acos <= target) return "#16a34a";
  if (acos <= target * 1.2) return "#f59e0b";
  return "#dc2626";
}

function healthLabel(acos, target) {
  if (!acos || acos === 0) return { label: "NO DATA", color: "#6b7280", bg: "#f3f4f6" };
  if (acos <= target) return { label: `HEALTHY (${fmtPct(acos)})`, color: "#16a34a", bg: "#dcfce7" };
  if (acos <= target * 1.2) return { label: `ATTENTION (${fmtPct(acos)})`, color: "#d97706", bg: "#fef3c7" };
  return { label: `CRITICAL (${fmtPct(acos)})`, color: "#dc2626", bg: "#fee2e2" };
}

// ─── Drag-and-drop file zone ──────────────────────────────────────────────────
function DropZone({ label, icon, hint, file, onFile, onClear }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all duration-200 ${
        dragging ? "border-red-400 bg-red-50" : file ? "border-green-400 bg-green-50" : "border-dashed border-gray-300 bg-white hover:border-red-300 hover:bg-red-50/30"
      }`}
      style={{ padding: "28px 32px" }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: file ? "#dcfce7" : "#fff5f5",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: 22
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a", marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>{hint}</div>
          {file ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #d1fae5", borderRadius: 10, padding: "8px 14px", width: "fit-content" }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{file.name}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button onClick={onClear} style={{ marginLeft: 4, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current.click()}
              style={{
                background: "none", border: "1.5px solid #e5e7eb",
                borderRadius: 8, padding: "6px 16px", fontSize: 13,
                color: "#374151", cursor: "pointer", fontWeight: 500
              }}
            >
              Browse file
            </button>
          )}
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => onFile(e.target.files[0])} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 80, height: 70 }}>
          <div style={{
            width: 70, height: 70, border: "2px dashed #e5e7eb", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#fafafa", color: "#d1d5db", fontSize: 26
          }}>
            {file ? "📄" : "⬆"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard / Upload Screen ────────────────────────────────────────────────
function DashboardPage({ onResults }) {
  const [targetFile, setTargetFile] = useState(null);
  const [searchFile, setSearchFile] = useState(null);
  const [targetAcos, setTargetAcos] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brandName, setBrandName] = useState("");

  const handleRun = async () => {
    if (!targetFile || !searchFile || !targetAcos) {
      setError("Please upload both reports and enter a Target ACoS.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const [targetRes, searchRes] = await Promise.all([
        (async () => {
          const fd = new FormData();
          fd.append("file", targetFile);
          fd.append("target_acos", targetAcos);
          const r = await fetch(`${API_BASE}/upload-report`, { method: "POST", body: fd });
          return r.json();
        })(),
        (async () => {
          const fd = new FormData();
          fd.append("file", searchFile);
          fd.append("target_acos", targetAcos);
          const r = await fetch(`${API_BASE}/upload-report`, { method: "POST", body: fd });
          return r.json();
        })(),
      ]);
      onResults({
  targeting: targetRes.data,
  searchTerm: searchRes.data,
  targetAcos: parseFloat(targetAcos),
  targetFile,
  searchFile,
  brandName
});
    } catch (e) {
      setError("Failed to connect to backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 24px 60px" }}>
      {/* Hero */}
      <div style={{ marginBottom: 40, paddingTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#dc2626", marginBottom: 10, textTransform: "uppercase" }}>
          Performance Intelligence
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 44, color: "#0f0f0f", margin: "0 0 14px", lineHeight: 1.1 }}>
          Initialize Audit
        </h1>
        <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 560, lineHeight: 1.65 }}>
          Transform your Amazon Advertising raw data into high-precision strategic insights.
          Upload your targeting and search term reports to begin the diagnostic process.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        {/* Upload cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DropZone
            label="Sponsored Products Targeting Report"
            icon="🎯"
            hint="Drag and drop your targeting Excel file or click to browse"
            file={targetFile}
            onFile={setTargetFile}
            onClear={() => setTargetFile(null)}
          />
          <DropZone
            label="Sponsored Products Search Term Report"
            icon="🔍"
            hint="Drag and drop your search term Excel file or click to browse"
            file={searchFile}
            onFile={setSearchFile}
            onClear={() => setSearchFile(null)}
          />
        </div>

        {/* Audit parameters card */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f0f0f0", padding: 28, boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a" }}>Audit Parameters</span>
          </div>
		  
		  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
				Brand Name
		</label>
		<div style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
			<input
				type="text"
				value={brandName}
				onChange={(e) => setBrandName(e.target.value)}
				placeholder="e.g. Nike"
				style={{ flex: 1, border: "none", outline: "none", padding: "14px 16px", fontSize: 16, fontWeight: 600, color: "#0f0f0f", background: "transparent" }}
			/>
		</div>

          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
            Enter Target ACoS (%)
          </label>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
            <input
              type="number"
              value={targetAcos}
              onChange={(e) => setTargetAcos(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", padding: "14px 16px", fontSize: 26, fontWeight: 700, color: "#0f0f0f", background: "transparent" }}
              min={1} max={200}
            />
            <span style={{ paddingRight: 16, fontSize: 18, color: "#9ca3af", fontWeight: 600 }}>%</span>
          </div>

          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
            We'll use this threshold to identify campaigns that require optimization or bidding adjustments.
          </p>

          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={loading}
            style={{
              width: "100%", padding: "15px", borderRadius: 12, border: "none",
              background: loading ? "#9ca3af" : "linear-gradient(135deg, #dc2626, #b91c1c)",
              color: "#fff", fontWeight: 700,
              fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 4px 20px rgba(220,38,38,0.35)",
              transition: "all 0.2s"
            }}
          >
            {loading ? (
              <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Processing…</>
            ) : (
              <><span>🚀</span> Run Audit</>
            )}
          </button>

          {!loading && (
            <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
              Processing time: ~14 seconds
            </div>
          )}

          {/* Promo banner */}
          <div style={{
            marginTop: 24, borderRadius: 14, overflow: "hidden",
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d1515 100%)",
            padding: 18, position: "relative"
          }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 6 }}>
              Advanced diagnostics for Amazon Sellers
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
              Powered by Export Accelerator Audit Engine.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Targeting Analysis Page ──────────────────────────────────────────────────
const MATCH_TYPE_META = {
  "Exact": { icon: "🎯", label: "Exact Match" },
  "Phrase": { icon: "💬", label: "Phrase Match" },
  "Broad": { icon: "📡", label: "Broad Match" },
  "Automatic Targets": { icon: "🤖", label: "Auto Targeting" },
  "Automatic Legacy Campaigns": { icon: "🏛️", label: "Auto Legacy" },
  "ASIN Targeting": { icon: "📦", label: "ASIN Targeting" },
  "Category Targeting": { icon: "🗂️", label: "Category Targeting" },
};

function MatchTypeCard({ type, data, targetAcos }) {
  const meta = MATCH_TYPE_META[type] || { icon: "📊", label: type };
  const health = healthLabel(data.acos, targetAcos);
  const totalKw = data.total_keywords || 0;
  const profPct = totalKw > 0 ? ((data.profitable_keywords / totalKw) * 100).toFixed(0) : 0;
  const unprofPct = totalKw > 0 ? ((data.unprofitable_keywords / totalKw) * 100).toFixed(0) : 0;

  return (
    <div style={{
      background: "#fff", borderRadius: 20, border: "1px solid #f0f0f0",
      padding: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.05)"
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {meta.icon}
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>{meta.label}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
          color: health.color, background: health.bg, letterSpacing: "0.05em"
        }}>
          {health.label}
        </span>
      </div>

      {/* Sales & Spend */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}>Sales Contribution</div>
        <div style={{ fontWeight: 800, fontSize: 26, color: "#0f0f0f" }}>{fmtUSD(data.sales)}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Spend: <strong>{fmtUSD(data.spend)}</strong></div>
      </div>

      {/* KW breakdown */}
      <div style={{ background: "#fafafa", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Total KWs</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f0f0f" }}>{totalKw.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: "#16a34a" }}>Profitable</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>{data.profitable_keywords?.toLocaleString()} ({profPct}%)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#dc2626" }}>Unprofitable</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>{data.unprofitable_keywords?.toLocaleString()} ({unprofPct}%)</span>
        </div>
      </div>

      {/* Wasted spend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f3f4f6", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#dc2626" }}>
          <span>↘</span> Wasted Spend
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#dc2626" }}>{fmtUSD(data.wasted_spend)}</span>
      </div>

      {/* Bottom stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "CLICKS/NO SALES", val: data.clicks_no_sales },
          { label: "NO CLICKS", val: data.no_clicks },
          { label: "IMPR/NO CLICKS", val: data.impressions_no_clicks },
          { label: "NO IMPRESSIONS", val: data.no_impressions },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.08em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#374151" }}>{val != null ? val.toLocaleString() : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetingPage({ data, targetAcos, targetFile, searchFile, brandName, onBack }) {
  const totals = data["TOTALS"] || {}; 
  const types = Object.keys(data).filter(k => k !== "TOTALS");

  // Grand totals across all types
  const allSales = types.reduce((s, t) => s + (data[t].sales || 0), 0);
  const allSpend = types.reduce((s, t) => s + (data[t].spend || 0), 0);
  const overallAcos = allSales > 0 ? (allSpend / allSales) * 100 : 0;
  const acosVsTarget = overallAcos - targetAcos;
  
const handleDownload = async () => {
  try {
    const formData = new FormData();

    formData.append("targeting_file", targetFile);
    formData.append("search_term_file", searchFile);
    formData.append("target_acos", targetAcos);
	formData.append("brand_name", brandName);

    const response = await fetch(`${API_BASE}/download-ppt`, {
      method: "POST",
      body: formData, // ✅ no headers
    });

    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName}_Audit_Report.pptx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

  } catch (err) {
    console.error(err);
    alert("Failed to download PPT");
  }
};

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 60px" }}>
      {/* Back */}
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderLeft: "4px solid #dc2626", paddingLeft: 18, marginBottom: 28 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 34, color: "#0f0f0f", margin: "0 0 6px" }}>
            Audit Report: Targeting Analysis
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Deep dive into account performance metrics broken down by match type and keyword efficiency.
          </p>
        </div>
<button 
  onClick={handleDownload}
  style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "11px 20px", border: "none",
    background: "#0B1120", color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    transition: "all 0.3s"
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = "#FFC000";
    e.currentTarget.style.color = "#000";
    e.currentTarget.style.transform = "scale(1.02)";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = "#0B1120";
    e.currentTarget.style.color = "#fff";
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
  }}
>
  ⬇ Download Report (PPT)
</button>
      </div>

      {/* KPI strip */}
      <div style={{
        background: "#fff", borderRadius: 20, border: "1px solid #f0f0f0",
        padding: "24px 32px", marginBottom: 28, display: "flex", gap: 0,
        boxShadow: "0 2px 16px rgba(0,0,0,0.05)"
      }}>
        <div style={{ flex: 2, borderRight: "1px solid #f3f4f6", paddingRight: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: 6, textTransform: "uppercase" }}>Total Account Sales</div>
          <div style={{ fontWeight: 800, fontSize: 36, color: "#dc2626" }}>{fmtUSD(allSales)}</div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" }}>Total Spend</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: "#0f0f0f" }}>{fmtUSD(allSpend)}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>
              Current ACoS: <strong style={{ color: acosVsTarget > 0 ? "#dc2626" : "#16a34a", fontSize: 18 }}>{fmtPct(overallAcos)}</strong>
              <span style={{ color: "#9ca3af", fontSize: 13 }}> v. {targetAcos}% Target</span>
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${Math.min((overallAcos / (targetAcos * 1.5)) * 100, 100)}%`,
                height: "100%",
                background: acosVsTarget > 0 ? "linear-gradient(90deg,#dc2626,#b91c1c)" : "linear-gradient(90deg,#16a34a,#15803d)",
                borderRadius: 6, transition: "width 0.8s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              <span>0%</span><span>Target: {targetAcos}%</span><span>100%</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, paddingLeft: 32, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", marginBottom: 10,
            background: acosVsTarget > 0 ? "#fee2e2" : "#dcfce7",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24
          }}>
            {acosVsTarget > 0 ? "⚠️" : "✅"}
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#0f0f0f", marginBottom: 6 }}>
            Health Status: {acosVsTarget > 0 ? "Needs Attention" : "Excellent"}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
            Overall account ACoS is {Math.abs(acosVsTarget).toFixed(1)}% {acosVsTarget > 0 ? "above" : "below"} your defined target performance.
          </div>
        </div>
      </div>

      {/* Totals summary bar */}
      <div style={{ background: "#0f0f0f", borderRadius: 16, padding: "18px 28px", marginBottom: 28, display: "flex", gap: 32, flexWrap: "wrap" }}>
        {[
          { label: "Profitable KWs", val: totals.profitable_keywords?.toLocaleString(), color: "#4ade80" },
          { label: "Profitable Sales", val: fmtUSD(totals.profitable_sales), color: "#4ade80" },
          { label: "Unprofitable KWs", val: totals.unprofitable_keywords?.toLocaleString(), color: "#f87171" },
          { label: "Wasted Spend", val: fmtUSD(totals.wasted_spend), color: "#f87171" },
          { label: "Zero Clicks", val: totals.zero_clicks?.toLocaleString(), color: "#fbbf24" },
          { label: "Clicks No Sales", val: totals.clicks_no_sales?.toLocaleString(), color: "#fbbf24" },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 18, color }}>{val ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* Section header */}
      <h3 style={{ fontWeight: 700, fontSize: 22, color: "#0f0f0f", marginBottom: 6 }}>
        Match Type Performance Breakdown
      </h3>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 22 }}>
        Granular analysis of how different targeting methods contribute to account health.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {types.map((type) => (
          <MatchTypeCard key={type} type={type} data={data[type]} targetAcos={targetAcos} />
        ))}
      </div>
    </div>
  );
}

// ─── Search Term Analysis Page ────────────────────────────────────────────────
function AcosChip({ acos, target }) {
  const col = acosColor(acos, target);
  return (
    <span style={{ display: "inline-block", background: col + "18", color: col, fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 8 }}>
      {acos > 0 ? fmtPct(acos) : "—"}
    </span>
  );
}

function KeywordTable({ rows, columns, targetAcos }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: "8px 12px", textAlign: c.align || "left", color: "#9ca3af", fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "10px 12px", color: "#374151", whiteSpace: c.wrap ? "normal" : "nowrap" }}>
                  {c.render ? c.render(row[c.key], row, targetAcos) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchTermPage({ data, targetAcos, targetFile, searchFile, brandName, onBack }) {
  const {
    converting_below_target_count,
    converting_above_target_count,
    non_converting_campaigns_count,
    total_duplicate_keywords,
    unique_duplicate_keywords,
    exact_phrase_duplicate_keywords,
    lowest_acos_keywords,
    highest_acos_keywords,
    highest_click_no_sales_keywords,
  } = data;

  const kwCols = [
    { key: "Customer Search Term", label: "Search Term", wrap: true, render: (v) => <em>"{v}"</em> },
    { key: "7 Day Total Sales", label: "Sales", align: "right", render: (v) => fmtUSD(v) },
    { key: "Spend", label: "Spend", align: "right", render: (v) => fmtUSD(v) },
    { key: "acos", label: "ACoS", align: "right", render: (v, _, ta) => <AcosChip acos={v} target={ta} /> },
  ];

  const clickCols = [
    { key: "Campaign Name", label: "Campaign", wrap: true },
    { key: "Ad Group Name", label: "Ad Group" },
    { key: "Customer Search Term", label: "Search Term", wrap: true, render: (v) => <em>"{v}"</em> },
    { key: "Clicks", label: "Clicks", align: "right", render: (v) => v?.toLocaleString() },
    { key: "Spend", label: "Spend", align: "right", render: (v) => <span style={{ color: "#dc2626", fontWeight: 700 }}>{fmtUSD(v)}</span> },
    { key: "7 Day Total Sales", label: "Sales", align: "right", render: () => "$0.00" },
  ];
  
const handleDownload = async () => {
  try {
    const formData = new FormData();

    formData.append("targeting_file", targetFile);
    formData.append("search_term_file", searchFile);
    formData.append("target_acos", targetAcos);
	formData.append("brand_name", brandName);

    const response = await fetch(`${API_BASE}/download-ppt`, {
      method: "POST",
      body: formData, // ✅ no headers
    });

    if (!response.ok) {
      throw new Error("Download failed");
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName}_Audit_Report.pptx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

  } catch (err) {
    console.error(err);
    alert("Failed to download PPT");
  }
};

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 60px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
        ← Back to Dashboard
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, borderLeft: "4px solid #dc2626", paddingLeft: 18 }}>
        <div>
          <h2 style={{fontWeight: 800, fontSize: 34, color: "#0f0f0f", margin: "0 0 4px" }}>
            Search Term Analysis
          </h2>
          <p style={{ fontSize: 13, color: "#6b7280" }}>Audit Results Section B • Amazon Advertising Performance Editorial</p>
        </div>
<button 
  onClick={handleDownload}
  style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "11px 20px", border: "none",
    background: "#0B1120", color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    transition: "all 0.3s"
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = "#FFC000";
    e.currentTarget.style.color = "#000";
    e.currentTarget.style.transform = "scale(1.02)";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = "#0B1120";
    e.currentTarget.style.color = "#fff";
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
  }}
>
  ⬇  Download Report (PPT)
</button>
      </div>

      {/* 3 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          {
            badge: "HEALTHY ASSETS", badgeColor: "#16a34a", badgeBg: "#dcfce7",
            icon: "📈", label: "CONVERTING — BELOW TARGET ACOS",
            value: converting_below_target_count?.toLocaleString(),
            sub: `${converting_below_target_count && converting_above_target_count
              ? Math.round((converting_below_target_count / (converting_below_target_count + converting_above_target_count)) * 100)
              : 0}% of all converting terms are profitable`,
            barColor: "#16a34a",
          },
          {
            badge: "ACTION REQUIRED", badgeColor: "#d97706", badgeBg: "#fef3c7",
            icon: "⚠️", label: "CONVERTING — ABOVE TARGET ACOS",
            value: converting_above_target_count?.toLocaleString(),
            sub: "Review bid adjustments for optimized returns",
            barColor: "#f59e0b",
          },
          {
            badge: "WASTE ALERT", badgeColor: "#dc2626", badgeBg: "#fee2e2",
            icon: "🚫", label: "NON-CONVERTING TERMS",
            value: non_converting_campaigns_count?.toLocaleString(),
            sub: null,
            barColor: "#dc2626",
          },
        ].map(({ badge, badgeColor, badgeBg, icon, label, value, sub, barColor }) => (
          <div key={badge} style={{ background: "#fff", borderRadius: 18, border: "1px solid #f0f0f0", padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, color: badgeColor, background: badgeBg, letterSpacing: "0.06em" }}>
                {badge}
              </span>
              <span style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontWeight: 800, fontSize: 36, color: "#0f0f0f", marginBottom: 8 }}>{value ?? "—"}</div>
            <div style={{ height: 3, background: "#f3f4f6", borderRadius: 4, marginBottom: 8 }}>
              <div style={{ height: "100%", width: "60%", background: barColor, borderRadius: 4 }} />
            </div>
            {sub && <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Duplicates + Self-competition */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #f0f0f0", padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Total Duplicates</div>
              <div style={{ fontWeight: 800, fontSize: 40, color: "#dc2626" }}>{total_duplicate_keywords?.toLocaleString() ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Unique Duplicates</div>
              <div style={{ fontWeight: 800, fontSize: 40, color: "#0f0f0f" }}>{unique_duplicate_keywords?.toLocaleString() ?? "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#374151" }}>Exact and Phrase Match Duplicates</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{exact_phrase_duplicate_keywords ?? "—"}</span>
          </div>
          <div style={{ background: "#dc2626", height: 5, borderRadius: 4, width: "70%", marginBottom: 12 }} />
        </div>

        <div style={{ background: "#0f0f0f", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 22, marginBottom: 10 }}>✨</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#fff", marginBottom: 10 }}>
              Self-Competition Risk
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>
              Detected overlaps in ad groups. This can lead to increased CPCs without incremental reach.
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Lowest ACOS */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #f0f0f0", padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>⭐</span>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>Top 5 Lowest ACoS Search Terms</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, color: "#16a34a", background: "#dcfce7", marginLeft: "auto" }}>PROFIT DRIVERS</span>
          </div>
          <KeywordTable rows={lowest_acos_keywords || []} columns={kwCols} targetAcos={targetAcos} />
        </div>

        {/* Highest ACOS */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #f0f0f0", padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>❗</span>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>Top 5 Highest ACoS Search Terms</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, color: "#dc2626", background: "#fee2e2", marginLeft: "auto" }}>INEFFICIENT</span>
          </div>
          <KeywordTable rows={highest_acos_keywords || []} columns={kwCols} targetAcos={targetAcos} />
        </div>
      </div>

      {/* Clicks / No Sales */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #f0f0f0", padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>💸</span>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#0f0f0f" }}>Top Search Terms with Most Clicks but Zero Sales</span>
        </div>
        <KeywordTable rows={highest_click_no_sales_keywords || []} columns={clickCols} targetAcos={targetAcos} />
      </div>
    </div>
  );
}

// ─── Results Hub (tab switcher) ───────────────────────────────────────────────
function ResultsHub({ targeting, searchTerm, targetAcos, targetFile, searchFile, brandName, onBack }) {
  const [tab, setTab] = useState("targeting");

  return (
    <div>
      {/* Tab bar */}
      <div style={{ background: "#F3F3F3", borderBottom: "1px solid #f0f0f0", marginBottom: 36 }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4 }}>
          {[
            { key: "targeting", label: "Section A: Targeting" },
            { key: "searchTerm", label: "Section B: Search Terms" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "16px 22px", border: "none", background: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 14,
                color: tab === t.key ? "#dc2626" : "#6b7280",
                borderBottom: tab === t.key ? "2px solid #dc2626" : "2px solid transparent",
                transition: "all 0.15s"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "targeting"
        ? <TargetingPage data={targeting} targetAcos={targetAcos} targetFile={targetFile} searchFile={searchFile} brandName={brandName} onBack={onBack} />
        : <SearchTermPage data={searchTerm} targetAcos={targetAcos} targetFile={targetFile} searchFile={searchFile} brandName={brandName} onBack={onBack} />
      }
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [results, setResults] = useState(null);

  const handleResults = (r) => setResults(r);
  const handleBack = () => setResults(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; color: #0f0f0f; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: "100vh", position: "relative"}}>
        {/* Mesh background */}
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          <img src={meshBg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", mixBlendMode: "soft-light", opacity: 0.5 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%,, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 1) 100%)" }} />
        </div>

        {/* Top nav */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(255, 255, 255, 0)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #ece9e3",
          display: "flex", alignItems: "center", padding: "0 32px", height: 60
        }}>
          <a href="https://exportaccelerator.com.au/" style={{ textDecoration: "none" }}>
            <img src={logo} alt="logo" style={{ height: 34, objectFit: "contain" }} />
          </a>
          <div style={{ flex: 1 }} />
          {results && (
            <button
              onClick={handleBack}
                style={{
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", border: "none",
    background: "#0B1120", color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    transition: "all 0.3s"
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = "#FFC000";
    e.currentTarget.style.color = "#000";
    e.currentTarget.style.transform = "scale(1.02)";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = "#0B1120";
    e.currentTarget.style.color = "#fff";
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
  }}
>
              ⟳ Run New Audit
            </button>
          )}
        </nav>

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 1, paddingTop: 40 }}>
          {!results
            ? <DashboardPage onResults={handleResults} />
            : <ResultsHub
                targeting={results.targeting}
                searchTerm={results.searchTerm}
                targetAcos={results.targetAcos}
				targetFile={results.targetFile}
				searchFile={results.searchFile}
				brandName={results.brandName} 
                onBack={handleBack}
              />
          }
        </div>
      </div>
    </>
  );
}