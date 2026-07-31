import React from "react";
import { classColor } from "../utils/wow";

function ClassBadge({ className, spec }) {
  return (
    <span style={{ color: classColor(className), fontWeight: 600 }}>
      {className}
      {spec ? ` — ${spec}` : ""}
    </span>
  );
}

export default ClassBadge;
