import { useAuth } from "../context/AuthContext";

/** Returns 'owner' | 'officer' | null for the current user's role in a guild. */
export function useGuildRole(guildId) {
  const { user } = useAuth();
  if (!user || !guildId) return null;
  const membership = user.memberships.find((m) => String(m.guild_id) === String(guildId));
  return membership ? membership.role : null;
}

/** True if the current user can edit roster/gear/tiers/assignments for this guild. */
export function useIsOfficer(guildId) {
  const role = useGuildRole(guildId);
  return role === "owner" || role === "officer";
}
