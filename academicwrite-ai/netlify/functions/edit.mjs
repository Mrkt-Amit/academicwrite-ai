const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (statusCode, data) => ({ statusCode, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(data) });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return reply(200, {});
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed." });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return reply(500, { error: "The site owner must add OPENAI_API_KEY in Netlify environment variables." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "Invalid request body." }); }
  const text = (body.text || "").trim();
  if (!text) return reply(400, { error: "Please provide text to edit." });
  if (text.length > 45000) return reply(413, { error: "Please process a shorter section (maximum 45,000 characters)." });

  const modeNames = {
    academic: "academic refinement",
    scientific: "scientific manuscript editing",
    critical: "critical academic analysis",
    grammar: "grammar and clarity correction",
    paraphrase: "responsible paraphrasing that preserves attribution and meaning"
  };
  const sourceContext = (body.sources || []).slice(0, 10).map((s, i) =>
    `${i+1}. ${s.title || "Untitled"}; ${s.authors || "Author metadata unavailable"}; ${s.year || "Year unavailable"}; DOI: ${s.doi || "not supplied"}; abstract: ${(s.abstract || "").slice(0, 900)}`
  ).join("\n");

  const instructions = `You are an expert academic language editor supporting researchers. Perform ${modeNames[body.mode] || modeNames.academic}.
Research field: ${body.field || "Not specified"}.
Intended readership: ${body.audience || "Academic readers"}.

NON-NEGOTIABLE INTEGRITY RULES:
- Preserve the author's substantive meaning, research question, methods, numerical results, interpretations, uncertainty, limitations, and scope.
- Do not invent facts, results, data, citations, quotations, references, DOIs, sample sizes, statistical values, or claims.
- Do not imply that the text is human-authored if it was AI-assisted. Do not optimize for evading AI detectors, plagiarism systems, provenance checks, or institutional disclosure requirements.
- Do not remove attribution, citations, quotation marks, or source acknowledgements. Never disguise copied wording as original.
- Use retrieved literature only as contextual guidance. Do not copy distinctive wording from papers. Do not cite a retrieved work unless the supplied text already cites it or you can clearly identify a specific claim it supports; in the latter case mark it as a suggested source for human verification, not a confirmed citation.
- If the input contains a factual ambiguity or unsupported claim, preserve it cautiously and flag it in the review rather than silently making it up.
- Maintain the language of the input unless the user clearly requests otherwise. Use precise, field-appropriate terminology, varied but natural syntax, concise transitions, grammatical accuracy, and a measured scholarly tone. Avoid inflated claims and generic filler.
- Do not change technical terms, equations, units, or proper names without a clear grammatical reason.

Return valid JSON only with this exact shape:
{"revision":"complete revised text","review":{"changes":"brief description of language and structure changes","verify":"specific claims, citations, data or ambiguities the author should check; if none apparent, say a final source check is still required","integrity":"state whether you preserved the meaning and identify any places where certainty or meaning may need author review"}}`;

  const userContent = `Revise the following text. Return the complete text, not a summary.\n\nSCHOLARLY RECORDS FOR CONTEXT (metadata/abstracts may be incomplete; do not treat them as proof):\n${sourceContext || "No scholarly records supplied."}\n\nTEXT TO EDIT:\n${text}`;

  try {
    const api = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: instructions }, { role: "user", content: userContent }]
      })
    });
    const data = await api.json();
    if (!api.ok) return reply(api.status, { error: data.error?.message || "The AI provider returned an error. Check your API account and configuration." });
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (!parsed.revision) throw new Error("The model returned no revised text.");
    return reply(200, parsed);
  } catch (e) {
    return reply(502, { error: "Could not complete the revision. Please try again or use a shorter section." });
  }
}
