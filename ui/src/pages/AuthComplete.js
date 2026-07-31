import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function decodeClaimable(b64) {
  if (!b64) return [];
  try {
    const standard = b64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(standard));
  } catch {
    return [];
  }
}

function AuthComplete() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/");
      return;
    }
    login(token);
    sessionStorage.setItem("claimable_guilds", JSON.stringify(decodeClaimable(params.get("claimable"))));
    navigate("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <div className="loading-text">Signing you in…</div>
    </div>
  );
}

export default AuthComplete;
