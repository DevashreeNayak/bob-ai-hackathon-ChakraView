import type { Entity, Relationship, RiskLevel } from './supabase';

// Calls the Bob edge function to get AI-powered extraction of unstructured
// cyber fraud intelligence. Falls back to the local engine if Bob is
// unavailable (secret not configured, network error, parse failure).

export interface BobResult {
  entities: Entity[];
  relationships: Relationship[];
  pattern: string;
  riskLevel: RiskLevel;
  summary: string;
  source: 'bob' | 'local';
  error?: string;
}

function normalizeEntities(raw: unknown): Entity[] {
  if (!Array.isArray(raw)) return [];
  const validTypes = ['person', 'phone', 'account', 'device', 'upi', 'location'];
  return raw
    .filter((e: any) => e && typeof e.id === 'string' && typeof e.label === 'string')
    .map((e: any) => ({
      id: e.id,
      type: (validTypes.includes(e.type) ? e.type : 'person') as Entity['type'],
      label: e.label,
      meta: e.meta && typeof e.meta === 'object' ? e.meta : undefined,
    }));
}

function normalizeRelationships(raw: unknown): Relationship[] {
  if (!Array.isArray(raw)) return [];
  const validKinds = ['owns', 'calls', 'transacts', 'uses_device', 'located_at', 'controls'];
  return raw
    .filter((r: any) => r && typeof r.source === 'string' && typeof r.target === 'string')
    .map((r: any) => ({
      source: r.source,
      target: r.target,
      kind: (validKinds.includes(r.kind) ? r.kind : 'controls') as Relationship['kind'],
      weight: typeof r.weight === 'number' ? r.weight : 1,
    }));
}

function normalizeRiskLevel(raw: unknown): RiskLevel {
  const valid = ['critical', 'high', 'medium', 'low'];
  if (typeof raw === 'string' && valid.includes(raw.toLowerCase())) {
    return raw.toLowerCase() as RiskLevel;
  }
  return 'high';
}

export async function callBob(text: string): Promise<BobResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase not configured.');
  }

  const endpoint = `${supabaseUrl}/functions/v1/bob-analyze`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Bob function returned ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    entities: normalizeEntities(data.entities),
    relationships: normalizeRelationships(data.relationships),
    pattern: typeof data.pattern === 'string' ? data.pattern : 'Multi-entity fraud network',
    riskLevel: normalizeRiskLevel(data.riskLevel),
    summary: typeof data.summary === 'string' ? data.summary : '',
    source: 'bob',
  };
}
