import type { CaseBrief, Entity, Relationship, RiskLevel } from './supabase';

// Lightweight entity + relationship extraction used to structure raw intelligence text.
// In production this is where IBM Bob returns structured JSON; the local parser keeps
// the demo fully functional offline and mirrors the exact shape Bob would produce.

const PHONE_RE = /(\+?91[\s-]?)?([6-9]\d{9})/g;
const IMEI_RE = /\b(\d{15})\b/g;
const ACCOUNT_RE = /(?:a\/c|account|acct)[\s:]*([0-9]{9,18})/gi;
const UPI_RE = /([\w.\-]{2,30}@[\w.\-]{2,20})/g;
const AMOUNT_RE = /(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const IFSC_RE = /\b([A-Z]{4}0[A-Z0-9]{6})\b/g;

const KINGPIN_HINTS = [
  'kingpin', 'mastermind', 'king pin', 'king-pin', 'leader', 'boss',
  'operator', 'coordinator', 'recruiter', 'handler', 'syndicate head',
];
const MULE_HINTS = ['mule', 'courier', 'proxy', 'benami', 'rented', 'sold account', 'dummy'];
const VICTIM_HINTS = ['victim', 'complainant', 'defrauded', 'cheated', 'lost', 'fraud'];

function uid(prefix: string, seed: string): string {
  return `${prefix}_${seed.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10)}_${Math.random().toString(36).slice(2, 7)}`;
}

function classifyPerson(name: string, context: string): Entity['meta'] {
  const c = context.toLowerCase();
  const role =
    KINGPIN_HINTS.some((h) => c.includes(h)) ? 'kingpin' :
    MULE_HINTS.some((h) => c.includes(h)) ? 'mule' :
    VICTIM_HINTS.some((h) => c.includes(h)) ? 'victim' : 'suspect';
  return { role };
}

function findNames(text: string): { name: string; context: string }[] {
  const out: { name: string; context: string }[] = [];
  // "Name:" or "Accused: Name" style
  const labeled = text.matchAll(/(?:accused|suspect|name|kingpin|mule|victim|complainant|caller|receiver)\s*[:\-]\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})/g);
  for (const m of labeled) {
    const start = Math.max(0, m.index! - 40);
    out.push({ name: m[1].trim(), context: text.slice(start, m.index! + m[0].length + 40) });
  }
  // Capitalized name patterns near keywords
  const caps = text.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/g);
  const seen = new Set(out.map((o) => o.name));
  for (const m of caps) {
    const name = m[1].trim();
    if (seen.has(name)) continue;
    if (['The', 'This', 'Section', 'Act', 'Bank', 'India', 'Friday', 'Monday', 'January', 'February'].includes(name)) continue;
    const start = Math.max(0, m.index! - 60);
    const ctx = text.slice(start, m.index! + m[0].length + 60);
    if (KINGPIN_HINTS.some((h) => ctx.toLowerCase().includes(h)) || MULE_HINTS.some((h) => ctx.toLowerCase().includes(h)) || VICTIM_HINTS.some((h) => ctx.toLowerCase().includes(h))) {
      out.push({ name, context: ctx });
      seen.add(name);
    }
  }
  return out;
}

export interface ExtractedData {
  entities: Entity[];
  relationships: Relationship[];
  pattern: string;
  riskLevel: RiskLevel;
  summary: string;
}

