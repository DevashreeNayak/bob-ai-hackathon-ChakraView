import { useRef, useState } from 'react';
import { Upload, FileText, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  onAnalyze: (text: string) => void;
  loading: boolean;
  hasResult: boolean;
}

const SAMPLE = `Case: Jamtara SIM-swap ring — Operation Chakra
Date: 14 March 2023
Location: Jamtara, Jharkhand

Kingpin: Rahul Kumar — coordinator of mule network, operates 3 devices.
Mule: Imran Sheikh — sold his bank account and SIM to kingpin for Rs 5,000.
Mule: Salim Ansari — rented out UPI handle salim.ansari@okhdfcbank, received 12% commission.
Victim: Priya Sharma — lost Rs 1,20,000 to UPI fraud on 10 March 2023.

CDR records:
Rahul Kumar phone: 9876543210 IMEI: 356938035643809
Imran Sheikh phone: 9123456780 IMEI: 356938035643809 (same device as kingpin)
Salim Ansari phone: 9988776655 IMEI: 490154203237518

Bank accounts:
Account: 1234567890123 linked to UPI: salim.ansari@okhdfcbank
Account: 9876543210987 linked to UPI: rahul.kumar@okicici

Transactions:
Rs 1,20,000 transferred from Priya Sharma to salim.ansari@okhdfcbank
Rs 1,00,000 forwarded from salim.ansari@okhdfcbank to rahul.kumar@okicici
Rs 5,000 paid to Imran Sheikh for SIM swap.

Pattern: SIM-swap used to intercept OTP, mule accounts used to layer and forward funds to kingpin.`;

export function IngestPanel({ onAnalyze, loading, hasResult }: Props) {
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setText(String(e.target?.result ?? ''));
    reader.readAsText(file);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          <FileText className="h-5 w-5 text-sky-500" />
          Intelligence Ingest
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paste raw CDRs, call logs, suspect indices, or transaction records. Bob will parse unstructured text into structured entities.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={`relative flex-1 overflow-hidden rounded-2xl border-2 border-dashed transition ${
          dragOver
            ? 'border-sky-400 bg-sky-50/60 dark:bg-sky-900/20'
            : 'border-slate-300/60 bg-slate-50/50 dark:border-slate-600/50 dark:bg-slate-800/40'
        }`}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste intelligence text here, or drag a .txt / .csv file..."
          className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
        />
        {text === '' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
            <Upload className="h-8 w-8" />
            <span className="text-sm">Drop a file or start typing</span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.csv,.log"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-slate-300/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Upload className="h-4 w-4" />
          Upload file
        </button>
        <button
          onClick={() => setText(SAMPLE)}
          className="flex items-center gap-2 rounded-xl border border-slate-300/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <FileText className="h-4 w-4" />
          Load sample case
        </button>
        <button
          onClick={() => onAnalyze(text)}
          disabled={!text.trim() || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:from-sky-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Bob is analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {hasResult ? 'Re-analyze' : 'Analyze with Bob'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
