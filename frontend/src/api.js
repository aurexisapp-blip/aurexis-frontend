const API_BASE = "http://127.0.0.1:8000";

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url);
  const data = await readJson(res);

  if (!res.ok) {
    const detail = data?.detail || `HTTP ${res.status}`;
    throw new Error(String(detail));
  }

  return data;
}

export async function fetchBestPick() {
  return request("/best_pick_v2");
}

export async function fetchAnalyze(symbol) {
  const clean = encodeURIComponent(String(symbol || "").trim().toUpperCase());
  if (!clean) throw new Error("Symbol is required for analyze.");
  return request(`/analyze/${clean}`);
}
