import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export const listRaidTiers = (guildId) => apiGet(`/api/guilds/${guildId}/raid-tiers`);
export const createRaidTier = (guildId, payload) => apiPost(`/api/guilds/${guildId}/raid-tiers`, payload);
export const updateRaidTier = (tierId, payload) => apiPatch(`/api/raid-tiers/${tierId}`, payload);
export const deleteRaidTier = (tierId) => apiDelete(`/api/raid-tiers/${tierId}`);

export const createEncounter = (tierId, payload) => apiPost(`/api/raid-tiers/${tierId}/encounters`, payload);
export const updateEncounter = (encounterId, payload) => apiPatch(`/api/encounters/${encounterId}`, payload);
export const deleteEncounter = (encounterId) => apiDelete(`/api/encounters/${encounterId}`);
