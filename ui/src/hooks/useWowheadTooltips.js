import { useEffect } from "react";

/** Re-runs Wowhead's tooltip script over any new `data-wowhead` links after
 * the given dependencies change (e.g. new gear data, or a collapsible section
 * toggling open). Wowhead's script is loaded globally in ui/public/index.html. */
export function useWowheadTooltips(deps) {
  useEffect(() => {
    if (window.$WowheadPower) {
      const timer = setTimeout(() => window.$WowheadPower.refreshLinks(), 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
