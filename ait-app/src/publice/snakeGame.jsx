import React, { useCallback, useEffect, useRef, useState } from "react";
import Styles from "./snakeGame.module.css";
import { playEat, getAudioContext } from "./sfx";

const COLS = 22;
const ROWS = 22;
const TICK_MS_DEFAULT = 120;

function randCell(max) {
  return Math.floor(Math.random() * max);
}
function same(a, b) {
  return a.x === b.x && a.y === b.y;
}
function randomFood(snake) {
  while (true) {
    const f = { x: randCell(COLS), y: randCell(ROWS) };
    if (!snake.some((s) => same(s, f))) return f;
  }
}

export default function SnakeGame({
  onGameOver,
  hideStartUI = false,
  autoStartTick = 0,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const dprRef = useRef(
    Math.min(
      2,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    )
  );
  const scrollYRef = useRef(0);
  const startTsRef = useRef(Date.now());
  useEffect(() => {
    startTsRef.current = Date.now();
  }, []);

  // 반응형 셀 크기
  const [size, setSize] = useState(() => {
    const S = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9);
    const cell = Math.max(12, Math.floor(S / COLS));
    return { cell, w: COLS * cell, h: ROWS * cell };
  });
  const CELL_SIZE = size.cell;
  const WIDTH = size.w;
  const HEIGHT = size.h;

  // ===== 상태를 먼저 선언 =====
  const [running, setRunning] = useState(true);
  const [started, setStarted] = useState(false);
  const [tickMs, setTickMs] = useState(TICK_MS_DEFAULT);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [snake, setSnake] = useState(() => {
    const mid = Math.floor(COLS / 2);
    return [
      { x: mid - 1, y: mid },
      { x: mid, y: mid },
      { x: mid + 1, y: mid },
    ];
  });
  const [food, setFood] = useState(() => randomFood([]));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() =>
    Number(localStorage.getItem("snake_best") || 0)
  );
  const [gameOver, setGameOver] = useState(false);

  // 시작/리셋 콜백
  const startGame = useCallback(() => {
    setStarted(true);
    setRunning(true);
  }, []);
  const reset = useCallback(() => {
    const mid = Math.floor(COLS / 2);
    setSnake([
      { x: mid - 1, y: mid },
      { x: mid, y: mid },
      { x: mid + 1, y: mid },
    ]);
    setDir({ x: 1, y: 0 });
    setFood(randomFood([]));
    setScore(0);
    setTickMs(TICK_MS_DEFAULT);
    startTsRef.current = Date.now();
    setGameOver(false);
    setRunning(true);
  }, []);

  // 카운트다운 종료 신호 오면 자동 시작
  useEffect(() => {
    if (!started && autoStartTick > 0) startGame();
  }, [autoStartTick, started, startGame]);

  // 반응형 리스너
  useEffect(() => {
    function fit() {
      const S = Math.floor(
        Math.min(window.innerWidth, window.innerHeight) * 0.9
      );
      const cell = Math.max(12, Math.floor(S / COLS));
      setSize({ cell, w: COLS * cell, h: ROWS * cell });
      dprRef.current = Math.min(2, window.devicePixelRatio || 1);
    }
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    fit();
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
  }, []);

  // 스크롤 잠금
  useEffect(() => {
    scrollYRef.current = window.scrollY || 0;
    const b = document.body;
    b.style.position = "fixed";
    b.style.top = `-${scrollYRef.current}px`;
    b.style.left = "0";
    b.style.right = "0";
    b.style.width = "100%";
    b.style.overflow = "hidden";
    return () => {
      const y = scrollYRef.current;
      b.style.position = "";
      b.style.top = "";
      b.style.left = "";
      b.style.right = "";
      b.style.width = "";
      b.style.overflow = "";
      window.scrollTo(0, y);
    };
  }, []);

  // 키보드
  useEffect(() => {
    function onKey(e) {
      const k = e.key.toLowerCase();
      if ((k === " " || k === "enter") && !started) {
        startGame();
        return;
      }
      if (k === " " || k === "enter") {
        if (gameOver) reset();
        else if (started) setRunning((r) => !r);
        return;
      }
      if (!running) return;
      if (k === "arrowup" || k === "w")
        return setDir((d) => (d.y === 1 ? d : { x: 0, y: -1 }));
      if (k === "arrowdown" || k === "s")
        return setDir((d) => (d.y === -1 ? d : { x: 0, y: 1 }));
      if (k === "arrowleft" || k === "a")
        return setDir((d) => (d.x === 1 ? d : { x: -1, y: 0 }));
      if (k === "arrowright" || k === "d")
        return setDir((d) => (d.x === -1 ? d : { x: 1, y: 0 }));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, reset, gameOver, startGame, started]);

  // 스와이프
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let sx = 0,
      sy = 0;
    function start(ev) {
      const t = ev.touches?.[0];
      if (!t) return;
      sx = t.clientX;
      sy = t.clientY;
    }
    function move(ev) {
      if (!running) return;
      const t = ev.touches?.[0];
      if (!t) return;
      const dx = t.clientX - sx,
        dy = t.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDir((d) =>
          dx > 0
            ? d.x === -1
              ? d
              : { x: 1, y: 0 }
            : d.x === 1
            ? d
            : { x: -1, y: 0 }
        );
      } else {
        setDir((d) =>
          dy > 0
            ? d.y === -1
              ? d
              : { x: 0, y: 1 }
            : d.y === 1
            ? d
            : { x: 0, y: -1 }
        );
      }
      const t2 = ev.touches?.[0];
      if (!t2) return;
      sx = t2.clientX;
      sy = t2.clientY;
    }
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
    };
  }, [running]);

  // 한 틱
  const step = useCallback(() => {
    setSnake((prev) => {
      const head = prev[prev.length - 1];
      const nx = head.x + dir.x,
        ny = head.y + dir.y;

      // 충돌
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= COLS ||
        ny >= ROWS ||
        prev.some((p) => p.x === nx && p.y === ny)
      ) {
        setGameOver(true);
        setRunning(false);
        setBest((b) => {
          const nb = Math.max(b, score);
          localStorage.setItem("snake_best", String(nb));
          return nb;
        });
        return prev;
      }

      const next = [...prev, { x: nx, y: ny }];

      // 먹이
      if (nx === food.x && ny === food.y) {
        const newScore = score + 1;
        setScore(newScore);
        setFood(randomFood(next));
        setTickMs((ms) => (newScore % 4 === 0 && ms > 60 ? ms - 6 : ms));
        playEat();
        return next;
      }


      // 이동
      next.shift();
      return next;
    });
  }, [dir, food, score]);

  // 루프
  const loop = useCallback(
    (t) => {
      if (!started || !running || gameOver) return;
      if (t - lastTickRef.current >= tickMs) {
        lastTickRef.current = t;
        step();
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [tickMs, running, gameOver, started, step]
  );

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  // 탭 비가시성 시 일시정지
  useEffect(() => {
    let wasRunningRef = running; // 백그라운드 전환 전 상태 저장
    
    function vis() {
      if (document.hidden) {
        // 백그라운드로 갈 때: 현재 실행 중이었는지 기억하고 일시정지
        wasRunningRef = running;
        if (running) setRunning(false);
      } else {
        // 포어그라운드로 복귀할 때: 이전에 실행 중이었다면 자동 재개
        if (wasRunningRef && started && !gameOver) {
          setRunning(true);
        }
      }
    }
    
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [running, started, gameOver]);


  // 그리기
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    const bw = Math.floor(WIDTH * dpr),
      bh = Math.floor(HEIGHT * dpr);
    if (c.width !== bw || c.height !== bh) {
      c.width = bw;
      c.height = bh;
      c.style.width = `${WIDTH}px`;
      c.style.height = `${HEIGHT}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 배경
    ctx.fillStyle = "#02017F";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 그리드
    ctx.strokeStyle = "#02017F";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE + 0.5, 0);
      ctx.lineTo(x * CELL_SIZE + 0.5, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE + 0.5);
      ctx.lineTo(WIDTH, y * CELL_SIZE + 0.5);
      ctx.stroke();
    }

    // 스네이크
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const isHead = i === snake.length - 1;
      ctx.fillStyle = isHead ? "#E9F711" : "#E9F711";
      const pad = isHead ? 1 : 1;
      ctx.fillRect(
        s.x * CELL_SIZE + pad,
        s.y * CELL_SIZE + pad,
        CELL_SIZE - pad * 1,
        CELL_SIZE - pad * 1
      );
    }

    // 먹이
    ctx.fillStyle = "#E9F711";
    const r = Math.floor(CELL_SIZE / 2) - 4;
    const cx = food.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = food.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }, [snake, food, CELL_SIZE, WIDTH, HEIGHT]);

  // onGameOver 단 한번
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (!gameOver || reportedRef.current) return;
    onGameOverRef.current?.({
      score,
      durationMs: Date.now() - startTsRef.current,
      when: new Date().toISOString(),
    });
    reportedRef.current = true;
  }, [gameOver, score]);

  // 새 게임 시작하면 리셋 플래그
  useEffect(() => {
    if (started && !gameOver) reportedRef.current = false;
  }, [started, gameOver]);

  return (
    <div
      className={Styles.snakeGame}
      style={{
        width: "100%",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 16,
        userSelect: "none",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Snake</h1>
      <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
        <span>
          Score: <b>{score}</b>
        </span>
        <span>
          Best: <b>{best}</b>
        </span>
        <span>
          Speed: <b>{Math.round(1000 / tickMs)} fps</b>
        </span>
      </div>

      <div
        style={{
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          borderRadius: 12,
          border: "1px solid #ffffff",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            background: "#0b1020",
            borderRadius: 16,
            imageRendering: "pixelated",
            touchAction: "none",
          }}
        />

        {/* 오버레이 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          {!hideStartUI && !started && !running && (
            <div
              style={{
                width: 104,
                height: 54,
                border: "2px solid #CCFBEA",
                borderRadius: 100,
              }}
            >
              <button
                onClick={startGame}
                onTouchStart={startGame}
                style={{
                  position: "absolute",
                  width: 100,
                  height: 50,
                  pointerEvents: "auto",
                  borderRadius: 100,
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: "pointer",
                  color: "#0A134A",
                  background: "#8EF5C5",
                }}
              >
                ▶
              </button>
            </div>
          )}
          {!running && !gameOver && (
            <div
              style={{
                pointerEvents: "auto",
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Paused
            </div>
          )}
          {gameOver && (
            <div
              style={{
                pointerEvents: "auto",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                padding: "12px 14px",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                Game Over
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Press Enter to restart
              </div>
              <button
                onClick={reset}
                style={{
                  background: "#fff",
                  color: "#000",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Restart
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setRunning((r) => !r)} style={btnStyle}>
          {running ? "Pause" : "Resume"}
        </button>
        <button onClick={reset} style={btnStyle}>
          Reset
        </button>
        <button
          onClick={() => setTickMs((ms) => Math.max(60, ms - 10))}
          style={btnStyle}
        >
          +
        </button>
        <button
          onClick={() => setTickMs((ms) => Math.min(300, ms + 10))}
          style={btnStyle}
        >
          -
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
