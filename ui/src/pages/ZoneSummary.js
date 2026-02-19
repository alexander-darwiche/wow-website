import React, { useState } from "react";

function ZoneSummary({ backendUrl }) {
  const [guild, setGuild] = useState("");
  const [server, setServer] = useState("");
  const [zoneSummary, setZoneSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchZoneSummary = () => {
    if (!guild || !server) return;
    setLoading(true);

    fetch(
      `${backendUrl}/api/zone-summary?guild=${encodeURIComponent(guild)}&server=${encodeURIComponent(server)}`
    )
      .then((res) => res.json())
      .then((data) => setZoneSummary(data))
      .catch((err) => console.error("Failed to fetch zone summary:", err))
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchZoneSummary();
  };

  return (
    <div>
      <div className="page-header">
        <h2>Zone Summary</h2>
        <p>Enter your guild and server to see raid zone report counts.</p>
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
        <button className="btn btn-primary" onClick={fetchZoneSummary}>
          Fetch
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Loading zone data…</span>
        </div>
      )}

      {!loading && Object.keys(zoneSummary).length > 0 && (
        <div className="card-grid">
          {Object.entries(zoneSummary)
            .sort((a, b) => b[1] - a[1])
            .map(([zone, count]) => (
              <div className="zone-card" key={zone}>
                <span className="zone-card-name">{zone}</span>
                <span className="zone-card-count">{count}</span>
                <span className="zone-card-label">Reports</span>
              </div>
            ))}
        </div>
      )}

      {!loading && Object.keys(zoneSummary).length === 0 && guild === "" && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">
            Enter a guild and server above to get started.
          </div>
        </div>
      )}
    </div>
  );
}

export default ZoneSummary;
