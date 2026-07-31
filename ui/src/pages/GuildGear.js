import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGuildGear, refreshGuildGear, setManualGear } from "../api/gear";
import ClassBadge from "../components/ClassBadge";
import GearSheet from "../components/GearSheet";
import { useIsOfficer } from "../hooks/useIsOfficer";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function GuildGear() {
  const { guildId } = useParams();
  const isOfficer = useIsOfficer(guildId);

  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [manualId, setManualId] = useState(null);
  const [manualForm, setManualForm] = useState({ avg_ilvl: "", notes: "" });

  const load = () => {
    setLoading(true);
    getGuildGear(guildId)
      .then(setGear)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [guildId]);

  const doRefresh = async () => {
    setRefreshing(true);
    setError("");
    setRefreshResult(null);
    try {
      const result = await refreshGuildGear(guildId);
      setRefreshResult(result);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const startManual = (c) => {
    setManualId(c.character_id);
    setManualForm({ avg_ilvl: c.latest?.avg_ilvl || "", notes: "" });
  };

  const submitManual = async (characterId) => {
    setError("");
    try {
      await setManualGear(characterId, {
        avg_ilvl: parseFloat(manualForm.avg_ilvl) || 0,
        notes: manualForm.notes || null,
      });
      setManualId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Gear</h2>
        <p>Each raider's latest known gear, pulled from your guild's WarcraftLogs reports.</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {isOfficer && (
        <div className="input-group">
          <button className="btn btn-primary" onClick={doRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh Gear from Logs"}
          </button>
        </div>
      )}

      {refreshResult && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div>
            Pulled gear from report <code>{refreshResult.report_code || "n/a"}</code>. Matched{" "}
            {refreshResult.matched.length} character{refreshResult.matched.length === 1 ? "" : "s"}.
          </div>
          {refreshResult.unmatched_characters.length > 0 && (
            <div style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>
              Not found in that log: {refreshResult.unmatched_characters.join(", ")}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : gear.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛡️</div>
          <div className="empty-state-text">No characters on the roster yet.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Class / Spec</th>
                <th>Avg iLvl</th>
                <th>Source</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gear.map((c) => (
                <React.Fragment key={c.character_id}>
                  <tr>
                    <td>{c.name}</td>
                    <td>
                      <ClassBadge className={c.class_name} spec={c.spec} />
                    </td>
                    <td>{c.latest ? c.latest.avg_ilvl : "—"}</td>
                    <td>{c.latest ? c.latest.source : "—"}</td>
                    <td>{c.latest ? formatDate(c.latest.captured_at) : "—"}</td>
                    <td style={{ display: "flex", gap: "0.35rem" }}>
                      {c.latest?.gear?.gearDisplay?.length > 0 && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setExpanded(expanded === c.character_id ? null : c.character_id)}
                        >
                          {expanded === c.character_id ? "Hide" : "View"}
                        </button>
                      )}
                      {isOfficer && (
                        <button className="btn btn-secondary" onClick={() => startManual(c)}>
                          Set Manually
                        </button>
                      )}
                    </td>
                  </tr>
                  {manualId === c.character_id && (
                    <tr>
                      <td colSpan={6}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <input
                            className="input-field"
                            type="number"
                            step="0.1"
                            placeholder="Avg item level"
                            value={manualForm.avg_ilvl}
                            onChange={(e) => setManualForm({ ...manualForm, avg_ilvl: e.target.value })}
                          />
                          <input
                            className="input-field"
                            placeholder="Notes (optional)"
                            value={manualForm.notes}
                            onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                          />
                          <button className="btn btn-primary" onClick={() => submitManual(c.character_id)}>
                            Save
                          </button>
                          <button className="btn btn-secondary" onClick={() => setManualId(null)}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {expanded === c.character_id && c.latest?.gear?.gearDisplay?.length > 0 && (
                    <tr>
                      <td colSpan={6}>
                        <GearSheet
                          gearDisplay={c.latest.gear.gearDisplay}
                          avgIlvl={c.latest.avg_ilvl}
                          characterName={c.name}
                          wowClass={c.class_name}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default GuildGear;
