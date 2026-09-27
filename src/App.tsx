import { useCallback, useEffect, useState } from 'react';
import {
  Shield, Sun, Moon, Activity, Database, Cpu, Radar, FileSearch,
  Loader2, AlertCircle, CheckCircle2, ChevronRight, Zap, Target, Layers,
} from 'lucide-react';
import { supabase, type CaseRecord, type CaseInsert, type Entity, type Relationship, type CaseBrief } from '@/lib/supabase';
import { extractIntelligence, generateBrief, detectKingpin } from '@/lib/engine';
import { callBob } from '@/lib/bob';
import { useTheme } from '@/lib/useTheme';
import { IngestPanel } from '@/components/IngestPanel';
import { NetworkGraph } from '@/components/NetworkGraph';
import { EntityPanel } from '@/components/EntityPanel';
import { BriefPanel } from '@/components/BriefPanel';
import { CaseArchive } from '@/components/CaseArchive';

type View = 'ingest' | 'graph' | 'entities' | 'brief' | 'archive';
type Phase = 'idle' | 'parsing' | 'resolving' | 'compiling' | 'done';

const RISK_STYLES: Record<string, string> = {
  critical: 'from-red-500 to-rose-500',
  high: 'from-orange-500 to-amber-500',
  medium: 'from-amber-400 to-yellow-400',
  low: 'from-emerald-400 to-teal-400',
};

