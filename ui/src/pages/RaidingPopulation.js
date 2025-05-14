import React, { useState } from "react";

function RaidingPopulation() {
  const [server, setServer] = useState("");
  const [raidingData, setRaidingData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchRaidingData = () => {
    if (!server) return;
    setLoading(true);

    fetch(`http://localhost:8000/api/raiding-population?server=${encodeURIComponent(server)}`)
      .then(res => res.json())
      .then(data => setRaidingData(data))
      .catch(err => console.error("Failed to fetch raiding population:", err))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h2>Raiding Population</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Server name"
          value={server}
          onChange={(e) => setServer(e.target.value)}
        />
        <button onClick={fetchRaidingData} style={{ marginLeft: "10px" }}>
          Fetch
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {Object.keys(raidingData).length > 0 && (
        <div>
          {Object.entries(raidingData).map(([zone, count]) => (
            <div key={zone}>
              {zone}: {count} reports
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RaidingPopulation;
