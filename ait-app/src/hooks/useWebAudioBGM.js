import { useEffect, useRef, useCallback } from "react";

export function useWebAudioBGM(url) {
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const gainRef = useRef(null);
  const bufRef = useRef(null);

  const ensureCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }
  };

  const load = useCallback(async () => {
    ensureCtx();
    if (bufRef.current) return;
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    bufRef.current = await ctxRef.current.decodeAudioData(arr);
  }, [url]);

  const play = useCallback(async () => {
    ensureCtx();
    await load();
    // 기존 소스 정리
    if (srcRef.current) {
      try { srcRef.current.stop(0); } catch {}
      try { srcRef.current.disconnect(); } catch {}
      srcRef.current = null;
    }
    // 새 소스 시작
    srcRef.current = ctxRef.current.createBufferSource();
    srcRef.current.buffer = bufRef.current;
    srcRef.current.loop = true;
    srcRef.current.connect(gainRef.current);
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
    srcRef.current.start(0);
  }, [load]);

  const pause = useCallback(async () => {
    if (!ctxRef.current) return;
    if (ctxRef.current.state === "running") await ctxRef.current.suspend();
  }, []);

  const resume = useCallback(async () => {
    ensureCtx();
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
  }, []);

  const stop = useCallback(async () => {
    if (srcRef.current) {
      try { srcRef.current.stop(0); } catch {}
      try { srcRef.current.disconnect(); } catch {}
      srcRef.current = null;
    }
    // 컨텍스트는 닫지 않는다. close() 금지
  }, []);

  const setVolume = useCallback((v) => {
    ensureCtx();
    if (gainRef.current) gainRef.current.gain.value = v;
  }, []);

  useEffect(() => {
    return () => {
      try { srcRef.current?.stop(0); } catch {}
      try {
        if (ctxRef.current && ctxRef.current.state !== "closed") {
          ctxRef.current.close();
        }
      } catch {}
    };
  }, []);

  return { play, pause, resume, stop, setVolume };
}
