import { useEffect, useRef } from "react";

export function useWebAudioBGM(src) {
  const ctxRef = useRef(null);
  const bufRef = useRef(null);
  const nodeRef = useRef(null);
  const gainRef = useRef(null);

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

  const stop = () => {
    try {
      nodeRef.current?.stop();
    } catch { }
    try {
      nodeRef.current?.disconnect();
    } catch { }
    nodeRef.current = null;
  };

  const play = async () => {
    await loadOnce();
    const ctx = ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
    stop();
    const n = ctx.createBufferSource();
    n.buffer = bufRef.current;
    n.loop = true;
    n.connect(gainRef.current);
    n.start(0);
    nodeRef.current = n;
  };

  const setVolume = (v) => {
    if (gainRef.current)
      gainRef.current.gain.value = Math.max(0, Math.min(1, v));
  };

  // 백그라운드 전환 시 즉시 정지
  useEffect(() => {
    const onHide = () => {
      stop();
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = null;
        } catch { }
        try {
          navigator.mediaSession.playbackState = "none";
        } catch { }
      }
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) onHide();
    });
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return { play, stop, setVolume };
}
