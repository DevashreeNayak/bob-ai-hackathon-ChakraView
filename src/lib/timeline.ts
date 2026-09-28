// Extracts a chronological list of timestamped forensic events from raw text.
// Events include transactions, SIM swaps, CDR calls, and OTP interceptions.

export interface TimelineEvent {
  id: string;
  timestamp: string; // ISO or display string
  sortKey: number;   // ms epoch for sorting
  type: 'transaction' | 'call' | 'sim_swap' | 'device' | 'registration' | 'other';
  description: string;
  amount?: number;
  entities: string[]; // entity labels involved
}

const DATE_RE = /(\d{1,2}[\s\-\/]\w{3,9}[\s\-\/]\d{4}|\d{4}[\-\/]\d{2}[\-\/]\d{2})/g;
const TIME_RE = /(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)/gi;
const AMOUNT_RE = /(?:rs\.?|inr|₹)\s?([\d,]+(?:\.\d{1,2})?)/gi;
const PHONE_RE = /([6-9]\d{9})/g;
const UPI_RE = /([\w.\-]{2,30}@[\w.\-]{2,20})/g;

function parseDate(str: string): number {
  const d = new Date(str.replace(/[\s\-\/]+/g, ' '));
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function extractEntitiesFromLine(line: string): string[] {
  const out: string[] = [];
  for (const m of line.matchAll(PHONE_RE)) out.push(m[1]);
  for (const m of line.matchAll(UPI_RE)) out.push(m[1]);
  // Named persons — capitalized pairs
  for (const m of line.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b/g)) {
    const skip = ['The', 'This', 'Account', 'Bank', 'Transaction', 'SIM', 'Swap', 'Phone', 'IMEI', 'Date', 'Case', 'Note'];
    if (!skip.includes(m[1])) out.push(m[1]);
  }
  return [...new Set(out)].slice(0, 4);
}

let _id = 0;
function nextId() { return `ev_${++_id}`; }

export function extractTimeline(rawText: string): TimelineEvent[] {
  _id = 0;
  const events: TimelineEvent[] = [];
  const lines = rawText.split('\n');

  let lastDate = '';
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;

    // Track date context
    const dateMatch = l.match(DATE_RE);
    if (dateMatch) lastDate = dateMatch[0];

    const ll = l.toLowerCase();

    // Transactions
    const amountMatches = [...l.matchAll(AMOUNT_RE)];
    if (amountMatches.length > 0 && (ll.includes('transfer') || ll.includes('paid') || ll.includes('forward') || ll.includes('debit') || ll.includes('credit') || ll.includes('upi') || ll.includes('sent') || ll.includes('received'))) {
      const amt = parseFloat(amountMatches[0][1].replace(/,/g, ''));
      const timeMatch = l.match(TIME_RE);
      const display = (lastDate ? lastDate : 'Unknown date') + (timeMatch ? ` ${timeMatch[0]}` : '');
      events.push({
        id: nextId(),
        timestamp: display,
        sortKey: parseDate(display),
        type: 'transaction',
        description: l.slice(0, 120),
        amount: amt,
        entities: extractEntitiesFromLine(l),
      });
      continue;
    }

    // SIM swap
    if (ll.includes('sim swap') || ll.includes('sim-swap') || ll.includes('sim card')) {
      const display = lastDate || 'Unknown date';
      events.push({ id: nextId(), timestamp: display, sortKey: parseDate(display), type: 'sim_swap', description: l.slice(0, 120), entities: extractEntitiesFromLine(l) });
      continue;
    }

    // CDR calls
    if ((ll.includes('call') || ll.includes('cdr') || ll.includes('caller') || ll.includes('receiver')) && l.match(PHONE_RE)) {
      const display = lastDate || 'Unknown date';
      events.push({ id: nextId(), timestamp: display, sortKey: parseDate(display), type: 'call', description: l.slice(0, 120), entities: extractEntitiesFromLine(l) });
      continue;
    }

    // Device/IMEI registration
    if (ll.includes('imei') || ll.includes('device') || ll.includes('registered')) {
      const display = lastDate || 'Unknown date';
      events.push({ id: nextId(), timestamp: display, sortKey: parseDate(display), type: 'device', description: l.slice(0, 120), entities: extractEntitiesFromLine(l) });
    }
  }

  // Sort chronologically, dedupe by description
  const seen = new Set<string>();
  return events
    .filter((e) => { if (seen.has(e.description)) return false; seen.add(e.description); return true; })
    .sort((a, b) => a.sortKey - b.sortKey);
}
