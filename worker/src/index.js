const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const cors = corsHeaders(origin, allowedOrigin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({ ok: true, aiConfigured: Boolean(env.OPENAI_API_KEY), gmailConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN), submissionMode: env.SUBMISSION_MODE || 'draft' }, 200, cors);
      }
      if (request.method === 'POST' && url.pathname === '/api/draft') {
        enforceOrigin(origin, allowedOrigin);
        const payload = await readJson(request);
        validatePayload(payload);
        if (!env.OPENAI_API_KEY) throw httpError(503, 'OPENAI_API_KEY er ikke konfigurert.');
        const draft = await generateApplication(payload, env);
        return json({ draft }, 200, cors);
      }
      if (request.method === 'POST' && url.pathname === '/api/submit/email') {
        enforceOrigin(origin, allowedOrigin);
        const payload = await readJson(request);
        validateSubmission(payload, env);
        const result = await submitWithGmail(payload, env);
        return json(result, 200, cors);
      }
      return json({ error: 'Ikke funnet.' }, 404, cors);
    } catch (error) {
      console.error(error);
      const status = Number(error.status) || 500;
      return json({ error: status >= 500 ? 'Tjenesten kunne ikke fullføre forespørselen.' : error.message }, status, cors);
    }
  }
};

function corsHeaders(origin, allowedOrigin) {
  const permitted = allowedOrigin === '*' || origin === allowedOrigin ? origin || '*' : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': permitted,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  };
}

function enforceOrigin(origin, allowedOrigin) {
  if (allowedOrigin !== '*' && origin !== allowedOrigin) throw httpError(403, 'Origin er ikke tillatt.');
}

async function readJson(request) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > 180000) throw httpError(413, 'Forespørselen er for stor.');
  try { return await request.json(); } catch { throw httpError(400, 'Ugyldig JSON.'); }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') throw httpError(400, 'Mangler søknadsdata.');
  requireString(payload.company?.name, 'Firmanavn');
  requireString(payload.project?.description, 'Prosjektbeskrivelse');
  requireString(payload.grant?.id, 'Ordningens ID');
  requireString(payload.grant?.name, 'Ordningens navn');
  requireHttpsUrl(payload.grant?.sourceUrl, 'Kildelenke');
  requireHttpsUrl(payload.grant?.applyUrl, 'Søknadslenke');
}

function validateSubmission(payload, env) {
  validatePayload(payload);
  if (payload.approved !== true) throw httpError(400, 'Søknaden er ikke godkjent.');
  const mode = env.SUBMISSION_MODE || 'draft';
  if (mode === 'send' && payload.approvalPhrase !== 'GODKJENT FOR INNSENDING') throw httpError(400, 'Den eksakte godkjenningsfrasen mangler.');
  const submission = payload.grant?.submission;
  if (submission?.type !== 'email' || !submission.email) throw httpError(400, 'Ordningen er ikke konfigurert for e-postinnsending.');
  requireEmail(submission.email, 'Mottaker');
  enforceRecipientDomain(submission.email, env.ALLOWED_RECIPIENT_DOMAINS || '');
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) throw httpError(503, 'Gmail OAuth er ikke konfigurert.');
}

async function generateApplication(payload, env) {
  const clean = { company: cleanCompany(payload.company), project: cleanProject(payload.project), grant: cleanGrant(payload.grant) };
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5',
      store: false,
      instructions: [
        'Du er søknadsassistent for Loki Lydstudio AS.',
        'Skriv profesjonelt bokmål og bruk bare fakta i innsendte data.',
        'Ikke oppfinn kunder, samarbeid, resultater, ansatte, beløp, datoer eller kvalifikasjoner.',
        'Marker manglende opplysninger i missingInformation.',
        'Vurder søkerkvalifikasjon forsiktig og krev kontroll av fullstendige vilkår hos originalkilden.',
        'Ikke påstå at søknaden er sendt eller at støtte vil bli innvilget.',
        'Budsjetttekst må være konsistent med oppgitte tall.'
      ].join('\n'),
      input: JSON.stringify(clean),
      text: { format: { type: 'json_schema', name: 'grant_application_draft', strict: true, schema: applicationSchema() } }
    })
  });
  const data = await response.json();
  if (!response.ok) { console.error('OpenAI error', data); throw httpError(502, 'AI-tjenesten returnerte en feil.'); }
  const outputText = data.output_text || (data.output || []).flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text;
  if (!outputText) throw httpError(502, 'AI-tjenesten returnerte ikke et utkast.');
  try { return JSON.parse(outputText); } catch { throw httpError(502, 'AI-utkastet hadde ugyldig struktur.'); }
}

function applicationSchema() {
  const strings = { type: 'array', items: { type: 'string' } };
  return {
    type: 'object', additionalProperties: false,
    required: ['eligibility','executiveSummary','companyBasis','projectDescription','artisticRelevance','plan','targetGroup','budgetText','requestedAmountRationale','expectedEffect','suggestedAnswers','missingInformation','complianceCheck','submissionNote'],
    properties: {
      eligibility: { type: 'object', additionalProperties: false, required: ['assessment','confidence','reasons','blockers'], properties: { assessment: { type: 'string' }, confidence: { type: 'string', enum: ['lav','middels','høy'] }, reasons: strings, blockers: strings } },
      executiveSummary: { type: 'string' }, companyBasis: { type: 'string' }, projectDescription: { type: 'string' }, artisticRelevance: { type: 'string' }, plan: { type: 'string' }, targetGroup: { type: 'string' }, budgetText: { type: 'string' }, requestedAmountRationale: { type: 'string' }, expectedEffect: { type: 'string' },
      suggestedAnswers: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['question','answer'], properties: { question: { type: 'string' }, answer: { type: 'string' } } } },
      missingInformation: strings, complianceCheck: strings, submissionNote: { type: 'string' }
    }
  };
}

