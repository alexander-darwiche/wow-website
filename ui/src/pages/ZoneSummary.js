import React, { useState } from "react";

function ZoneSummary() {
  const [guild, setGuild] = useState("");
  const [server, setServer] = useState("");
  const [zoneSummary, setZoneSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchZoneSummary = () => {
    if (!guild || !server) return;
    setLoading(true);

    fetch(`http://localhost:8000/api/zone-summary?guild=${encodeURIComponent(guild)}&server=${encodeURIComponent(server)}`)
      .then(res => res.json())
      .then(data => setZoneSummary(data))
      .catch(err => console.error("Failed to fetch zone summary:", err))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h2>Zone Summary</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Guild name"
          value={guild}
          onChange={(e) => setGuild(e.target.value)}
        />
        <input
          type="text"
          placeholder="Server name"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          style={{ marginLeft: "10px" }}
        />
        <button onClick={fetchZoneSummary} style={{ marginLeft: "10px" }}>
          Fetch
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {Object.keys(zoneSummary).length > 0 && (
        <div>
          {Object.entries(zoneSummary).map(([zone, count]) => (
            <div key={zone}>
              {zone}: {count} reports
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ZoneSummary;
