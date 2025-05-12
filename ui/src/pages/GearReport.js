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
      if (typeof a[key] === "string") {
        return direction === "asc"
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      } else if (typeof a[key] === "number") {
        return direction === "asc" ? a[key] - b[key] : b[key] - a[key];
      }
      return 0;
    });

    setGearData(sortedData);
    setSortConfig({ key, direction });
  };

  const formatGearData = (data) => {
    return data.map((player) => {
      const gear = [];
    //   let totalIlvl = 0;

      for (let i = 1; i <= 18; i++) {
        const ilvl = player[`gear_${i}_ilvl`] || 0;
        gear.push({
          name: player[`gear_${i}_name`] || "Empty",
          ilvl
        });
        // totalIlvl += ilvl;
      }

      return {
        name: player.name || "Unknown Player",
        gear,
        totalIlvl: player.total_ilvl
      };
    });
  };

  const getIlvlColor = (ilvl) => {
    if (ilvl >= 90) return "green";
    if (ilvl >= 80) return "orange";
    return "red";
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
          <table border="1" cellPadding="8" style={{ marginTop: "20px", width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Player Name</th>
                <th>Total iLvl</th>
                {Array.from({ length: 18 }, (_, index) => (
                  <th key={`gear_${index + 1}`}>{`Gear ${index + 1}`}</th>
                ))}
                
              </tr>
            </thead>
            <tbody>
              {formatGearData(gearData).map((player, index) => (
                <tr key={index}>
                  <td>{player.name}</td>
                  <td style={{ fontWeight: "bold", color: getIlvlColor(player.totalIlvl) }}>
                    {player.totalIlvl}
                  </td>
                  {player.gear.map((gear, gearIndex) => (
                    <td key={gearIndex} style={{ color: getIlvlColor(gear.ilvl) }}>
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
