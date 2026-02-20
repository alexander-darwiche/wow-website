import React, { useState, useEffect } from "react";

function GearReport({ backendUrl }) {
  const [reportCode, setReportCode] = useState("");
  const [gearData, setGearData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [filterMissing, setFilterMissing] = useState(false);

  const fetchGear = () => {
    if (!reportCode) return;
    setLoading(true);

    fetch(`${backendUrl}/api/gear/${reportCode}`)
      .then((res) => res.json())
      .then((data) => {
        setGearData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch Gear data:", err);
        setLoading(false);
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchGear();
  };

  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedData = [...gearData].sort((a, b) => {
      const aVal = key === "totalIlvl" ? a.total_ilvl : a[key];
      const bVal = key === "totalIlvl" ? b.total_ilvl : b[key];

      if (typeof aVal === "string") {
        return direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (typeof aVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    setGearData(sortedData);
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return (
      <span className="sort-indicator">
        {sortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const formatGearData = (data) => {
    return data.map((player) => {
      const gear = [];
      for (let i = 0; i <= 18; i++) {
        const ilvl = player[`gear_${i}_ilvl`] || 0;
        gear.push({
          name: player[`gear_${i}_name`] || "Empty",
          itemId: player[`gear_${i}_id`] || 0,
          permanentEnchant: player[`gear_${i}_perm_enchant`] || "Empty",
          temporaryEnchant: player[`gear_${i}_temp_enchant`] || "Empty",
          ilvl,
        });
      }

      return {
        name: player.name || "Unknown Player",
        gear,
        totalIlvl: player.total_ilvl,
        missingEnchants: gear.reduce(
          (count, g, i) => count + (ENCHANT_GEAR_INDICES.has(i) && g.permanentEnchant === "Empty" ? 1 : 0),
          0
        ),
      };
    });
  };

  const getIlvlClass = (ilvl) => {
    if (ilvl >= 75) return "ilvl-high";
    if (ilvl >= 60) return "ilvl-mid";
    return "ilvl-low";
  };

  const ENCHANT_GEAR_INDICES = new Set([0, 2, 4, 6, 7, 8, 9, 14, 15]);

  // Refresh Wowhead tooltips/icons when gear data renders
  useEffect(() => {
    if (gearData.length > 0 && window.$WowheadPower) {
      setTimeout(() => window.$WowheadPower.refreshLinks(), 100);
    }
  }, [gearData]);

  const shouldHaveEnchant = (gearIndex) => ENCHANT_GEAR_INDICES.has(gearIndex);

  const missingRuneOrEnchant = (gearIndex, permanentEnchant) =>
    shouldHaveEnchant(gearIndex) && permanentEnchant === "Empty";

  const SLOT_NAMES = [
    "Head", "Neck", "Shoulder", "Shirt", "Chest",
    "Waist", "Legs", "Feet", "Wrist", "Hands",
    "Ring 1", "Ring 2", "Trinket 1", "Trinket 2", "Back",
    "Main Hand", "Off Hand", "Ranged", "Tabard",
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Gear Report</h2>
        <p>Audit gear, item levels, and enchants for every raider in a log.</p>
      </div>

      <div className="input-group">
        <input
          className="input-field"
          type="text"
          placeholder="Enter report code"
          value={reportCode}
          onChange={(e) => setReportCode(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={fetchGear}>
          Fetch Gear
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading gear data…</span>
        </div>
      )}

      {!loading && gearData.length > 0 && (
        <div>
          <div className="input-group">
            <button
              className={`btn ${filterMissing ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterMissing(!filterMissing)}
            >
              {filterMissing ? "✓ Showing Missing Enchants" : "Filter: Missing Enchants"}
            </button>
          </div>
          <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => sortData("name")}>
                  Player {getSortIndicator("name")}
                </th>
                <th onClick={() => sortData("totalIlvl")}>
                  Avg iLvl {getSortIndicator("totalIlvl")}
                </th>
                <th>Missing</th>
                {SLOT_NAMES.map((name, index) => (
                  <th key={index}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formatGearData(gearData)
                .filter((p) => !filterMissing || p.missingEnchants > 0)
                .map((player, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    {player.name}
                  </td>
                  <td>
                    <span className={`ilvl-badge ${getIlvlClass(player.totalIlvl)}`}>
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
                  {player.gear.map((gear, gearIndex) => (
                    <td
                      key={gearIndex}
                      className={
                        missingRuneOrEnchant(gearIndex, gear.permanentEnchant)
                          ? "missing-enchant"
                          : ""
                      }
                      style={{ fontSize: "0.8rem", minWidth: "120px" }}
                    >
                      <div>
                        {gear.itemId ? (
                          <a
                            href={`https://www.wowhead.com/tbc/item=${gear.itemId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wowhead-link"
                            data-wowhead={`item=${gear.itemId}&domain=tbc`}
                          >
                            {gear.name}
                          </a>
                        ) : (
                          gear.name
                        )}
                      </div>
                      <span className={`ilvl-badge ${getIlvlClass(gear.ilvl)}`}>
                        {gear.ilvl}
                      </span>
                      {shouldHaveEnchant(gearIndex) && (
                        <div className="enchant-badge">
                          {gear.permanentEnchant !== "Empty"
                            ? gear.permanentEnchant
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
      )}

      {!loading && gearData.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-text">
            Enter a report code above to audit gear.
          </div>
        </div>
      )}
    </div>
  );
}

export default GearReport;
