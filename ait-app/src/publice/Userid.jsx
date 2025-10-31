import React, { useState } from "react";

export default function UserLogin({ onLoginSuccess }) {
  const [inputName, setInputName] = useState("");

  const handleLogin = () => {
    if (inputName.trim()) {
      // 로그인 처리 로직
      const id = inputName.trim();
      localStorage.setItem("snake_userId", id);
      localStorage.setItem("snake_userKey", id);
      onLoginSuccess?.(id);
      
      // 로그인 성공 시 콜백 호출
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ 
        marginTop: 0, 
        marginBottom: 20,
        fontSize: 24,
        color: "#1a1a1a"
      }}>
        Snake Game
      </h2>
      
      <p style={{ 
        marginBottom: 20, 
        color: "#666",
        fontSize: 14
      }}>
        게임을 시작하려면 이름을 입력하세요
      </p>
      
      <input
        type="text"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') handleLogin();
        }}
        placeholder="이름 입력"
        maxLength={12}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: 16,
          border: "2px solid #e5e7eb",
          borderRadius: 8,
          marginBottom: 16,
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => e.target.style.borderColor = "#1FD3FF"}
        onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
      />
      
      <button
        onClick={handleLogin}
        disabled={!inputName.trim()}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: 16,
          fontWeight: 700,
          color: "#fff",
          background: inputName.trim() ? "#1FD3FF" : "#ccc",
          border: "none",
          borderRadius: 8,
          cursor: inputName.trim() ? "pointer" : "not-allowed",
          transition: "all 0.2s",
          boxShadow: inputName.trim() ? "0 4px 12px rgba(31, 211, 255, 0.3)" : "none",
        }}
      >
        시작하기
      </button>
    </div>
  );
}