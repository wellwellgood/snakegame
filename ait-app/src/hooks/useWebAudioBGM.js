// hooks/useWebAudioBGM.js
import { useEffect, useRef } from "react";

/**
 * WebAudio 기반 BGM 훅
 * - 백그라운드 진입: 즉시 pause + MediaSession 해제 → 다이나믹 아일랜드 숨김
 * - 복귀: 직전이 재생 상태였으면 이어서 자동 재개
 * - 최초 자동재생은 브라우저 정책상 사용자 제스처가 필요할 수 있음
 */
export function useWebAudioBGM(src) {
  const ctxRef = useRef(null);
  const bufRef = useRef(null);
  const nodeRef = useRef(null);
  const gainRef = useRef(null);

  const wasPlayingRef = useRef(false);
  const startedAtRef = useRef(0);
  const pausedOffsetRef = useRef(0);
  const needUserTapRef = useRef(false);

  const CtxCls = () => window.AudioContext || window.webkitAudioContext;

  const createCtx = () => {
    const Ctx = CtxCls();
    const ctx = new Ctx();
    ctxRef.current = ctx;

    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = 1.0;
    } else {
      try { gainRef.current.disconnect(); } catch {}
    }
    gainRef.current.connect(ctx.destination);

    ctx.onstatechange = () => {
      if (ctx.state === "interrupted" || ctx.state === "suspended") {
        needUserTapRef.current = true;
      }
    };

    return ctx;
  };

  const ensureCtx = () => {
    if (!ctxRef.current) return createCtx();
    const st = ctxRef.current.state;
    if (st === "closed" || st === "interrupted") return createCtx();
    return ctxRef.current;
  };

  const loadOnce = async () => {
    if (bufRef.current) return;
    const ctx = ensureCtx();
    const res = await fetch(src);
    const arr = await res.arrayBuffer();
    bufRef.current = await ctx.decodeAudioData(arr);
  };

  const _startAt = (offsetSec = 0) => {
    const ctx = ensureCtx();
    const n = ctx.createBufferSource();
    n.buffer = bufRef.current;
    n.loop = true;
    n.connect(gainRef.current);
    const dur = bufRef.current?.duration || 1;
    n.start(0, offsetSec % dur);
    nodeRef.current = n;
    startedAtRef.current = ctx.currentTime - offsetSec;
    wasPlayingRef.current = true;
  };

  const play = async () => {
    await loadOnce();
    const ctx = ensureCtx();
    try { if (ctx.state === "suspended") await ctx.resume(); } catch {}
    if (ctx.state !== "running") {
      needUserTapRef.current = true;
      throw new Error("requires-user-gesture");
    }
    _startAt(pausedOffsetRef.current || 0);
  };

  const pause = () => {
    if (!nodeRef.current) return;
    const ctx = ensureCtx();
    pausedOffsetRef.current = Math.max(0, ctx.currentTime - startedAtRef.current);
    try { nodeRef.current.stop(); } catch {}
    try { nodeRef.current.disconnect(); } catch {}
    nodeRef.current = null;
    wasPlayingRef.current = false;
  };

  const resume = async () => {
    if (nodeRef.current) return;
    await loadOnce();
    const ctx = ensureCtx();
    try { if (ctx.state === "suspended") await ctx.resume(); } catch {}
    if (ctx.state !== "running") {
      needUserTapRef.current = true;
      throw new Error("requires-user-gesture");
    }
    _startAt(pausedOffsetRef.current || 0);
    needUserTapRef.current = false;
  };

  const stop = () => {
    wasPlayingRef.current = false;
    try { nodeRef.current?.stop(); } catch {}
    try { nodeRef.current?.disconnect(); } catch {}
    nodeRef.current = null;
    pausedOffsetRef.current = 0;
    startedAtRef.current = 0;
  };

  // 백/포그 전환 + 다이내믹 아일랜드 숨김 처리
  useEffect(() => {
    const clearMediaSession = () => {
      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.metadata = null; } catch {}
        try { navigator.mediaSession.playbackState = "none"; } catch {}
        ["play","pause","stop","seekbackward","seekforward","seekto"].forEach(k=>{
          try { navigator.mediaSession.setActionHandler(k, null); } catch {}
        });
      }
    };

    const onHide = () => {
      wasPlayingRef.current = !!nodeRef.current;
      pause();                // 위치 유지
      clearMediaSession();    // 다이내믹 아일랜드 카드 제거
    };

    const onShow = async () => {
      if (!wasPlayingRef.current) return;
      try { await resume(); } catch {}
    };

    const onVis = () => (document.hidden ? onHide() : onShow());

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide, { capture: true });
    window.addEventListener("pageshow", onShow);
    window.addEventListener("blur", onHide);
    window.addEventListener("focus", onShow);

    // iOS 자동재개 보조: 사용자 제스처 시 재시도
    const onFirstUserGesture = async () => {
      if (!needUserTapRef.current) return;
      if (!wasPlayingRef.current) return;
      try { await resume(); } catch {}
    };
    document.addEventListener("pointerdown", onFirstUserGesture, true);
    document.addEventListener("touchstart", onFirstUserGesture, true);
    document.addEventListener("keydown", onFirstUserGesture, true);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide, { capture: true });
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("blur", onHide);
      window.removeEventListener("focus", onShow);

      document.removeEventListener("pointerdown", onFirstUserGesture, true);
      document.removeEventListener("touchstart", onFirstUserGesture, true);
      document.removeEventListener("keydown", onFirstUserGesture, true);

      stop();
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  return { play, pause, resume, stop };
}
