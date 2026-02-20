import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import Home from "./pages/Home";
import GuildSummary from "./pages/GuildSummary";
import ReportDetail from "./pages/ReportDetail";
import PlayerPage from "./pages/PlayerPage";
import RaidingPopulation from "./pages/RaidingPopulation";
import "./App.css";

function App() {
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
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
            {/* Population nav link disabled for now */}
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/guild" element={<GuildSummary backendUrl={backendUrl} />} />
            <Route path="/report/:code" element={<ReportDetail backendUrl={backendUrl} />} />
            <Route path="/player" element={<PlayerPage backendUrl={backendUrl} />} />
            {/* <Route path="/population" element={<RaidingPopulation backendUrl={backendUrl} />} /> */}
          </Routes>
        </main>

        <footer className="footer">
          <p>Raidlytics &mdash; Data sourced from WarcraftLogs API</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
