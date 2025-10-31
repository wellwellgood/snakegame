import { useEffect, useRef, useCallback } from "react";

/**
 * WebAudio 기반 BGM 훅
 * - sharedCtx 주입 시 SFX와 같은 AudioContext 공유
 * - 언마운트 시 close() 금지 (라우팅 전환에도 생존)
 */
export function useWebAudioBGM(url, sharedCtx) {
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const gainRef = useRef(null);
  const bufRef = useRef(null);

  const ensureCtx = () => {
    // 공유 컨텍스트 우선 사용
    if (sharedCtx) {
      ctxRef.current = sharedCtx;
      if (!gainRef.current) {
        gainRef.current = sharedCtx.createGain();
        gainRef.current.connect(sharedCtx.destination);
      }
      return;
    }
    // 자체 컨텍스트 생성
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
      try { srcRef.current.stop(0); } catch { }
      try { srcRef.current.disconnect(); } catch { }
      srcRef.current = null;
    }

    // 새 소스 시작
    srcRef.current = ctxRef.current.createBufferSource();
    srcRef.current.buffer = bufRef.current;
    srcRef.current.loop = true;
    srcRef.current.connect(gainRef.current);

    if (ctxRef.current.state === "suspended") {
      try { await ctxRef.current.resume(); } catch { }
    }
    srcRef.current.start(0);
  }, [load]);

  const pause = useCallback(async () => {
    if (!ctxRef.current) return;
    if (ctxRef.current.state === "running") {
      try { await ctxRef.current.suspend(); } catch { }
    }
  }, []);

  const resume = useCallback(async () => {
    ensureCtx();
    if (!ctxRef.current) return;
    if (ctxRef.current.state !== "running") {
      try { await ctxRef.current.resume(); } catch { }
    }
  }, []);

  const stop = useCallback(async () => {
    if (srcRef.current) {
      try { srcRef.current.stop(0); } catch { }
      try { srcRef.current.disconnect(); } catch { }
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
      // 라우팅 전환에서도 생존해야 하므로 close() 호출 금지
      try { srcRef.current?.stop(0); } catch { }
      try { srcRef.current?.disconnect(); } catch { }
      srcRef.current = null;
    };
  }, []);

  return { play, pause, resume, stop, setVolume };
}
