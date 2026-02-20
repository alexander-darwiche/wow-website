import React, { useState } from "react";
import { Link } from "react-router-dom";

function GuildSummary({ backendUrl }) {
  const [guild, setGuild] = useState("");
  const [server, setServer] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchGuildLogs = () => {
    if (!guild || !server) return;
    setLoading(true);
    setFetched(false);

    fetch(
      `${backendUrl}/api/guild-logs?guild=${encodeURIComponent(guild)}&server=${encodeURIComponent(server)}`
    )
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setFetched(true);
      })
      .catch((err) => console.error("Failed to fetch guild logs:", err))
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchGuildLogs();
  };

  // Group logs by zone, preserving date order within each group
  const grouped = logs.reduce((acc, log) => {
    if (!acc[log.zone]) acc[log.zone] = [];
    acc[log.zone].push(log);
    return acc;
  }, {});

  // Sort zones by the most recent log in each zone
  const sortedZones = Object.entries(grouped).sort((a, b) => {
    const aMax = Math.max(...a[1].map((l) => l.startTime || 0));
    const bMax = Math.max(...b[1].map((l) => l.startTime || 0));
    return bMax - aMax;
  });

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Guild Summary</h2>
        <p>
          Enter your guild and server to browse raid logs. Click any log to view
          DPS, gear, and more.
        </p>
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
        <button className="btn btn-primary" onClick={fetchGuildLogs}>
          Fetch Logs
        </button>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span className="loading-text">Fetching guild logs…</span>
        </div>
      )}

      {!loading && fetched && logs.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">
            No logs found for this guild / server.
          </div>
        </div>
      )}

      {!loading && sortedZones.length > 0 && (
        <div className="guild-zones">
          {sortedZones
            .map(([zone, zoneLogs]) => (
              <div key={zone} className="guild-zone-section">
                <div className="guild-zone-header">
                  <span className="guild-zone-name">{zone}</span>
                  <span className="guild-zone-count">
                    {zoneLogs.length} log{zoneLogs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="log-list">
                  {zoneLogs.map((log) => (
                    <Link
                      to={`/report/${log.code}`}
                      key={log.code}
                      className="log-card"
                    >
                      <div className="log-card-title">{log.title}</div>
                      <div className="log-card-meta">
                        <span className="log-card-owner">
                          by {log.owner}
                        </span>
                        {log.startTime ? (
                          <span className="log-card-date">
                            {formatDate(log.startTime)}
                          </span>
                        ) : null}
                        <span className="log-card-code">{log.code}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {!loading && !fetched && (
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

export default GuildSummary;
