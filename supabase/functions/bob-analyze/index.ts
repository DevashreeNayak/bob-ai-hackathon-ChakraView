// Edge function: proxies unstructured cyber-fraud intelligence text to IBM Bob's
// inference API, asks Bob to extract entities + relationships as structured JSON,
// and returns that JSON to the ChakraView frontend. The BOB_API_KEY secret is
// read from the server environment and never reaches the browser.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BOB_BASE_URL = "https://api.us-east.bob.ibm.com/inference/v1";
const BOB_MODEL = "premium";

interface BobMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface BobChoice {
  message?: { content?: string };
}

interface BobResponse {
  choices?: BobChoice[];
}

interface ExtractedEntity {
  id: string;
  type: string;
  label: string;
  meta?: Record<string, string>;
}

interface ExtractedRelationship {
  source: string;
  target: string;
  kind: string;
  weight?: number;
}

interface AnalysisResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  pattern: string;
  riskLevel: string;
  summary: string;
}

const SYSTEM_PROMPT = `You are ChakraView, a cyber fraud intelligence analysis engine used by Indian law enforcement.
Given raw, unstructured cyber fraud intelligence text (CDRs, call logs, device IDs, accused names, transaction records, UPI IDs),
you must extract structured entities and relationships and return ONLY valid JSON.

Entity types: "person", "phone", "account", "device", "upi", "location"
Relationship kinds: "owns", "calls", "transacts", "uses_device", "located_at", "controls"

For person entities, include a "meta.role" field with one of: "kingpin", "mule", "victim", "suspect".
Infer roles from context clues (kingpin/mastermind/handler → kingpin; mule/proxy/benami → mule; victim/complainant → victim).

Also detect the fraud pattern type and assess risk level (critical/high/medium/low).

Return JSON in this exact shape:
{
  "entities": [{ "id": "person_1", "type": "person", "label": "Name", "meta": { "role": "kingpin" } }],
  "relationships": [{ "source": "person_1", "target": "phone_1", "kind": "owns", "weight": 2 }],
  "pattern": "SIM-swap / mule convergence",
  "riskLevel": "critical",
  "summary": "One-sentence case summary."
}

Return ONLY the JSON object. No markdown, no explanation.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const text: string = body.text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty 'text' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("BOB_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "BOB_API_KEY secret is not configured on the server." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages: BobMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ];

    const bobResponse = await fetch(`${BOB_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Apikey ${apiKey}`,
        "User-Agent": "bobshell/2.0.1",
      },
      body: JSON.stringify({
        model: BOB_MODEL,
        messages,
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!bobResponse.ok) {
      const errText = await bobResponse.text();
      return new Response(
        JSON.stringify({ error: `Bob API returned ${bobResponse.status}: ${errText.slice(0, 500)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bobData: BobResponse = await bobResponse.json();
    const content = bobData.choices?.[0]?.message?.content ?? "";

    // Bob may wrap JSON in markdown fences; extract the JSON object.
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const braceStart = jsonStr.indexOf("{");
    const braceEnd = jsonStr.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd !== -1) {
      jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
    }

    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bob returned a response that could not be parsed as JSON.",
          raw: content.slice(0, 1000),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Basic validation / defaults
    parsed.entities = Array.isArray(parsed.entities) ? parsed.entities : [];
    parsed.relationships = Array.isArray(parsed.relationships) ? parsed.relationships : [];
    parsed.pattern = parsed.pattern || "Multi-entity fraud network";
    parsed.riskLevel = parsed.riskLevel || "high";
    parsed.summary = parsed.summary || "";

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
