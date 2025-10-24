// App.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import SnakeGame from "./publice/snakeGame.jsx";
import { addScore, loadScores, clearScores } from "./publice/scoreStorage.jsx";
import Scoreboard from "./publice/scoreBoard.jsx";
import { initSfx, resumeSfx, setSfxMuted } from "./publice/sfx.js";
import styles from "./App.css";

import ALL from "./img/ALL.png"; //연령등급받으면 변경
import Setting from "./img/setting.png";
import BGM from "./publice/assets/Pixel Parade.mp3";
import { useWebAudioBGM } from "./hooks/useWebAudioBGM"; // 경로는 프로젝트에 맞게

// mm:ss.cs
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
  const [autoStartTick, setAutoStartTick] = useState(0);

  // 스코어보드
  const [name, setName] = useState(() => localStorage.getItem("snake_name") || "PLAYER");
  const [records, setRecords] = useState(() => loadScores());
  const [open, setOpen] = useState(false);

  // 설정창
  const [showSetting, setShowSetting] = useState(false);
  const [sfxOn, setSfxOn] = useState(() => localStorage.getItem("snake_sfx") !== "off");
  const [bgmOn, setBgmOn] = useState(() => localStorage.getItem("snake_bgm") === "on");

  // Web Audio BGM
  const { play: playBgm, pause: pauseBgm, resume: resumeBgm, stop: stopBgm } = useWebAudioBGM(BGM);

  // 초기 전역 플래그
  useEffect(() => { initSfx(); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__SNAKE_SFX_MUTED = !sfxOn;
    window.__SNAKE_BGM_MUTED = !bgmOn;
  }, []);

  // SFX 토글
  useEffect(() => {
    localStorage.setItem("snake_sfx", sfxOn ? "on" : "off");
    setSfxMuted(!sfxOn);
  }, [sfxOn]);

  // BGM 토글 상태 저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("snake_bgm", bgmOn ? "on" : "off");
    window.__SNAKE_BGM_MUTED = !bgmOn;
  }, [bgmOn]);

  // BGM 실제 제어: 일시정지/재개
  const prevOn = useRef(bgmOn);
  useEffect(() => {
    if (bgmOn && !prevOn.current) {
      resumeBgm().catch(() => { /* 사용자 제스처 필요 시 버튼에서 재시도 */ });
    }
    if (!bgmOn && prevOn.current) {
      pauseBgm();
    }
    prevOn.current = bgmOn;
  }, [bgmOn, resumeBgm, pauseBgm]);

  // 로고 페이드
  const [showLogo, setShowLogo] = useState(true);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 3000);
    const t2 = setTimeout(() => setShowLogo(false), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // iOS 스와이프 제스처 방지
  useEffect(() => {
    const isAit =
      typeof window !== "undefined" &&
      (window.ReactNativeWebView ||
        (window.webkit && window.webkit.messageHandlers));
    if (!isAit) return;
    const api = window.__AIT_API__;
    if (!api?.setIosSwipeGestureEnabled) return;
    api.setIosSwipeGestureEnabled({ isEnabled: false });
    return () => api.setIosSwipeGestureEnabled({ isEnabled: true });
  }, []);

  // 이름 저장
  useEffect(() => {
    localStorage.setItem("snake_name", name);
  }, [name]);

  // onGameOver
  const nameRef = useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);
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

  // 카운트다운
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
      {/* BGM: Web Audio 사용 → <audio> 없음 */}

      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 100,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 30,
          }}
        >
          <div style={{ position: "relative", width: "100%", display: "flex" }}>
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
            <button
              onClick={() => setOpen((v) => !v)}
              style={{ marginLeft: "auto", padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}
            >
              {open ? "Hide Score" : "Show Score"}
            </button>
          </div>

          <div style={{ position: "relative", marginTop: 10, display: "flex", width: "100%", alignContent: "center", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", position: "abssolute", width: 100 }}>
              <div>
                <div style={{ top: 10, right: 0 }}>
                  <div onClick={() => setShowSetting(true)} className={styles.settingbtn}>
                    <img src={Setting}
                      style={{
                        width: 50,
                        height: 50,
                        border: "1px solid #fff",
                        background: "#888",
                        cursor: "pointer",
                        borderRadius: "100px",
                      }} />
                  </div>
                </div>
              </div>

              {showSetting && (
                <div
                  onClick={() => setShowSetting(false)}
                  style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50 }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", top: "670%", width: 340, padding: 20, borderRadius: 12, background: "#fff", boxShadow: "0 8px 20px rgba(0,0,0,.3)" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h2 style={{ margin: 0, fontSize: 18 }}>설정</h2>
                      <button onClick={() => setShowSetting(false)} style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#eee", cursor: "pointer" }}>
                        닫기
                      </button>
                    </div>

                    {/* 효과음 */}
                    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>효과음</span>
                      <button
                        onClick={() => setSfxOn(v => !v)}
                        aria-pressed={sfxOn}
                        style={{ width: 64, height: 32, borderRadius: 16, border: "1px solid #ddd", background: sfxOn ? "#1fd3ff" : "#e5e7eb", position: "relative", cursor: "pointer" }}
                      >
                        <span style={{ position: "absolute", top: 3, left: sfxOn ? 34 : 3, width: 26, height: 26, borderRadius: 13, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .1s" }} />
                      </button>
                    </div>

                    {/* 배경음 */}
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>배경음악</span>
                      <button
                        onClick={() => setBgmOn(v => !v)}
                        aria-pressed={bgmOn}
                        style={{ width: 64, height: 32, borderRadius: 16, border: "1px solid #ddd", background: bgmOn ? "#1fd3ff" : "#e5e7eb", position: "relative", cursor: "pointer" }}
                      >
                        <span style={{ position: "absolute", top: 3, left: bgmOn ? 34 : 3, width: 26, height: 26, borderRadius: 13, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .1s" }} />
                      </button>
                    </div>

                    <p style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                      효과음과 배경음을 개별로 제어합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <SnakeGame
          onGameOver={onGameOver}
          hideStartUI={showStart}
          autoStartTick={autoStartTick}
        />

        {showStart && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(2,1,127,0.28)",
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
                onClick={() => {
                  if (sfxOn) resumeSfx();
                  if (bgmOn) resumeBgm().catch(() => {});
                  setCounting(true);
                }}
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
                PLAY
              </button>
            )}
          </div>
        )}

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
