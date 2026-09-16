import React, { useState, useEffect, useCallback, useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Same admin-secret pattern (and same sessionStorage key) as AdminAnalytics --
// unlocking one unlocks the other, one secret for every private tool.
const SECRET_KEY = "aurexis_admin_secret";

const T = {
  bg: "#07090f",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.09)",
  text: "rgba(255,255,255,0.92)",
  textSec: "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.32)",
  green: "#4ade80",
  greenSoft: "rgba(74,222,128,0.12)",
  red: "#f87171",
  redSoft: "rgba(248,113,113,0.12)",
  amber: "#fbbf24",
  amberSoft: "rgba(251,191,36,0.12)",
  blue: "#60a5fa",
};

const CONTENT_TYPES = [
  { value: "seo_post", label: "SEO post" },
  { value: "social_caption", label: "Social caption" },
  { value: "email_sequence", label: "Email sequence" },
  { value: "ad_copy", label: "Ad copy" },
];

const PLATFORMS = ["none", "blog", "reddit", "tiktok", "instagram", "x", "linkedin", "email", "google_search"];

// Sensible default platform per content type -- still overridable.
const DEFAULT_PLATFORM = {
  seo_post: "blog",
  social_caption: "tiktok",
  email_sequence: "email",
  ad_copy: "tiktok",
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Badge({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "3px 7px", borderRadius: 5, color, background: bg, flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === "approved") return <Badge color={T.green} bg={T.greenSoft}>Approved</Badge>;
  if (status === "rejected") return <Badge color={T.red} bg={T.redSoft}>Rejected</Badge>;
  if (status === "published") return <Badge color={T.blue} bg="rgba(96,165,250,0.12)">Published</Badge>;
  return <Badge color={T.amber} bg={T.amberSoft}>Pending</Badge>;
}

// The whole point of surfacing flags in the UI: catch a hallucinated claim
// (fake trial, invented tier, made-up win rate) without reading every word.
// Rendered loud and above the fold, not buried.
function FlagsBanner({ flags }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div style={{
      background: T.redSoft, border: `1px solid rgba(248,113,113,0.35)`, borderRadius: 8,
      padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#fca5a5",
    }}>
      <div style={{ fontWeight: 800, marginBottom: flags.length > 1 ? 4 : 0 }}>
        ⚠ {flags.length} flag{flags.length > 1 ? "s" : ""} — check before approving
      </div>
      {flags.map((f, i) => <div key={i}>• {f}</div>)}
    </div>
  );
}

