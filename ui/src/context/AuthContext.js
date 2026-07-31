import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMe } from "../api/auth";
import { clearToken, getToken, setToken as persistToken } from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getMe()
      .then(setUser)
      .catch(() => {
        // Token missing/expired/invalid — drop it.
        clearToken();
        setTokenState("");
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = (newToken) => {
    persistToken(newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    clearToken();
    setTokenState("");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
