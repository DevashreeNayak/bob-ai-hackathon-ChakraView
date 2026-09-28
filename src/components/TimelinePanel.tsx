import { Clock, ArrowRight, Smartphone, PhoneCall, CreditCard, Shuffle, AlertCircle } from 'lucide-react';
import type { TimelineEvent } from '@/lib/timeline';

interface Props {
  events: TimelineEvent[];
  onHighlightEntity?: (label: string) => void;
}

const EVENT_STYLES: Record<TimelineEvent['type'], { icon: typeof Clock; bg: string; border: string; text: string; dot: string }> = {
  transaction: { icon: CreditCard,  bg: 'bg-amber-50 dark:bg-amber-900/20',    border: 'border-amber-300/60 dark:border-amber-700/50',  text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
  call:        { icon: PhoneCall,   bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300/60 dark:border-emerald-700/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400' },
  sim_swap:    { icon: Shuffle,     bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-300/60 dark:border-red-700/50',     text: 'text-red-700 dark:text-red-300',   dot: 'bg-red-400' },
  device:      { icon: Smartphone,  bg: 'bg-violet-50 dark:bg-violet-900/20',   border: 'border-violet-300/60 dark:border-violet-700/50', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-400' },
  registration:{ icon: AlertCircle, bg: 'bg-sky-50 dark:bg-sky-900/20',         border: 'border-sky-300/60 dark:border-sky-700/50',     text: 'text-sky-700 dark:text-sky-300',   dot: 'bg-sky-400' },
  other:       { icon: Clock,       bg: 'bg-slate-50 dark:bg-slate-800/40',     border: 'border-slate-200/70 dark:border-slate-700/50', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
};

const TYPE_LABELS: Record<TimelineEvent['type'], string> = {
  transaction: 'Transaction',
  call: 'CDR Call',
  sim_swap: 'SIM Swap',
  device: 'Device',
  registration: 'Registration',
  other: 'Event',
};

function formatAmount(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

export function TimelinePanel({ events, onHighlightEntity }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          <Clock className="h-5 w-5 text-sky-500" />
          Event Timeline
        </h2>
        <div className="flex flex-1 items-center justify-center py-12 text-center text-sm text-slate-400 dark:text-slate-500">
          No timestamped events extracted. Ensure source text contains dates and transaction/call details.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          <Clock className="h-5 w-5 text-sky-500" />
          Event Timeline
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {events.length} events
          </span>
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          {Object.entries(TYPE_LABELS).filter(([k]) => events.some(e => e.type === k)).map(([type, label]) => {
            const s = EVENT_STYLES[type as TimelineEvent['type']];
            return (
              <span key={type} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-thin mt-4 flex-1 overflow-y-auto pr-1">
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="space-y-3 pl-10">
            {events.map((ev, i) => {
              const s = EVENT_STYLES[ev.type];
              const Icon = s.icon;
              return (
                <div key={ev.id} className="relative animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                  {/* Dot on spine */}
                  <span className={`absolute -left-[29px] top-3.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${s.dot}`} />

                  <div className={`rounded-xl border p-3 transition hover:shadow-sm ${s.bg} ${s.border}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${s.text}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>
                          {TYPE_LABELS[ev.type]}
                        </span>
                        {ev.amount !== undefined && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            {formatAmount(ev.amount)}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">{ev.timestamp}</span>
                    </div>

                    <p className="mt-1.5 text-[12px] leading-snug text-slate-700 dark:text-slate-300">
                      {ev.description}
                    </p>

                    {ev.entities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ev.entities.map((label) => (
                          <button
                            key={label}
                            onClick={() => onHighlightEntity?.(label)}
                            className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-2 py-0.5 font-mono text-[10px] text-slate-600 transition hover:border-sky-400 hover:text-sky-600 dark:border-slate-700/50 dark:bg-slate-800/60 dark:text-slate-400"
                          >
                            {label}
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