function App() {
  const { theme, toggle } = useTheme();
  const [view, setView] = useState<View>('ingest');
  const [phase, setPhase] = useState<Phase>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceText, setSourceText] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [pattern, setPattern] = useState('');
  const [riskLevel, setRiskLevel] = useState<string>('');
  const [summary, setSummary] = useState('');
  const [brief, setBrief] = useState<CaseBrief | null>(null);
  const [kingpinId, setKingpinId] = useState<string | undefined>();

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [currentCaseId, setCurrentCaseId] = useState<string | undefined>();
  const [currentCaseNumber, setCurrentCaseNumber] = useState('');
  const [bobSource, setBobSource] = useState<'bob' | 'local' | null>(null);

  const loadCases = useCallback(async () => {
    setCasesLoading(true);
    const { data, error } = await supabase
      .from('chakraview_cases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError('Could not load saved cases: ' + error.message);
    } else {
      setCases((data ?? []) as CaseRecord[]);
    }
    setCasesLoading(false);
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const phaseSteps: { key: Phase; label: string; icon: typeof Cpu }[] = [
    { key: 'parsing', label: 'Bob parses unstructured text', icon: Cpu },
    { key: 'resolving', label: 'Identity resolution & pattern matching', icon: Radar },
    { key: 'compiling', label: 'Compiling FIR-ready brief', icon: FileSearch },
  ];

  async function handleAnalyze(text: string) {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setPhase('parsing');
    setSourceText(text);

    let usedBob = false;
    try {
      // Phase 1: Bob parses unstructured text → structured entities
      let extracted;
      try {
        const bobResult = await callBob(text);
        extracted = {
          entities: bobResult.entities,
          relationships: bobResult.relationships,
          pattern: bobResult.pattern,
          riskLevel: bobResult.riskLevel,
          summary: bobResult.summary,
        };
        usedBob = true;
        setBobSource('bob');
      } catch (bobErr) {
        // Bob unavailable (secret not set, network, parse) — fall back to local engine
        console.warn('Bob extraction failed, using local engine:', bobErr);
        setBobSource('local');
        await delay(400);
        extracted = extractIntelligence(text);
      }
      setEntities(extracted.entities);
      setRelationships(extracted.relationships);
      setPattern(extracted.pattern);
      setRiskLevel(extracted.riskLevel);
      setSummary(extracted.summary);

      // Phase 2: Identity resolution & pattern matching
      setPhase('resolving');
      await delay(700);
      const kp = detectKingpin(extracted.entities, extracted.relationships);
      setKingpinId(kp?.id);

      // Phase 3: Compile FIR-ready brief
      setPhase('compiling');
      await delay(600);
      const caseNumber = `CV-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;
      setCurrentCaseNumber(caseNumber);
      const generated = generateBrief(text, extracted.entities, extracted.relationships, extracted.pattern, caseNumber);
      setBrief(generated);

      // Persist to Supabase
      const insert: CaseInsert = {
        case_number: caseNumber,
        title: extracted.pattern,
        status: 'active',
        risk_level: extracted.riskLevel,
        pattern: extracted.pattern,
        summary: extracted.summary,
        source_text: text,
        entities: extracted.entities,
        relationships: extracted.relationships,
        brief: generated,
      };
      const { data, error: insertError } = await supabase
        .from('chakraview_cases')
        .insert(insert)
        .select()
        .single();
      if (insertError) {
        setError('Case analyzed but could not be saved: ' + insertError.message);
      } else if (data) {
        setCurrentCaseId((data as CaseRecord).id);
        await loadCases();
      }

      setPhase('done');
      setView('graph');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setPhase('idle');
    } finally {
      setLoading(false);
      void usedBob;
    }
  }

  function loadCase(c: CaseRecord) {
    setSourceText(c.source_text);
    setEntities(c.entities ?? []);
    setRelationships(c.relationships ?? []);
    setPattern(c.pattern);
    setRiskLevel(c.risk_level);
    setSummary(c.summary);
    setBrief(c.brief ?? null);
    setCurrentCaseId(c.id);
    setCurrentCaseNumber(c.case_number);
    const kp = detectKingpin(c.entities ?? [], c.relationships ?? []);
    setKingpinId(kp?.id);
    setPhase('done');
    setView('graph');
  }

  function reset() {
    setSourceText('');
    setEntities([]);
    setRelationships([]);
    setPattern('');
    setRiskLevel('');
    setSummary('');
    setBrief(null);
    setKingpinId(undefined);
    setCurrentCaseId(undefined);
    setCurrentCaseNumber('');
    setBobSource(null);
    setPhase('idle');
    setView('ingest');
  }

  const navItems: { key: View; label: string; icon: typeof Cpu }[] = [
    { key: 'ingest', label: 'Ingest', icon: Cpu },
    { key: 'graph', label: 'Network', icon: Radar },
    { key: 'entities', label: 'Entities', icon: Layers },
    { key: 'brief', label: 'Brief', icon: FileSearch },
    { key: 'archive', label: 'Archive', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 glass dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/30">
              <Shield className="h-5 w-5 text-white" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">ChakraView</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Cyber Fraud Network Analyzer · NFSU Hackathon</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase === 'done' && currentCaseNumber && (
              <span className="hidden rounded-full bg-sky-100 px-3 py-1 font-mono text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 sm:block">
                {currentCaseNumber}
              </span>
            )}
            <button
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200/70 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700/70 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-0">
        {/* Sidebar */}
        <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-16 shrink-0 flex-col items-center gap-1 border-r border-slate-200/70 py-4 dark:border-slate-800/70 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`group relative grid h-12 w-12 place-items-center rounded-xl transition ${
                view === item.key
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
              {view === item.key && (
                <span className="absolute -left-1 h-6 w-1 rounded-full bg-sky-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Main */}
        <main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col gap-4 p-4 lg:p-6">
          {/* Mobile nav */}
          <div className="flex gap-1 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  view === item.key
                    ? 'bg-sky-500 text-white'
                    : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Pipeline status bar */}
          {(phase !== 'idle' || loading) && (
            <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-3 dark:border-slate-800/70 dark:bg-slate-900/50">
              {phaseSteps.map((step, i) => {
                const stepOrder = ['parsing', 'resolving', 'compiling', 'done'];
                const active = stepOrder.indexOf(phase) >= i;
                const current = phase === step.key;
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      current
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                        : active
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}>
                      {current && loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : active && !loading ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <step.icon className="h-3.5 w-3.5" />
                      )}
                      {step.label}
                    </div>
                    {i < phaseSteps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Content grid */}
          <div className="grid flex-1 gap-4 lg:grid-cols-12">
            {view === 'ingest' && (
              <div className="lg:col-span-5">
                <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900/50">
                  <IngestPanel onAnalyze={handleAnalyze} loading={loading} hasResult={phase === 'done'} />
                </div>
              </div>
            )}

            {view === 'ingest' && phase === 'done' && (
              <div className="lg:col-span-7">
                <ResultSummary
                  pattern={pattern}
                  riskLevel={riskLevel}
                  summary={summary}
                  kingpin={entities.find((e) => e.id === kingpinId)?.label}
                  entityCount={entities.length}
                  relCount={relationships.length}
                  bobSource={bobSource}
                  onGraph={() => setView('graph')}
                />
              </div>
            )}

            {view === 'ingest' && phase === 'idle' && (
              <div className="lg:col-span-7">
                <HeroPanel />
              </div>
            )}

            {view === 'graph' && (
              <>
                <div className="lg:col-span-8">
                  <div className="h-[calc(100vh-16rem)] min-h-[400px] rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-slate-100 dark:border-slate-800/70 dark:from-slate-900/50 dark:to-slate-950/50">
                    {entities.length > 0 ? (
                      <NetworkGraph entities={entities} relationships={relationships} kingpinId={kingpinId} />
                    ) : (
                      <EmptyState text="Run an analysis to see the network graph." />
                    )}
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="h-[calc(100vh-16rem)] min-h-[400px] rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900/50">
                    <EntityPanel entities={entities} relationships={relationships} kingpinId={kingpinId} />
                  </div>
                </div>
              </>
            )}

            {view === 'entities' && (
              <div className="lg:col-span-12">
                <div className="h-[calc(100vh-12rem)] min-h-[400px] rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900/50">
                  <EntityPanel entities={entities} relationships={relationships} kingpinId={kingpinId} />
                </div>
              </div>
            )}

            {view === 'brief' && (
              <div className="lg:col-span-8 lg:col-start-3">
                <div className="h-[calc(100vh-12rem)] min-h-[400px] rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900/50">
                  {brief ? (
                    <BriefPanel brief={brief} caseNumber={currentCaseNumber || 'CV-XXXX'} title={pattern} />
                  ) : (
                    <EmptyState text="Run an analysis to generate the FIR-ready brief." />
                  )}
                </div>
              </div>
            )}

            {view === 'archive' && (
              <div className="relative lg:col-span-6 lg:col-start-4">
                <div className="h-[calc(100vh-12rem)] min-h-[400px] rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900/50">
                  <CaseArchive
                    cases={cases}
                    loading={casesLoading}
                    onSelect={loadCase}
                    onDeleted={loadCases}
                    currentId={currentCaseId}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between border-t border-slate-200/70 py-3 text-xs text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
            <span>ChakraView · IBM Bob × NFSU Cyber Security Hackathon</span>
            <span>Track 05 · Cyber Fraud Network Analyzer</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ResultSummary({
  pattern, riskLevel, summary, kingpin, entityCount, relCount, bobSource, onGraph,
}: {
  pattern: string; riskLevel: string; summary: string; kingpin?: string;
  entityCount: number; relCount: number; bobSource: 'bob' | 'local' | null; onGraph: () => void;
}) {
  return (
    <div className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-sky-500" />
          <h2 className="text-lg font-bold">Analysis Result</h2>
        </div>
        {bobSource && (
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
            bobSource === 'bob'
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${bobSource === 'bob' ? 'bg-sky-500' : 'bg-slate-400'}`} />
            {bobSource === 'bob' ? 'IBM Bob' : 'Local engine'}
          </span>
        )}
      </div>
      <div className={`mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${RISK_STYLES[riskLevel] ?? RISK_STYLES.low} px-4 py-1.5 text-sm font-bold text-white`}>
        <Zap className="h-4 w-4" />
        {riskLevel.toUpperCase()} RISK
      </div>
      <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-700/70 dark:bg-slate-800/50">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Detected Pattern</p>
        <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{pattern}</p>
      </div>
      {kingpin && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-900/20">
          <Target className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Kingpin Isolated</p>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{kingpin}</p>
          </div>
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 text-center dark:border-slate-700/70 dark:bg-slate-800/50">
          <p className="text-2xl font-bold text-sky-500">{entityCount}</p>
          <p className="text-xs text-slate-500">Entities</p>
        </div>
        <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-3 text-center dark:border-slate-700/70 dark:bg-slate-800/50">
          <p className="text-2xl font-bold text-emerald-500">{relCount}</p>
          <p className="text-xs text-slate-500">Relationships</p>
        </div>
      </div>
      <button
        onClick={onGraph}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-600 hover:to-cyan-600"
      >
        <Radar className="h-4 w-4" />
        View Network Graph
      </button>
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-8 dark:border-slate-800/70 dark:from-slate-900/50 dark:to-slate-950/50">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-xl shadow-sky-500/30">
          <Radar className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold">Unstructured Intelligence → Court-Ready Brief</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Paste raw CDRs, call logs, and suspect indices. ChakraView extracts entities, maps the syndicate hierarchy, isolates the kingpin, and drafts an FIR-ready brief mapped to IT Act and BNS sections.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 text-left">
          {[
            { icon: Cpu, title: 'Extract', desc: 'Parse raw text into entities' },
            { icon: Radar, title: 'Resolve', desc: 'Find kingpin & patterns' },
            { icon: FileSearch, title: 'Compile', desc: 'Generate FIR brief' },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-700/70 dark:bg-slate-800/50">
              <s.icon className="h-5 w-5 text-sky-500" />
              <p className="mt-1.5 text-sm font-semibold">{s.title}</p>
              <p className="text-xs text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400 dark:text-slate-500">
      <Radar className="h-10 w-10" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default App;
