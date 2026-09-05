import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import JobDriveDashboardBase from "./JobDriveDashboardBase.jsx";
import CoverageHealthCard from "./discovery/CoverageHealthCard.jsx";

function CoverageHealthPortal({ coverage, retainedTotal, error }) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    const kpiSection = document.querySelector(".jd-kpis");
    if (!kpiSection) return undefined;

    const slot = document.createElement("div");
    slot.className = "jd-coverage-health-slot";
    kpiSection.insertAdjacentElement("afterend", slot);
    setHost(slot);

    return () => {
      setHost(null);
      slot.remove();
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <CoverageHealthCard
      coverage={coverage}
      retainedTotal={retainedTotal}
      error={error}
    />,
    host
  );
}

export default function JobDriveDashboard(props) {
  const {
    view,
    jobs = [],
    coverage,
    coverageError = "",
  } = props;

  return (
    <>
      <JobDriveDashboardBase {...props} />
      {view === "overview" ? (
        <CoverageHealthPortal
          coverage={coverage}
          retainedTotal={jobs.length}
          error={coverageError}
        />
      ) : null}
    </>
  );
}
