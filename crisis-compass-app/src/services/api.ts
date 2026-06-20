import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'web' 
  ? 'http://localhost:8000' 
  : 'http://192.168.0.187:8000';

export interface GuidanceStep {
  title: string;
  body: string;
  action: string;
  alternative: string;
}

export interface CrisisResponse {
  topic: string;
  location: string | null;
  location_query: string;
  need_for_national_helpline: boolean;
  national_helplinenumber: {
    number: number | null;
    confidence: number;
  } | null;
  overall_confidence: number;
  helpline_organizations: string;
  places: Array<{
    name: string;
    phone: string;
    website: string;
  }>;
  national_helpline_search: string;
  web_links: Array<{ title: string; url: string }>;
  
  // Guided Action Plan (structured steps with alternatives)
  steps: GuidanceStep[];
  case_id: string;
  timestamp: string;
  call_script: string;
  message_draft: string;
  crisis_summary: string;
  passport_qr: string; // Base64 image data URI
  passport_text: string;
}

export async function submitCrisis(
  state: string,
  country: string,
  crisis: string
): Promise<CrisisResponse> {
  const classRes = await fetch(`${API_BASE}/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state,
      country,
      crisis: crisis.trim(),
    }),
  });

  if (!classRes.ok) {
    const text = await classRes.text();
    throw new Error(text || `Server error: ${classRes.status}`);
  }

  const classification = await classRes.json();

  const guidanceBody = {
    user_query: crisis.trim(),
    topic: classification.topic,
    location: classification.location,
    helpline_number: classification.national_helplinenumber?.number ?? null,
    places: classification.places,
    country: country,
  };

  const guideRes = await fetch(`${API_BASE}/guidance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guidanceBody),
  });

  if (guideRes.ok) {
    const guideData = await guideRes.json();
    classification.steps = guideData.steps || [];
    classification.case_id = guideData.case_id;
    classification.timestamp = guideData.timestamp;
    classification.call_script = guideData.call_script;
    classification.message_draft = guideData.message_draft;
    classification.crisis_summary = guideData.crisis_summary;
    classification.passport_qr = guideData.passport_qr;
    classification.passport_text = guideData.passport_text;
  } else {
    classification.steps = [];
    classification.case_id = 'CC-0000';
    classification.timestamp = new Date().toLocaleString();
    classification.call_script = 'Please assist with my crisis.';
    classification.message_draft = 'I need help.';
    classification.crisis_summary = crisis;
    classification.passport_qr = '';
    classification.passport_text = crisis;
  }

  return classification;
}


