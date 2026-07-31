import React, { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext();

export function AppProvider({ children }) {
  // Persistent guild/server (stored in localStorage)
  const [guild, setGuild] = useState(() => localStorage.getItem("app_guild") || "");
  const [server, setServer] = useState(() => localStorage.getItem("app_server") || "");

  // Cached guild logs (session only — not in localStorage since they can be large)
  const [guildLogs, setGuildLogs] = useState([]);
  const [guildLogsFetched, setGuildLogsFetched] = useState(false);

  // Persist guild/server to localStorage on change
  useEffect(() => {
    localStorage.setItem("app_guild", guild);
  }, [guild]);

  useEffect(() => {
    localStorage.setItem("app_server", server);
  }, [server]);

  return (
    <AppContext.Provider
      value={{
        guild, setGuild,
        server, setServer,
        guildLogs, setGuildLogs,
        guildLogsFetched, setGuildLogsFetched,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
