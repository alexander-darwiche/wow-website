import React, { useState } from "react";

function GearReport({ backendUrl }) {
  const [reportCode, setReportCode] = useState("");
  const [gearData, setGearData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const fetchGear = () => {
    if (!reportCode) return;

    fetch(`${backendUrl}/api/gear/${reportCode}`)
      .then((res) => res.json())
      .then((data) => setGearData(data))
      .catch((err) => console.error("Failed to fetch Gear data:", err));
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

  const formatGearData = (data) => {
    return data.map((player) => {
      const gear = [];
      for (let i = 0; i <= 18; i++) {
        const ilvl = player[`gear_${i}_ilvl`] || 0;
        gear.push({
          name: player[`gear_${i}_name`] || "Empty",
          permanentEnchant: player[`gear_${i}_perm_enchant`] || "Empty",
          temporaryEnchant: player[`gear_${i}_temp_enchant`] || "Empty",
          ilvl
        });
      }

      return {
        name: player.name || "Unknown Player",
        gear,
        totalIlvl: player.total_ilvl
      };
    });
  };

  const getIlvlColor = (ilvl) => {
    if (ilvl >= 75) return "#c8e6c9"; // light green
    if (ilvl >= 60) return "#ffe0b2"; // light orange
    return "#ffcdd2"; // light red
  };

  // TODO: support off-hand enchants
  const ENCHANT_GEAR_INDICES = new Set([0, 2, 4, 6, 7, 8, 9, 14, 15])
  const RUNE_GEAR_INDICES = new Set([0, 2, 4, 5, 6, 7, 8, 9, 10, 11, 14])
  const shouldHaveEnchant = (gearIndex) => {
    return ENCHANT_GEAR_INDICES.has(gearIndex);
  };
  const shouldHaveRune = (gearIndex) => {
    return RUNE_GEAR_INDICES.has(gearIndex);
  };
  const missingRuneOrEnchant = (gearIndex, permanentEnchant, temporaryEnchant) => {
    return (shouldHaveEnchant(gearIndex) && permanentEnchant === "Empty"); //|| (shouldHaveRune(gearIndex) && temporaryEnchant === "Empty");
  }

  return (
    <div>
      <h2>Gear Report</h2>
      <input
        type="text"
        placeholder="Enter report code"
        value={reportCode}
        onChange={(e) => setReportCode(e.target.value)}
      />
      <button onClick={fetchGear}>Fetch Gear</button>

      {gearData.length > 0 && (
        <div>
          <table
            border="1"
            cellPadding="8"
            style={{ marginTop: "20px", width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>Player Name</th>
                <th style={{ cursor: "pointer" }} onClick={() => sortData("totalIlvl")}>
                  Total iLvl {sortConfig.key === "totalIlvl" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                {Array.from({ length: 19 }, (_, index) => (
                  <th key={`gear_${index + 1}`}>{`Gear ${index + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formatGearData(gearData).map((player, index) => (
                <tr key={index}>
                  <td>{player.name}</td>
                  <td
                    style={{
                      fontWeight: "bold",
                      backgroundColor: getIlvlColor(player.totalIlvl)
                    }}
                  >
                    {player.totalIlvl}
                  </td>
                  {player.gear.map((gear, gearIndex) => (
                    <td
                      key={gearIndex}
                      style={{
                        backgroundColor: getIlvlColor(gear.ilvl),
                        border: missingRuneOrEnchant(gearIndex, gear.permanentEnchant, gear.temporaryEnchant) ? "5px solid red" : ""
                      }}
                    >
                      {`${gear.name} (${gear.ilvl})`}<br/>
                      <span style={{color: "green"}}>{shouldHaveEnchant(gearIndex) && `${gear.permanentEnchant}`}</span><br/>
                      {/* <span style={{color: "blue"}}>{shouldHaveRune(gearIndex) && `${gear.temporaryEnchant}`}</span> */}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default GearReport;
