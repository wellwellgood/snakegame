// App.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import SnakeGame from "./publice/snakeGame.jsx";
import Scoreboard from "./publice/scoreBoard.jsx";
import { addScore, loadScores, clearScores } from "./publice/scoreStorage.jsx";
import { initSfx, resumeSfx, setSfxMuted, getAudioContext } from "./publice/sfx.js";
import { useWebAudioBGM } from "./hooks/useWebAudioBGM";
import styles from "./App.module.css";
import {
  getUserKeyForGame,
  submitGameCenterLeaderBoardScore,
  openGameCenterLeaderboard,
  isMinVersionSupported,
  tdsEvent,
} from "@apps-in-toss/web-framework";
import Setting from "./img/setting.png";
import BGM from "./publice/assets/Pixel Parade.mp3";

const fmtMs = (ms) => {
  const totalMin = Math.floor(ms / 60000);
  const sec = Math.floor(ms / 1000) % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(totalMin).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

const isAitEnv = () =>
  typeof window !== "undefined" &&
  (window.__AIT_API__ || window.ReactNativeWebView || (window.webkit && window.webkit.messageHandlers));

export default function App() {
  const boardRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const log = (...a) => setLogs((L) => [...L.slice(-30), a.join(" ")]);

  const [showStart, setShowStart] = useState(true);
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(3);
  const [autoStartTick, setAutoStartTick] = useState(0);

  const [name, setName] = useState(() => localStorage.getItem("snake_name") || "PLAYER");
  const [records, setRecords] = useState(() => loadScores());
  const [open, setOpen] = useState(false);

  const [showSetting, setShowSetting] = useState(false);
  const [sfxOn, setSfxOn] = useState(() => localStorage.getItem("snake_sfx") !== "off");
  const [bgmOn, setBgmOn] = useState(() => localStorage.getItem("snake_bgm") === "on");

  // AudioContext 공유
  const [sharedCtx, setSharedCtx] = useState(null);
  const { play: playBgm, pause: pauseBgm, resume: resumeBgm } = useWebAudioBGM(BGM, sharedCtx);

  // BGM 재생 상태 추적
  const isBgmPlayingRef = useRef(false);

  // SFX 초기화 및 AudioContext 공유
  useEffect(() => {
    initSfx().then(() => {
      const ctx = getAudioContext();
      if (ctx) {
        setSharedCtx(ctx);
        log("AudioContext 초기화 완료, state:", ctx.state);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__SNAKE_SFX_MUTED = !sfxOn;
    window.__SNAKE_BGM_MUTED = !bgmOn;
  }, []);

  useEffect(() => {
    localStorage.setItem("snake_sfx", sfxOn ? "on" : "off");
    setSfxMuted(!sfxOn);
    log("효과음:", sfxOn ? "ON" : "OFF");
  }, [sfxOn]);

  // BGM 토글 처리
  useEffect(() => {
    localStorage.setItem("snake_bgm", bgmOn ? "on" : "off");
    log("배경음:", bgmOn ? "ON" : "OFF");

    if (bgmOn) {
      playBgm().then(() => {
        isBgmPlayingRef.current = true;
        log("BGM 재생 시작");
      }).catch((err) => {
        log("BGM 재생 실패:", err?.message);
      });
    } else {
      pauseBgm().then(() => {
        isBgmPlayingRef.current = false;
        log("BGM 일시정지");
      }).catch(() => { });
    }
  }, [bgmOn, playBgm, pauseBgm]);

  const handleOpenLeaderboard = useCallback(() => {
    const isSupported = isMinVersionSupported({ android: "5.221.0", ios: "5.221.0" });
    if (!isSupported) {
      log("⚠️ 리더보드는 최소 5.221.0 이상 필요");
      alert("리더보드는 최소 버전 5.221.0 이상에서 지원됩니다");
      return;
    }
    log("리더보드 웹뷰 열기...");
    try {
      openGameCenterLeaderboard();
    } catch (e) {
      log("리더보드 열기 실패:", e?.message || String(e));
    }
  }, []);

  useEffect(() => {
    if (!isAitEnv()) {
      log("ENV not AIT");
      return;
    }
    if (!tdsEvent?.addEventListener) {
      log("tdsEvent missing");
      return;
    }
    const cleanup = tdsEvent.addEventListener("navigationAccessoryEvent", {
      onEvent: ({ id }) => {
        log("[nav click]", String(id));
        if (id === "leaderboard") handleOpenLeaderboard();
      },
    });
    return () => {
      try {
        cleanup?.();
      } catch { }
    };
  }, [handleOpenLeaderboard]);

  useEffect(() => {
    const api = window?.__AIT_API__;
    if (!api?.setNavigationBar) return;
    api.setNavigationBar({
      rightAccessories: [{ id: "leaderboard", label: "리더보드", icon: "trophy" }],
    });
  }, []);

  // ✅ 포어그라운드 복귀 처리 (iOS 사용자 제스처 필수)
  useEffect(() => {
    let resumeTimer = null;
    let needsUserGesture = false;

    const forceResumeAudio = async () => {
      const ctx = getAudioContext();

      log("🔄 오디오 복구 시도, ctx.state:", ctx?.state, "bgmOn:", bgmOn, "sfxOn:", sfxOn);

      if (!ctx) {
        log("❌ AudioContext 없음");
        return;
      }

      // ✅ 사운드 설정과 무관하게 항상 AudioContext는 깨운다
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
          log("✅ AudioContext resume 호출, new state:", ctx.state);

          // iOS에서 여전히 suspended면 사용자 제스처 필요
          if (ctx.state === "suspended") {
            needsUserGesture = true;
            log("⚠️ iOS: 사용자 제스처 필요");
          }
        } catch (err) {
          log("❌ AudioContext resume 실패:", err?.message);
          needsUserGesture = true;
        }
      } else {
        log("ℹ️ AudioContext 이미 running:", ctx.state);
      }

      // BGM resume (켜져있고 이전에 재생 중이었다면)
      if (bgmOn && isBgmPlayingRef.current && ctx.state === "running") {
        try {
          await resumeBgm();
          log("✅ BGM resumed");
        } catch (err) {
          log("❌ BGM resume 실패:", err?.message);
          // resume 실패 시 재생 시도
          try {
            await playBgm();
            isBgmPlayingRef.current = true;
            log("✅ BGM 재시작 성공");
          } catch (e) {
            log("❌ BGM 재시작 실패:", e?.message);
          }
        }
      }
    };

    const onVisibilityChange = async () => {
      const ctx = getAudioContext();

      if (document.visibilityState === "visible") {
        log("👁️ 포어그라운드 복귀");
        needsUserGesture = false;

        // 즉시 시도
        await forceResumeAudio();

        // 0.5초 후 재시도 (iOS 대응)
        resumeTimer = setTimeout(async () => {
          log("🔄 지연 재시도");
          await forceResumeAudio();
        }, 500);

      } else {
        log("🌙 백그라운드 전환");

        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }

        // ✅ AudioContext는 suspend하지 않음 (모바일 최적화)
        // 백그라운드에서도 running 유지
        log("ℹ️ AudioContext 유지 (suspend 안 함)");
      }
    };

    const onFocus = async () => {
      log("🎯 window focus");
      await forceResumeAudio();
    };

    const onPageShow = async (e) => {
      log("📄 pageshow, persisted:", e.persisted);
      if (e.persisted) {
        // bfcache에서 복귀
        await forceResumeAudio();
      }
    };

    // ✅ 사용자 인터랙션 시 복구 (iOS 필수)
    const onUserInteraction = async (e) => {
      const ctx = getAudioContext();
      log("👆 사용자 인터랙션, ctx.state:", ctx?.state, "needsGesture:", needsUserGesture);

      if (document.visibilityState === "visible" && ctx) {
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
            log("✅ 제스처로 AudioContext resumed, state:", ctx.state);

            // BGM도 재개
            if (bgmOn && isBgmPlayingRef.current) {
              try {
                await resumeBgm();
                log("✅ 제스처로 BGM resumed");
              } catch (err) {
                await playBgm();
                isBgmPlayingRef.current = true;
                log("✅ 제스처로 BGM 재시작");
              }
            }

            needsUserGesture = false;
          } catch (err) {
            log("❌ 제스처 resume 실패:", err?.message);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    // ✅ 여러 제스처 이벤트 등록 (passive: false로 변경)
    document.addEventListener("touchstart", onUserInteraction, { passive: false });
    document.addEventListener("touchend", onUserInteraction, { passive: false });
    document.addEventListener("click", onUserInteraction, { passive: false });
    document.addEventListener("pointerdown", onUserInteraction, { passive: false });

    return () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("touchstart", onUserInteraction);
      document.removeEventListener("touchend", onUserInteraction);
      document.removeEventListener("click", onUserInteraction);
      document.removeEventListener("pointerdown", onUserInteraction);
    };
  }, [bgmOn, sfxOn, resumeBgm, playBgm]);

  // 디버깅 로그
  useEffect(() => {
    const ts = () => new Date().toISOString().split("T")[1].replace("Z", "");
    const push = (...a) => setLogs((L) => [...L.slice(-50), [ts(), ...a].join(" ")]);
    const onVis = () => push("visibility", document.visibilityState);
    const onFocus = () => push("focus");
    const onBlur = () => push("blur");
    const onShow = (e) => push("pageshow persisted=", e.persisted);
    const onHide = (e) => push("pagehide persisted=", e.persisted);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  useEffect(() => {
    const api = window?.__AIT_API__;
    if (!api?.setIosSwipeGestureEnabled) return;
    api.setIosSwipeGestureEnabled({ isEnabled: false });
    return () => api.setIosSwipeGestureEnabled({ isEnabled: true });
  }, []);

  useEffect(() => {
    localStorage.setItem("snake_name", name);
  }, [name]);

  useEffect(() => {
    if (!isAitEnv()) return;
    getUserKeyForGame()
      .then((key) => setName(key.slice(0, 8)))
      .catch((err) => {
        log("getUserKey 실패:", err?.message || String(err));
      });
  }, []);

  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const onGameOver = useCallback(async (rec) => {
    try {
      if (isAitEnv()) {
        await submitGameCenterLeaderBoardScore({ score: String(rec.score) });
        log("리더보드 점수 제출 성공");
      }
    } catch (err) {
      log("리더보드 제출 실패:", err?.message || String(err));
    }
    const fixedName = (nameRef.current?.toUpperCase().slice(0, 12)) || "PLAYER";
    const top = addScore({ ...rec, name: fixedName });
    setRecords(top);
    setOpen(true);
  }, []);

  const onClear = useCallback(() => {
    clearScores();
    setRecords([]);
  }, []);

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
    <div style={{ display: "flex", flexDirection: "column", isolation: "isolate" }}>
      {/* 디버깅 로그 표시 */}
      {/* <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 150,
        overflow: "auto",
        background: "rgba(0,0,0,0.8)",
        color: "#0f0",
        fontSize: 10,
        padding: 4,
        zIndex: 9999,
        fontFamily: "monospace"
      }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div> */}

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
              style={{
                marginLeft: "auto",
                padding: "6px 10px",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {open ? "Hide Score" : "Show Score"}
            </button>
          </div>

          <div
            style={{
              position: "relative",
              marginTop: 10,
              display: "flex",
              width: "100%",
              alignContent: "center",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                position: "abssolute",
              }}
            >
              <div>
                <div style={{ top: 10, right: 0 }}>
                  <div onClick={() => setShowSetting(true)} className={styles.setingimg}>
                    <img
                      src={Setting}
                      style={{
                        width: 40,
                        height: 40,
                        border: "1px solid #bbb",
                        cursor: "pointer",
                        borderRadius: "100px",
                        marginTop: "10px",
                      }}
                    />
                  </div>
                </div>
              </div>

              {showSetting && (
                <div
                  onClick={() => setShowSetting(false)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 50,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: "670%",
                      width: 340,
                      padding: 20,
                      borderRadius: 12,
                      background: "#fff",
                      boxShadow: "0 8px 20px rgba(0,0,0,.3)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h2 style={{ margin: 0, fontSize: 18 }}>설정</h2>
                      <button
                        onClick={() => setShowSetting(false)}
                        style={{
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          background: "#eee",
                          cursor: "pointer",
                        }}
                      >
                        닫기
                      </button>
                    </div>

                    <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>효과음</span>
                      <button
                        onClick={() => setSfxOn((v) => !v)}
                        aria-pressed={sfxOn}
                        style={{
                          width: 64,
                          height: 32,
                          borderRadius: 16,
                          border: "1px solid #ddd",
                          background: sfxOn ? "#1fd3ff" : "#e5e7eb",
                          position: "relative",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            left: sfxOn ? 34 : 3,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            background: "#fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                            transition: "left .1s",
                          }}
                        />
                      </button>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>배경음악</span>
                      <button
                        onClick={() => setBgmOn((v) => !v)}
                        aria-pressed={bgmOn}
                        style={{
                          width: 64,
                          height: 32,
                          borderRadius: 16,
                          border: "1px solid #ddd",
                          background: bgmOn ? "#1fd3ff" : "#e5e7eb",
                          position: "relative",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            left: bgmOn ? 34 : 3,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            background: "#fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                            transition: "left .1s",
                          }}
                        />
                      </button>
                    </div>

                    <p style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>효과음과 배경음을 개별로 제어합니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <SnakeGame onGameOver={onGameOver} hideStartUI={showStart} autoStartTick={autoStartTick} />

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
              zIndex: 20,
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
                onClick={async () => {
                  const ctx = getAudioContext();
                  log("PLAY 클릭, ctx.state:", ctx?.state);

                  if (sfxOn) {
                    resumeSfx();
                    log("SFX resume 호출");
                  }

                  if (bgmOn) {
                    try {
                      await playBgm();
                      isBgmPlayingRef.current = true;
                      log("BGM play 성공");
                    } catch (err) {
                      log("BGM play 실패:", err?.message);
                    }
                  }

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
              zIndex: 10,
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
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b>Scoreboard</b>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
              <Scoreboard open={true} records={records} name={name} onNameChange={setName} onClear={onClear} fmtMs={fmtMs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}