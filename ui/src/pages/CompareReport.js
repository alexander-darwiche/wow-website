import React, { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CompareReport({ backendUrl }) {
  const [reportCode, setReportCode] = useState("");
  const [fights, setFights] = useState([]);
  const [fightsLoading, setFightsLoading] = useState(false);
  const [selectedFight, setSelectedFight] = useState("");
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [metric, setMetric] = useState("dps");
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFights = useCallback(() => {
    if (!reportCode) return;
    setFightsLoading(true);
    setFights([]);
    setSelectedFight("");
    setPlayers([]);
    setSelectedPlayer("");
    setCompareData(null);
    setError("");

    fetch(`${backendUrl}/api/fights/${reportCode}`)
      .then((res) => res.json())
      .then((data) => {
        const bossFights = data.filter((f) => !f.isTrash && f.encounterID !== 0);
        setFights(bossFights);
      })
      .catch((err) => {
        console.error("Failed to fetch fights:", err);
        setError("Failed to fetch fights. Check the report code.");
      })
      .finally(() => setFightsLoading(false));
  }, [backendUrl, reportCode]);

  const fetchPlayers = useCallback(
    (fightId) => {
      if (!reportCode || !fightId) return;
      setPlayersLoading(true);
      setPlayers([]);
      setSelectedPlayer("");
      setCompareData(null);
      setError("");

      fetch(`${backendUrl}/api/dps/${reportCode}?fight_ids=${fightId}`)
        .then((res) => res.json())
        .then((data) => {
          const sorted = [...data].sort((a, b) => b.dps - a.dps);
          setPlayers(sorted);
        })
        .catch((err) => console.error("Failed to fetch players:", err))
        .finally(() => setPlayersLoading(false));
    },
    [backendUrl, reportCode]
  );

  const runComparison = () => {
    if (!reportCode || !selectedFight || !selectedPlayer) return;
    setCompareLoading(true);
    setCompareData(null);
    setError("");

    const params = new URLSearchParams({
      fight_id: selectedFight,
      player: selectedPlayer,
      metric: metric,
    });

    fetch(`${backendUrl}/api/compare/${reportCode}?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCompareData(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch comparison:", err);
        setError("Failed to fetch comparison data.");
      })
      .finally(() => setCompareLoading(false));
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === "Enter") fetchFights();
  };

  const handleFightChange = (e) => {
    const fightId = e.target.value;
    setSelectedFight(fightId);
    if (fightId) fetchPlayers(fightId);
  };

  const formatNumber = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n?.toFixed(0) ?? "0";
  };

  const metricLabel = metric === "dps" ? "DPS" : "HPS";

  const percentOfTop =
    compareData && compareData.top.throughput > 0
      ? Math.round(
          (compareData.player.throughput / compareData.top.throughput) * 100
        )
      : null;

  const pctColor =
    percentOfTop >= 95
      ? "var(--accent-green)"
      : percentOfTop >= 85
      ? "var(--accent-gold)"
      : percentOfTop >= 75
      ? "var(--accent-orange)"
      : "var(--accent-red)";

  // Build chart data: merge abilities from both players by name
  const buildChartData = () => {
    if (!compareData) return [];
    const map = {};

    for (const a of compareData.player.abilities || []) {
      map[a.name] = { name: a.name, player: a.total, top: 0 };
    }
    for (const a of compareData.top.abilities || []) {
      if (!map[a.name]) map[a.name] = { name: a.name, player: 0, top: 0 };
      map[a.name].top = a.total;
    }

    return Object.values(map).sort(
      (a, b) => Math.max(b.player, b.top) - Math.max(a.player, a.top)
    );
  };

  const chartData = buildChartData();
  const sharedAbilities = chartData.filter((a) => a.player > 0 && a.top > 0);
  const playerOnlyAbilities = chartData.filter((a) => a.player > 0 && a.top === 0);
  const topOnlyAbilities = chartData.filter((a) => a.player === 0 && a.top > 0);

  return (
    <div>
      <div className="page-header">
        <h2>Compare to Top Parse</h2>
        <p>
          Compare your ability breakdown side-by-side against the #1 ranked
          player for the same boss, class, and spec.
        </p>
      </div>

      {/* Step 1: Report Code */}
      <div className="input-group">
        <input
          className="input-field"
          type="text"
          placeholder="Report code (e.g. abc123)"
          value={reportCode}
          onChange={(e) => setReportCode(e.target.value)}
          onKeyDown={handleCodeKeyDown}
        />
        <button
          className="btn btn-primary"
          onClick={fetchFights}
          disabled={fightsLoading || !reportCode}
        >
          {fightsLoading ? "Loading…" : "Load Fights"}
        </button>
      </div>

      {/* Step 2: Fight & Player selection */}
      {fights.length > 0 && (
        <div className="input-group">
          <select
            className="input-field"
            value={selectedFight}
            onChange={handleFightChange}
          >
            <option value="">Select a boss fight</option>
            {fights.map((f) => (
              <option key={f.ids[0]} value={f.ids[0]}>
                {f.name}
                {f.kill
                  ? " ✓"
                  : f.bossPercentage != null
                  ? ` (${(f.bossPercentage / 100).toFixed(1)}%)`
                  : ""}
                {` — ${f.duration}s`}
              </option>
            ))}
          </select>

          {playersLoading && (
            <span className="loading-text">Loading players…</span>
          )}

          {players.length > 0 && (
            <>
              <select
                className="input-field"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">Select your character</option>
                {players.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {formatNumber(p.dps)} DPS
                  </option>
                ))}
              </select>

              <select
                className="input-field"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                style={{ minWidth: "100px" }}
              >
                <option value="dps">Damage</option>
                <option value="hps">Healing</option>
              </select>

              <button
                className="btn btn-primary"
                onClick={runComparison}
                disabled={compareLoading || !selectedPlayer}
              >
                {compareLoading ? "Comparing…" : "Compare"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="card"
          style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}
        >
          <span style={{ color: "var(--accent-red)" }}>⚠ {error}</span>
        </div>
      )}

      {/* Loading */}
      {compareLoading && (
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">
            Fetching rankings and ability data — this may take a few seconds…
          </span>
        </div>
      )}

      {/* Results */}
      {compareData && (
        <>
          {/* Summary cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                Boss
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {compareData.encounterName}
              </div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                You ({compareData.player.class} — {compareData.player.spec})
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#8b5cf6" }}>
                {formatNumber(compareData.player.throughput)} {metricLabel}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                Total: {formatNumber(compareData.player.total)} &middot;{" "}
                {compareData.player.duration}s
              </div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                #1 — {compareData.top.name}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-green)" }}>
                {formatNumber(compareData.top.throughput)} {metricLabel}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                Total: {formatNumber(compareData.top.total)}
              </div>
            </div>

            {percentOfTop !== null && (
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                  % of Top
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: pctColor }}>
                  {percentOfTop}%
                </div>
              </div>
            )}
          </div>

          {/* Horizontal bar chart — shared abilities side by side */}
          {sharedAbilities.length > 0 && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                Ability Comparison
              </div>
              <ResponsiveContainer width="100%" height={Math.max(300, sharedAbilities.length * 38)}>
                <BarChart
                  data={sharedAbilities}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11 }}
                    tickFormatter={formatNumber}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.78rem",
                    }}
                    formatter={(value, name) => [formatNumber(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
                  <Bar
                    dataKey="player"
                    name={compareData.player.name + " (You)"}
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                  <Bar
                    dataKey="top"
                    name={compareData.top.name + " (#1)"}
                    fill="#22c55e"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Side-by-side ability tables */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {/* Player abilities */}
            <div className="card">
              <div style={{ color: "#8b5cf6", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                {compareData.player.name} — Abilities
              </div>
              <div className="table-container" style={{ marginTop: 0, border: "none" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ability</th>
                      <th>Total</th>
                      <th>%</th>
                      <th>Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compareData.player.abilities || []).map((a, i) => (
                      <tr key={i}>
                        <td>{a.name}</td>
                        <td>{formatNumber(a.total)}</td>
                        <td>
                          {compareData.player.total > 0
                            ? ((a.total / compareData.player.total) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                        <td>{a.hitCount + a.tickCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top player abilities */}
            <div className="card">
              <div style={{ color: "var(--accent-green)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                {compareData.top.name} (#1) — Abilities
              </div>
              <div className="table-container" style={{ marginTop: 0, border: "none" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ability</th>
                      <th>Total</th>
                      <th>%</th>
                      <th>Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compareData.top.abilities || []).map((a, i) => (
                      <tr key={i}>
                        <td>{a.name}</td>
                        <td>{formatNumber(a.total)}</td>
                        <td>
                          {compareData.top.total > 0
                            ? ((a.total / compareData.top.total) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                        <td>{a.hitCount + a.tickCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Unique abilities */}
          {(playerOnlyAbilities.length > 0 || topOnlyAbilities.length > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                marginTop: "0.75rem",
              }}
            >
              {playerOnlyAbilities.length > 0 && (
                <div className="card">
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                    Only used by you
                  </div>
                  {playerOnlyAbilities.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.25rem 0",
                        fontSize: "0.78rem",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      <span style={{ color: "var(--text-primary)" }}>{a.name}</span>
                      <span style={{ color: "#8b5cf6" }}>{formatNumber(a.player)}</span>
                    </div>
                  ))}
                </div>
              )}
              {topOnlyAbilities.length > 0 && (
                <div
                  className="card"
                  style={playerOnlyAbilities.length === 0 ? { gridColumn: "2" } : {}}
                >
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                    Only used by #1
                  </div>
                  {topOnlyAbilities.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.25rem 0",
                        fontSize: "0.78rem",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      <span style={{ color: "var(--text-primary)" }}>{a.name}</span>
                      <span style={{ color: "var(--accent-green)" }}>{formatNumber(a.top)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CompareReport;
