import React, { useState } from "react";

function DpsReport() {
  const [reportCode, setReportCode] = useState("");
  const [dpsData, setDpsData] = useState([]);

  const fetchDps = () => {
    if (!reportCode) return;

    fetch(`http://localhost:8000/api/dps/${reportCode}`)
      .then(res => res.json())
      .then(data => setDpsData(data))
      .catch(err => console.error("Failed to fetch DPS data:", err));
  };

  return (
    <div>
      <h2>DPS Report</h2>
      <input
        type="text"
        placeholder="Enter report code"
        value={reportCode}
        onChange={(e) => setReportCode(e.target.value)}
      />
      <button onClick={fetchDps}>Fetch DPS</button>

      {dpsData.length > 0 && (
        <table border="1" cellPadding="8" style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>DPS</th>
              <th>Total Damage</th>
            </tr>
          </thead>
          <tbody>
            {dpsData.map((entry, index) => (
              <tr key={index}>
                <td>{entry.name}</td>
                <td>{entry.dps.toLocaleString()}</td>
                <td>{entry.damage.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DpsReport;
