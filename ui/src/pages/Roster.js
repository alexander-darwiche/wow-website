import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createCharacter, deleteCharacter, listCharacters, updateCharacter } from "../api/characters";
import ClassBadge from "../components/ClassBadge";
import { useIsOfficer } from "../hooks/useIsOfficer";
import { CHARACTER_ROLES, WOW_CLASSES, formatRole } from "../utils/wow";

const emptyForm = { name: "", class_name: WOW_CLASSES[0], spec: "", role: "", discord_user_id: "" };

function Roster() {
  const { guildId } = useParams();
  const isOfficer = useIsOfficer(guildId);

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [includeInactive, setIncludeInactive] = useState(false);

  const load = () => {
    setLoading(true);
    listCharacters(guildId, includeInactive)
      .then(setCharacters)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [guildId, includeInactive]);

  const submitAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createCharacter(guildId, {
        ...addForm,
        role: addForm.role || null,
        spec: addForm.spec || null,
        discord_user_id: addForm.discord_user_id || null,
      });
      setAddForm(emptyForm);
      setShowAddForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      class_name: c.class_name,
      spec: c.spec || "",
      role: c.role || "",
      discord_user_id: c.discord_user_id || "",
    });
  };

  const submitEdit = async (id) => {
    setError("");
    try {
      await updateCharacter(id, {
        ...editForm,
        role: editForm.role || null,
        spec: editForm.spec || null,
        discord_user_id: editForm.discord_user_id || null,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (c) => {
    setError("");
    try {
      await updateCharacter(c.id, { is_active: !c.is_active });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (c) => {
    setError("");
    try {
      await deleteCharacter(c.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Roster</h2>
        <p>{characters.length} character{characters.length === 1 ? "" : "s"}</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--accent-red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="input-group">
        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Show inactive
        </label>
        {isOfficer && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "Add Character"}
          </button>
        )}
      </div>

      {showAddForm && (
        <form className="card" onSubmit={submitAdd} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
          <input
            className="input-field"
            placeholder="Character name"
            required
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
          />
          <select
            className="input-field"
            value={addForm.class_name}
            onChange={(e) => setAddForm({ ...addForm, class_name: e.target.value })}
          >
            {WOW_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Spec (optional)"
            value={addForm.spec}
            onChange={(e) => setAddForm({ ...addForm, spec: e.target.value })}
          />
          <select
            className="input-field"
            value={addForm.role}
            onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
          >
            <option value="">Role (optional)</option>
            {CHARACTER_ROLES.map((r) => (
              <option key={r} value={r}>
                {formatRole(r)}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Discord ID (optional)"
            value={addForm.discord_user_id}
            onChange={(e) => setAddForm({ ...addForm, discord_user_id: e.target.value })}
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
      ) : characters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">No characters on the roster yet.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Class / Spec</th>
                <th>Role</th>
                <th>Discord</th>
                {isOfficer && <th></th>}
              </tr>
            </thead>
            <tbody>
              {characters.map((c) =>
                editingId === c.id ? (
                  <tr key={c.id}>
                    <td>
                      <input
                        className="input-field"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td style={{ display: "flex", gap: "0.35rem" }}>
                      <select
                        className="input-field"
                        value={editForm.class_name}
                        onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                      >
                        {WOW_CLASSES.map((cl) => (
                          <option key={cl} value={cl}>
                            {cl}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input-field"
                        placeholder="Spec"
                        value={editForm.spec}
                        onChange={(e) => setEditForm({ ...editForm, spec: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className="input-field"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        <option value="">—</option>
                        {CHARACTER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {formatRole(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="input-field"
                        value={editForm.discord_user_id}
                        onChange={(e) => setEditForm({ ...editForm, discord_user_id: e.target.value })}
                      />
                    </td>
                    <td style={{ display: "flex", gap: "0.35rem" }}>
                      <button className="btn btn-primary" onClick={() => submitEdit(c.id)}>
                        Save
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
                    <td>{c.name}</td>
                    <td>
                      <ClassBadge className={c.class_name} spec={c.spec} />
                    </td>
                    <td>{formatRole(c.role)}</td>
                    <td>{c.discord_user_id || "—"}</td>
                    {isOfficer && (
                      <td style={{ display: "flex", gap: "0.35rem" }}>
                        <button className="btn btn-secondary" onClick={() => startEdit(c)}>
                          Edit
                        </button>
                        <button className="btn btn-secondary" onClick={() => toggleActive(c)}>
                          {c.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                        <button className="btn btn-secondary" onClick={() => remove(c)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Roster;