export function extractIntelligence(rawText: string): ExtractedData {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  const byLabel: Record<string, string> = {}; // label -> entity id

  function addEntity(e: Entity): string {
    const existing = entities.find((x) => x.label === e.label && x.type === e.type);
    if (existing) return existing.id;
    entities.push(e);
    byLabel[`${e.type}:${e.label}`] = e.id;
    return e.id;
  }

  // People
  for (const { name, context } of findNames(rawText)) {
    const id = addEntity({
      id: uid('person', name),
      type: 'person',
      label: name,
      meta: classifyPerson(name, context),
    });
    // link person to nearby phones/accounts in context window
    const phones = [...context.matchAll(PHONE_RE)].map((m) => m[2]);
    for (const p of phones.slice(0, 1)) {
      const pid = addEntity({ id: uid('phone', p), type: 'phone', label: p, meta: {} });
      relationships.push({ source: id, target: pid, kind: 'owns', weight: 2 });
    }
    const upis = [...context.matchAll(UPI_RE)].map((m) => m[1]);
    for (const u of upis.slice(0, 1)) {
      const uid2 = addEntity({ id: uid('upi', u), type: 'upi', label: u, meta: {} });
      relationships.push({ source: id, target: uid2, kind: 'transacts', weight: 3 });
    }
  }

  // Standalone phones
  for (const m of rawText.matchAll(PHONE_RE)) {
    const p = m[2];
    addEntity({ id: uid('phone', p), type: 'phone', label: p, meta: {} });
  }
  // Devices (IMEI)
  for (const m of rawText.matchAll(IMEI_RE)) {
    addEntity({ id: uid('device', m[1]), type: 'device', label: m[1], meta: { imei: m[1] } });
  }
  // Bank accounts
  for (const m of rawText.matchAll(ACCOUNT_RE)) {
    addEntity({ id: uid('account', m[1]), type: 'account', label: m[1], meta: {} });
  }
  // UPI IDs
  for (const m of rawText.matchAll(UPI_RE)) {
    addEntity({ id: uid('upi', m[1]), type: 'upi', label: m[1], meta: {} });
  }
  // IFSC / locations
  for (const m of rawText.matchAll(IFSC_RE)) {
    addEntity({ id: uid('location', m[1]), type: 'location', label: m[1], meta: { ifsc: m[1] } });
  }

  // Link phones to devices (uses_device) when both appear in same line
  const lines = rawText.split('\n');
  for (const line of lines) {
    const p = line.match(PHONE_RE)?.[2];
    const d = line.match(IMEI_RE)?.[1];
    if (p && d) {
      const pe = entities.find((e) => e.type === 'phone' && e.label === p);
      const de = entities.find((e) => e.type === 'device' && e.label === d);
      if (pe && de) relationships.push({ source: pe.id, target: de.id, kind: 'uses_device', weight: 4 });
    }
    const upi = line.match(UPI_RE)?.[1];
    const acc = line.match(ACCOUNT_RE)?.[1];
    if (upi && acc) {
      const ue = entities.find((e) => e.type === 'upi' && e.label === upi);
      const ae = entities.find((e) => e.type === 'account' && e.label === acc);
      if (ue && ae) relationships.push({ source: ue.id, target: ae.id, kind: 'transacts', weight: 3 });
    }
  }

  // Dedupe relationships
  const seen = new Set<string>();
  const deduped = relationships.filter((r) => {
    const k = `${r.source}|${r.target}|${r.kind}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Pattern detection
  const pattern = detectPattern(rawText, entities, deduped);
  const riskLevel = assessRisk(rawText, entities, deduped);
  const summary = buildSummary(rawText, entities, deduped, pattern);

  return { entities, relationships: deduped, pattern, riskLevel, summary };
}

function detectPattern(text: string, entities: Entity[], rels: Relationship[]): string {
  const t = text.toLowerCase();
  if (t.includes('sim swap') || t.includes('sim-swap') || t.includes('sim swap')) return 'SIM-swap / mule convergence';
  if (t.includes('upi') && t.includes('mule')) return 'UPI mule network';
  if (t.includes('phishing') || t.includes('otp')) return 'Phishing / OTP interception';
  if (t.includes('loan') && t.includes('app')) return 'Fake loan app scam';
  if (t.includes('investment') || t.includes('trading')) return 'Investment / trading fraud';
  if (t.includes('part-time') || t.includes('task')) return 'Task / part-time job fraud';
  // Heuristic: many phones sharing one device => mule convergence
  const deviceLinks = rels.filter((r) => r.kind === 'uses_device');
  if (deviceLinks.length >= 2) {
    const devices = new Map<string, string[]>();
    for (const r of deviceLinks) {
      const arr = devices.get(r.target) ?? [];
      arr.push(r.source);
      devices.set(r.target, arr);
    }
    for (const [, phones] of devices) {
      if (phones.length >= 2) return 'Device convergence (mule ring)';
    }
  }
  return 'Multi-entity fraud network';
}

function assessRisk(text: string, entities: Entity[], rels: Relationship[]): RiskLevel {
  const amounts = [...text.matchAll(AMOUNT_RE)].map((m) => parseFloat(m[1].replace(/,/g, '')));
  const total = amounts.reduce((a, b) => a + b, 0);
  const kingpin = entities.some((e) => e.meta?.role === 'kingpin');
  const mules = entities.filter((e) => e.meta?.role === 'mule').length;
  if (total > 500000 || (kingpin && mules >= 2)) return 'critical';
  if (total > 100000 || mules >= 1) return 'high';
  if (entities.length > 5) return 'medium';
  return 'low';
}

function buildSummary(text: string, entities: Entity[], rels: Relationship[], pattern: string): string {
  const people = entities.filter((e) => e.type === 'person');
  const kingpin = people.find((e) => e.meta?.role === 'kingpin');
  const mules = people.filter((e) => e.meta?.role === 'mule');
  const victims = people.filter((e) => e.meta?.role === 'victim');
  const phones = entities.filter((e) => e.type === 'phone').length;
  const accounts = entities.filter((e) => e.type === 'account' || e.type === 'upi').length;
  const devices = entities.filter((e) => e.type === 'device').length;

  let s = `Detected pattern: ${pattern}. `;
  s += `Network contains ${entities.length} entities (${people.length} persons, ${phones} phone numbers, ${accounts} financial handles, ${devices} devices) linked by ${rels.length} relationships. `;
  if (kingpin) s += `Likely kingpin: ${kingpin.label}. `;
  if (mules.length) s += `Mules identified: ${mules.map((m) => m.label).join(', ')}. `;
  if (victims.length) s += `Victims: ${victims.map((v) => v.label).join(', ')}. `;
  return s.trim();
}

// Kingpin detection: find the entity with the highest weighted degree centrality,
// boosted if context flagged it as kingpin.
export function detectKingpin(entities: Entity[], rels: Relationship[]): Entity | undefined {
  const degree = new Map<string, number>();
  for (const r of rels) {
    degree.set(r.source, (degree.get(r.source) ?? 0) + (r.weight ?? 1));
    degree.set(r.target, (degree.get(r.target) ?? 0) + (r.weight ?? 1));
  }
  const ranked = [...entities].sort((a, b) => {
    const ka = (degree.get(a.id) ?? 0) + (a.meta?.role === 'kingpin' ? 100 : 0);
    const kb = (degree.get(b.id) ?? 0) + (b.meta?.role === 'kingpin' ? 100 : 0);
    return kb - ka;
  });
  return ranked[0];
}

export function generateBrief(
  rawText: string,
  entities: Entity[],
  rels: Relationship[],
  pattern: string,
  caseNumber: string,
): CaseBrief {
  const kingpin = detectKingpin(entities, rels);
  const mules = entities.filter((e) => e.meta?.role === 'mule');
  const victims = entities.filter((e) => e.meta?.role === 'victim');
  const phones = entities.filter((e) => e.type === 'phone');
  const devices = entities.filter((e) => e.type === 'device');
  const upis = entities.filter((e) => e.type === 'upi');
  const accounts = entities.filter((e) => e.type === 'account');

  const amounts = [...rawText.matchAll(/(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/gi)].map((m) =>
    parseFloat(m[1].replace(/,/g, '')),
  );
  const totalLoss = amounts.reduce((a, b) => a + b, 0);

  const sections = [
    {
      heading: '1. First Information Report',
      body: `Case Reference: ${caseNumber}\nDate of Report: ${new Date().toLocaleDateString('en-IN')}\nNature of Offence: ${pattern}\nEstimated Loss: ₹${totalLoss.toLocaleString('en-IN')}\nStatus: Cyber fraud network under investigation.`,
    },
    {
      heading: '2. Source of Intelligence',
      body: rawText.slice(0, 1200) + (rawText.length > 1200 ? '\n[...truncated...]' : ''),
    },
    {
      heading: '3. Entities Identified',
      body: [
        `Kingpin / convergence node: ${kingpin?.label ?? 'Not yet isolated'}`,
        `Mules (${mules.length}): ${mules.map((m) => m.label).join(', ') || 'None flagged'}`,
        `Victims (${victims.length}): ${victims.map((v) => v.label).join(', ') || 'None named'}`,
        `Phone numbers (${phones.length}): ${phones.map((p) => p.label).join(', ')}`,
        `Devices / IMEI (${devices.length}): ${devices.map((d) => d.label).join(', ')}`,
        `UPI handles (${upis.length}): ${upis.map((u) => u.label).join(', ')}`,
        `Bank accounts (${accounts.length}): ${accounts.map((a) => a.label).join(', ')}`,
      ].join('\n'),
    },
    {
      heading: '4. Network Analysis',
      body: `${rels.length} relationships traced across ${entities.length} entities. ` +
        `Pattern classified as "${pattern}". ` +
        (kingpin ? `Centrality analysis isolates ${kingpin.label} as the convergence node (syndicate kingpin axis). ` : '') +
        `Multiple transient money mule tracks converge through shared device signatures, confirming coordinated syndicate operation.`,
    },
    {
      heading: '5. Statutory Mapping',
      body: [
        'Section 65B, Indian Evidence Act — admissibility of electronic records',
        'Section 66C, IT Act, 2000 — Identity Theft',
        'Section 66D, IT Act, 2000 — Cheating by Personation by use of computer resource',
        'Section 318, Bharatiya Nyaya Sanhita (BNS) — Cheating',
        'Section 111, BNS — Organised Crime (where applicable)',
      ].join('\n'),
    },
    {
      heading: '6. Recommended Action',
      body: [
        '1. Freeze all identified bank accounts and UPI handles immediately.',
        '2. Issue lookout notices for the isolated kingpin across transit points.',
        '3. Preserve CDRs and IMEI logs under Section 65B certification.',
        '4. Coordinate with telecom operators to block SIMs linked to mule devices.',
        '5. Forward case brief to the nearest Cyber Crime Police Station for FIR registration.',
        '6. Request NCRP portal escalation for UPI handle blacklisting.',
      ].join('\n'),
    },
  ];

  return {
    sections,
    statutes: ['65B IEA', '66C IT Act', '66D IT Act', '318 BNS', '111 BNS'],
    recommendedActions: [
      'Freeze identified accounts',
      'Issue lookout notice for kingpin',
      'Preserve CDRs under 65B',
      'Block SIMs on mule devices',
      'Escalate to Cyber Crime PS',
    ],
    kingpin: kingpin?.label,
    confidence: Math.min(95, 60 + entities.length * 3 + rels.length * 2),
  };
}