async function submitWithGmail(payload, env) {
  const accessToken = await getGoogleAccessToken(env);
  const mode = env.SUBMISSION_MODE || 'draft';
  const recipient = payload.grant.submission.email;
  const subject = safeHeader(`Søknad: ${payload.project.title || 'Prosjekt'} – ${payload.grant.name}`);
  const body = payload.editedText || buildEmailBody(payload);
  const raw = base64UrlEncode([`To: ${safeHeader(recipient)}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit', '', body].join('\r\n'));
  const endpoint = mode === 'send' ? `${GMAIL_BASE}/messages/send` : `${GMAIL_BASE}/drafts`;
  const gmailPayload = mode === 'send' ? { raw } : { message: { raw } };
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(gmailPayload) });
  const result = await response.json();
  if (!response.ok) { console.error('Gmail error', result); throw httpError(502, 'Gmail kunne ikke klargjøre innsendingen.'); }
  return { ok: true, mode, id: result.id || result.message?.id || 'ukjent', recipient };
}

async function getGoogleAccessToken(env) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }) });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw httpError(502, 'Kunne ikke autorisere Gmail.');
  return data.access_token;
}

function buildEmailBody(payload) {
  const d = payload.draft;
  return [`Søker: ${payload.company.name}`, `Organisasjonsnummer: ${payload.company.organizationNumber || '[ikke oppgitt]'}`, `Prosjekt: ${payload.project.title || '[ikke oppgitt]'}`, `Ordning: ${payload.grant.name}`, '', 'SAMMENDRAG', d.executiveSummary, '', 'PROSJEKTBESKRIVELSE', d.projectDescription, '', 'BUDSJETT OG FINANSIERING', d.budgetText, '', 'KILDE', payload.grant.sourceUrl].join('\n');
}

function cleanCompany(value = {}) { return { name: cleanString(value.name, 160), organizationNumber: cleanString(value.organizationNumber, 20), location: cleanString(value.location, 160), contactName: cleanString(value.contactName, 160), description: cleanString(value.description, 6000), documentedStrengths: cleanString(value.documentedStrengths, 6000), applicantTypes: cleanArray(value.applicantTypes, 20, 100) }; }
function cleanProject(value = {}) { return { title: cleanString(value.title, 200), type: cleanString(value.type, 100), typeLabel: cleanString(value.typeLabel, 160), totalBudget: cleanNumber(value.totalBudget), requestedAmount: cleanNumber(value.requestedAmount), description: cleanString(value.description, 8000), goals: cleanString(value.goals, 8000), targetGroupAndEffect: cleanString(value.targetGroupAndEffect, 6000), plan: cleanString(value.plan, 6000), financing: cleanString(value.financing, 5000), keywords: cleanArray(value.keywords, 30, 100) }; }
function cleanGrant(value = {}) { return { id: cleanString(value.id, 160), name: cleanString(value.name, 300), provider: cleanString(value.provider, 300), summary: cleanString(value.summary, 1500), categories: cleanArray(value.categories, 30, 100), applicantTypes: cleanArray(value.applicantTypes, 30, 100), region: cleanString(value.region, 200), deadlineType: cleanString(value.deadlineType, 50), deadlines: cleanArray(value.deadlines, 30, 80), deadlineNote: cleanString(value.deadlineNote, 500), verifiedAt: cleanString(value.verifiedAt, 30), sourceUrl: cleanString(value.sourceUrl, 1000), applyUrl: cleanString(value.applyUrl, 1000), submission: value.submission?.type === 'email' ? { type: 'email', email: cleanString(value.submission.email, 320) } : { type: 'portal' } }; }
function cleanString(value, max) { return String(value || '').trim().slice(0, max); }
function cleanArray(value, maxItems, maxLength) { return Array.isArray(value) ? value.slice(0, maxItems).map(item => cleanString(item, maxLength)) : []; }
function cleanNumber(value) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; }
function requireString(value, label) { if (!String(value || '').trim()) throw httpError(400, `${label} mangler.`); }
function requireHttpsUrl(value, label) { try { const url = new URL(value); if (url.protocol !== 'https:') throw new Error(); } catch { throw httpError(400, `${label} må være en gyldig HTTPS-adresse.`); } }
function requireEmail(value, label) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''))) throw httpError(400, `${label} er ugyldig.`); }
function enforceRecipientDomain(email, configured) { const domains = configured.split(',').map(value => value.trim().toLowerCase()).filter(Boolean); if (domains.length && !domains.includes(email.split('@')[1].toLowerCase())) throw httpError(403, 'Mottakerdomenet er ikke tillatt.'); }
function safeHeader(value) { return String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 500); }
function base64UrlEncode(value) { const bytes = new TextEncoder().encode(value); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function json(payload, status, headers) { return new Response(JSON.stringify(payload), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
