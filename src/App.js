import React, { useCallback, useEffect, useRef, useState } from "react";
import SnakeGame from "./publice/snakeGame.jsx";
import { addScore, loadScores, clearScores } from "./publice/scoreStorage.jsx";
import Scoreboard from "./publice/scoreBoard.jsx";
import { initSfx, resumeSfx } from "./publice/sfx.js";


// mm:ss.cs (분은 누적표시)
const fmtMs = (ms) => {
  const totalMin = Math.floor(ms / 60000);
  const sec = Math.floor(ms / 1000) % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(totalMin).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

export default function App() {
  const boardRef = useRef(null);

  // 시작 오버레이 + 카운트다운
  const [showStart, setShowStart] = useState(true);
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(3);
  const [autoStartTick, setAutoStartTick] = useState(0); // 카운트 종료 신호

  // 스코어보드
  const [name, setName] = useState(() => localStorage.getItem("snake_name") || "PLAYER");
  const [records, setRecords] = useState(() => loadScores());
  const [open, setOpen] = useState(false);

  //뒤로가기 스와이프 방지
  useEffect(() => {
    history.pushState(null, '', location.href);
    const onpop = () => {
      history.pushState(null, '', location.href);
      setShowStart(true);
    };
    window.addEventListener('popstate', onpop);
    return () => window.removeEventListener('popstate', onpop);
  }, []);

  // 게임 효과음
  useEffect(() => { initSfx(); }, []);

  // 이름 저장
  useEffect(() => {
    localStorage.setItem("snake_name", name);
  }, [name]);

  // onGameOver는 고정 함수로 만들어 중복 기록 방지
  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const onGameOver = useCallback((rec) => {
    const fixedName = nameRef.current?.toUpperCase().slice(0, 12) || "PLAYER";
    const top = addScore({ ...rec, name: fixedName });
    setRecords(top);
    setOpen(true);
  }, []);

  const onClear = useCallback(() => {
    clearScores();
    setRecords([]);
  }, []);

  // 카운트다운: 버튼 누르면 시작 → 3,2,1 → 자동 시작
  useEffect(() => {
    if (!showStart || !counting) return;
    setCount(3);
    let tick = 3;
    const id = setInterval(() => {
      tick -= 1;
      setCount(tick);
      if (tick <= 0) {
        clearInterval(id);
        setShowStart(false);
        setCounting(false);
        setAutoStartTick((n) => n + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [showStart, counting]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 30}}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", width: "min(640px,94vw)", padding: (0,10) }}>
        <b style={{ fontSize: 16 }}>Snake with Scoreboard</b>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ marginLeft: "auto", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          {open ? "Hide Board" : "Show Board"}
        </button>
      </div>

      {/* 게임 영역 */}
      <div style={{ position: "relative" }}>
        <SnakeGame
          onGameOver={onGameOver}
          hideStartUI={showStart}
          autoStartTick={autoStartTick}
        />

        {/* 시작 오버레이: 버튼 클릭 → 카운트다운 → 자동 시작 */}
        {showStart && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(2,1,127,0.28)", // 배경 #02017F 톤
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 20
            }}
          >
            {counting ? (
              <div style={{ textAlign: "center" }} aria-live="assertive" role="status">
                <div style={{ fontSize: 64, fontWeight: 800, color: "#E6F7FF", textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>
                  {count}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#CFE9FF", opacity: 0.9 }}>Get Ready</div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { resumeSfx(); setCounting(true); }}
                style={{
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: "2px solid #9FE8FF",
                  background: "#1FD3FF",
                  color: "#081146",
                  fontWeight: 700,
                  boxShadow: "0 6px 18px rgba(0,0,0,.25)",
                  cursor: "pointer"
                }}
              >
                ▶
              </button>
            )}
          </div>
        )}

        {/* 스코어보드 오버레이 */}
        {open && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.5)",
              zIndex: 10
            }}
            onClick={() => setOpen(false)}
          >
            <div
              ref={boardRef}
              style={{
                width: "min(620px,94vw)",
                maxHeight: "90%",
                // overflow: "auto",
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b>Scoreboard</b>
                <button
                  onClick={() => setOpen(false)}
                  style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
              <Scoreboard
                open={true}
                records={records}
                name={name}
                onNameChange={setName}
                onClear={onClear}
                fmtMs={fmtMs}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
