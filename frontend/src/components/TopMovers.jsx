export default function TopMovers({ movers }) {
  if (!movers || movers.length === 0) return null;

  const items = Array.isArray(movers) ? movers : [];

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
      }}
    >
      <h3 style={{ margin: "0 0 10px" }}>Top Movers</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.slice(0, 12).map((mover, idx) => {
          const symbol = String(mover?.symbol || "").trim().toUpperCase();
          const price = mover?.price;
          const change = mover?.change;
          const pctChange = mover?.pct_change;
          return (
            <span
              key={`${symbol}-${idx}`}
              style={{
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {symbol || "-"}
              {` | ${String(price ?? "-")}`}
              {` | ${String(change ?? "-")}`}
              {pctChange !== undefined && pctChange !== null && pctChange !== ""
                ? ` | ${String(pctChange)}`
                : ""}
            </span>
          );
        })}
      </div>
    </section>
  );
}
