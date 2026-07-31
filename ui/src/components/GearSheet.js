import React, { useState } from "react";
import { useWowheadTooltips } from "../hooks/useWowheadTooltips";

// Centralized so a future content-phase change (Classic Fresh -> TBC -> Wrath)
// is a one-line edit instead of another copy-pasted string.
const WOWHEAD_DOMAIN = "tbc";

const SLOT_LABELS = {
  0: "Head", 1: "Neck", 2: "Shoulder", 14: "Back", 4: "Chest",
  3: "Shirt", 18: "Tabard", 8: "Wrist",
  9: "Hands", 5: "Waist", 6: "Legs", 7: "Feet",
  10: "Ring 1", 11: "Ring 2", 12: "Trinket 1", 13: "Trinket 2",
  15: "Main Hand", 16: "Off Hand", 17: "Ranged",
};

const LEFT_SLOTS = [0, 1, 2, 14, 4, 3, 18, 8];
const RIGHT_SLOTS = [9, 5, 6, 7, 10, 11, 12, 13];
const BOTTOM_SLOTS = [15, 16, 17];

const SLOT_ICONS = {
  0: "🪖", 1: "📿", 2: "🦽", 14: "🧣", 4: "👕",
  3: "👔", 18: "🏷️", 8: "⌚",
  9: "🧤", 5: "🪢", 6: "👖", 7: "👢",
  10: "💍", 11: "💍", 12: "🔮", 13: "🔮",
  15: "⚔️", 16: "🛡️", 17: "🏹",
};

function getQualityClass(quality) {
  if (quality >= 5) return "quality-legendary";
  if (quality >= 4) return "quality-epic";
  if (quality >= 3) return "quality-rare";
  if (quality >= 2) return "quality-uncommon";
  return "quality-common";
}

function GearSlot({ slotId, item, rightSide = false, bottomSlot = false }) {
  const icon = <div className="gear-slot-icon">{SLOT_ICONS[slotId]}</div>;
  const info = (
    <div className={`gear-slot-info ${rightSide ? "right-info" : ""}`}>
      <div className="gear-slot-label">{SLOT_LABELS[slotId]}</div>
      {item ? (
        <>
          <a
            href={`https://www.wowhead.com/${WOWHEAD_DOMAIN}/item=${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`gear-item-name ${getQualityClass(item.quality)}`}
            data-wowhead={`item=${item.id}&domain=${WOWHEAD_DOMAIN}`}
          >
            {item.name}
          </a>
          <div className="gear-item-details">
            <span className="gear-ilvl">iLvl {item.ilvl}</span>
            {item.enchant && <span className="gear-enchant">✦ {item.enchant}</span>}
          </div>
        </>
      ) : (
        <span className="gear-empty-text">Empty</span>
      )}
    </div>
  );

  return (
    <div
      className={`gear-slot ${item ? "equipped" : "empty"} ${rightSide ? "right-slot" : ""} ${
        bottomSlot ? "bottom-slot" : ""
      }`}
    >
      {rightSide ? (
        <>
          {info}
          {icon}
        </>
      ) : (
        <>
          {icon}
          {info}
        </>
      )}
    </div>
  );
}

/**
 * Renders the WoW character-sheet gear grid. `gearDisplay` is the
 * {slot, id, name, ilvl, enchant, quality}[] shape produced both by
 * wcl_client.get_player_summary()/get_gear_display_for_report() on the fly
 * and by a stored GearSnapshot.gear_json — so this component renders
 * identically whether fed live WCL data or roster gear history.
 */
function GearSheet({ gearDisplay, avgIlvl, characterName, wowClass, defaultOpen = true }) {
  const [showGear, setShowGear] = useState(defaultOpen);
  useWowheadTooltips([gearDisplay, showGear]);

  if (!gearDisplay || gearDisplay.length === 0) return null;

  const getGearBySlot = (slotId) => gearDisplay.find((g) => g.slot === slotId) || null;

  return (
    <div className="gear-sheet-section">
      <div className="gear-sheet-header" onClick={() => setShowGear(!showGear)}>
        <span className="gear-sheet-title">
          ⚔️ Equipment
          {avgIlvl ? <span className="avg-ilvl-badge">iLvl {avgIlvl}</span> : null}
        </span>
        <span className="gear-toggle">{showGear ? "▼" : "▶"}</span>
      </div>
      {showGear && (
        <div className="gear-sheet-body">
          <div className="gear-sheet-left">
            {LEFT_SLOTS.map((slotId) => (
              <GearSlot key={slotId} slotId={slotId} item={getGearBySlot(slotId)} />
            ))}
          </div>

          <div className="gear-sheet-center">
            <div className="gear-center-frame">
              <div className="gear-center-icon">🧙</div>
              {characterName && <div className="gear-center-name">{characterName}</div>}
              {wowClass && <div className="gear-center-class">{wowClass}</div>}
              {avgIlvl ? (
                <div className="gear-center-ilvl">
                  Average Item Level <strong>{avgIlvl}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="gear-sheet-right">
            {RIGHT_SLOTS.map((slotId) => (
              <GearSlot key={slotId} slotId={slotId} item={getGearBySlot(slotId)} rightSide />
            ))}
          </div>

          <div className="gear-sheet-bottom">
            {BOTTOM_SLOTS.map((slotId) => (
              <GearSlot key={slotId} slotId={slotId} item={getGearBySlot(slotId)} bottomSlot />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GearSheet;
