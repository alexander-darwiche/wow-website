import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export const listCharacters = (guildId, includeInactive = false) =>
  apiGet(`/api/guilds/${guildId}/characters${includeInactive ? "?include_inactive=true" : ""}`);
export const createCharacter = (guildId, payload) => apiPost(`/api/guilds/${guildId}/characters`, payload);
export const updateCharacter = (characterId, payload) => apiPatch(`/api/characters/${characterId}`, payload);
export const deleteCharacter = (characterId) => apiDelete(`/api/characters/${characterId}`);
