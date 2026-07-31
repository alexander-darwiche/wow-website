import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGuild } from "../api/guilds";
import { useIsOfficer } from "../hooks/useIsOfficer";

function GuildHome() {
  const { guildId } = useParams();
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isOfficer = useIsOfficer(guildId);

  useEffect(() => {
    setLoading(true);
    getGuild(guildId)
      .then(setGuild)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !guild) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-text">{error || "Guild not found"}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{guild.name}</h2>
        <p>
          {guild.wcl_guild_name
            ? `${guild.wcl_guild_name} — ${guild.server_slug || "?"} (${guild.region})`
            : "WarcraftLogs guild not linked yet — set it up in Settings."}
        </p>
      </div>

      <div className="card-grid">
        <Link to={`/g/${guildId}/roster`} className="feature-card">
          <div className="feature-icon">📋</div>
          <div className="feature-title">Roster</div>
          <div className="feature-desc">Manage your guild's characters, classes, and roles.</div>
        </Link>

        <Link to={`/g/${guildId}/gear`} className="feature-card">
          <div className="feature-icon">🛡️</div>
          <div className="feature-title">Gear</div>
          <div className="feature-desc">Track each raider's latest gear, pulled from your logs.</div>
        </Link>

        <Link to={`/g/${guildId}/tiers`} className="feature-card">
          <div className="feature-icon">🔥</div>
          <div className="feature-title">Raid Tiers</div>
          <div className="feature-desc">Plan raid nights and build group/role assignments.</div>
        </Link>

        {isOfficer && (
          <Link to={`/g/${guildId}/settings`} className="feature-card">
            <div className="feature-icon">⚙️</div>
            <div className="feature-title">Settings</div>
            <div className="feature-desc">WarcraftLogs mapping, Raid-Helper key, officers.</div>
          </Link>
        )}
      </div>
    </div>
  );
}

export default GuildHome;
