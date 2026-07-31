import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createRaidTier, listRaidTiers } from "../api/raidTiers";
import { useIsOfficer } from "../hooks/useIsOfficer";

function RaidTiers() {
  const { guildId } = useParams();
  const isOfficer = useIsOfficer(guildId);

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", zone: "" });

  const load = () => {
    setLoading(true);
    listRaidTiers(guildId)
      .then(setTiers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [guildId]);

  const submitAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createRaidTier(guildId, { name: form.name, zone: form.zone || null });
      setForm({ name: "", zone: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Raid Tiers</h2>
        <p>Plan raid nights and build assignments for each phase of content.</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {isOfficer && (
        <div className="input-group">
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "Add Raid Tier"}
          </button>
        </div>
      )}

      {showAdd && (
        <form className="card" onSubmit={submitAdd} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            className="input-field"
            placeholder="Tier name (e.g. Molten Core)"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Zone (optional)"
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
          />
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : tiers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔥</div>
          <div className="empty-state-text">No raid tiers yet.</div>
        </div>
      ) : (
        <div className="card-grid">
          {tiers.map((t) => (
            <Link to={`/g/${guildId}/tiers/${t.id}`} key={t.id} className="feature-card">
              <div className="feature-icon">🔥</div>
              <div className="feature-title">{t.name}</div>
              <div className="feature-desc">
                {t.zone ? `${t.zone} — ` : ""}
                {t.encounters.length} encounter{t.encounters.length === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default RaidTiers;