function QueueItem({ item, onReview, onPublish, connections, busy, publishBusy }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const isPending = item.status === "pending";
  const isApproved = item.status === "approved";
  const isPublished = item.status === "published";
  const redditConn = (connections || []).find(c => c.platform === "reddit");
  const redditConnected = !!redditConn?.connected;
  const bodyPreviewLen = 320;
  const isLong = (item.body || "").length > bodyPreviewLen;
  const shown = expanded || !isLong ? item.body : `${item.body.slice(0, bodyPreviewLen)}…`;

  return (
    <div style={{
      background: T.card, border: `1px solid ${item.flags?.length ? "rgba(248,113,113,0.3)" : T.cardBorder}`,
      borderRadius: 12, padding: "16px 18px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Badge color={T.blue} bg="rgba(96,165,250,0.12)">
            {CONTENT_TYPES.find(c => c.value === item.content_type)?.label || item.content_type}
          </Badge>
          {item.platform && item.platform !== "none" ? (
            <Badge color={T.textSec} bg="rgba(255,255,255,0.06)">{item.platform}</Badge>
          ) : null}
          <StatusBadge status={item.status} />
          <span style={{ fontSize: 11, color: T.textFaint }}>{timeAgo(item.created_at)}</span>
        </div>
        <span style={{ fontSize: 11, color: T.textFaint }}>#{item.id}</span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 }}>{item.topic}</div>

      <FlagsBanner flags={item.flags} />

      <div style={{
        fontSize: 12.5, color: T.textSec, whiteSpace: "pre-wrap", lineHeight: 1.55,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 8,
      }}>
        {shown}
      </div>
      {isLong ? (
        <button onClick={() => setExpanded(v => !v)} style={{
          background: "none", border: "none", color: T.blue, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10,
        }}>
          {expanded ? "Show less" : "Show full text"}
        </button>
      ) : null}

      {item.status !== "pending" && item.review_notes ? (
        <div style={{ fontSize: 11.5, color: T.textFaint, marginBottom: 10, fontStyle: "italic" }}>
          Note: {item.review_notes}
        </div>
      ) : null}

      {isPending ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note…"
            style={{
              flex: 1, minWidth: 140, padding: "8px 10px", borderRadius: 8, fontSize: 12,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cardBorder}`, color: T.text,
              outline: "none", fontFamily: "inherit",
            }}
          />
          <button
            disabled={busy} onClick={() => onReview(item.id, "approve", notes)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", background: T.green, color: "#052e16",
              fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
            }}
          >
            ✓ Approve
          </button>
          <button
            disabled={busy} onClick={() => onReview(item.id, "reject", notes)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.red}`, background: "transparent", color: T.red,
              fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
            }}
          >
            ✕ Reject
          </button>
        </div>
      ) : null}

      {isApproved ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {item.content_type === "seo_post" ? (
            <button
              disabled={publishBusy} onClick={() => onPublish(item.id, "blog")}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none", background: T.blue, color: "#0a1929",
                fontSize: 12, fontWeight: 800, cursor: publishBusy ? "default" : "pointer", opacity: publishBusy ? 0.6 : 1,
              }}
            >
              ↑ Publish to Blog
            </button>
          ) : null}
          {redditConnected ? (
            <button
              disabled={publishBusy} onClick={() => onPublish(item.id, "reddit")}
              style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.blue}`, background: "transparent", color: T.blue,
                fontSize: 12, fontWeight: 800, cursor: publishBusy ? "default" : "pointer", opacity: publishBusy ? 0.6 : 1,
              }}
            >
              ↑ Publish to r/{redditConn.credentials_redacted?.subreddit || "…"}
            </button>
          ) : (
            <span style={{ fontSize: 11.5, color: T.textFaint }}>Connect Reddit below to publish there</span>
          )}
        </div>
      ) : null}

      {isPublished ? (
        <div style={{ fontSize: 12, color: T.blue }}>
          Published to <strong>{item.published_platform}</strong> · {timeAgo(item.published_at)}
          {item.published_url ? (
            <>
              {" "}·{" "}
              <a href={item.published_url} target="_blank" rel="noreferrer" style={{ color: T.blue }}>
                view →
              </a>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GenerateForm({ secret, onGenerated }) {
  const [contentType, setContentType] = useState("seo_post");
  const [platform, setPlatform] = useState(DEFAULT_PLATFORM.seo_post);
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const changeType = (v) => {
    setContentType(v);
    setPlatform(DEFAULT_PLATFORM[v] || "none");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) { setErr("Topic is required."); return; }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/growth/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, content_type: contentType, topic: topic.trim(), platform, brief: brief.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.detail ? (typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail)) : `HTTP ${res.status}`);
      }
      setTopic("");
      setBrief("");
      onGenerated(json.item);
    } catch (e2) {
      setErr(e2.message || "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cardBorder}`, color: T.text,
    outline: "none", fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: T.textFaint, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

  return (
    <form onSubmit={submit} style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>Generate new content</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Content type</label>
          <select value={contentType} onChange={e => changeType(e.target.value)} style={inputStyle}>
            {CONTENT_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Platform</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={inputStyle}>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Topic / moment *</label>
        <input
          value={topic} onChange={e => setTopic(e.target.value)} style={inputStyle}
          placeholder='e.g. "why Aurexis shows one AI pick instead of a big watchlist" or "day 3 after signup, still on Free"'
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Extra brief (optional)</label>
        <textarea
          value={brief} onChange={e => setBrief(e.target.value)} rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Any extra instructions or facts to include"
        />
      </div>
      {err ? <div style={{ fontSize: 12.5, color: T.red, marginBottom: 12 }}>{err}</div> : null}
      <button type="submit" disabled={loading} style={{
        padding: "11px 22px", borderRadius: 10, border: "none",
        background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff",
        fontSize: 13, fontWeight: 800, cursor: loading ? "default" : "pointer", opacity: loading ? 0.65 : 1,
      }}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}

function ConnectionRow({ conn, secret, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(() => Object.fromEntries((conn.required_fields || []).map(f => [f, ""])));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const isLive = conn.status === "live";

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/growth/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, platform: conn.platform, credentials: fields }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(false);
      onChanged();
    } catch (e2) {
      setErr("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!confirm(`Remove the ${conn.platform} connection?`)) return;
    try {
      await fetch(`${API_BASE_URL}/admin/growth/connections/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, platform: conn.platform }),
      });
      onChanged();
    } catch (e) {
      alert("Remove failed — try again.");
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, fontSize: 12.5,
    background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cardBorder}`, color: T.text,
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{
      border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{conn.platform.replace("_", " ")}</span>
          {isLive ? (
            <Badge color={T.green} bg={T.greenSoft}>Live</Badge>
          ) : (
            <Badge color={T.amber} bg={T.amberSoft}>Needs platform review</Badge>
          )}
          {conn.connected ? <Badge color={T.blue} bg="rgba(96,165,250,0.12)">Connected</Badge> : null}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {conn.connected ? (
            <button onClick={disconnect} style={{ background: "none", border: "none", color: T.red, fontSize: 12, cursor: "pointer" }}>
              Disconnect
            </button>
          ) : null}
          <button onClick={() => setEditing(v => !v)} style={{ background: "none", border: "none", color: T.blue, fontSize: 12, cursor: "pointer" }}>
            {conn.connected ? "Update" : "Connect"}
          </button>
        </div>
      </div>

      {conn.setup_note ? (
        <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 6 }}>{conn.setup_note}</div>
      ) : null}

      {conn.connected && !editing ? (
        <div style={{ fontSize: 11.5, color: T.textSec, marginTop: 8, fontFamily: "ui-monospace, monospace" }}>
          {Object.entries(conn.credentials_redacted || {}).map(([k, v]) => `${k}=${v}`).join("  ")}
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={save} style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {(conn.required_fields || []).map(f => (
            <input
              key={f} value={fields[f] || ""} placeholder={f}
              type={/secret|password|token/i.test(f) ? "password" : "text"}
              onChange={e => setFields(prev => ({ ...prev, [f]: e.target.value }))}
              style={inputStyle}
            />
          ))}
          {err ? <div style={{ fontSize: 11.5, color: T.red }}>{err}</div> : null}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving} style={{
              padding: "7px 14px", borderRadius: 7, border: "none", background: T.green, color: "#052e16",
              fontSize: 12, fontWeight: 800, cursor: saving ? "default" : "pointer",
            }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={{
              padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.cardBorder}`, background: "transparent", color: T.textSec,
              fontSize: 12, cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Connections({ secret, onLoaded }) {
  const [connections, setConnections] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch(`${API_BASE_URL}/admin/growth/connections?secret=${encodeURIComponent(secret)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setConnections(d.connections || []); onLoaded?.(d.connections || []); })
      .catch(() => {});
  }, [secret, onLoaded]);

  useEffect(() => { load(); }, [load]);

  const liveCount = (connections || []).filter(c => c.connected).length;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, marginBottom: 28, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", padding: "16px 22px", background: "none", border: "none", color: T.text,
        display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Connections {liveCount > 0 ? `(${liveCount} connected)` : ""}</span>
        <span style={{ fontSize: 12, color: T.textFaint }}>{open ? "▲ hide" : "▼ show"}</span>
      </button>
      {open ? (
        <div style={{ padding: "0 22px 20px" }}>
          <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 14 }}>
            Reddit posts for real once connected. TikTok/Instagram/ad platforms need their own app-review
            cleared before posting works, even once you save credentials here — see each one's note.
          </div>
          {connections === null ? (
            <div style={{ fontSize: 12, color: T.textFaint }}>Loading…</div>
          ) : (
            connections.map(c => <ConnectionRow key={c.platform} conn={c} secret={secret} onChanged={load} />)
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminGrowth() {
  const [secret, setSecret] = useState(() => {
    try { return sessionStorage.getItem(SECRET_KEY) || ""; } catch { return ""; }
  });
  const [secretInput, setSecretInput] = useState("");
  const [unlockErr, setUnlockErr] = useState("");
  const [items, setItems] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [connections, setConnections] = useState([]);
  // Reset to true on every effect run, not just at ref-creation time -- React 18
  // StrictMode double-invokes effects in dev (mount -> cleanup -> mount again),
  // so a cleanup-only version of this flips to false on the phantom first mount
  // and never comes back, silently dropping every fetch's result forever
  // (verified live: the queue fetch itself succeeded, this is what ate it).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchQueue = useCallback(async (secretToUse, status) => {
    if (!secretToUse) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ secret: secretToUse });
      if (status) qs.set("status", status);
      const res = await fetch(`${API_BASE_URL}/admin/growth/queue?${qs.toString()}`);
      if (res.status === 403 || res.status === 401) {
        setUnlockErr("Incorrect secret.");
        try { sessionStorage.removeItem(SECRET_KEY); } catch {}
        setSecret("");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mountedRef.current) { setItems(json.items || []); setLoadErr(""); }
    } catch (e) {
      if (mountedRef.current) setLoadErr("Could not reach the backend.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (secret) fetchQueue(secret, statusFilter);
  }, [secret, statusFilter, fetchQueue]);

  const unlock = (e) => {
    e.preventDefault();
    if (!secretInput.trim()) return;
    try { sessionStorage.setItem(SECRET_KEY, secretInput.trim()); } catch {}
    setUnlockErr("");
    setSecret(secretInput.trim());
  };

  const handleGenerated = (item) => {
    // New items are always pending -- if the current tab can show them, prepend immediately
    // instead of waiting on a refetch.
    if (statusFilter === "" || statusFilter === "pending") {
      setItems(prev => [item, ...(prev || [])]);
    }
  };

  const handleReview = async (id, action, notes) => {
    setReviewingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/growth/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, id, action, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      // Instant feedback (updates the badge/notes immediately), then refetch
      // the current filter so a just-reviewed item drops out of e.g. the
      // "Pending" tab once its status no longer matches.
      setItems(prev => (prev || []).map(it => it.id === id ? json.item : it));
      fetchQueue(secret, statusFilter);
    } catch (e) {
      alert("Review failed — try again.");
    } finally {
      setReviewingId(null);
    }
  };

  const handlePublish = async (id, platform) => {
    setPublishingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/growth/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, id, platform }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        // Publish failures are informative on purpose (not connected yet,
        // platform needs its own review, Reddit rejected the post) --
        // surface the real reason, not a generic "failed".
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      setItems(prev => (prev || []).map(it => it.id === id ? json.item : it));
      fetchQueue(secret, statusFilter);
    } catch (e) {
      alert(`Publish failed: ${e.message || e}`);
    } finally {
      setPublishingId(null);
    }
  };

  if (!secret) {
    return (
      <div style={{
        minHeight: "100vh", background: T.bg, color: T.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }}>
        <form onSubmit={unlock} style={{ width: 320, padding: 28, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.green, marginBottom: 8 }}>Aurexis</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Growth agent access</div>
          <input
            type="password" autoFocus value={secretInput} onChange={e => setSecretInput(e.target.value)}
            placeholder="Admin secret"
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: `1px solid ${T.cardBorder}`,
              color: T.text, fontSize: 14, outline: "none", marginBottom: 14, fontFamily: "inherit",
            }}
          />
          {unlockErr ? <div style={{ fontSize: 13, color: T.red, marginBottom: 14 }}>{unlockErr}</div> : null}
          <button type="submit" style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      padding: "32px 28px 80px",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.green, marginBottom: 4 }}>Aurexis · Private</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em" }}>Growth agent</div>
          </div>
          <div style={{ fontSize: 12, color: T.textFaint }}>
            Generate → review → approve. Nothing here publishes anywhere automatically.
          </div>
        </div>

        <GenerateForm secret={secret} onGenerated={handleGenerated} />

        <Connections secret={secret} onLoaded={setConnections} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => setStatusFilter(t.value)} style={{
                padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${statusFilter === t.value ? T.green : T.cardBorder}`,
                background: statusFilter === t.value ? T.greenSoft : "transparent",
                color: statusFilter === t.value ? T.green : T.textSec,
              }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.textFaint, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: loading ? T.amber : T.green, display: "inline-block" }} />
            {loading ? "Loading…" : `${items ? items.length : 0} item${items && items.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {loadErr ? <div style={{ fontSize: 13, color: T.red, marginBottom: 16 }}>{loadErr}</div> : null}

        {!items || items.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textFaint, padding: "24px 0" }}>
            {loading ? "Loading…" : "Nothing here yet — generate something above."}
          </div>
        ) : (
          items.map(item => (
            <QueueItem
              key={item.id} item={item} onReview={handleReview} onPublish={handlePublish}
              connections={connections} busy={reviewingId === item.id} publishBusy={publishingId === item.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
