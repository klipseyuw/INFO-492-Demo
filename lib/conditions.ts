// Lightweight, deterministic conditions estimator based on location.
// Pure functions only so it can run on server and client.

export type WeatherSummary =
  | "Clear"
  | "Cloudy"
  | "Rain"
  | "Storm"
  | "Snow"
  | "Fog"
  | "Wind";

export type RoadStatus = "Clear" | "Wet" | "Icy" | "Snowy" | "Flooding" | "Debris";

export interface Conditions {
  regionKey: string;
  weather: {
    summary: WeatherSummary;
    temperatureC: number;
    windKph: number;
    precipitation: "None" | "Light" | "Moderate" | "Heavy";
    visibilityKm: number;
    updatedAt: string;
  };
  roads: {
    status: RoadStatus;
    traffic: "Light" | "Moderate" | "Heavy";
    advisory?: string;
  };
}

// Optional basic coords for common cities used in simulations
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
  "Tacoma, WA": { lat: 47.2529, lng: -122.4443 },
  "Spokane, WA": { lat: 47.6588, lng: -117.426 },
  "Portland, OR": { lat: 45.5051, lng: -122.675 },
  "Boise, ID": { lat: 43.615, lng: -116.2023 },
  "Missoula, MT": { lat: 46.8721, lng: -113.994 },
  "Yakima, WA": { lat: 46.6021, lng: -120.5059 },
  "Eugene, OR": { lat: 44.0521, lng: -123.0868 },
  "Salem, OR": { lat: 44.9429, lng: -123.0351 },
  "Bellingham, WA": { lat: 48.7519, lng: -122.4787 }
};

function toTileKey(lat: number, lng: number): string {
  // Coarse ~0.5° tile for stability across polls
  const lt = Math.round(lat * 2) / 2;
  const ln = Math.round(lng * 2) / 2;
  return `${lt.toFixed(1)},${ln.toFixed(1)}`;
}

function seededRand(seed: number): () => number {
  // Simple LCG for deterministic pseudo-random [0,1)
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s & 0xffffffff) / 0x100000000;
  };
}

function strHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickWeather(r: number): WeatherSummary {
  if (r < 0.38) return "Clear";
  if (r < 0.58) return "Cloudy";
  if (r < 0.74) return "Rain";
  if (r < 0.82) return "Wind";
  if (r < 0.9) return "Fog";
  if (r < 0.97) return "Snow";
  return "Storm";
}

function deriveFromWeather(w: WeatherSummary, rand: () => number) {
  // Temperature bands biased by region latitude-ish via rand
  let temperatureC = Math.round((rand() * 18 - 2) * 10) / 10; // -2..16 C baseline
  let windKph = Math.round(rand() * 40); // 0..40
  let precipitation: Conditions["weather"]["precipitation"] = "None";
  let visibilityKm = Math.max(1, Math.round((8 + rand() * 8) * 10) / 10); // 8..16

  switch (w) {
    case "Clear":
      precipitation = "None";
      visibilityKm = 15 + Math.round(rand() * 5);
      break;
    case "Cloudy":
      precipitation = rand() < 0.2 ? "Light" : "None";
      visibilityKm = 10 + Math.round(rand() * 5);
      break;
    case "Rain":
      precipitation = rand() < 0.7 ? "Moderate" : "Light";
      temperatureC = Math.round((6 + rand() * 8) * 10) / 10; // 6..14
      visibilityKm = 6 + Math.round(rand() * 4);
      break;
    case "Storm":
      precipitation = "Heavy";
      windKph = 30 + Math.round(rand() * 40);
      temperatureC = Math.round((8 + rand() * 6) * 10) / 10;
      visibilityKm = 3 + Math.round(rand() * 2);
      break;
    case "Snow":
      precipitation = rand() < 0.5 ? "Moderate" : "Light";
      temperatureC = Math.round((-8 + rand() * 6) * 10) / 10; // -8..-2
      visibilityKm = 4 + Math.round(rand() * 3);
      break;
    case "Fog":
      precipitation = "None";
      visibilityKm = 1 + Math.round(rand() * 3);
      break;
    case "Wind":
      windKph = 25 + Math.round(rand() * 30);
      visibilityKm = 10 + Math.round(rand() * 4);
      break;
  }

  // Road status from weather
  let status: RoadStatus = "Clear";
  if (w === "Rain") status = rand() < 0.85 ? "Wet" : "Debris";
  else if (w === "Storm") status = rand() < 0.6 ? "Debris" : rand() < 0.8 ? "Wet" : "Flooding";
  else if (w === "Snow") status = rand() < 0.8 ? "Snowy" : "Icy";
  else if (w === "Fog") status = rand() < 0.9 ? "Clear" : "Debris";
  else if (w === "Wind") status = rand() < 0.8 ? "Clear" : "Debris";

  // Traffic heuristic
  const traffic = ((): Conditions["roads"]["traffic"] => {
    const t = rand();
    if (status === "Flooding" || w === "Storm") return t < 0.6 ? "Heavy" : "Moderate";
    if (status === "Snowy" || status === "Icy" || w === "Fog") return t < 0.5 ? "Moderate" : t < 0.8 ? "Heavy" : "Light";
    return t < 0.6 ? "Moderate" : t < 0.85 ? "Light" : "Heavy";
  })();

  let advisory: string | undefined;
  if (status === "Icy") advisory = "Icy roads – chains recommended on grades";
  else if (status === "Snowy") advisory = "Snow on roadway – reduce speed, increase distance";
  else if (status === "Flooding") advisory = "Localized flooding – avoid low-lying areas";
  else if (status === "Wet") advisory = "Wet surface – increased braking distance";
  else if (w === "Fog") advisory = "Reduced visibility – use low beams";
  else if (w === "Wind" && windKph > 35) advisory = "Strong crosswinds – caution for high-profile vehicles";

  return {
    weather: { summary: w, temperatureC, windKph, precipitation, visibilityKm, updatedAt: new Date().toISOString() },
    roads: { status, traffic, advisory }
  } as const;
}

