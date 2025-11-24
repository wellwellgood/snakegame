// App.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import SnakeGame from "./publice/snakeGame.jsx";
import Scoreboard from "./publice/scoreBoard.jsx";
import { addScore, loadScores, clearScores } from "./publice/scoreStorage.jsx";
import { initSfx, resumeSfx, setSfxMuted, getAudioContext } from "./publice/sfx.js";
import { useWebAudioBGM } from "./hooks/useWebAudioBGM";
import styles from "./App.module.css";

import {
  appLogin,
  getUserKeyForGame,
  submitGameCenterLeaderBoardScore,
  openGameCenterLeaderboard,
  isMinVersionSupported,
  tdsEvent,
} from "@apps-in-toss/web-framework";
import ALL from "./img/ALL.png";
import Setting from "./img/setting.png";
import BGM from "./publice/assets/gameSoundEffect.mp3";

const fmtMs = (ms) => {
  const totalMin = Math.floor(ms / 60000);
  const sec = Math.floor(ms / 1000) % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(totalMin).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

const isAitEnv = () =>
  typeof window !== "undefined" &&
  (window.__AIT_API__ || window.ReactNativeWebView || (window.webkit && window.webkit.messageHandlers));

export default function GameScreen({ userId }) {
  const boardRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const log = (...a) => setLogs((L) => [...L.slice(-30), a.join(" ")]);

  const [started, setStarted] = useState(false);
  const [showALL, setShowAll] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);


  const [showStart, setShowStart] = useState(true);
  const [counting, setCounting] = useState(false);
  const [count, setCount] = useState(3);
  const [autoStartTick, setAutoStartTick] = useState(0);

  const [name, setName] = useState(() => localStorage.getItem("snake_name") || "PLAYER");
  const [records, setRecords] = useState(() => loadScores());
  const [open, setOpen] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  // 로그인 모달 상태 추가
  const [showSetting, setShowSetting] = useState(false);
  const [sfxOn, setSfxOn] = useState(() => localStorage.getItem("snake_sfx") !== "off");
  const [bgmOn, setBgmOn] = useState(() => localStorage.getItem("snake_bgm") === "on");

  // AudioContext 공유
  const [sharedCtx, setSharedCtx] = useState(null);
  const { play: playBgm, pause: pauseBgm, resume: resumeBgm } = useWebAudioBGM(BGM, sharedCtx);

  // BGM 재생 상태 추적
  const isBgmPlayingRef = useRef(false);

  // Toss 리더보드 식별용 원본 키
  const [userKey, setUserKey] = useState("");

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
      playBgm()
        .then(() => {
          isBgmPlayingRef.current = true;
          log("BGM 재생 시작");
        })
        .catch((err) => {
          log("BGM 재생 실패:", err?.message);
        });
    } else {
      pauseBgm()
        .then(() => {
          isBgmPlayingRef.current = false;
          log("BGM 일시정지");
        })
        .catch(() => { });
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

  // 포어그라운드 복귀 처리
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

      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
          log("✅ AudioContext resume 호출, new state:", ctx.state);
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

      if (bgmOn && isBgmPlayingRef.current && ctx.state === "running") {
        try {
          await resumeBgm();
          log("✅ BGM resumed");
        } catch (err) {
          log("❌ BGM resume 실패:", err?.message);
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

        await forceResumeAudio();

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

        log("ℹ️ AudioContext 유지 (suspend 안 함)");
      }
    };

    const onFocus = async () => {
      log("🎯 window focus");
      await forceResumeAudio();
    };

    const onPageShow = async (e) => {
      log("🔄 pageshow, persisted:", e.persisted);
      if (e.persisted) {
        await forceResumeAudio();
      }
    };

    const onUserInteraction = async () => {
      const ctx = getAudioContext();
      log("👆 사용자 인터랙션, ctx.state:", ctx?.state, "needsGesture:", needsUserGesture);

      if (document.visibilityState === "visible" && ctx) {
        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
            log("✅ 제스처로 AudioContext resumed, state:", ctx.state);

            if (bgmOn && isBgmPlayingRef.current) {
              try {
                await resumeBgm();
                log("✅ 제스처로 BGM resumed");
              } catch {
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

  // 연령이미지 3초 노출
  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2500);  // 2.5초 후 서서히 사라짐 시작
    const t2 = setTimeout(() => setShowAll(false), 3000); // 3초 후 완전히 제거
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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

  // 원본 키와 표시용 이름 세팅
  useEffect(() => {
    const id = localStorage.getItem("snake_userId") || "";
    if (!isAitEnv()) {
      const display = id || "PLAYER";
      setUserKey(id || "");
      setName(display);
      localStorage.setItem("snake_userId", display);
      return;
    }
    appLogin()                              // ① 로그인 화면 띄움 (AIT에서만)
      .catch(() => null)                    // 이미 로그인됐거나 취소해도 계속 진행
      .then(() => getUserKeyForGame())      // ② 로그인 완료 후 게임용 키 획득
      .then((key) => {
        const raw = typeof key === "string" ? key : key?.hash || "";
        const display = id || (raw ? raw.slice(0, 8) : "PLAYER");
        setUserKey(raw);
        setName(display);
        localStorage.setItem("snake_userId", display);
        if (raw) localStorage.setItem("snake_userKey", raw);
      })
      .catch(() => {
        const display = id || "PLAYER";
        setUserKey(id || "");
        setName(display);
        localStorage.setItem("snake_userId", display);
      });
  }, []);

  const safeGetUserKey = async () => {
    if (!window.ReactNativeWebView) return null;
    try {
      await appLogin();
      return await getUserKeyForGame();
    } catch {
      return null;
    }
  };

  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  // 게임 오버 시 점수 제출
  const onGameOver = useCallback(
    async (rec) => {
      try {
        if (isAitEnv() && userKey) {
          await submitGameCenterLeaderBoardScore({
            score: String(rec.score),
            name: (nameRef.current || "PLAYER").slice(0, 12),
            userKey,
          });
          log("리더보드 점수 제출 성공");
        }
      } catch (err) {
        log("리더보드 제출 실패:", err?.message || String(err));
      }
      const fixedName = (nameRef.current?.toUpperCase().slice(0, 12)) || "PLAYER";
      const top = addScore({ ...rec, name: fixedName });
      setRecords(top);
      setOpen(true);
    },
    [userId, userKey]
  );

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


  //pinch zoom 방지
  useEffect(() => {
    const blockPinch = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const blockGesture = (e) => {
      e.preventDefault();
    };

    document.addEventListener("touchmove", blockPinch, { passive: false });
    document.addEventListener("gesturestart", blockGesture);
    document.addEventListener("gesturechange", blockGesture);
    document.addEventListener("gestureend", blockGesture);

    return () => {
      document.removeEventListener("touchmove", blockPinch);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
    };
  }, []);

  return (
    <div className={styles.main} style={{ display: "flex", flexDirection: "column", isolation: "isolate" }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 20,
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
                fontSize: 20,
                color: "#E6F7FF",
                textShadow: "0 2px 6px rgba(0,0,0,0.4)",
                display: "inline-block",
                width: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              Snake Game
            </h1>
            <div
              style={{
                position: "relative",
                width: "100%",
                display: "flex",
                alignItems: "center",
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
              </h1>

              {/* 오른쪽 버튼 영역 */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowHowTo(true)}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 100,
                    background: "#e2e2e2",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ?
                </button>

                <button
                  onClick={() => setOpen((v) => !v)}
                  style={{
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
            </div>
          </div>

          <div
            style={{
              position: "relative",
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
                position: "absolute",
              }}
            >
              <div>
                <div style={{ top: 10, right: 0, display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                  {showALL && (
                    <div style={{ transition: "opacity 0.5s ease", }}>
                      <img
                        src={ALL}
                        alt="all"
                        style={{
                          width: 40,
                          height: 40,
                          marginTop: "10px",
                        }}
                      />
                    </div>
                  )}
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
                      alt="settings"
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
                      top: "500%",
                      right: "50%",
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

        {/* START 버튼 화면 */}
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
        {/* 게임 방법 모달 */}
        {showHowTo && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.5)",
              zIndex: 99999,
            }}
            onClick={() => setShowHowTo(false)}
          >
            <div
              style={{
                width: "85%",
                maxWidth: 360,
                background: "#ffffff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <b style={{ fontSize: 16 }}>게임 방법</b>
                <button
                  onClick={() => setShowHowTo(false)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  닫기
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                <p style={{ marginTop: 0, marginBottom: 6 }}>
                  뱀을 움직여 먹이를 먹고, 벽과 자기 몸을 피해서 최대한 오래 버티는 게임입니다.
                </p>

                <p style={{ margin: "6px 0 2px" }}>조작 방법</p>
                <ul style={{ paddingLeft: 18, margin: "0 0 6px" }}>
                  <li>모바일: 게임 안 파란화면을 스와이프해서 이동</li>
                </ul>

                <p style={{ margin: "6px 0 2px" }}>규칙</p>
                <ul style={{ paddingLeft: 18, margin: "0 0 6px" }}>
                  <li>먹이를 먹을 때마다 길이가 늘어나고 점수가 올라갑니다.</li>
                  <li>벽이나 자기 몸에 닿으면 게임 오버입니다.</li>
                </ul>

                <p style={{ margin: "6px 0 2px" }}>기타</p>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  <li>PLAY 버튼을 누르면 3초 카운트다운 후 시작됩니다.</li>
                  <li>게임이 끝나면 Scoreboard에서 기록을 확인할 수 있습니다.</li>
                  <li>우측 상단 설정 아이콘에서 효과음/배경음 On/Off를 바꿀 수 있습니다.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 스코어보드 모달 */}
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
                maxHeight: "90%",
                marginTop: "50px",
                background: "#fff",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b>Scoreboard</b>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={onClear}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
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
              </div>

              <Scoreboard
                open={true}
                records={records}
                name={name}
                setName={setName}
                fmtMs={fmtMs}
                loginId={localStorage.getItem("snake_userId")}
                userKeyOverride={userKey}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}