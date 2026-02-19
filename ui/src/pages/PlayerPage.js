import React, { useState } from "react";
import { Link } from "react-router-dom";

function PlayerPage({ backendUrl }) {
  const [guild, setGuild] = useState("");
  const [server, setServer] = useState("");
  const [playerName, setPlayerName] = useState("");
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
  const [showGear, setShowGear] = useState(true);

  const fetchPlayerData = () => {
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
    if (e.key === "Enter") fetchPlayerData();
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

  // Gear slot layout for character sheet
  const SLOT_LABELS = {
    0: "Head", 1: "Neck", 2: "Shoulder", 14: "Back", 4: "Chest",
    3: "Shirt", 18: "Tabard", 8: "Wrist",
    9: "Hands", 5: "Waist", 6: "Legs", 7: "Feet",
    10: "Ring 1", 11: "Ring 2", 12: "Trinket 1", 13: "Trinket 2",
    15: "Main Hand", 16: "Off Hand", 17: "Ranged",
  };

  const LEFT_SLOTS = [0, 1, 2, 14, 4, 3, 18, 8];
  const RIGHT_SLOTS = [9, 5, 6, 7, 10, 11, 12, 13];
  const BOTTOM_SLOTS = [15, 16, 17];

  const getGearBySlot = (slotId) => {
    if (!data?.export?.gearDisplay) return null;
    return data.export.gearDisplay.find((g) => g.slot === slotId) || null;
  };

  const getQualityClass = (quality) => {
    if (quality >= 5) return "quality-legendary";
    if (quality >= 4) return "quality-epic";
    if (quality >= 3) return "quality-rare";
    if (quality >= 2) return "quality-uncommon";
    return "quality-common";
  };

  const SLOT_ICONS = {
    0: "🪖", 1: "📿", 2: "🦽", 14: "🧣", 4: "👕",
    3: "👔", 18: "🏷️", 8: "⌚",
    9: "🧤", 5: "🪢", 6: "👖", 7: "👢",
    10: "💍", 11: "💍", 12: "🔮", 13: "🔮",
    15: "⚔️", 16: "🛡️", 17: "🏹",
  };

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
        <button className="btn btn-primary" onClick={fetchPlayerData}>
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
          {data?.export?.gearDisplay && data.export.gearDisplay.length > 0 && (
            <div className="gear-sheet-section">
              <div
                className="gear-sheet-header"
                onClick={() => setShowGear(!showGear)}
              >
                <span className="gear-sheet-title">
                  ⚔️ Equipment
                  {data.export.avgIlvl && (
                    <span className="avg-ilvl-badge">
                      iLvl {data.export.avgIlvl}
                    </span>
                  )}
                </span>
                <span className="gear-toggle">{showGear ? "▼" : "▶"}</span>
              </div>
              {showGear && (
                <div className="gear-sheet-body">
                  <div className="gear-sheet-left">
                    {LEFT_SLOTS.map((slotId) => {
                      const item = getGearBySlot(slotId);
                      return (
                        <div
                          key={slotId}
                          className={`gear-slot ${item ? "equipped" : "empty"}`}
                        >
                          <div className="gear-slot-icon">
                            {SLOT_ICONS[slotId]}
                          </div>
                          <div className="gear-slot-info">
                            <div className="gear-slot-label">
                              {SLOT_LABELS[slotId]}
                            </div>
                            {item ? (
                              <>
                                <a
                                  href={`https://www.wowhead.com/classic/item=${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`gear-item-name ${getQualityClass(item.quality)}`}
                                >
                                  {item.name}
                                </a>
                                <div className="gear-item-details">
                                  <span className="gear-ilvl">
                                    iLvl {item.ilvl}
                                  </span>
                                  {item.enchant && (
                                    <span className="gear-enchant">
                                      ✦ {item.enchant}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="gear-empty-text">Empty</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="gear-sheet-center">
                    <div className="gear-center-frame">
                      <div className="gear-center-icon">🧙</div>
                      <div className="gear-center-name">{data.name}</div>
                      <div className="gear-center-class">{data.class}</div>
                      {data.export.avgIlvl && (
                        <div className="gear-center-ilvl">
                          Average Item Level{" "}
                          <strong>{data.export.avgIlvl}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="gear-sheet-right">
                    {RIGHT_SLOTS.map((slotId) => {
                      const item = getGearBySlot(slotId);
                      return (
                        <div
                          key={slotId}
                          className={`gear-slot ${item ? "equipped" : "empty"} right-slot`}
                        >
                          <div className="gear-slot-info right-info">
                            <div className="gear-slot-label">
                              {SLOT_LABELS[slotId]}
                            </div>
                            {item ? (
                              <>
                                <a
                                  href={`https://www.wowhead.com/classic/item=${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`gear-item-name ${getQualityClass(item.quality)}`}
                                >
                                  {item.name}
                                </a>
                                <div className="gear-item-details">
                                  <span className="gear-ilvl">
                                    iLvl {item.ilvl}
                                  </span>
                                  {item.enchant && (
                                    <span className="gear-enchant">
                                      ✦ {item.enchant}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="gear-empty-text">Empty</span>
                            )}
                          </div>
                          <div className="gear-slot-icon">
                            {SLOT_ICONS[slotId]}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="gear-sheet-bottom">
                    {BOTTOM_SLOTS.map((slotId) => {
                      const item = getGearBySlot(slotId);
                      return (
                        <div
                          key={slotId}
                          className={`gear-slot bottom-slot ${item ? "equipped" : "empty"}`}
                        >
                          <div className="gear-slot-icon">
                            {SLOT_ICONS[slotId]}
                          </div>
                          <div className="gear-slot-info">
                            <div className="gear-slot-label">
                              {SLOT_LABELS[slotId]}
                            </div>
                            {item ? (
                              <>
                                <a
                                  href={`https://www.wowhead.com/classic/item=${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`gear-item-name ${getQualityClass(item.quality)}`}
                                >
                                  {item.name}
                                </a>
                                <div className="gear-item-details">
                                  <span className="gear-ilvl">
                                    iLvl {item.ilvl}
                                  </span>
                                  {item.enchant && (
                                    <span className="gear-enchant">
                                      ✦ {item.enchant}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="gear-empty-text">Empty</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
