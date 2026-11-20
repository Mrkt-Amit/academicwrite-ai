# AcademicWrite AI

A deployable academic writing assistant built with React, Vite and Netlify Functions. It supports Word document upload, academic editing, scholarly metadata discovery through OpenAlex and Crossref, editorial review notes, and Word/text export.

## Features

- Paste manuscript text or upload `.docx`.
- Choose an editing objective and specify the research field.
- Search scholarly metadata via OpenAlex and Crossref.
- Use selected literature records as contextual guidance during editing.
- Revise academic language while preserving meaning, data, citations and limitations.
- Export the revised text as `.docx` or `.txt`.

## Requirements

- Node.js 18+
- A Netlify account
- An OpenAI API key with API access and billing configured

## Run locally

```bash
npm install
cp .env.example .env
# Edit .env and set OPENAI_API_KEY
npm run dev
```

The Netlify Functions do not run under plain Vite dev server automatically. For local end-to-end testing, install the Netlify CLI and run:

```bash
npm install -g netlify-cli
netlify dev
```

Netlify CLI loads environment variables from `.env` for local function development. Keep `.env` out of Git.

## Deploy using GitHub + Netlify

1. Create a new GitHub repository and upload these project files.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Connect the GitHub repository.
4. Netlify should detect the settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. In **Site configuration → Environment variables**, add:
   - `OPENAI_API_KEY` = your private API key
   - `OPENAI_MODEL` = `gpt-4.1-mini` (optional)
6. Deploy. Test document upload, research search and editing.

## Important implementation notes

- The browser never receives the OpenAI API key. AI calls are made by a Netlify Function.
- OpenAlex and Crossref provide discovery metadata; they do not guarantee full-text access or peer-review status.
- The application does not currently authenticate users, meter usage, or enforce paid plans. Add authentication, rate limiting, quotas and abuse protection before public launch.
- Add a privacy policy, terms of use, retention controls and secure storage before handling confidential, unpublished or personally identifiable research.
- The editor is not a plagiarism checker and cannot guarantee any Turnitin/iThenticate result. It does not remove document provenance or AI-use disclosures.
- Users must verify references, source relevance, factual claims, and institutional policies before publication or submission.
- Search result ranking, journal quartiles and indexing status are not independently certified by this prototype.

## Suggested production roadmap

1. Add user accounts, project history and secure document storage.
2. Add citation-style formatting (APA, Vancouver, IEEE, Chicago).
3. Add a source verification workflow using DOI resolution and Crossref metadata.
4. Add similarity review against licensed or open full-text corpora where permitted.
5. Add section-aware tools for abstracts, methods, results, discussion and literature reviews.
6. Add institutional disclosure settings and a transparent AI-edit history.
7. Add rate limiting, quotas, monitoring, error reporting and privacy controls.
