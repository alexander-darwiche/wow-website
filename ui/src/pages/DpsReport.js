import React, { useState } from "react";

function DpsReport({ backendUrl }) {
  const [reportCode, setReportCode] = useState("");
  const [dpsData, setDpsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const fetchDps = () => {
    if (!reportCode) return;
    setLoading(true);

    fetch(`${backendUrl}/api/dps/${reportCode}`)
      .then((res) => res.json())
      .then((data) => {
        setDpsData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch DPS data:", err);
        setLoading(false);
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchDps();
  };

  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sortedData = [...dpsData].sort((a, b) => {
      if (typeof a[key] === "string") {
        return direction === "asc"
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      } else {
        return direction === "asc" ? a[key] - b[key] : b[key] - a[key];
      }
    });

    setDpsData(sortedData);
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

  const maxDps = dpsData.length > 0 ? Math.max(...dpsData.map((d) => d.dps)) : 1;

  return (
    <div>
      <div className="page-header">
        <h2>DPS Report</h2>
        <p>Enter a WarcraftLogs report code to view DPS rankings.</p>
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
        <button className="btn btn-primary" onClick={fetchDps}>
          Fetch DPS
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading DPS data…</span>
        </div>
      )}

      {!loading && dpsData.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>#</th>
                <th onClick={() => sortData("name")}>
                  Player {getSortIndicator("name")}
                </th>
                <th onClick={() => sortData("dps")}>
                  DPS {getSortIndicator("dps")}
                </th>
                <th onClick={() => sortData("damage")}>
                  Total Damage {getSortIndicator("damage")}
                </th>
                <th style={{ width: "30%" }}>Relative</th>
              </tr>
            </thead>
            <tbody>
              {dpsData.map((entry, index) => (
                <tr key={index}>
                  <td style={{ color: "var(--text-muted)" }}>{index + 1}</td>
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
      )}

      {!loading && dpsData.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">⚔️</div>
          <div className="empty-state-text">
            Enter a report code above to see DPS data.
          </div>
        </div>
      )}
    </div>
  );
}

export default DpsReport;
