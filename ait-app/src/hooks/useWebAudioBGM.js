import { useEffect, useRef } from "react";

export function useWebAudioBGM(src) {
  const ctxRef = useRef(null);
  const bufRef = useRef(null);
  const nodeRef = useRef(null);
  const gainRef = useRef(null);
  const wasPlayingRef = useRef(false);
  const startedAtRef = useRef(0);
  const pausedOffsetRef = useRef(0);

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
    if (nodeRef.current) return;               // 이미 재생 중
    await loadOnce();
    const ctx = ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
    _startAt(pausedOffsetRef.current || 0);    // 정지면 0, 일시정지면 이어서
  };

  const pause = () => {
    if (!nodeRef.current) return;
    const ctx = ensureCtx();
    pausedOffsetRef.current = Math.max(0, ctx.currentTime - startedAtRef.current);
    try { nodeRef.current.stop(); } catch { }
    try { nodeRef.current.disconnect(); } catch { }
    nodeRef.current = null;
    wasPlayingRef.current = false;
  };

  const resume = async () => {
    if (nodeRef.current) return;
    await loadOnce();
    const ctx = ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
    _startAt(pausedOffsetRef.current || 0);
  };

  const stop = () => {
    wasPlayingRef.current = false;
    try { nodeRef.current?.stop(); } catch { }
    try { nodeRef.current?.disconnect(); } catch { }
    nodeRef.current = null;
    pausedOffsetRef.current = 0;
    startedAtRef.current = 0;
  };

  const setVolume = (v) => {
    if (gainRef.current) gainRef.current.gain.value = Math.max(0, Math.min(1, v));
  };

  // 백그라운드 → 일시정지, 복귀 → 직전상태면 재개
  useEffect(() => {
    const clearMS = () => {
      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.metadata = null; } catch { }
        try { navigator.mediaSession.playbackState = "none"; } catch { }
      }
    };
    const onHide = () => {
      wasPlayingRef.current = !!nodeRef.current;
      pause();
      clearMS();
    };
    const tryResume = async () => {
      if (!wasPlayingRef.current) return;
      await resume(); // iOS가 제스처 요구 시 다음 탭에서 성공
    };

    const onVis = () => (document.hidden ? onHide() : tryResume());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", tryResume);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", tryResume);
      window.removeEventListener("pagehide", onHide);
      stop();
    };
  }, []);

  return { play, pause, resume, stop, setVolume };
}
