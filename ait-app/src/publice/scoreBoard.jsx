// scoreBoard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getUserKeyForGame } from "@apps-in-toss/web-framework"; // ✅ 토스 SDK import

const PAGE_SIZE = 10;

export default function Scoreboard({
  open,
  records,
  name,
  setName, // onNameChange 대신 setName으로 단순화
  onClear,
  fmtMs,
}) {
  // ✅ Toss ID 로드
  useEffect(() => {
    async function fetchUserKey() {
      try {
        const key = await getUserKeyForGame();
        setName(key.slice(0, 8)); // 예: 앞 8자리만 표시
      } catch (err) {
        // console.error("getUserKeyForGame failed:", err);
      }
    }
    fetchUserKey();
  }, [setName]);

  // ✅ 페이지 상태
  const [page, setPage] = useState(1);
  const total = records?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 페이지가 바뀌거나 데이터가 줄어들면 범위 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (records || []).slice(start, start + PAGE_SIZE);
  }, [records, page]);

  if (!open) return null;

  const startIdx = (page - 1) * PAGE_SIZE; // 전역 순번 오프셋

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
      }}
    >
      {/* 헤더 + 액션 */}
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

      {/* Toss ID */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12, opacity: 0.8 }}>Toss ID</label>
        <input
          value={name}
          readOnly
          style={{
            flex: "0 1 200px",
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            fontSize: 13,
            background: "#f9fafb",
          }}
        />
      </div>

      {/* 테이블 */}
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
            {total === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{ ...td, textAlign: "center", padding: "14px 8px" }}
                >
                  No records yet
                </td>
              </tr>
            )}

            {pagedRecords.map((r, i) => (
              <tr
                key={`${r.when}-${startIdx + i}`}
                style={{ borderTop: "1px solid #eef2f7" }}
              >
                <td style={td}>{startIdx + i + 1}</td>
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

      {/* 페이지 컨트롤 */}
      {total > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          <button
            style={btn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span style={{ fontSize: 12 }}>
            {page} / {totalPages}
          </span>
          <button
            style={btn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
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
