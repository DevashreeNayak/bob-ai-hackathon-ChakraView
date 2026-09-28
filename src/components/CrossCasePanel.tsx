import { useState, useEffect } from 'react';
import { Link2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { supabase, type CaseRecord, type Entity } from '@/lib/supabase';

interface CrossLink {
  matchedLabel: string;
  entityType: Entity['type'];
  caseNumber: string;
  caseId: string;
  caseTitle: string;
  riskLevel: string;
}

interface Props {
  entities: Entity[];
  currentCaseId?: string;
  onOpenCase: (caseId: string) => void;
}

export function CrossCasePanel({ entities, currentCaseId, onOpenCase }: Props) {
  const [links, setLinks] = useState<CrossLink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entities.length === 0) return;
    let cancelled = false;

    async function detect() {
      setLoading(true);
      try {
        // Pull all other cases
        const { data } = await supabase
          .from('chakraview_cases')
          .select('id, case_number, title, risk_level, entities')
          .neq('id', currentCaseId ?? '');

        if (cancelled || !data) return;

        const otherCases = data as Pick<CaseRecord, 'id' | 'case_number' | 'title' | 'risk_level' | 'entities'>[];

        // Build a set of high-signal labels from the current case
        // Only match phones, devices, UPI, accounts — not generic person names
        const MATCH_TYPES: Entity['type'][] = ['phone', 'device', 'upi', 'account'];
        const currentLabels = new Map<string, Entity['type']>();
        for (const e of entities) {
          if (MATCH_TYPES.includes(e.type)) {
            currentLabels.set(e.label.toLowerCase(), e.type);
          }
        }

        const found: CrossLink[] = [];
        for (const c of otherCases) {
          for (const e of (c.entities ?? [])) {
            const key = e.label.toLowerCase();
            if (currentLabels.has(key)) {
              // Avoid duplicates (same case+label)
              const dup = found.some((f) => f.caseId === c.id && f.matchedLabel === e.label);
              if (!dup) {
                found.push({
                  matchedLabel: e.label,
                  entityType: e.type,
                  caseNumber: c.case_number,
                  caseId: c.id,
                  caseTitle: c.title,
                  riskLevel: c.risk_level,
                });
              }
            }
          }
        }

        if (!cancelled) setLinks(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    detect();
    return () => { cancelled = true; };
  }, [entities, currentCaseId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50">
        <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
        Scanning archive for cross-case entity matches…
      </div>
    );
  }

  if (links.length === 0) return null;

  const RISK_COLORS: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-emerald-600 dark:text-emerald-400',
  };

  const TYPE_COLOR: Record<Entity['type'], string> = {
    phone: '#22c55e',
    device: '#ef4444',
    upi: '#8b5cf6',
    account: '#f59e0b',
    person: '#0ea5e9',
    location: '#64748b',
  };

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-4 dark:border-amber-700/50 dark:bg-amber-900/10">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
          Cross-Case Entity Match — {links.length} shared indicator{links.length > 1 ? 's' : ''} detected
        </span>
      </div>
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-200/60 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-slate-800/50">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLOR[l.entityType] }} />
            <div className="min-w-0 flex-1">
              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{l.matchedLabel}</span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{l.entityType}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">{l.caseNumber}</span>
              <span className={`text-[10px] font-bold uppercase ${RISK_COLORS[l.riskLevel] ?? ''}`}>{l.riskLevel}</span>
              <button
                onClick={() => onOpenCase(l.caseId)}
                className="grid h-6 w-6 place-items-center rounded-md text-slate-400 transition hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30"
                title={`Open ${l.caseNumber}`}
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
