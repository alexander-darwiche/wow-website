// Standard WoW class colors, keyed the same way the backend's CLASS_ID_MAP
// (server/app/services/wcl_client.py) and WarcraftLogs report the class name.
export const WOW_CLASSES = [
  "Warrior",
  "Paladin",
  "Hunter",
  "Rogue",
  "Priest",
  "DeathKnight",
  "Shaman",
  "Mage",
  "Warlock",
  "Druid",
];

export const CLASS_COLORS = {
  Warrior: "#C79C6E",
  Paladin: "#F58CBA",
  Hunter: "#ABD473",
  Rogue: "#FFF569",
  Priest: "#FFFFFF",
  DeathKnight: "#C41E3A",
  Shaman: "#0070DE",
  Mage: "#69CCF0",
  Warlock: "#9482C9",
  Monk: "#00FF96",
  Druid: "#FF7D0A",
};

export function classColor(className) {
  return CLASS_COLORS[className] || "var(--text-primary)";
}

export const CHARACTER_ROLES = ["tank", "healer", "dps"];

export function formatRole(role) {
  if (!role) return "—";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
