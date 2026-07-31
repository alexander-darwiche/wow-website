import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";

function ReportPlayer({ backendUrl }) {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("player") || "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code || !playerName) {
      setError("Missing report code or player name.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(
      `${backendUrl}/api/report-player/${code}?player=${encodeURIComponent(playerName)}`
    )
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch report player data:", err);
        setError("Failed to fetch player data.");
      })
      .finally(() => setLoading(false));
  }, [backendUrl, code, playerName]);

  const formatNumber = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n?.toFixed(0) ?? "0";
  };

  const killFights = data?.bosses?.filter((b) => b.kill && b.dps > 0) || [];
  const avgDps =
    killFights.length > 0
      ? Math.round(killFights.reduce((s, f) => s + f.dps, 0) / killFights.length)
      : 0;
  const bestDps =
    killFights.length > 0 ? Math.max(...killFights.map((f) => f.dps)) : 0;
  const bestFight = killFights.find((f) => f.dps === bestDps);

  return (
    <div>
      <div className="page-header">
        <Link to={`/report/${code}`} className="back-link">
          ← Back to Report
        </Link>
        <h2>{playerName}</h2>
        {data && (
          <p style={{ color: "var(--text-secondary)" }}>
            {data.playerClass}
            {data.spec ? ` — ${data.spec}` : ""} &middot; Report{" "}
            <a
              href={`https://fresh.warcraftlogs.com/reports/${code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              {code} ↗
            </a>
          </p>
        )}
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading player data…</span>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}
        >
          <span style={{ color: "var(--accent-red)" }}>⚠ {error}</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.25rem",
                }}
              >
                Overall DPS
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--accent-gold)",
                }}
              >
                {data.overallDps.toLocaleString()}
              </div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.25rem",
                }}
              >
                Boss Fights
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {data.bosses.length}
              </div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.25rem",
                }}
              >
                Avg Kill DPS
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--accent-green)",
                }}
              >
                {avgDps.toLocaleString()}
              </div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.25rem",
                }}
              >
                Best DPS{bestFight ? ` (${bestFight.boss})` : ""}
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#8b5cf6",
                }}
              >
                {bestDps.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Boss table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Boss</th>
                  <th>Duration</th>
                  <th>Result</th>
                  <th>DPS</th>
                  <th>Total Damage</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.bosses.map((boss) => {
                  const mins = Math.floor(boss.duration / 60);
                  const secs = String(Math.floor(boss.duration % 60)).padStart(
                    2,
                    "0"
                  );
                  return (
                    <tr key={boss.fightId}>
                      <td style={{ fontWeight: 600 }}>{boss.boss}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {mins}:{secs}
                      </td>
                      <td>
                        <span
                          style={{
                            color: boss.kill
                              ? "var(--accent-green)"
                              : "#ef4444",
                            fontWeight: 600,
                          }}
                        >
                          {boss.kill ? "Kill" : "Wipe"}
                          {!boss.kill &&
                            boss.bossPercentage != null &&
                            ` (${(boss.bossPercentage / 100).toFixed(1)}%)`}
                        </span>
                      </td>
                      <td>
                        {boss.dps > 0 ? (
                          <span className="ilvl-badge ilvl-high">
                            {boss.dps.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>{formatNumber(boss.damage)}</td>
                      <td>
                        <Link
                          to={`/compare?code=${code}&fight=${boss.fightId}&player=${encodeURIComponent(playerName)}`}
                          className="btn btn-primary"
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.2rem 0.5rem",
                          }}
                          title="Compare vs #1 parse"
                        >
                          Compare
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportPlayer;
