import React from "react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home-hero">
      <h1>Raidlytics</h1>
      <p>
        Explore raid analytics — zone summaries, DPS breakdowns, gear audits,
        and server population data, all powered by the WarcraftLogs API.
      </p>

      <div className="home-features">
        <Link to="/guild" className="feature-card">
          <div className="feature-icon">🏰</div>
          <div className="feature-title">Guild Summary</div>
          <div className="feature-desc">
            Browse your guild's raid logs by zone. Click into any log to see
            DPS, gear, and more.
          </div>
        </Link>

        <Link to="/player" className="feature-card">
          <div className="feature-icon">⚔️</div>
          <div className="feature-title">Player Lookup</div>
          <div className="feature-desc">
            Search for a player across guild logs. Compare actual DPS to sim
            results and inspect gear.
          </div>
        </Link>

        {/* Population card disabled for now */}
      </div>
    </div>
  );
}

export default Home;
