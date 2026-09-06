export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dphi = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function fmtDistance(m: number, lang: "en" | "hi"): string {
  if (m < 1000) return `${Math.round(m)} ${lang === "hi" ? "मीटर" : "m"}`;
  return `${(m / 1000).toFixed(1)} ${lang === "hi" ? "किमी" : "km"}`;
}

export type Verdict = "walk" | "run" | "wait";

const WALK_MPS = 1.3;
const RUN_MPS = 2.8;

/** Catchability Index: compares the time you need to reach the stop with the bus ETA. */
export function catchability(distanceM: number, etaS: number): { verdict: Verdict; walkS: number; runS: number } {
  const walkS = distanceM / WALK_MPS;
  const runS = distanceM / RUN_MPS;
  let verdict: Verdict = "wait";
  if (walkS + 45 <= etaS) verdict = "walk";
  else if (runS + 15 <= etaS) verdict = "run";
  return { verdict, walkS, runS };
}
