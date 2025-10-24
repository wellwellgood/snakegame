import { useEffect, useRef } from "react";

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
      try { gainRef.current.disconnect(); } catch { }
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
    try { if (ctx.state === "suspended") await ctx.resume(); } catch { }
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
    try { nodeRef.current.stop(); } catch { }
    try { nodeRef.current.disconnect(); } catch { }
    nodeRef.current = null;
    wasPlayingRef.current = false;
  };

  const resume = async () => {
    if (nodeRef.current) return;
    await loadOnce();
    // if (!ctxRef.current || ctxRef.current.state === "closed" || ctxRef.current.state === "interrupted") createCtx();
    const ctx = ensureCtx();
    try { if (ctx.state === "suspended") await ctx.resume(); } catch (e) { }
    if (ctx.state !== "running") {
      needUserTapRef.current = true;
      throw new Error("requires-user-gesture");
    }
    _startAt(pausedOffsetRef.current || 0);
    needUserTapRef.current = false;
  };

  const stop = () => {
    wasPlayingRef.current = false;
    try { nodeRef.current?.stop(); } catch { }
    try { nodeRef.current?.disconnect(); } catch { }
    nodeRef.current = null;
    pausedOffsetRef.current = 0;
    startedAtRef.current = 0;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const clearMedia = () => {
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = null; } catch { }
        try { navigator.mediaSession.playbackState = 'none'; } catch { }
        ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto'].forEach(a => {
          try { navigator.mediaSession.setActionHandler(a, null); } catch { }
        });
      }
    };

    const onHide = () => {
      wasPlayingRef.current = !audio.paused;
      audio.pause();
      setInsoundOn(flase);
      clearMedia();
      addlog('🌙 백그라운드 - BGM 정지 + MediaSession 해제');

      // ✅ 백그라운드 진입 시 MediaSession 제거 (다이내믹 아일랜드 숨김)
      if ("mediaSession" in navigator) {
        try { navigator.mediaSession.metadata = null; } catch { }
        try { navigator.mediaSession.playbackState = "none"; } catch { }
        ["play", "pause", "stop", "seekbackward", "seekforward", "seekto"].forEach(k => {
          try { navigator.mediaSession.setActionHandler(k, null); } catch { }
        });
      }
    };

    const onShow = async () => {
      // ✅ 복귀 시 직전 재생 상태만 복원
      if (!wasPlayingRef.current) return;
      audio.play().then(() => {
        setInsoundOn(true);
        addlog('🌞 포그라운드 복귀 - BGM 재생');
      }).catch(err => {
        setNeedManualresume(true);
        addlog('⚠️ 복귀 자동재생 실패: ${err.name}');
      });
    };

    const onVis = () => document.hidden ? onHide() : onShow();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', onHide, { capture: true });
  window.addEventListener('blur', onHide);
  window.addEventListener('pageshow', onShow);
  window.addEventListener('focus', onShow);

  return () => {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onHide, { capture: true });
    window.removeEventListener('blur', onHide);
    window.removeEventListener('pageshow', onShow);
    window.removeEventListener('focus', onShow);
  };
}, []);

  return { play, pause, resume, stop, };
}