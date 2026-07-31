import { apiGet, apiPost } from "./client";

export const getGuildGear = (guildId) => apiGet(`/api/guilds/${guildId}/gear`);
export const refreshGuildGear = (guildId) => apiPost(`/api/guilds/${guildId}/gear/refresh`);
export const getCharacterGearHistory = (characterId) => apiGet(`/api/characters/${characterId}/gear/history`);
export const setManualGear = (characterId, payload) => apiPost(`/api/characters/${characterId}/gear`, payload);
