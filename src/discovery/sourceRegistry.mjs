export const DISCOVERY_SOURCES = [
  { key:"mistral-ashby", company:"Mistral AI", type:"ashby", tenant:"mistral.ai", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"datadog-greenhouse", company:"Datadog", type:"greenhouse", tenant:"datadog", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"doctolib-greenhouse", company:"Doctolib", type:"greenhouse", tenant:"doctolib", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"backmarket-ashby", company:"Back Market", type:"ashby", tenant:"backmarket", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"bosch-smartrecruiters", company:"Bosch France", type:"smartrecruiters", tenant:"BoschGroup", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"visa-smartrecruiters", company:"Visa", type:"smartrecruiters", tenant:"Visa", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"publicis-smartrecruiters", company:"Publicis Groupe", type:"smartrecruiters", tenant:"PublicisGroupe", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"alan-ashby", company:"Alan", type:"ashby", tenant:"alan", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"nabla-ashby", company:"Nabla", type:"ashby", tenant:"nabla", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"owkin-ashby", company:"Owkin", type:"ashby", tenant:"owkin", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"pennylane-ashby", company:"Pennylane", type:"ashby", tenant:"pennylane", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"hcompany-ashby", company:"H Company", type:"ashby", tenant:"hcompany", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"photoroom-ashby", company:"Photoroom", type:"ashby", tenant:"photoroom", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"dust-ashby", company:"Dust", type:"ashby", tenant:"dust", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"gladia-ashby", company:"Gladia", type:"ashby", tenant:"gladia", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"decathlon-greenhouse", company:"Decathlon Digital", type:"greenhouse", tenant:"decathlontechnologyen", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"ubisoft-smartrecruiters", company:"Ubisoft", type:"smartrecruiters", tenant:"Ubisoft2", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"poolside-ashby", company:"Poolside", type:"ashby", tenant:"poolside", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"dataiku-greenhouse", company:"Dataiku", type:"greenhouse", tenant:"dataiku", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"blablacar-lever", company:"BlaBlaCar", type:"lever", tenant:"blablacar", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"pivot-ashby", company:"Pivot", type:"ashby", tenant:"pivot", active:true, verifiedAt:"2026-09-05", verificationStatus:"verified" },
  { key:"huggingface-greenhouse", company:"Hugging Face", type:"greenhouse", tenant:"huggingface", active:false, verifiedAt:"2026-09-05", verificationStatus:"failed", notes:"Greenhouse endpoint returned 404 in production run." },
  { key:"qonto-ashby", company:"Qonto", type:"ashby", tenant:"qonto", active:false, verifiedAt:"", verificationStatus:"unverified" },
  { key:"pigment-ashby", company:"Pigment", type:"ashby", tenant:"pigment", active:false, verifiedAt:"", verificationStatus:"unverified" },
  { key:"contentsquare-greenhouse", company:"Contentsquare", type:"greenhouse", tenant:"contentsquare", active:false, verifiedAt:"", verificationStatus:"unverified" },
  { key:"criteo-greenhouse", company:"Criteo", type:"greenhouse", tenant:"criteo", active:false, verifiedAt:"", verificationStatus:"unverified" },
  { key:"shifttechnology-lever", company:"Shift Technology", type:"lever", tenant:"shifttechnology", active:false, verifiedAt:"", verificationStatus:"unverified" },
  { key:"france-travail", company:"France Travail", type:"france_travail", tenant:"", active:true, verifiedAt:"", verificationStatus:"configuration_required" },
  { key:"linkedin-market", company:"LinkedIn Jobs", type:"linkedin_discovery", tenant:"", active:true, verifiedAt:"", verificationStatus:"restricted" },
  { key:"indeed-market", company:"Indeed", type:"indeed_discovery", tenant:"", active:true, verifiedAt:"", verificationStatus:"restricted" }
];

export function activeDiscoverySources() {
  return DISCOVERY_SOURCES.filter((source) => source.active && source.verificationStatus === "verified");
}
