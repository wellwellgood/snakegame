// WebAudio 기반 초저지연 SFX
import eatUrl from "./assets/gameSoundEffect.mp3";

let ctx, eatBuf;
export async function initSfx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (!eatBuf) {
    const res = await fetch(eatUrl);
    const arr = await res.arrayBuffer();
    eatBuf = await ctx.decodeAudioData(arr);
  }
}
export function resumeSfx() { ctx?.resume().catch(() => {}); }
export function playEat() {
  if (!ctx || !eatBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = eatBuf;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  src.connect(gain).connect(ctx.destination);
  src.start(0); // 즉시 재생
}
