import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import GearSheet from "../components/GearSheet";

function PlayerPage({ backendUrl }) {
  const { guild, setGuild, server, setServer } = useAppContext();
  const [searchParams] = useSearchParams();

  const [playerName, setPlayerName] = useState(() => searchParams.get("player") || "");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(null);
  const [copiedExport, setCopiedExport] = useState(false);

  // Sim DPS per boss (keyed by "reportCode-fightId")
  const [simValues, setSimValues] = useState(() => {
    try {
      const stored = localStorage.getItem("playerSimDps");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Expanded logs
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  // Refresh Wowhead tooltips/icons when data changes (GearSheet handles its own)
  useEffect(() => {
    if (data && window.$WowheadPower) {
      setTimeout(() => window.$WowheadPower.refreshLinks(), 100);
    }
  }, [data, expandedLogs]);

  // Auto-fetch when navigated with search params
  const autoFetched = React.useRef(false);
  useEffect(() => {
    if (!autoFetched.current && guild && server && playerName) {
      autoFetched.current = true;
      fetchPlayerDataFn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlayerDataFn = () => {
    if (!guild || !server || !playerName) return;
    setLoading(true);
    setFetched(false);
    setData(null);

    fetch(
      `${backendUrl}/api/player-summary?guild=${encodeURIComponent(guild)}&server=${encodeURIComponent(server)}&player=${encodeURIComponent(playerName)}`
    )
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setFetched(true);
      })
      .catch((err) => console.error("Failed to fetch player data:", err))
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchPlayerDataFn();
  };

  const toggleLog = (code) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const updateSimDps = (key, value) => {
    const numVal = value === "" ? "" : Number(value);
    const updated = { ...simValues, [key]: numVal };
    setSimValues(updated);
    localStorage.setItem("playerSimDps", JSON.stringify(updated));
  };

  const copyExport = () => {
    if (!data?.export) return;
    const exportJson = JSON.stringify(
      {
        name: data.export.name,
        race: data.export.race || "Human",
        class: data.export.className,
        level: 80,
        gear: data.export.gear,
      },
      null,
      2
    );
    navigator.clipboard.writeText(exportJson).then(() => {
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2000);
    });
  };

  const getPerformance = (actual, sim) => {
    if (!sim || sim <= 0) return null;
    return Math.round((actual / sim) * 100);
  };

  const getPerformanceColor = (pct) => {
    if (pct >= 95) return "var(--accent-green)";
    if (pct >= 85) return "var(--accent-gold)";
    if (pct >= 75) return "#f59e0b";
    return "#ef4444";
  };

  // Aggregate stats
  const allBossFights =
    data?.logs?.flatMap((log) =>
      log.bosses.map((b) => ({
        ...b,
        reportCode: log.reportCode,
        zone: log.zone,
        title: log.title,
      }))
    ) || [];

  const killFights = allBossFights.filter((f) => f.kill && f.dps > 0);
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
        <h2>Player Lookup</h2>
        <p>
          Look up a player across guild logs. Compare actual DPS to sim results
          per boss fight.
        </p>
      </div>

      <div className="input-group">
        <input
          className="input-field"
          type="text"
          placeholder="Guild name"
          value={guild}
          onChange={(e) => setGuild(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className="input-field"
          type="text"
          placeholder="Server slug (e.g. living-flame)"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          className="input-field"
          type="text"
          placeholder="Character name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={fetchPlayerDataFn}>
          Lookup
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">
            Fetching player data across logs… This may take a moment.
          </span>
        </div>
      )}

      {!loading && fetched && (!data || !data.logs || data.logs.length === 0) && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">
            No logs found for this player in the guild.
          </div>
        </div>
      )}

      {!loading && data && data.logs && data.logs.length > 0 && (
        <div>
          {/* Player header */}
          <div className="player-header">
            <div className="player-header-info">
              <h3 className="player-name">{data.player}</h3>
              <span className="player-class-badge">
                {data.playerClass}
                {data.spec ? ` — ${data.spec}` : ""}
              </span>
            </div>
            <div className="player-header-actions">
              {data.export && (
                <button className="sim-export-btn" onClick={copyExport}>
                  {copiedExport ? "✓ Copied!" : "Copy WoWSims Export"}
                </button>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="player-stats">
            <div className="player-stat-card">
              <div className="player-stat-value">{data.logs.length}</div>
              <div className="player-stat-label">Logs</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">{killFights.length}</div>
              <div className="player-stat-label">Boss Kills</div>
            </div>
            <div className="player-stat-card">
              <div className="player-stat-value">
                {avgDps.toLocaleString()}
              </div>
              <div className="player-stat-label">Avg Boss DPS</div>
            </div>
            <div className="player-stat-card highlight">
              <div className="player-stat-value">
                {bestDps.toLocaleString()}
              </div>
              <div className="player-stat-label">
                Best DPS{bestFight ? ` (${bestFight.boss})` : ""}
              </div>
            </div>
          </div>

          {/* Gear Character Sheet */}
          {data?.export?.gearDisplay && (
            <GearSheet
              gearDisplay={data.export.gearDisplay}
              avgIlvl={data.export.avgIlvl}
              characterName={data.player}
              wowClass={data.playerClass}
            />
          )}

          {/* Instructions */}
          <div className="sim-instructions">
            <p>
              <strong>How to compare:</strong> Click{" "}
              <em>Copy WoWSims Export</em> above to get gear JSON. Paste into{" "}
              <a
                href="https://wowsims.github.io/classic/"
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
              >
                WoWSims
              </a>{" "}
              via <em>Import → Addon</em>. Sim each boss, then enter the
              result in the <em>Sim DPS</em> column below.
            </p>
          </div>

          {/* Logs accordion */}
          <div className="player-logs">
            {data.logs.map((log) => (
              <div key={log.reportCode} className="player-log-section">
                <div
                  className="player-log-header"
                  onClick={() => toggleLog(log.reportCode)}
                >
                  <div className="player-log-header-left">
                    <span className="player-log-expand">
                      {expandedLogs.has(log.reportCode) ? "▼" : "▶"}
                    </span>
                    <span className="player-log-zone">{log.zone}</span>
                    <span className="player-log-title">{log.title}</span>
                  </div>
                  <div className="player-log-header-right">
                    <span className="ilvl-badge ilvl-high">
                      {log.overallDps.toLocaleString()} DPS
                    </span>
                    <Link
                      to={`/report/${log.reportCode}`}
                      className="player-log-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Report ↗
                    </Link>
                  </div>
                </div>

                {expandedLogs.has(log.reportCode) && (
                  <div className="player-boss-table-wrap">
                    <table className="data-table player-boss-table">
                      <thead>
                        <tr>
                          <th>Boss</th>
                          <th>Duration</th>
                          <th>Result</th>
                          <th>Actual DPS</th>
                          <th>Sim DPS</th>
                          <th>% of Sim</th>
                          <th style={{ width: "18%" }}>Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.bosses.map((boss) => {
                          const simKey = `${log.reportCode}-${boss.fightId}`;
                          const simVal = simValues[simKey] || "";
                          const perf = getPerformance(boss.dps, simVal);
                          const mins = Math.floor(boss.duration / 60);
                          const secs = String(
                            Math.floor(boss.duration % 60)
                          ).padStart(2, "0");

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
                                    boss.dps === 0 &&
                                    ""}
                                </span>
                              </td>
                              <td>
                                {boss.dps > 0 ? (
                                  <span className="ilvl-badge ilvl-high">
                                    {boss.dps.toLocaleString()}
                                  </span>
                                ) : (
                                  <span
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="sim-input"
                                  placeholder="Sim DPS"
                                  value={simVal}
                                  onChange={(e) =>
                                    updateSimDps(simKey, e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                {perf !== null ? (
                                  <span
                                    className="sim-pct-badge"
                                    style={{
                                      color: getPerformanceColor(perf),
                                    }}
                                  >
                                    {perf}%
                                  </span>
                                ) : (
                                  <span
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                              <td>
                                {perf !== null ? (
                                  <div
                                    style={{
                                      background: "var(--bg-input)",
                                      borderRadius: "var(--radius-sm)",
                                      overflow: "hidden",
                                      height: "8px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(perf, 100)}%`,
                                        height: "100%",
                                        background:
                                          getPerformanceColor(perf),
                                        borderRadius: "var(--radius-sm)",
                                        transition: "width 0.4s ease",
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: "var(--text-muted)",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    Enter sim →
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !fetched && (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text">
            Enter guild, server, and player name to get started.
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerPage;
