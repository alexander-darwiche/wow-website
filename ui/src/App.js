import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import ZoneSummary from "./pages/ZoneSummary";
import DpsReport from "./pages/DpsReport";
import GearReport from "./pages/GearReport";

function App() {
  return (
    <Router>
      <nav style={{ padding: "10px" }}>
        <Link to="/">Home</Link> |{" "}
        <Link to="/zones">Zone Summary</Link> |{" "}
        <Link to="/dps">DPS Report</Link>
        <Link to="/gear">Gear Report</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/zones" element={<ZoneSummary />} />
        <Route path="/dps" element={<DpsReport />} />
        <Route path="/gear" element={<GearReport />} />
      </Routes>
    </Router>
  );
}

export default App;
