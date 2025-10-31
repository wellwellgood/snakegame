// env 체크
export function isAitEnv() {
    if (typeof window === "undefined") return false;
    return !!(
        window.__AIT_API__ ||
        window.ReactNativeWebView ||
        (window.webkit && window.webkit.messageHandlers)
    );
}

// 키 조회 래퍼
export async function resolveUserKeyOrFallback(loginId) {
    if (!isAitEnv()) return loginId || "PLAYER";
    try {
        const res = await getUserKeyForGame();
        // 가능한 반환 케이스 처리
        if (res && typeof res === "object" && res.type === "HASH" && typeof res.hash === "string") {
            return res.hash;            // 정식 키
        }
        if (res === "INVALID_CATEGORY") {
            // 게임 카테고리 아님 → 로그인 아이디로 대체
            return loginId || "PLAYER";
        }
        if (res === "ERROR" || typeof res === "undefined") {
            // 오류 혹은 최소버전 미만 → 로그인 아이디로 대체
            return loginId || "PLAYER";
        }
        // 정의 밖 값이 와도 안전 대체
        return loginId || "PLAYER";
    } catch (e) {
        // 브라우저 환경 등 예외: ReactNativeWebView not available …
        return loginId || "PLAYER";
    }
}
