import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export const claimGuild = (payload) => apiPost("/api/guilds/claim", payload);
export const getMyGuilds = () => apiGet("/api/guilds/mine");
export const getGuild = (guildId) => apiGet(`/api/guilds/${guildId}`);
export const updateGuild = (guildId, payload) => apiPatch(`/api/guilds/${guildId}`, payload);
export const listMembers = (guildId) => apiGet(`/api/guilds/${guildId}/members`);
export const addOfficer = (guildId, discordId) =>
  apiPost(`/api/guilds/${guildId}/members`, { discord_id: discordId });
export const removeOfficer = (guildId, membershipId) =>
  apiDelete(`/api/guilds/${guildId}/members/${membershipId}`);
