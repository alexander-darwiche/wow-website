import React from "react";
import { discordLoginUrl } from "../api/auth";
import { useAuth } from "../context/AuthContext";

function NavAuthControl() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return (
      <a href={discordLoginUrl()} className="btn btn-secondary" style={{ textDecoration: "none" }}>
        Login with Discord
      </a>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{user.username}</span>
      <button className="btn btn-secondary" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

export default NavAuthControl;
