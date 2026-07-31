import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { addOfficer, getGuild, listMembers, removeOfficer, updateGuild } from "../api/guilds";
import { useGuildRole } from "../hooks/useIsOfficer";

function GuildSettings() {
  const { guildId } = useParams();
  const role = useGuildRole(guildId);
  const isOwner = role === "owner";

  const [guild, setGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(null);
  const [newOfficerId, setNewOfficerId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = () => {
    getGuild(guildId).then((g) => {
      setGuild(g);
      setForm({
        name: g.name,
        wcl_guild_name: g.wcl_guild_name || "",
        server_slug: g.server_slug || "",
        region: g.region || "US",
        raid_helper_api_key: "",
      });
    });
    if (isOwner) {
      listMembers(guildId).then(setMembers).catch(() => {});
    }
  };

  useEffect(load, [guildId, isOwner]);

  if (!guild || !form) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-text">You're not an officer for this guild.</div>
      </div>
    );
  }

  const saveGuild = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    const payload = {
      name: form.name,
      wcl_guild_name: form.wcl_guild_name,
      server_slug: form.server_slug,
      region: form.region,
    };
    if (form.raid_helper_api_key) payload.raid_helper_api_key = form.raid_helper_api_key;
    try {
      await updateGuild(guildId, payload);
      setStatus("Saved.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitAddOfficer = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await addOfficer(guildId, newOfficerId.trim());
      setNewOfficerId("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRemove = async (membershipId) => {
    setError("");
    try {
      await removeOfficer(guildId, membershipId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Guild Settings</h2>
        <p>{guild.name}</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {status && (
        <div className="card" style={{ borderColor: "var(--accent-green)", marginBottom: "1rem" }}>
          {status}
        </div>
      )}

      <form className="card" onSubmit={saveGuild} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 420 }}>
        <label>
          Guild Name
          <input
            className="input-field"
            style={{ width: "100%", marginTop: "0.25rem" }}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={!isOwner}
          />
        </label>
        <label>
          WarcraftLogs Guild Name
          <input
            className="input-field"
            style={{ width: "100%", marginTop: "0.25rem" }}
            value={form.wcl_guild_name}
            onChange={(e) => setForm({ ...form, wcl_guild_name: e.target.value })}
          />
        </label>
        <label>
          Server Slug
          <input
            className="input-field"
            style={{ width: "100%", marginTop: "0.25rem" }}
            value={form.server_slug}
            onChange={(e) => setForm({ ...form, server_slug: e.target.value })}
          />
        </label>
        <label>
          Region
          <select
            className="input-field"
            style={{ width: "100%", marginTop: "0.25rem" }}
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          >
            <option value="US">US</option>
            <option value="EU">EU</option>
            <option value="KR">KR</option>
            <option value="TW">TW</option>
            <option value="CN">CN</option>
          </select>
        </label>
        <label>
          Raid-Helper API Key {guild.has_raid_helper_key && "(currently set — leave blank to keep)"}
          <input
            className="input-field"
            style={{ width: "100%", marginTop: "0.25rem" }}
            type="password"
            value={form.raid_helper_api_key}
            onChange={(e) => setForm({ ...form, raid_helper_api_key: e.target.value })}
            placeholder={guild.has_raid_helper_key ? "••••••••" : "not set"}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
      </form>

      {isOwner && (
        <div style={{ marginTop: "2rem" }}>
          <div className="page-header">
            <h2>Officers</h2>
            <p>They must have logged into the site with Discord at least once before you can add them.</p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Discord ID</th>
                  <th>Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.username}</td>
                    <td>{m.discord_id}</td>
                    <td>{m.role}</td>
                    <td>
                      {m.role !== "owner" && (
                        <button className="btn btn-secondary" onClick={() => submitRemove(m.id)}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={submitAddOfficer} className="input-group" style={{ marginTop: "1rem" }}>
            <input
              className="input-field"
              placeholder="Discord ID"
              value={newOfficerId}
              onChange={(e) => setNewOfficerId(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Add Officer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default GuildSettings;
