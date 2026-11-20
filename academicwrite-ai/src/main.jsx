import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import mammoth from "mammoth";
import "./style.css";

const modes = [
  ["academic", "Academic refinement"],
  ["scientific", "Scientific manuscript"],
  ["critical", "Critical analysis"],
  ["grammar", "Grammar and clarity"],
  ["paraphrase", "Responsible paraphrasing"]
];

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [field, setField] = useState("General research");
  const [mode, setMode] = useState("academic");
  const [audience, setAudience] = useState("Researchers and academic readers");
  const [sources, setSources] = useState([]);
  const [sourceQuery, setSourceQuery] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [includeSources, setIncludeSources] = useState(true);

  const wordCount = useMemo(() => input.trim() ? input.trim().split(/\s+/).length : 0, [input]);

  async function uploadDocx(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setStatus("Please upload a .docx file. You can paste plain text directly.");
      return;
    }
    try {
      setStatus("Reading Word document…");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setInput(result.value);
      setStatus(`Loaded ${file.name}. Please review the extracted text before editing.`);
    } catch {
      setStatus("Could not read that Word document. Try saving it as .docx and uploading again.");
    }
  }

  async function findSources() {
    if (!sourceQuery.trim()) return setStatus("Enter a research topic or keywords first.");
    setBusy(true); setStatus("Searching scholarly metadata…");
    try {
      const res = await fetch(`/api/research?q=${encodeURIComponent(sourceQuery)}&field=${encodeURIComponent(field)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Literature search failed.");
      setSources(data.sources || []);
      setStatus(`Found ${(data.sources || []).length} scholarly records. Check each source before citing it.`);
    } catch (e) { setStatus(e.message); }
    finally { setBusy(false); }
  }

  async function improve() {
    if (!input.trim()) return setStatus("Paste text or upload a Word document first.");
    if (input.length > 45000) return setStatus("For best results, process sections of up to 45,000 characters.");
    setBusy(true); setStatus("Reviewing the text and preparing an academic revision…"); setReport(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input, field, mode, audience,
          sources: includeSources ? sources : []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Editing failed.");
      setOutput(data.revision || "");
      setReport(data.review || null);
      setStatus("Revision complete. Review the changes and verify all claims and references before submission.");
    } catch (e) { setStatus(e.message); }
    finally { setBusy(false); }
  }

  async function exportWord() {
    if (!output.trim()) return;
    const paragraphs = output.split(/\n+/).filter(Boolean).map(line =>
      new Paragraph({ text: line, spacing: { after: 180 } })
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "academicwrite-revised.docx"; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadText() {
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "academicwrite-revised.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  async function copyOutput() {
    try { await navigator.clipboard.writeText(output); setStatus("Revised text copied."); }
    catch { setStatus("Clipboard access was blocked by your browser. Select and copy the text manually."); }
  }

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">A</span><span>AcademicWrite <b>AI</b></span></a>
      <span className="top-note">Research-focused writing workspace</span>
    </header>

    <main>
      <section className="hero">
        <div className="eyebrow">FOR RESEARCHERS · SCHOLARS · ACADEMICS</div>
        <h1>Make your research writing<br/><em>clearer, stronger and more rigorous.</em></h1>
        <p>Refine academic language, discover relevant scholarly literature and strengthen the clarity of your manuscript while preserving its meaning and evidence.</p>
        <div className="hero-tags"><span>Academic tone</span><span>Literature discovery</span><span>Meaning preservation</span><span>Reference awareness</span></div>
      </section>

      <section className="workspace">
        <div className="section-head">
          <div><div className="eyebrow">01 / YOUR MANUSCRIPT</div><h2>Start with your text</h2></div>
          <label className="upload-btn">↑ Upload Word file<input type="file" accept=".docx" onChange={uploadDocx}/></label>
        </div>
        <div className="settings">
          <label>Research field<input value={field} onChange={e=>setField(e.target.value)} placeholder="e.g. Environmental science, Education"/></label>
          <label>Editing objective<select value={mode} onChange={e=>setMode(e.target.value)}>{modes.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
          <label>Intended readership<input value={audience} onChange={e=>setAudience(e.target.value)}/></label>
        </div>
        <div className="editor-grid">
          <div className="editor-panel">
            <div className="panel-title"><span>ORIGINAL TEXT</span><span>{wordCount.toLocaleString()} words</span></div>
            <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Paste your research text, manuscript section, abstract, literature review or discussion here…"/>
            <div className="panel-foot"><span>Your text is sent to the configured AI provider for processing.</span><button className="text-btn" onClick={()=>{setInput("");setOutput("");setReport(null);}}>Clear</button></div>
          </div>
          <div className="editor-panel output-panel">
            <div className="panel-title"><span>REVISED ACADEMIC TEXT</span><span className="live-dot">● OUTPUT</span></div>
            <textarea value={output} onChange={e=>setOutput(e.target.value)} placeholder="Your revised academic text will appear here. You can edit it before exporting."/>
            <div className="panel-foot"><span>Always verify scientific claims and citations.</span><button className="text-btn" onClick={copyOutput} disabled={!output}>Copy text</button></div>
          </div>
        </div>
        <div className="action-row">
          <label className="check"><input type="checkbox" checked={includeSources} onChange={e=>setIncludeSources(e.target.checked)}/> Use discovered literature as contextual guidance</label>
          <button className="primary-btn" onClick={improve} disabled={busy}>{busy ? "Working…" : "Refine my academic writing"} <span>→</span></button>
        </div>
        {status && <div className="status" role="status">{status}</div>}
        {output && <div className="export-row"><button onClick={exportWord}>↓ Export Word (.docx)</button><button onClick={downloadText}>↓ Export text (.txt)</button></div>}
      </section>

      <section className="literature">
        <div className="section-head">
          <div><div className="eyebrow">02 / SCHOLARLY CONTEXT</div><h2>Find related research</h2><p>Discover research records to help you check terminology, context and supporting evidence.</p></div>
        </div>
        <div className="search-row"><input value={sourceQuery} onChange={e=>setSourceQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&findSources()} placeholder="Search a topic, method, key concept or research question…"/><button onClick={findSources} disabled={busy}>Search literature →</button></div>
        <div className="source-list">
          {sources.length===0 ? <div className="empty-sources">Your discovered papers will appear here. Search by topic to retrieve records from OpenAlex and Crossref.</div> :
            sources.map((s,i)=><article className="source" key={s.doi||s.id||i}>
              <div className="source-index">{String(i+1).padStart(2,"0")}</div><div className="source-info"><h3>{s.title}</h3><p>{s.authors} · {s.year||"Year not listed"} · {s.journal||"Publication not listed"}</p>{s.abstract && <p className="abstract">{s.abstract.slice(0,360)}{s.abstract.length>360?"…":""}</p>}<a href={s.url} target="_blank" rel="noreferrer">Open source ↗</a></div>
            </article>)
          }
        </div>
        <p className="small-note">Search results are bibliographic discovery records, not endorsements. Verify the full paper, publication status, journal quality, DOI and whether it supports the claim before citing it.</p>
      </section>

      {report && <section className="review">
        <div className="eyebrow">03 / EDITORIAL REVIEW</div><h2>Review notes</h2>
        <div className="review-grid">
          <div><h3>What was improved</h3><p>{report.changes || "Review the revised text against your original."}</p></div>
          <div><h3>Items to verify</h3><p>{report.verify || "Check claims, data, quotations and references against your original sources."}</p></div>
          <div><h3>Meaning and evidence</h3><p>{report.integrity || "Confirm that the revision preserves the intended meaning and does not add unsupported results."}</p></div>
        </div>
      </section>}

      <section className="principles">
        <div className="eyebrow">BUILT FOR RESPONSIBLE SCHOLARSHIP</div>
        <div className="principle-grid"><div><b>01</b><h3>Meaning first</h3><p>Preserve the author's argument, methods, results and limitations.</p></div><div><b>02</b><h3>Evidence matters</h3><p>Do not invent studies, data, quotations, DOIs or citations.</p></div><div><b>03</b><h3>Author remains responsible</h3><p>Review every revision and follow institutional AI-use and authorship policies.</p></div></div>
      </section>
    </main>
    <footer><span>AcademicWrite AI</span><span>Independent academic writing support · Verify before publication</span></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
