import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client";

export const listRaidEvents = (tierId) => apiGet(`/api/raid-tiers/${tierId}/events`);
export const createRaidEvent = (tierId, payload) => apiPost(`/api/raid-tiers/${tierId}/events`, payload);
export const getRaidEvent = (eventId) => apiGet(`/api/raid-events/${eventId}`);
export const updateRaidEvent = (eventId, payload) => apiPatch(`/api/raid-events/${eventId}`, payload);
export const deleteRaidEvent = (eventId) => apiDelete(`/api/raid-events/${eventId}`);
export const setAssignments = (eventId, assignments) =>
  apiPut(`/api/raid-events/${eventId}/assignments`, { assignments });
export const setEncounterNote = (eventId, encounterId, notes) =>
  apiPut(`/api/raid-events/${eventId}/encounter-notes/${encounterId}`, { notes });
