import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import GuildSummary from "./pages/GuildSummary";
import ReportDetail from "./pages/ReportDetail";
import ReportPlayer from "./pages/ReportPlayer";
import PlayerPage from "./pages/PlayerPage";
import CompareReport from "./pages/CompareReport";
import AuthComplete from "./pages/AuthComplete";
import Dashboard from "./pages/Dashboard";
import GuildHome from "./pages/GuildHome";
import Roster from "./pages/Roster";
import GuildGear from "./pages/GuildGear";
import RaidTiers from "./pages/RaidTiers";
import RaidTierDetail from "./pages/RaidTierDetail";
import RaidEventEditor from "./pages/RaidEventEditor";
import GuildSettings from "./pages/GuildSettings";
import NavAuthControl from "./components/NavAuthControl";
import "./App.css";

function App() {
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  return (
    <AuthProvider>
    <AppProvider>
    <Router>
      <div className="app">
        <nav className="navbar">
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div className="navbar-brand">
              <span className="navbar-logo">⚔️</span>
              <span className="navbar-title">Raidlytics</span>
            </div>
            <div className="navbar-links">
              <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Home
              </NavLink>
              <NavLink to="/guild" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Guild Summary
              </NavLink>
              <NavLink to="/player" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Player
              </NavLink>
              <NavLink to="/compare" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                Compare
              </NavLink>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                My Guilds
              </NavLink>
              {/* Population nav link disabled for now */}
            </div>
          </div>
          <NavAuthControl />
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/guild" element={<GuildSummary backendUrl={backendUrl} />} />
            <Route path="/report/:code" element={<ReportDetail backendUrl={backendUrl} />} />
            <Route path="/report/:code/player" element={<ReportPlayer backendUrl={backendUrl} />} />
            <Route path="/player" element={<PlayerPage backendUrl={backendUrl} />} />
            <Route path="/compare" element={<CompareReport backendUrl={backendUrl} />} />
            {/* <Route path="/population" element={<RaidingPopulation backendUrl={backendUrl} />} /> */}

            <Route path="/auth/complete" element={<AuthComplete />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/g/:guildId" element={<GuildHome />} />
            <Route path="/g/:guildId/roster" element={<Roster />} />
            <Route path="/g/:guildId/gear" element={<GuildGear />} />
            <Route path="/g/:guildId/tiers" element={<RaidTiers />} />
            <Route path="/g/:guildId/tiers/:tierId" element={<RaidTierDetail />} />
            <Route path="/g/:guildId/tiers/:tierId/events/:eventId" element={<RaidEventEditor />} />
            <Route path="/g/:guildId/settings" element={<GuildSettings />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>Raidlytics &mdash; Data sourced from WarcraftLogs API</p>
        </footer>
      </div>
    </Router>
    </AppProvider>
    </AuthProvider>
  );
}

export default App;
