import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";

function ReportDetail({ backendUrl }) {
  const { code } = useParams();
  const [activeTab, setActiveTab] = useState("dps");

  // Fights state
  const [fights, setFights] = useState([]);
  const [fightsLoading, setFightsLoading] = useState(false);
  const [selectedFight, setSelectedFight] = useState("all"); // "all" or fight id

  // DPS state
  const [dpsData, setDpsData] = useState([]);
  const [dpsLoading, setDpsLoading] = useState(false);
  const [dpsSortConfig, setDpsSortConfig] = useState({
    key: "dps",
    direction: "desc",
  });

  // Healing state
  const [healingData, setHealingData] = useState([]);
  const [healingLoading, setHealingLoading] = useState(false);
  const [healingSortConfig, setHealingSortConfig] = useState({
    key: "hps",
    direction: "desc",
  });

  // Gear state
  const [gearData, setGearData] = useState([]);
  const [gearLoading, setGearLoading] = useState(false);
  const [gearFilterMissing, setGearFilterMissing] = useState(false);
  const [gearSortConfig, setGearSortConfig] = useState({
    key: "",
    direction: "asc",
  });
  const [copiedAudit, setCopiedAudit] = useState(false);

  // Sim comparison state
  const [simExportData, setSimExportData] = useState([]);
  const [simExportLoading, setSimExportLoading] = useState(false);
  const [simExportFetched, setSimExportFetched] = useState(null);
  const [simDpsValues, setSimDpsValues] = useState(() => {
    try {
      const stored = localStorage.getItem(`simDps_${code}`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [copiedPlayer, setCopiedPlayer] = useState(null);

  // Keep track of which fight was last fetched per tab so we can re-fetch on change
  const [dpsFetchedFight, setDpsFetchedFight] = useState(null);
  const [healingFetchedFight, setHealingFetchedFight] = useState(null);
  const [gearFetchedFight, setGearFetchedFight] = useState(null);

  const fightParam = selectedFight !== "all" ? `?fight_ids=${selectedFight}` : "";

  // Refresh Wowhead tooltips/icons when gear data renders
  useEffect(() => {
    if (gearData.length > 0 && window.$WowheadPower) {
      setTimeout(() => window.$WowheadPower.refreshLinks(), 100);
    }
  }, [gearData]);

  // Fetch fights on mount
  useEffect(() => {
    setFightsLoading(true);
    fetch(`${backendUrl}/api/fights/${code}`)
      .then((res) => res.json())
      .then((data) => setFights(data))
      .catch((err) => console.error("Failed to fetch fights:", err))
      .finally(() => setFightsLoading(false));
  }, [backendUrl, code]);

  // Fetch DPS
  const fetchDps = useCallback(() => {
    setDpsLoading(true);
    fetch(`${backendUrl}/api/dps/${code}${fightParam}`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.dps - a.dps);
        setDpsData(sorted);
        setDpsFetchedFight(selectedFight);
        setDpsSortConfig({ key: "dps", direction: "desc" });
      })
      .catch((err) => console.error("Failed to fetch DPS:", err))
      .finally(() => setDpsLoading(false));
  }, [backendUrl, code, fightParam, selectedFight]);

  // Fetch Healing
  const fetchHealing = useCallback(() => {
    setHealingLoading(true);
    fetch(`${backendUrl}/api/healing/${code}${fightParam}`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort((a, b) => b.hps - a.hps);
        setHealingData(sorted);
        setHealingFetchedFight(selectedFight);
        setHealingSortConfig({ key: "hps", direction: "desc" });
      })
      .catch((err) => console.error("Failed to fetch Healing:", err))
      .finally(() => setHealingLoading(false));
  }, [backendUrl, code, fightParam, selectedFight]);

  // Fetch Gear
  const fetchGear = useCallback(() => {
    setGearLoading(true);
    fetch(`${backendUrl}/api/gear/${code}${fightParam}`)
      .then((res) => res.json())
      .then((data) => {
        setGearData(data);
        setGearFetchedFight(selectedFight);
      })
      .catch((err) => console.error("Failed to fetch Gear:", err))
      .finally(() => setGearLoading(false));
  }, [backendUrl, code, fightParam, selectedFight]);

  // Fetch WoWSims export data
  const fetchSimExport = useCallback(() => {
    setSimExportLoading(true);
    fetch(`${backendUrl}/api/wowsims-export/${code}${fightParam}`)
      .then((res) => res.json())
      .then((data) => {
        setSimExportData(data);
        setSimExportFetched(selectedFight);
      })
      .catch((err) => console.error("Failed to fetch sim export:", err))
      .finally(() => setSimExportLoading(false));
  }, [backendUrl, code, fightParam, selectedFight]);

  // Auto-fetch active tab when fight changes or on initial load
  useEffect(() => {
    if (activeTab === "dps" && dpsFetchedFight !== selectedFight) fetchDps();
  }, [activeTab, selectedFight, dpsFetchedFight, fetchDps]);

  useEffect(() => {
    if (activeTab === "healing" && healingFetchedFight !== selectedFight) fetchHealing();
  }, [activeTab, selectedFight, healingFetchedFight, fetchHealing]);

  useEffect(() => {
    if (activeTab === "gear" && gearFetchedFight !== selectedFight) fetchGear();
  }, [activeTab, selectedFight, gearFetchedFight, fetchGear]);

  useEffect(() => {
    if (activeTab === "sim") {
      if (dpsFetchedFight !== selectedFight) fetchDps();
      if (simExportFetched !== selectedFight) fetchSimExport();
    }
  }, [activeTab, selectedFight, dpsFetchedFight, simExportFetched, fetchDps, fetchSimExport]);

  // --- DPS sorting ---
  const sortDps = (key) => {
    let direction = "asc";
    if (dpsSortConfig.key === key && dpsSortConfig.direction === "asc") {
      direction = "desc";
    }
    const sorted = [...dpsData].sort((a, b) => {
      if (typeof a[key] === "string")
        return direction === "asc"
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      return direction === "asc" ? a[key] - b[key] : b[key] - a[key];
    });
    setDpsData(sorted);
    setDpsSortConfig({ key, direction });
  };

  const dpsIndicator = (key) =>
    dpsSortConfig.key === key ? (
      <span className="sort-indicator">
        {dpsSortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    ) : null;

  const maxDps =
    dpsData.length > 0 ? Math.max(...dpsData.map((d) => d.dps)) : 1;

  // --- Healing sorting ---
  const sortHealing = (key) => {
    let direction = "asc";
    if (healingSortConfig.key === key && healingSortConfig.direction === "asc") {
      direction = "desc";
    }
    const sorted = [...healingData].sort((a, b) => {
      if (typeof a[key] === "string")
        return direction === "asc"
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      return direction === "asc" ? a[key] - b[key] : b[key] - a[key];
    });
    setHealingData(sorted);
    setHealingSortConfig({ key, direction });
  };

  const healingIndicator = (key) =>
    healingSortConfig.key === key ? (
      <span className="sort-indicator">
        {healingSortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    ) : null;

  const maxHps =
    healingData.length > 0 ? Math.max(...healingData.map((d) => d.hps)) : 1;

  // --- Gear sorting ---
  const countMissing = (player) => {
    let count = 0;
    for (const i of [0, 2, 4, 6, 7, 8, 9, 14, 15]) {
      if (!player[`gear_${i}_perm_enchant`] || player[`gear_${i}_perm_enchant`] === "") count++;
    }
    return count;
  };

  const sortGear = (key) => {
    let direction = "asc";
    if (gearSortConfig.key === key && gearSortConfig.direction === "asc") {
      direction = "desc";
    }
    const sorted = [...gearData].sort((a, b) => {
      let aVal, bVal;
      if (key === "totalIlvl") {
        aVal = a.total_ilvl; bVal = b.total_ilvl;
      } else if (key === "missingEnchants") {
        aVal = countMissing(a); bVal = countMissing(b);
      } else if (key === "className") {
        aVal = `${a.className || ""}-${a.spec || ""}`;
        bVal = `${b.className || ""}-${b.spec || ""}`;
      } else {
        aVal = a[key]; bVal = b[key];
      }
      if (typeof aVal === "string")
        return direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      if (typeof aVal === "number")
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      return 0;
    });
    setGearData(sorted);
    setGearSortConfig({ key, direction });
  };

  const gearIndicator = (key) =>
    gearSortConfig.key === key ? (
      <span className="sort-indicator">
        {gearSortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    ) : null;

  const formatGearData = (data) =>
    data.map((player) => {
      const gear = [];
      for (let i = 0; i <= 18; i++) {
        gear.push({
          name: player[`gear_${i}_name`] || "Empty",
          itemId: player[`gear_${i}_id`] || 0,
          permanentEnchant: player[`gear_${i}_perm_enchant`] || "Empty",
          temporaryEnchant: player[`gear_${i}_temp_enchant`] || "Empty",
          ilvl: player[`gear_${i}_ilvl`] || 0,
        });
      }
      return {
        name: player.name || "Unknown Player",
        className: player.className || "",
        spec: player.spec || "",
        gear,
        totalIlvl: player.total_ilvl,
        missingEnchants: gear.reduce(
          (count, g, i) => count + (shouldHaveEnchant(i) && g.permanentEnchant === "Empty" ? 1 : 0),
          0
        ),
      };
    });

  const getIlvlClass = (ilvl) => {
    if (ilvl >= 75) return "ilvl-high";
    if (ilvl >= 60) return "ilvl-mid";
    return "ilvl-low";
  };

  const ENCHANT_GEAR_INDICES = new Set([0, 2, 4, 6, 7, 8, 9, 14, 15]);
  const shouldHaveEnchant = (i) => ENCHANT_GEAR_INDICES.has(i);
  const missingEnchant = (i, enc) =>
    shouldHaveEnchant(i) && enc === "Empty";

  const SLOT_NAMES = [
    "Head", "Neck", "Shoulder", "Shirt", "Chest",
    "Waist", "Legs", "Feet", "Wrist", "Hands",
    "Ring 1", "Ring 2", "Trinket 1", "Trinket 2", "Back",
    "Main Hand", "Off Hand", "Ranged", "Tabard",
  ];

  const exportEnchantAudit = () => {
    const formatted = formatGearData(gearData);
    const lines = [];
    lines.push("⚠️ ENCHANT AUDIT");
    lines.push("═══════════════════════════════");
    let allGood = true;
    for (const player of formatted) {
      const missing = [];
      player.gear.forEach((g, i) => {
        if (shouldHaveEnchant(i) && g.permanentEnchant === "Empty") {
          missing.push(SLOT_NAMES[i]);
        }
      });
      if (missing.length > 0) {
        allGood = false;
        const classInfo = player.className ? ` (${player.className}${player.spec ? " - " + player.spec : ""})` : "";
        lines.push(`❌ ${player.name}${classInfo}`);
        missing.forEach((slot) => lines.push(`   └─ ${slot}: No enchant`));
      }
    }
    if (allGood) {
      lines.push("✅ All players have enchants on all required slots!");
    }
    lines.push("═══════════════════════════════");
    const summary = formatted.filter((p) => p.missingEnchants > 0);
    lines.push(`${summary.length} of ${formatted.length} players missing enchants`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2000);
    });
  };

  // --- Sim comparison helpers ---
  const updateSimDps = (playerName, value) => {
    const numVal = value === "" ? "" : Number(value);
    const updated = { ...simDpsValues, [playerName]: numVal };
    setSimDpsValues(updated);
    localStorage.setItem(`simDps_${code}`, JSON.stringify(updated));
  };

  const copyExport = (playerExport) => {
    const exportJson = JSON.stringify({
      name: playerExport.name,
      race: playerExport.race || "Human",
      class: playerExport.className,
      level: 80,
      gear: playerExport.gear,
    }, null, 2);
    navigator.clipboard.writeText(exportJson).then(() => {
      setCopiedPlayer(playerExport.name);
      setTimeout(() => setCopiedPlayer(null), 2000);
    });
  };

  const getSimPerformance = (actual, sim) => {
    if (!sim || sim <= 0) return null;
    return Math.round((actual / sim) * 100);
  };

  const getPerformanceColor = (pct) => {
    if (pct >= 95) return "var(--accent-green)";
    if (pct >= 85) return "var(--accent-gold)";
    if (pct >= 75) return "#f59e0b";
    return "#ef4444";
  };

  const simData = dpsData.map((d) => {
    const exportEntry = simExportData.find((e) => e.name === d.name);
    return {
      ...d,
      export: exportEntry || null,
      simDps: simDpsValues[d.name] || "",
      performance: getSimPerformance(d.dps, simDpsValues[d.name]),
    };
  });

  const tabs = [
    { id: "dps", label: "DPS", icon: "⚔️" },
    { id: "healing", label: "Healing", icon: "💚" },
    { id: "gear", label: "Gear", icon: "🛡️" },
    { id: "sim", label: "Sim Comparison", icon: "📊" },
  ];

  return (
    <div>
      <div className="page-header">
        <Link to="/guild" className="back-link">
          ← Back to Guild Summary
        </Link>
        <h2>Report: {code}</h2>
        <p>
          <a
            href={`https://fresh.warcraftlogs.com/reports/${code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            View on WarcraftLogs ↗
          </a>
        </p>
      </div>

      {/* Fight selector */}
      <div className="fight-selector">
        <label className="fight-label">Fight:</label>
        {fightsLoading ? (
          <span className="loading-text" style={{ fontSize: "0.85rem" }}>Loading fights…</span>
        ) : (
          <select
            className="fight-dropdown"
            value={selectedFight}
            onChange={(e) => setSelectedFight(e.target.value === "all" ? "all" : e.target.value)}
          >
            <option value="all">All Fights</option>
            {fights.map((f, idx) => {
              const idsValue = f.ids.join(",");
              const mins = Math.floor(f.duration / 60);
              const secs = String(Math.floor(f.duration % 60)).padStart(2, "0");
              const timeStr = `${mins}:${secs}`;
              const status = f.isTrash ? " 🗑️" : f.kill ? " ✓" : " ✗";
              return (
                <option key={idx} value={idsValue}>
                  {f.name}{status} ({timeStr})
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* DPS Tab */}
      {activeTab === "dps" && (
        <div>
          {dpsLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span className="loading-text">Loading DPS data…</span>
            </div>
          ) : dpsData.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th onClick={() => sortDps("name")}>
                      Player {dpsIndicator("name")}
                    </th>
                    <th onClick={() => sortDps("dps")}>
                      DPS {dpsIndicator("dps")}
                    </th>
                    <th onClick={() => sortDps("damage")}>
                      Total Damage {dpsIndicator("damage")}
                    </th>
                    <th style={{ width: "30%" }}>Relative</th>
                  </tr>
                </thead>
                <tbody>
                  {dpsData.map((entry, index) => (
                    <tr key={index}>
                      <td style={{ color: "var(--text-muted)" }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{entry.name}</td>
                      <td>
                        <span className="ilvl-badge ilvl-high">
                          {entry.dps.toLocaleString()}
                        </span>
                      </td>
                      <td>{entry.damage.toLocaleString()}</td>
                      <td>
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
                              width: `${(entry.dps / maxDps) * 100}%`,
                              height: "100%",
                              background:
                                "linear-gradient(90deg, var(--accent-gold), var(--accent-gold-hover))",
                              borderRadius: "var(--radius-sm)",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">⚔️</div>
              <div className="empty-state-text">No DPS data available.</div>
            </div>
          )}
        </div>
      )}

      {/* Healing Tab */}
      {activeTab === "healing" && (
        <div>
          {healingLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span className="loading-text">Loading healing data…</span>
            </div>
          ) : healingData.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th onClick={() => sortHealing("name")}>
                      Player {healingIndicator("name")}
                    </th>
                    <th onClick={() => sortHealing("hps")}>
                      HPS {healingIndicator("hps")}
                    </th>
                    <th onClick={() => sortHealing("healing")}>
                      Total Healing {healingIndicator("healing")}
                    </th>
                    <th onClick={() => sortHealing("overheal")}>
                      Overheal {healingIndicator("overheal")}
                    </th>
                    <th style={{ width: "25%" }}>Relative</th>
                  </tr>
                </thead>
                <tbody>
                  {healingData.map((entry, index) => (
                    <tr key={index}>
                      <td style={{ color: "var(--text-muted)" }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{entry.name}</td>
                      <td>
                        <span className="ilvl-badge" style={{ background: "rgba(34,197,94,0.15)", color: "var(--accent-green)" }}>
                          {entry.hps.toLocaleString()}
                        </span>
                      </td>
                      <td>{entry.healing.toLocaleString()}</td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {entry.overheal.toLocaleString()}
                      </td>
                      <td>
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
                              width: `${(entry.hps / maxHps) * 100}%`,
                              height: "100%",
                              background:
                                "linear-gradient(90deg, var(--accent-green), #4ade80)",
                              borderRadius: "var(--radius-sm)",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">💚</div>
              <div className="empty-state-text">No healing data available.</div>
            </div>
          )}
        </div>
      )}

      {/* Gear Tab */}
      {activeTab === "gear" && (
        <div>
          {gearLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span className="loading-text">Loading gear data…</span>
            </div>
          ) : gearData.length > 0 ? (
            <div>
              <div className="input-group">
                <button
                  className={`btn ${gearFilterMissing ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setGearFilterMissing(!gearFilterMissing)}
                >
                  {gearFilterMissing ? "✓ Showing Missing Enchants" : "Filter: Missing Enchants"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={exportEnchantAudit}
                >
                  {copiedAudit ? "✓ Copied!" : "📋 Export Enchant Audit"}
                </button>
              </div>
              <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => sortGear("name")}>
                      Player {gearIndicator("name")}
                    </th>
                    <th onClick={() => sortGear("className")}>
                      Class / Spec {gearIndicator("className")}
                    </th>
                    <th onClick={() => sortGear("totalIlvl")}>
                      Avg iLvl {gearIndicator("totalIlvl")}
                    </th>
                    <th onClick={() => sortGear("missingEnchants")} style={{ cursor: "pointer" }}>
                      Missing {gearIndicator("missingEnchants")}
                    </th>
                    {SLOT_NAMES.map((name, i) => (
                      <th key={i}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formatGearData(gearData)
                    .filter((p) => !gearFilterMissing || p.missingEnchants > 0)
                    .map((player, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {player.name}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                        <span className="class-spec-label">
                          {player.className}{player.spec ? ` — ${player.spec}` : ""}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`ilvl-badge ${getIlvlClass(
                            player.totalIlvl
                          )}`}
                        >
                          {player.totalIlvl}
                        </span>
                      </td>
                      <td>
                        {player.missingEnchants > 0 ? (
                          <span className="ilvl-badge ilvl-low" style={{ fontWeight: 700 }}>
                            {player.missingEnchants}
                          </span>
                        ) : (
                          <span className="ilvl-badge ilvl-high">✓</span>
                        )}
                      </td>
                      {player.gear.map((g, gi) => (
                        <td
                          key={gi}
                          className={
                            missingEnchant(gi, g.permanentEnchant)
                              ? "missing-enchant"
                              : ""
                          }
                          style={{ fontSize: "0.8rem", minWidth: "120px" }}
                        >
                          <div>
                            {g.itemId ? (
                              <a
                                href={`https://www.wowhead.com/tbc/item=${g.itemId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="wowhead-link"
                                data-wowhead={`item=${g.itemId}&domain=tbc`}
                              >
                                {g.name}
                              </a>
                            ) : (
                              g.name
                            )}
                          </div>
                          <span
                            className={`ilvl-badge ${getIlvlClass(g.ilvl)}`}
                          >
                            {g.ilvl}
                          </span>
                          {shouldHaveEnchant(gi) && (
                            <div className="enchant-badge">
                              {g.permanentEnchant !== "Empty"
                                ? g.permanentEnchant
                                : "⚠ No enchant"}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <div className="empty-state-text">No gear data available.</div>
            </div>
          )}
        </div>
      )}

      {/* Sim Comparison Tab */}
      {activeTab === "sim" && (
        <div>
          <div className="sim-instructions">
            <p>
              <strong>How to use:</strong> Click <em>Copy Export</em> to copy a player's gear as WoWSims JSON.
              Paste it into <a href="https://wowsims.github.io/classic/" target="_blank" rel="noopener noreferrer" className="external-link">WoWSims</a> via
              <em> Import → Addon</em>, run the sim, then enter the resulting DPS below to compare.
            </p>
          </div>

          {(dpsLoading || simExportLoading) ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span className="loading-text">Loading sim data…</span>
            </div>
          ) : simData.length > 0 ? (
            <div className="table-container">
              <table className="data-table sim-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Player</th>
                    <th>Class / Spec</th>
                    <th>Actual DPS</th>
                    <th>Sim DPS</th>
                    <th>% of Sim</th>
                    <th style={{ width: "22%" }}>Performance</th>
                    <th>Export</th>
                  </tr>
                </thead>
                <tbody>
                  {simData.map((entry, index) => (
                    <tr key={index}>
                      <td style={{ color: "var(--text-muted)" }}>{index + 1}</td>
                      <td style={{ fontWeight: 600 }}>{entry.name}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {entry.export ? `${entry.export.className} — ${entry.export.spec}` : "—"}
                      </td>
                      <td>
                        <span className="ilvl-badge ilvl-high">
                          {entry.dps.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="sim-input"
                          placeholder="Sim DPS"
                          value={entry.simDps}
                          onChange={(e) => updateSimDps(entry.name, e.target.value)}
                        />
                      </td>
                      <td>
                        {entry.performance !== null ? (
                          <span
                            className="sim-pct-badge"
                            style={{ color: getPerformanceColor(entry.performance) }}
                          >
                            {entry.performance}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {entry.performance !== null ? (
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
                                width: `${Math.min(entry.performance, 100)}%`,
                                height: "100%",
                                background: getPerformanceColor(entry.performance),
                                borderRadius: "var(--radius-sm)",
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            Enter sim DPS →
                          </span>
                        )}
                      </td>
                      <td>
                        {entry.export ? (
                          <button
                            className="sim-export-btn"
                            onClick={() => copyExport(entry.export)}
                          >
                            {copiedPlayer === entry.name ? "✓ Copied!" : "Copy Export"}
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">No data available for sim comparison.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportDetail;
