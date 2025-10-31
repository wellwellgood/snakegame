import React, { useEffect, useState } from "react";
import Scoreboard from "./scoreBoard";
import {
  submitGameCenterLeaderBoardScore,
  getGameCenterLeaderboardScoreList,
  getGameCenterLeaderboardScore,
  getUserKeyForGame,
} from "@apps-in-toss/web-framework";

export default function ScoreboardWrapper({ finalScore, durationMs, fmtMs }) {
  const [records, setRecords] = useState([]);
  const [name, setName] = useState("PLAYER");
  const [open, setOpen] = useState(true);

  // 1️⃣ 유저 식별
  useEffect(() => {
    getUserKeyForGame().then((key) => setName(key.slice(0, 8)));
  }, []);

  // 2️⃣ 점수 제출 (게임 끝났을 때 호출)
  useEffect(() => {
    if (finalScore > 0) {
      const id = localStorage.getItem("snake_userId");
      const key = localStorage.getItem("snake_userKey") || id;
      submitGameCenterLeaderBoardScore({
        score: String(finalScore),
        name: id,
        userKey: key,
      }).catch(console.error);
    }
  }, [finalScore]);

  // 3️⃣ 리더보드 가져오기
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // 전체 리더보드 목록
        const list = await getGameCenterLeaderboardScoreList();
        // 내 점수도 가져와 하이라이트용으로 표시 가능
        const me = await getGameCenterLeaderboardScore();
        console.log("[nav] click:", id);
        const formatted = list.map((entry, i) => ({
          name:
            entry.userKey === me.userKey
              ? "YOU"
              : entry.userKey.slice(0, 8).toUpperCase(),
          score: Number(entry.score),
          durationMs: 0, // 리더보드는 시간 데이터 없음 → 더미
          when: i,
        }));
        setRecords(formatted);
      } catch (e) {
        console.error(e);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <Scoreboard
      open={open}
      records={records}
      name={name}
      onNameChange={setName}
      onClear={() => setRecords([])}
      fmtMs={fmtMs}
    />
  );
}
