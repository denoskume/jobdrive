import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  resolveCompanyIdentity,
} from "../companyIdentity/companyIdentity.mjs";

import {
  buildLogoCandidates,
} from "../companyIdentity/companyIdentitySources.mjs";


function NeutralCompanyIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 21V5l8-3v19" />
      <path d="M12 8h8v13" />

      <path d="M7 8h2" />
      <path d="M7 12h2" />
      <path d="M7 16h2" />

      <path d="M15 12h2" />
      <path d="M15 16h2" />
    </svg>
  );
}


export default function CompanyLogo({
  company = "",
  link = "",
  source = "",
  companyDomain = "",
  logoUrl = "",
}) {
  const identity =
    useMemo(
      () =>
        resolveCompanyIdentity({
          company,
          link,
          source,
          companyDomain,
          logoUrl,
        }),
      [
        company,
        link,
        source,
        companyDomain,
        logoUrl,
      ]
    );


  const candidates =
    useMemo(
      () =>
        buildLogoCandidates(
          identity
        ),
      [identity]
    );


  const [candidateIndex, setCandidateIndex] =
    useState(0);


  useEffect(() => {
    setCandidateIndex(0);
  }, [
    company,
    link,
    source,
    companyDomain,
    logoUrl,
  ]);


  const currentLogo =
    candidates[
      candidateIndex
    ] || "";


  if (!currentLogo) {
    return (
      <div
        className="
          jd-company-logo
          jd-company-logo-fallback
        "
        title={
          company ||
          "Company"
        }
        aria-label={
          company
            ? `${company} logo unavailable`
            : "Company logo unavailable"
        }
      >
        <NeutralCompanyIcon />
      </div>
    );
  }


  return (
    <div
      className="jd-company-logo"
      title={
        company ||
        "Company"
      }
    >
      <img
        src={currentLogo}
        alt={
          company
            ? `${company} logo`
            : "Company logo"
        }
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          setCandidateIndex(
            (current) =>
              current + 1
          );
        }}
      />
    </div>
  );
}
