import { useState } from 'react';
import { Scale, Gavel, ShieldAlert, CheckCircle2, Copy, Check, Download } from 'lucide-react';
import type { CaseBrief } from '@/lib/supabase';

interface Props {
  brief: CaseBrief;
  caseNumber: string;
  title: string;
}

export function BriefPanel({ brief, caseNumber, title }: Props) {
  const [copied, setCopied] = useState(false);

  function copyBrief() {
    const text = brief.sections.map((s) => `${s.heading}\n${s.body}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadBrief() {
    const text = [
      `FIR-READY CASE BRIEF`,
      `Case: ${caseNumber} — ${title}`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      `Confidence: ${brief.confidence}%`,
      '',
      ...brief.sections.map((s) => `${s.heading}\n${'─'.repeat(40)}\n${s.body}`),
      '',
      'Statutes:',
      ...brief.statutes.map((s) => `  • ${s}`),
      '',
      'Recommended Actions:',
      ...brief.recommendedActions.map((a) => `  ${a}`),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FIR_${caseNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          <Scale className="h-5 w-5 text-amber-500" />
          FIR-Ready Case Brief
        </h2>
        <div className="flex gap-2">
          <button
            onClick={copyBrief}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300/60 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-300"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={downloadBrief}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300/60 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-300"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Gavel className="h-3.5 w-3.5" />
          {brief.confidence}% confidence
        </div>
        {brief.kingpin && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Kingpin: {brief.kingpin}
          </div>
        )}
      </div>

      <div className="scrollbar-thin mt-3 flex-1 overflow-y-auto space-y-3 pr-1">
        {brief.sections.map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-700/70 dark:bg-slate-800/50">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{s.heading}</h3>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {s.body}
            </pre>
          </div>
        ))}

        <div className="rounded-xl border border-amber-200/70 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
            <CheckCircle2 className="h-4 w-4" />
            Statutory Provisions Invoked
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {brief.statutes.map((st) => (
              <span key={st} className="rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-xs font-semibold text-amber-800 dark:bg-amber-800/40 dark:text-amber-200">
                {st}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
