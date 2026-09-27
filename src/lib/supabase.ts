import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Soft message instead of a hard crash so the UI can surface a helpful state.
  console.warn('Supabase env vars are missing. Case persistence will be unavailable.');
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false },
});

export type CaseStatus = 'active' | 'review' | 'closed';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Entity {
  id: string;
  type: 'person' | 'phone' | 'account' | 'device' | 'upi' | 'location';
  label: string;
  meta?: Record<string, string>;
}

export interface Relationship {
  source: string;
  target: string;
  kind: 'owns' | 'calls' | 'transacts' | 'uses_device' | 'located_at' | 'controls';
  weight?: number;
}

export interface CaseBrief {
  sections: { heading: string; body: string }[];
  statutes: string[];
  recommendedActions: string[];
  kingpin?: string;
  confidence: number;
}

export interface CaseRecord {
  id: string;
  case_number: string;
  title: string;
  status: CaseStatus;
  risk_level: RiskLevel;
  pattern: string;
  summary: string;
  source_text: string;
  entities: Entity[];
  relationships: Relationship[];
  brief: CaseBrief;
  created_at: string;
  updated_at: string;
}

export interface CaseInsert {
  case_number: string;
  title: string;
  status: CaseStatus;
  risk_level: RiskLevel;
  pattern: string;
  summary: string;
  source_text: string;
  entities: Entity[];
  relationships: Relationship[];
  brief: CaseBrief;
}
