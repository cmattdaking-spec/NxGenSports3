import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Default lettering system
export const DEFAULT_POSITION_LABELS = {
  QB: "QB",
  X: "X",    // #1 WR / Split End
  Z: "Z",    // #2 WR / Flanker
  W: "W",    // Slot / Wing
  Y: "Y",    // Tight End
  A: "A",    // Running Back
  FB: "FB",
  H: "H",    // H-Back
  LT: "LT", LG: "LG", C: "C", RG: "RG", RT: "RT",
  DE: "DE", DT: "DT", NT: "NT",
  OLB: "SAM", MLB: "MIKE", ILB: "WILL",
  CB: "CB", SS: "SS", FS: "FS",
  K: "K", P: "P", LS: "LS",
  WR: "X/Z", RB: "A", TE: "Y",
};

export const POSITION_DEFS = [
  { code: "QB",  default: "QB",   unit: "offense",       desc: "Quarterback" },
  { code: "X",   default: "X",    unit: "offense",       desc: "#1 WR / Split End" },
  { code: "Z",   default: "Z",    unit: "offense",       desc: "#2 WR / Flanker" },
  { code: "W",   default: "W",    unit: "offense",       desc: "Slot / Wing" },
  { code: "Y",   default: "Y",    unit: "offense",       desc: "Tight End" },
  { code: "A",   default: "A",    unit: "offense",       desc: "Running Back" },
  { code: "FB",  default: "FB",   unit: "offense",       desc: "Fullback" },
  { code: "H",   default: "H",    unit: "offense",       desc: "H-Back" },
  { code: "LT",  default: "LT",   unit: "offense",       desc: "Left Tackle" },
  { code: "LG",  default: "LG",   unit: "offense",       desc: "Left Guard" },
  { code: "C",   default: "C",    unit: "offense",       desc: "Center" },
  { code: "RG",  default: "RG",   unit: "offense",       desc: "Right Guard" },
  { code: "RT",  default: "RT",   unit: "offense",       desc: "Right Tackle" },
  { code: "DE",  default: "DE",   unit: "defense",       desc: "Defensive End" },
  { code: "DT",  default: "DT",   unit: "defense",       desc: "Defensive Tackle" },
  { code: "NT",  default: "NT",   unit: "defense",       desc: "Nose Tackle" },
  { code: "OLB", default: "SAM",  unit: "defense",       desc: "SAM / Strong OLB" },
  { code: "MLB", default: "MIKE", unit: "defense",       desc: "MIKE / MLB" },
  { code: "ILB", default: "WILL", unit: "defense",       desc: "WILL / Weak ILB" },
  { code: "CB",  default: "CB",   unit: "defense",       desc: "Cornerback" },
  { code: "SS",  default: "SS",   unit: "defense",       desc: "Strong Safety" },
  { code: "FS",  default: "FS",   unit: "defense",       desc: "Free Safety" },
  { code: "K",   default: "K",    unit: "special_teams", desc: "Kicker" },
  { code: "P",   default: "P",    unit: "special_teams", desc: "Punter" },
  { code: "LS",  default: "LS",   unit: "special_teams", desc: "Long Snapper" },
];

let _cache = null;
let _listeners = [];

function notify(data) { _cache = data; _listeners.forEach(fn => fn(data)); }

export async function loadTeamLanguage() {
  if (_cache) return _cache;
  const list = await base44.entities.AppSettings.list();
  const settings = list[0] || {};
  const labels = { ...DEFAULT_POSITION_LABELS, ...(settings.position_labels || {}) };
  const data = { labels, settings, id: settings.id };
  notify(data);
  return data;
}

export async function savePositionLabels(labels, settingsId) {
  if (settingsId) {
    await base44.entities.AppSettings.update(settingsId, { position_labels: labels });
  } else {
    await base44.entities.AppSettings.create({ position_labels: labels });
  }
  _cache = null;
  return loadTeamLanguage();
}

export function useTeamLanguage() {
  const [data, setData] = useState(_cache || { labels: { ...DEFAULT_POSITION_LABELS }, settings: {}, id: null });

  useEffect(() => {
    _listeners.push(setData);
    if (!_cache) loadTeamLanguage().then(setData).catch(() => {});
    return () => { _listeners = _listeners.filter(fn => fn !== setData); };
  }, []);

  const getLabel = (code) => data.labels?.[code] || code;

  const getLanguageContext = () => {
    const entries = Object.entries(data.labels || {});
    const custom = entries
      .filter(([code, label]) => label !== DEFAULT_POSITION_LABELS[code])
      .map(([code, label]) => `${code}→"${label}"`)
      .join(", ");
    return `IMPORTANT: Use our team's position naming system. Standard: X=#1WR(split end), Z=#2WR(flanker), W=Slot/Wing, Y=Tight End, A=Running Back, MIKE=MLB, SAM=strongside OLB, WILL=weakside ILB.${custom ? " Team custom names: " + custom + "." : ""} Always refer to positions by their team label, not generic names.`;
  };

  return { labels: data.labels, settings: data.settings, settingsId: data.id, getLabel, getLanguageContext };
}