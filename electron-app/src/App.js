import React, { useCallback, useEffect, useRef, useState } from "react";
import SnakeGame from "./publice/snakeGame.jsx";
import { addScore, loadScores, clearScores } from "./publice/scoreStorage.jsx";
import Scoreboard from "./publice/scoreBoard.jsx";
import { initSfx, resumeSfx } from "./publice/sfx.js";

import ALL from "./img/ALL.png";


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

  // 이미지 3초 노출
  const [showLogo, setShowLogo] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 3000);   // 3초 후 페이드 시작
    const t2 = setTimeout(() => setShowLogo(false), 3800); // 0.8초 후 DOM 제거
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // iOS 스와이프 제스처 방지
  useEffect(() => {
    const isAit =
      typeof window !== "undefined" &&
      (window.ReactNativeWebView ||
        (window.webkit && window.webkit.messageHandlers));
    if (!isAit) return;

    let mounted = true;

    // enable off
    import("@apps-in-toss/web-framework").then(mod => {
      if (!mounted) return;
      mod.setIosSwipeGestureEnabled({ isEnabled: false });
    });

    return () => {
      mounted = false;
      // enable on
      import("@apps-in-toss/web-framework").then(mod => {
        mod.setIosSwipeGestureEnabled({ isEnabled: true });
      });
    };
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
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* 게임 영역 */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 30, // 오버레이보다 위
          }}
        >
          <h1
            style={{
              fontFamily: "PressStart2P, monospace",
              fontSize: 20,
              color: "#E6F7FF",
              textShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}
          >
            <b style={{ fontSize: 20, fontFamily: "Press Start 2P" }}>Snake Game</b>
          </h1>
          <div style={{position: "relative"}}>
            <button
              onClick={() => setOpen((v) => !v)}
              style={{ marginLeft: "auto", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}
            >
              {open ? "Hide Score" : "Show Score"}
            </button>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              {showLogo && (
                <img
                  src={ALL}
                  alt="ALL"
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    width: 60,
                    height: 60,
                    margin: 10,
                    opacity: fade ? 0 : 1,
                    transition: "opacity 0.8s ease-in-out",
                    willChange: "opacity",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>

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
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "2px solid #9FE8FF",
                  background: "#1FD3FF",
                  color: "#081146",
                  fontWeight: 700,
                  boxShadow: "0 6px 18px rgba(0,0,0,.25)",
                  cursor: "pointer",
                  fontSize: 24,
                  letterSpacing: 6,
                }}
              >
                {/* ▶ */}
                PLAY
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
