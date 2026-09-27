/*
# Create ChakraView investigation cases

1. New Tables
- `chakraview_cases` stores investigation cases in one shared hackathon workspace.
- `id` uniquely identifies a case.
- `case_number` is the human-readable case reference.
- `title` is the investigation title.
- `status` tracks active, review, or closed work.
- `risk_level` stores the assessed severity.
- `pattern` stores the detected fraud pattern.
- `summary` stores the case synopsis.
- `source_text` stores the original intelligence text supplied to the workspace.
- `entities` stores extracted entities as JSON.
- `relationships` stores extracted links as JSON.
- `brief` stores the generated FIR-ready brief as JSON.
- `created_at` and `updated_at` record case history.

2. Security
- Row level security is enabled.
- This is intentionally a shared, no-sign-in hackathon workspace, so anon and authenticated roles have separate CRUD policies.

3. Important Notes
- JSON fields keep the demo flexible for Bob output while preserving the original source for auditability.
- No user accounts or destructive data operations are introduced.
*/

CREATE TABLE IF NOT EXISTS public.chakraview_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  risk_level text NOT NULL DEFAULT 'high',
  pattern text NOT NULL DEFAULT 'SIM-swap / mule convergence',
  summary text NOT NULL DEFAULT '',
  source_text text NOT NULL DEFAULT '',
  entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  relationships jsonb NOT NULL DEFAULT '[]'::jsonb,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chakraview_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_select_chakraview_cases" ON public.chakraview_cases;
CREATE POLICY "shared_select_chakraview_cases" ON public.chakraview_cases
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_insert_chakraview_cases" ON public.chakraview_cases;
CREATE POLICY "shared_insert_chakraview_cases" ON public.chakraview_cases
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shared_update_chakraview_cases" ON public.chakraview_cases;
CREATE POLICY "shared_update_chakraview_cases" ON public.chakraview_cases
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shared_delete_chakraview_cases" ON public.chakraview_cases;
CREATE POLICY "shared_delete_chakraview_cases" ON public.chakraview_cases
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS chakraview_cases_created_at_idx ON public.chakraview_cases (created_at DESC);
CREATE INDEX IF NOT EXISTS chakraview_cases_status_idx ON public.chakraview_cases (status);
