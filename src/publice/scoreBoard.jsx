import React from "react";

export default function Scoreboard({
  open,
  records,
  name,
  onNameChange,
  onClear,
  fmtMs,
}) {
  if (!open) return null;
  return (
    <div
      style={{
        width: "min(640px,94vw)",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <b style={{ fontSize: 14 }}>Scoreboard</b>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={onClear} style={btn}>
            Clear
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12, opacity: 0.8 }}>Name</label>
        <input
          value={name}
          onChange={(e) =>
            onNameChange(e.target.value.toUpperCase().slice(0, 12))
          }
          placeholder="PLAYER"
          style={{
            flex: "0 1 200px",
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc" }}>
              <th style={th}>#</th>
              <th style={th}>Name</th>
              <th style={th}>Score</th>
              <th style={th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{ ...td, textAlign: "center", padding: "14px 8px" }}
                >
                  No records yet
                </td>
              </tr>
            )}
            {records.map((r, i) => (
              <tr
                key={`${r.when}-${i}`}
                style={{ borderTop: "1px solid #eef2f7" }}
              >
                <td style={td}>{i + 1}</td>
                <td style={td}>{r.name}</td>
                <td style={td}>
                  <b>{r.score}</b>
                </td>
                <td style={td}>{fmtMs(r.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const btn = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
const th = { padding: "8px", verticalAlign: "middle" };
const td = { padding: "8px", verticalAlign: "middle" };
