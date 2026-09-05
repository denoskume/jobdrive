export const DISCOVERY_SOURCES = [
  { key:"mistral-ashby", company:"Mistral AI", type:"ashby", tenant:"mistral.ai", active:true },
  { key:"huggingface-greenhouse", company:"Hugging Face", type:"greenhouse", tenant:"huggingface", active:true },
  { key:"datadog-greenhouse", company:"Datadog", type:"greenhouse", tenant:"datadog", active:true },
  { key:"doctolib-lever", company:"Doctolib", type:"lever", tenant:"doctolib", active:true },
  { key:"backmarket-lever", company:"Back Market", type:"lever", tenant:"backmarket", active:true },
  { key:"bosch-smartrecruiters", company:"Bosch France", type:"smartrecruiters", tenant:"BoschGroup", active:true },
  { key:"visa-smartrecruiters", company:"Visa", type:"smartrecruiters", tenant:"Visa", active:true },
  { key:"publicis-smartrecruiters", company:"Publicis Groupe", type:"smartrecruiters", tenant:"PublicisGroupe", active:true },
];
export function activeDiscoverySources() { return DISCOVERY_SOURCES.filter(source => source.active); }
