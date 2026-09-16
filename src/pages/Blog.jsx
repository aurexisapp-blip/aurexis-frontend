import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Public, unauthenticated -- this is the actual SEO content the growth
// agent's approval queue produces once an seo_post item is approved and
// explicitly published (see AdminGrowth.jsx / growth_agent.py). No secret,
// no login: this is meant to be crawled and read by anyone.

const S = {
  page: {
    minHeight: "100vh", background: "#07090f", color: "rgba(255,255,255,0.92)",
    fontFamily: '"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    padding: "48px 24px 100px",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  brand: {
    fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
    color: "#4ade80", marginBottom: 28, display: "inline-block", textDecoration: "none",
  },
  h1: { fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.25, marginBottom: 10 },
  meta: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 32 },
  card: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14, padding: "22px 24px", marginBottom: 16, textDecoration: "none",
    color: "inherit", display: "block",
  },
  cardTitle: { fontSize: 17, fontWeight: 700, marginBottom: 6, color: "rgba(255,255,255,0.92)" },
  cardMeta: { fontSize: 12.5, color: "rgba(255,255,255,0.4)" },
  body: { fontSize: 15.5, lineHeight: 1.75, color: "rgba(255,255,255,0.82)", whiteSpace: "pre-wrap" },
  empty: { fontSize: 14, color: "rgba(255,255,255,0.35)", padding: "40px 0" },
};

// Body is stored as Markdown from the generator, and this is intentionally
// not a full Markdown renderer (no extra dependency for a v1) -- strips the
// most common syntax down to readable plain text with real line breaks.
// Headings and emphasis markers are dropped rather than styled; good enough
// to read, not meant to be the final word on blog typography.
function renderBody(md) {
  return (md || "")
    // The H1 line is already rendered separately as the page's own <h1>
    // (see titleFromMeta) -- drop it here instead of showing the title twice.
    .replace(/^#\s+.+\n?/m, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^-{3,}$/gm, "")
    .trim();
}

function titleFromMeta(body) {
  const match = (body || "").match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export function BlogList() {
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/growth/blog`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setPosts(d.posts || []))
      .catch(() => setErr("Could not load posts."));
  }, []);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link to="/" style={S.brand}>Aurexis</Link>
        <h1 style={S.h1}>From the blog</h1>
        <div style={S.meta}>Trading concepts, product notes, and how Aurexis's scoring works.</div>
        {err ? <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div> : null}
        {posts === null && !err ? <div style={S.empty}>Loading…</div> : null}
        {posts && posts.length === 0 ? <div style={S.empty}>Nothing published yet — check back soon.</div> : null}
        {(posts || []).map(p => (
          <Link key={p.id} to={`/blog/${p.id}`} style={S.card}>
            <div style={S.cardTitle}>{titleFromMeta(p.body) || p.topic}</div>
            <div style={S.cardMeta}>{new Date(p.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/growth/blog/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setPost(d.post))
      .catch(() => setErr("Post not found."));
  }, [id]);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link to="/blog" style={S.brand}>← Aurexis blog</Link>
        {err ? <div style={{ color: "#f87171", fontSize: 13 }}>{err}</div> : null}
        {!post && !err ? <div style={S.empty}>Loading…</div> : null}
        {post ? (
          <>
            <h1 style={S.h1}>{titleFromMeta(post.body) || post.topic}</h1>
            <div style={S.meta}>{new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
            <div style={S.body}>{renderBody(post.body)}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}
