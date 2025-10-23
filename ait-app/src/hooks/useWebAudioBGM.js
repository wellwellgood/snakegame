import { useEffect, useRef } from "react";

export function useWebAudioBGM(src) {
  const ctxRef = useRef(null);
  const bufRef = useRef(null);
  const nodeRef = useRef(null);
  const gainRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const startedAtRef = useRef(0);
  const pausedOffsetRef = useRef(0);
  const needUserTapRef = useRef(false); // iOS 복귀 시 제스처 요구 폴백

  const ensureCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  };

  const loadOnce = async () => {
    if (bufRef.current) return;
    const res = await fetch(src, { cache: "force-cache" });
    const arr = await res.arrayBuffer();
    const ctx = ensureCtx();
    bufRef.current = await ctx.decodeAudioData(arr);
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = 1.0;
      gainRef.current.connect(ctx.destination);
    }
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
    if (nodeRef.current) return; // 이미 재생 중
    await loadOnce();
    const ctx = ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
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
    try {
      if (ctx.state === "suspended") await ctx.resume();
      _startAt(pausedOffsetRef.current || 0);
      needUserTapRef.current = false;
    } catch {
      needUserTapRef.current = true; // 자동 재개 거부 시 터치 대기
      throw new Error("resume requires user gesture");
    }
  };

  const stop = () => {
    wasPlayingRef.current = false;
    try { nodeRef.current?.stop(); } catch {}
    try { nodeRef.current?.disconnect(); } catch {}
    nodeRef.current = null;
    pausedOffsetRef.current = 0;
    startedAtRef.current = 0;
  };

  const setVolume = (v) => {
    if (gainRef.current) gainRef.current.gain.value = Math.max(0, Math.min(1, v));
  };

  useEffect(() => {
    const clearMS = () => {
      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.metadata = null; } catch {}
        try { navigator.mediaSession.playbackState = "none"; } catch {}
      }
    };

    const onHide = () => {
      wasPlayingRef.current = !!nodeRef.current;
      pause();
      clearMS();
    };

    const tryResume = async () => {
      if (!wasPlayingRef.current) return;
      try { await resume(); } catch { /* iOS가 제스처 요구 → onFirstTap로 처리 */ }
    };

    const onFirstTap = async () => {
      if (!needUserTapRef.current) return;
      needUserTapRef.current = false;
      try { await resume(); } catch {}
      document.removeEventListener("pointerdown", onFirstTap, true);
      document.removeEventListener("touchend", onFirstTap, true);
      document.removeEventListener("click", onFirstTap, true);
    };

    const onVis = () => (document.hidden ? onHide() : tryResume());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", tryResume);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("pointerdown", onFirstTap, true);
    document.addEventListener("touchend", onFirstTap, true);
    document.addEventListener("click", onFirstTap, true);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", tryResume);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("pointerdown", onFirstTap, true);
      document.removeEventListener("touchend", onFirstTap, true);
      document.removeEventListener("click", onFirstTap, true);
      stop();
    };
  }, []);

  return { play, pause, resume, stop, setVolume };
}
