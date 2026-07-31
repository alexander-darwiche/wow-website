import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { claimGuild, getMyGuilds } from "../api/guilds";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [myGuilds, setMyGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimable, setClaimable] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [claimForm, setClaimForm] = useState({ wcl_guild_name: "", server_slug: "", region: "US" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyGuilds()
      .then(setMyGuilds)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    try {
      setClaimable(JSON.parse(sessionStorage.getItem("claimable_guilds") || "[]"));
    } catch {
      setClaimable([]);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-text">You need to log in with Discord to see your guilds.</div>
      </div>
    );
  }

  const claimedIds = new Set(myGuilds.map((g) => g.discord_guild_id));
  const unclaimedGuilds = claimable.filter((g) => !claimedIds.has(g.id));

  const startClaim = (discordGuild) => {
    setClaimingId(discordGuild.id);
    setClaimForm({ wcl_guild_name: "", server_slug: "", region: "US" });
    setError("");
  };

  const submitClaim = async (discordGuild) => {
    setError("");
    try {
      const guild = await claimGuild({
        discord_guild_id: discordGuild.id,
        name: discordGuild.name,
        wcl_guild_name: claimForm.wcl_guild_name || null,
        server_slug: claimForm.server_slug || null,
        region: claimForm.region || "US",
      });
      setClaimingId(null);
      navigate(`/g/${guild.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>My Guilds</h2>
        <p>Guild management hubs you own or officer for.</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : myGuilds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏰</div>
          <div className="empty-state-text">You're not a member of any guild hub yet.</div>
        </div>
      ) : (
        <div className="card-grid">
          {myGuilds.map((g) => (
            <Link to={`/g/${g.id}`} key={g.id} className="feature-card">
              <div className="feature-icon">⚔️</div>
              <div className="feature-title">{g.name}</div>
              <div className="feature-desc">Role: {g.my_role}</div>
            </Link>
          ))}
        </div>
      )}

      {unclaimedGuilds.length > 0 && (
        <>
          <div className="page-header" style={{ marginTop: "2rem" }}>
            <h2>Claim a Discord Server</h2>
            <p>
              These are Discord servers you have Manage Server permission on. Claiming one creates a
              guild hub you'll be the owner of.
            </p>
          </div>
          <div className="card-grid">
            {unclaimedGuilds.map((g) => (
              <div className="card" key={g.id}>
                <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{g.name}</div>
                {claimingId === g.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input
                      className="input-field"
                      placeholder="WarcraftLogs guild name (optional, set later)"
                      value={claimForm.wcl_guild_name}
                      onChange={(e) => setClaimForm({ ...claimForm, wcl_guild_name: e.target.value })}
                    />
                    <input
                      className="input-field"
                      placeholder="Server slug (e.g. living-flame)"
                      value={claimForm.server_slug}
                      onChange={(e) => setClaimForm({ ...claimForm, server_slug: e.target.value })}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-primary" onClick={() => submitClaim(g)}>
                        Confirm Claim
                      </button>
                      <button className="btn btn-secondary" onClick={() => setClaimingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => startClaim(g)}>
                    Claim this Server
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