export function estimateConditions(input: {
  lat?: number | null;
  lng?: number | null;
  origin?: string | null;
  destination?: string | null;
}): Conditions {
  let lat = typeof input.lat === "number" ? input.lat : undefined;
  let lng = typeof input.lng === "number" ? input.lng : undefined;

  if ((lat === undefined || lng === undefined) && input.origin && CITY_COORDS[input.origin]) {
    lat = CITY_COORDS[input.origin].lat;
    lng = CITY_COORDS[input.origin].lng;
  }
  if ((lat === undefined || lng === undefined) && input.destination && CITY_COORDS[input.destination]) {
    lat = CITY_COORDS[input.destination].lat;
    lng = CITY_COORDS[input.destination].lng;
  }

  // Fallback default to Seattle-ish if still missing
  if (lat === undefined || lng === undefined) {
    lat = 47.6062;
    lng = -122.3321;
  }

  const regionKey = `tile:${toTileKey(lat, lng)}`;
  const seed = strHash(regionKey);
  const rnd = seededRand(seed);
  const w = pickWeather(rnd());
  const { weather, roads } = deriveFromWeather(w, rnd);

  return { regionKey, weather, roads };
}

// Compact, human-readable line for prompts and UI
export function formatConditionsBrief(c: Conditions): string {
  const parts: string[] = [];
  parts.push(`${c.weather.summary} ${c.weather.temperatureC}°C, wind ${c.weather.windKph} kph`);
  if (c.weather.precipitation !== "None") parts.push(`${c.weather.precipitation} precip`);
  parts.push(`visibility ${c.weather.visibilityKm} km`);
  parts.push(`roads: ${c.roads.status.toLowerCase()}, traffic ${c.roads.traffic.toLowerCase()}`);
  return parts.join("; ");
}

// Slightly richer UI-friendly block
export function formatConditionsHtml(c: Conditions): string {
  const adv = c.roads.advisory ? `<div class=\"text-[11px] text-amber-700 mt-1\">${escapeHtml(c.roads.advisory)}</div>` : "";
  return `
  <div class=\"mt-1 text-xs\">
    <div><span class=\"font-medium\">Weather:</span> ${escapeHtml(c.weather.summary)} • ${c.weather.temperatureC}°C • wind ${c.weather.windKph} kph • vis ${c.weather.visibilityKm} km${c.weather.precipitation !== "None" ? ` • ${c.weather.precipitation}` : ""}</div>
    <div><span class=\"font-medium\">Roads:</span> ${escapeHtml(c.roads.status)} • traffic ${escapeHtml(c.roads.traffic)}</div>
    ${adv}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
