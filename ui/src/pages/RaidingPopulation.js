import React, { useState } from "react";

function RaidingPopulation({ backendUrl }) {
  const [server, setServer] = useState("");
  const [raidingData, setRaidingData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchRaidingData = () => {
    if (!server) return;
    setLoading(true);

    fetch(
      `${backendUrl}/api/raiding-population?server=${encodeURIComponent(server)}`
    )
      .then((res) => res.json())
      .then((data) => setRaidingData(data))
      .catch((err) =>
        console.error("Failed to fetch raiding population:", err)
      )
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchRaidingData();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Raiding Population</h2>
        <p>Find the number of unique raiders on a server.</p>
      </div>

      <div className="input-group">
        <input
          className="input-field"
          type="text"
          placeholder="Server name"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={fetchRaidingData}>
          Fetch
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading population data…</span>
        </div>
      )}

      {!loading && Object.keys(raidingData).length > 0 && (
        <div className="card-grid">
          {Object.entries(raidingData).map(([key, value]) => (
            <div className="stat-card" key={key}>
              <div className="stat-value">{value.toLocaleString()}</div>
              <div className="stat-label">
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && Object.keys(raidingData).length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">
            Enter a server name above to check raiding population.
          </div>
        </div>
      )}
    </div>
  );
}

export default RaidingPopulation;
