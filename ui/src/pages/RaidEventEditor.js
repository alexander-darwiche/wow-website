import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listCharacters } from "../api/characters";
import { getRaidEvent, setAssignments, setEncounterNote } from "../api/raidEvents";
import { listRaidTiers } from "../api/raidTiers";
import ClassBadge from "../components/ClassBadge";
import { useIsOfficer } from "../hooks/useIsOfficer";

const GROUPS = [1, 2, 3, 4, 5, 6, 7, 8];

function RaidEventEditor() {
  const { guildId, tierId, eventId } = useParams();
  const isOfficer = useIsOfficer(guildId);

  const [event, setEvent] = useState(null);
  const [tier, setTier] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [groupByCharacter, setGroupByCharacter] = useState({});
  const [notesByEncounter, setNotesByEncounter] = useState({});
  const [activeEncounterId, setActiveEncounterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([getRaidEvent(eventId), listRaidTiers(guildId), listCharacters(guildId)])
      .then(([evt, tiers, chars]) => {
        setEvent(evt);
        const t = tiers.find((x) => String(x.id) === String(tierId)) || null;
        setTier(t);
        setCharacters(chars);

        const groups = {};
        evt.assignments.forEach((a) => {
          groups[a.character_id] = a.group_number;
        });
        setGroupByCharacter(groups);

        const notes = {};
        evt.encounter_notes.forEach((n) => {
          notes[n.encounter_id] = n.notes || "";
        });
        setNotesByEncounter(notes);
        if (t?.encounters?.length > 0) setActiveEncounterId(t.encounters[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [guildId, tierId, eventId]);

  const setGroup = (characterId, value) => {
    setGroupByCharacter((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[characterId];
      } else {
        next[characterId] = parseInt(value, 10);
      }
      return next;
    });
  };

  const saveAssignments = async () => {
    setError("");
    setStatus("");
    try {
      const assignments = Object.entries(groupByCharacter).map(([characterId, groupNumber]) => ({
        character_id: parseInt(characterId, 10),
        group_number: groupNumber,
      }));
      await setAssignments(eventId, assignments);
      setStatus("Assignments saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  const saveNote = async (encounterId) => {
    setError("");
    try {
      await setEncounterNote(eventId, encounterId, notesByEncounter[encounterId] || "");
      setStatus("Note saved.");
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

  if (!event || !tier) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-text">{error || "Raid event not found"}</div>
      </div>
    );
  }

  const groupedByGroup = GROUPS.map((g) => ({
    group: g,
    characters: characters.filter((c) => groupByCharacter[c.id] === g),
  }));

  return (
    <div>
      <div className="page-header">
        <h2>{event.title}</h2>
        <p>
          {tier.name} — {event.status}
        </p>
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

      <div className="page-header" style={{ marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Assignments</h2>
        <p>Assign each roster character to a raid group.</p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Class / Spec</th>
              <th>Group</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <ClassBadge className={c.class_name} spec={c.spec} />
                </td>
                <td>
                  {isOfficer ? (
                    <select
                      className="input-field"
                      value={groupByCharacter[c.id] || ""}
                      onChange={(e) => setGroup(c.id, e.target.value)}
                    >
                      <option value="">—</option>
                      {GROUPS.map((g) => (
                        <option key={g} value={g}>
                          Group {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    groupByCharacter[c.id] ? `Group ${groupByCharacter[c.id]}` : "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOfficer && (
        <div className="input-group" style={{ marginTop: "0.75rem" }}>
          <button className="btn btn-primary" onClick={saveAssignments}>
            Save Assignments
          </button>
        </div>
      )}

      <div className="page-header" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Groups Overview</h2>
      </div>
      <div className="card-grid">
        {groupedByGroup
          .filter((g) => g.characters.length > 0)
          .map((g) => (
            <div className="card" key={g.group}>
              <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Group {g.group}</div>
              {g.characters.map((c) => (
                <div key={c.id} style={{ fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                  <ClassBadge className={c.class_name} spec={c.spec} /> {c.name}
                </div>
              ))}
            </div>
          ))}
      </div>

      {tier.encounters.length > 0 && (
        <>
          <div className="page-header" style={{ marginTop: "2rem" }}>
            <h2 style={{ fontSize: "1.05rem" }}>Encounter Notes</h2>
            <p>Tank targets, interrupt rotations, loot notes — per boss for this raid night.</p>
          </div>

          <div className="tab-bar">
            {tier.encounters.map((enc) => (
              <button
                key={enc.id}
                className={`tab-btn ${activeEncounterId === enc.id ? "tab-active" : ""}`}
                onClick={() => setActiveEncounterId(enc.id)}
              >
                {enc.name}
              </button>
            ))}
          </div>

          {activeEncounterId && (
            <div className="card" style={{ marginTop: "0.75rem" }}>
              <textarea
                className="input-field"
                style={{ width: "100%", minHeight: 140, fontFamily: "inherit" }}
                value={notesByEncounter[activeEncounterId] || ""}
                onChange={(e) =>
                  setNotesByEncounter({ ...notesByEncounter, [activeEncounterId]: e.target.value })
                }
                onBlur={() => isOfficer && saveNote(activeEncounterId)}
                readOnly={!isOfficer}
                placeholder={isOfficer ? "Tank targets, interrupt rotation, loot notes…" : "No notes yet."}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RaidEventEditor;
