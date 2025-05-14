import React, { useState } from "react";

function GearReport() {
  const [reportCode, setReportCode] = useState("");
  const [gearData, setGearData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const fetchGear = () => {
    if (!reportCode) return;

    fetch(`http://localhost:8000/api/gear/${reportCode}`)
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
      for (let i = 1; i <= 18; i++) {
        const ilvl = player[`gear_${i}_ilvl`] || 0;
        gear.push({
          name: player[`gear_${i}_name`] || "Empty",
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
    if (ilvl >= 90) return "#c8e6c9"; // light green
    if (ilvl >= 80) return "#ffe0b2"; // light orange
    return "#ffcdd2"; // light red
  };

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
                {Array.from({ length: 18 }, (_, index) => (
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
                      backgroundColor: getIlvlColor(player.totalIlvl / 18)
                    }}
                  >
                    {player.totalIlvl}
                  </td>
                  {player.gear.map((gear, gearIndex) => (
                    <td
                      key={gearIndex}
                      style={{ backgroundColor: getIlvlColor(gear.ilvl) }}
                    >
                      {`${gear.name} (${gear.ilvl})`}
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
