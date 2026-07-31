import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createRaidEvent, listRaidEvents } from "../api/raidEvents";
import { createEncounter, deleteEncounter, listRaidTiers } from "../api/raidTiers";
import { useIsOfficer } from "../hooks/useIsOfficer";

function formatDate(iso) {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RaidTierDetail() {
  const { guildId, tierId } = useParams();
  const isOfficer = useIsOfficer(guildId);

  const [tier, setTier] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newEncounter, setNewEncounter] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([listRaidTiers(guildId), listRaidEvents(tierId)])
      .then(([tiers, evts]) => {
        setTier(tiers.find((t) => String(t.id) === String(tierId)) || null);
        setEvents(evts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [guildId, tierId]);

  const submitEncounter = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createEncounter(tierId, { name: newEncounter, sort_order: (tier?.encounters.length || 0) + 1 });
      setNewEncounter("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeEncounter = async (id) => {
    setError("");
    try {
      await deleteEncounter(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createRaidEvent(tierId, {
        title: newEventTitle,
        scheduled_at: newEventDate ? new Date(newEventDate).toISOString() : null,
      });
      setNewEventTitle("");
      setNewEventDate("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!tier) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-text">{error || "Raid tier not found"}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{tier.name}</h2>
        <p>{tier.zone}</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="page-header" style={{ marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Encounters</h2>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Boss</th>
              {isOfficer && <th></th>}
            </tr>
          </thead>
          <tbody>
            {tier.encounters.map((enc) => (
              <tr key={enc.id}>
                <td>{enc.name}</td>
                {isOfficer && (
                  <td>
                    <button className="btn btn-secondary" onClick={() => removeEncounter(enc.id)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isOfficer && (
        <form onSubmit={submitEncounter} className="input-group" style={{ marginTop: "0.75rem" }}>
          <input
            className="input-field"
            placeholder="Boss name"
            required
            value={newEncounter}
            onChange={(e) => setNewEncounter(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Add Encounter
          </button>
        </form>
      )}

      <div className="page-header" style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Raid Nights</h2>
      </div>
      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">No raid nights planned yet.</div>
        </div>
      ) : (
        <div className="card-grid">
          {events.map((e) => (
            <Link to={`/g/${guildId}/tiers/${tierId}/events/${e.id}`} key={e.id} className="feature-card">
              <div className="feature-icon">📅</div>
              <div className="feature-title">{e.title}</div>
              <div className="feature-desc">
                {formatDate(e.scheduled_at)} — {e.status}
              </div>
            </Link>
          ))}
        </div>
      )}
      {isOfficer && (
        <form onSubmit={submitEvent} className="input-group" style={{ marginTop: "0.75rem" }}>
          <input
            className="input-field"
            placeholder="Raid night title (e.g. Tuesday Raid)"
            required
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
          />
          <input
            className="input-field"
            type="datetime-local"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Create Raid Night
          </button>
        </form>
      )}
    </div>
  );
}

export default RaidTierDetail;
