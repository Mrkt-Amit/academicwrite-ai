const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

function decodeAbstract(inv) {
  if (!inv || typeof inv !== "object") return "";
  const words = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions || []) words[p] = word;
  }
  return words.filter(Boolean).join(" ");
}
function response(statusCode, body) {
  return { statusCode, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return response(200, {});
  const q = (event.queryStringParameters?.q || "").trim();
  if (!q) return response(400, { error: "A search query is required." });
  try {
    const [oa, cr] = await Promise.all([
      fetch(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=8&sort=relevance_score:desc`),
      fetch(`https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=8&select=title,author,published,container-title,DOI,URL`)
    ]);
    const [od, cd] = await Promise.all([oa.json(), cr.json()]);
    const records = new Map();
    for (const w of od.results || []) {
      const doi = (w.doi || "").toLowerCase();
      const authors = (w.authorships || []).slice(0, 5).map(a => a.author?.display_name).filter(Boolean).join(", ");
      records.set(doi || `oa-${w.id}`, {
        id: w.id, title: w.title || "Untitled work", authors,
        year: w.publication_year, journal: w.primary_location?.source?.display_name || "",
        doi: w.doi || "", url: w.doi || w.id, abstract: decodeAbstract(w.abstract_inverted_index)
      });
    }
    for (const w of cd.message?.items || []) {
      const doi = (w.DOI || "").toLowerCase();
      const title = w.title?.[0] || "Untitled work";
      const authors = (w.author || []).slice(0, 5).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
      const date = w.published?.["date-parts"]?.[0]?.[0];
      const key = doi || `cr-${title}`;
      if (!records.has(key)) records.set(key, {
        id: key, title, authors, year: date || "", journal: w["container-title"]?.[0] || "",
        doi: w.DOI || "", url: w.URL || (w.DOI ? `https://doi.org/${w.DOI}` : "")
      });
    }
    return response(200, { sources: [...records.values()].slice(0, 12) });
  } catch (e) {
    return response(502, { error: "Scholarly search services are temporarily unavailable. Please try again." });
  }
}
