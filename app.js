const STORAGE = {
  followed: 'stotteklang-followed-v1',
  categories: 'stotteklang-categories-v1',
  reminders: 'stotteklang-reminders-v1',
  notified: 'stotteklang-notified-v1',
  assistantDraft: 'stotteklang-assistant-draft-v2',
  assistantProfile: 'stotteklang-assistant-profile-v1'
};

const state = {
  grants: [],
  meta: {},
  query: '',
  category: '',
  applicant: '',
  status: 'active',
  view: 'all',
  followed: new Set(JSON.parse(localStorage.getItem(STORAGE.followed) || '[]')),
  subscribedCategories: new Set(JSON.parse(localStorage.getItem(STORAGE.categories) || '[]')),
  reminderDays: new Set(JSON.parse(localStorage.getItem(STORAGE.reminders) || '[30,14,7,1]')),
  assistantText: '',
  assistantPayload: null,
  assistantMatches: [],
  deferredInstall: null
};

const el = id => document.getElementById(id);
const fmtDate = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const DAY = 86400000;
const STOTTEBOT_API_URL = String(window.STOTTEBOT_API_URL || '').replace(/\/$/, '');
const accents = ['#3157e7', '#111d3d', '#f06a5f', '#805ad5', '#e7a63b', '#5276e9'];
const categoryIcons = {
  '': '•',
  'Innspilling': '◉',
  'Turné': '↗',
  'Stipend': '◇',
  'Konsert': '♪',
  'Utstyr': '□',
  'Lokaler': '⌂',
  'Komposisjon': '≈',
  'Markedsføring': '○',
  'Barn og unge': '☆'
};

const APPLICATION_TEMPLATES = {
  recording: {
    label: 'Innspilling og utgivelse',
    guidance: 'Beskriv den kunstneriske retningen, hvem som medvirker, produksjonsplanen og hvordan utgivelsen skal nå publikum.',
    focus: 'kunstnerisk idé, produksjon og lansering',
    sectionTitle: 'Produksjon og utgivelsesplan',
    checklist: ['Repertoar og kunstnerisk retning', 'Produsent, studio og medvirkende', 'Innspillings-, miks- og masterplan', 'Utgivelsesdato, distribusjon og lansering']
  },
  tour: {
    label: 'Turné og konserter',
    guidance: 'Vær konkret om spillesteder, tidsrom, kunstnerisk program, logistikk og hvordan turneen bygger publikum.',
    focus: 'kunstnerisk program, gjennomføring og publikumsarbeid',
    sectionTitle: 'Turné- og gjennomføringsplan',
    checklist: ['Bekreftede eller planlagte spillesteder', 'Reiserute og tekniske behov', 'Honorarer, reise og overnatting', 'Publikums- og kommunikasjonsplan']
  },
  stipend: {
    label: 'Stipend og kunstnerisk utvikling',
    guidance: 'Forklar hva du skal fordype deg i, hvorfor tiden er riktig nå og hvilken langsiktig betydning perioden vil ha for kunstnerskapet.',
    focus: 'kunstnerisk fordypning og langsiktig utvikling',
    sectionTitle: 'Arbeidsperiode og utviklingsmål',
    checklist: ['Tydelig kunstnerisk problemstilling', 'Aktiviteter i stipendperioden', 'Realistisk tidsbruk', 'Betydning for videre kunstnerskap']
  },
  equipment: {
    label: 'Utstyr, studio og lokaler',
    guidance: 'Beskriv behovet, hvem tiltaket kommer til gode, hvordan utstyret eller lokalet skal brukes og hvorfor investeringen er varig.',
    focus: 'behov, bruk, kvalitet og langsiktig verdi',
    sectionTitle: 'Behov og bruk av investeringen',
    checklist: ['Dagens situasjon og dokumentert behov', 'Konkret utstyrs- eller tiltaksoversikt', 'Brukere, aktivitet og tilgjengelighet', 'Drift, vedlikehold og varighet']
  },
  organizer: {
    label: 'Arrangør, festival og arena',
    guidance: 'Vis en tydelig programprofil, realistisk produksjon, publikumsarbeid og hvordan prosjektet styrker det lokale eller nasjonale musikklivet.',
    focus: 'programprofil, produksjon og publikumsutvikling',
    sectionTitle: 'Program og arrangementsplan',
    checklist: ['Kunstnerisk profil og programidé', 'Produksjon, bemanning og sikkerhet', 'Publikum, inkludering og tilgjengelighet', 'Lokal forankring og samarbeid']
  },
  composition: {
    label: 'Komposisjon og nytt verk',
    guidance: 'Beskriv verkideen, formatet, den kunstneriske prosessen og hvordan verket skal ferdigstilles, framføres eller formidles.',
    focus: 'verkidé, skapende prosess og formidling',
    sectionTitle: 'Skapende prosess og ferdigstilling',
    checklist: ['Verkets idé, format og omfang', 'Kompositorisk metode og arbeidsplan', 'Utøvere, bestiller eller samarbeidspartner', 'Plan for framføring, publisering eller formidling']
  },
  marketing: {
    label: 'Markedsføring og eksport',
    guidance: 'Knytt aktivitetene til konkrete målgrupper og markeder. Beskriv tiltak, partnere, tidslinje og målbare resultater.',
    focus: 'marked, synlighet og målbare resultater',
    sectionTitle: 'Markeds- og lanseringsplan',
    checklist: ['Prioriterte målgrupper eller territorier', 'Konkrete markedsaktiviteter', 'Partnere, medier og bransjekontakter', 'Mål og hvordan effekten skal måles']
  },
  youth: {
    label: 'Barn og unge',
    guidance: 'Beskriv medvirkning, læring, inkludering og hvordan prosjektet gir barn og unge reell tilgang til musikalske aktiviteter.',
    focus: 'deltakelse, mestring, inkludering og trygg gjennomføring',
    sectionTitle: 'Deltakelse og pedagogisk opplegg',
    checklist: ['Alder og målgruppe', 'Medvirkning og læringsmål', 'Inkludering, tilgjengelighet og trygghet', 'Kompetanse hos ansvarlige og samarbeidspartnere']
  }
};

const ASSISTANT_FIELD_IDS = ['assistantTemplate','assistantGrant','assistantApplicant','assistantOrgNumber','assistantLocation','assistantContact','assistantCompanyDescription','assistantEvidence','assistantProject','assistantIdea','assistantGoals','assistantAudience','assistantPlan','assistantBudget','assistantFunding','assistantImpact','assistantKeywords'];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function getDeadlineInfo(grant, now = new Date()) {
  if (grant.deadlineType === 'rolling') return { key: 'rolling', label: 'Løpende frist', date: null, days: Infinity };
  const dates = (grant.deadlines || []).map(value => new Date(value)).filter(date => !Number.isNaN(date.getTime())).sort((a,b) => a-b);
  if (!dates.length) return { key: 'unknown', label: grant.deadlineNote || 'Frist ikke bestemt', date: null, days: Infinity };
  const next = dates.find(date => date.getTime() >= now.getTime());
  if (!next) return { key: 'expired', label: `Utløpt ${fmtDate.format(dates.at(-1))}`, date: dates.at(-1), days: -1 };
  const days = Math.ceil((next.getTime() - now.getTime()) / DAY);
  if (grant.openFrom && new Date(grant.openFrom) > now) return { key: 'upcoming', label: `Åpner ${fmtDate.format(new Date(grant.openFrom))}`, date: next, days };
  if (days <= 7) return { key: 'urgent', label: `${days === 0 ? 'I dag' : `${days} dager igjen`}`, date: next, days };
  if (days <= 30) return { key: 'soon', label: `${days} dager igjen`, date: next, days };
  return { key: 'open', label: 'Åpen / kommende', date: next, days };
}

function matchesStatus(grant, info) {
  const filter = state.status;
  if (filter === 'all') return true;
  if (filter === 'active') return info.key !== 'expired';
  if (filter === 'urgent') return info.key === 'urgent';
  if (filter === 'soon') return ['urgent', 'soon'].includes(info.key);
  return info.key === filter;
}

function isFollowed(grant) {
  return state.followed.has(grant.id) || grant.categories.some(category => state.subscribedCategories.has(category));
}

function filteredGrants() {
  const query = state.query.trim().toLocaleLowerCase('nb-NO');
  return state.grants
    .map(grant => ({ grant, info: getDeadlineInfo(grant) }))
    .filter(({grant, info}) => {
      const haystack = [grant.name, grant.provider, grant.summary, ...(grant.categories || []), ...(grant.applicantTypes || [])].join(' ').toLocaleLowerCase('nb-NO');
      if (query && !haystack.includes(query)) return false;
      if (state.category && !grant.categories.includes(state.category)) return false;
      if (state.applicant && !grant.applicantTypes.includes(state.applicant)) return false;
      if (!matchesStatus(grant, info)) return false;
      if (state.view === 'soon' && !['urgent', 'soon'].includes(info.key)) return false;
      if (state.view === 'followed' && !isFollowed(grant)) return false;
      return true;
    })
    .sort((a,b) => {
      const order = { urgent: 0, soon: 1, rolling: 2, open: 3, upcoming: 4, unknown: 5, expired: 6 };
      const statusDiff = order[a.info.key] - order[b.info.key];
      if (statusDiff) return statusDiff;
      return (a.info.date?.getTime() || Infinity) - (b.info.date?.getTime() || Infinity) || a.grant.name.localeCompare(b.grant.name, 'nb');
    });
}

function renderCategoryRail() {
  const featured = ['Innspilling', 'Turné', 'Stipend', 'Konsert', 'Utstyr', 'Lokaler', 'Komposisjon', 'Markedsføring', 'Barn og unge'];
  el('categoryRail').innerHTML = [
    `<button class="category-chip ${state.category === '' ? 'is-active' : ''}" data-category="" data-icon="${categoryIcons['']}">Alt</button>`,
    ...featured.map(category => `<button class="category-chip ${state.category === category ? 'is-active' : ''}" data-category="${escapeHtml(category)}" data-icon="${categoryIcons[category] || '✦'}">${escapeHtml(category)}</button>`)
  ].join('');
  el('categoryRail').querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    state.category = button.dataset.category;
    renderAll();
  }));
}

function renderApplicantOptions() {
  const applicants = [...new Set(state.grants.flatMap(grant => grant.applicantTypes || []))].sort((a,b) => a.localeCompare(b, 'nb'));
  el('applicantFilter').innerHTML = `<option value="">Alle søkere</option>${applicants.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('')}`;
  el('applicantFilter').value = state.applicant;
}

function renderSubscriptions() {
  const categories = [...new Set(state.grants.flatMap(grant => grant.categories || []))].sort((a,b) => a.localeCompare(b, 'nb'));
  el('subscriptionCategories').innerHTML = categories.map(category => `
    <label><input type="checkbox" value="${escapeHtml(category)}" ${state.subscribedCategories.has(category) ? 'checked' : ''}> ${escapeHtml(category)}</label>
  `).join('');
  el('subscriptionCategories').querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
    input.checked ? state.subscribedCategories.add(input.value) : state.subscribedCategories.delete(input.value);
    persistSubscriptions();
    renderAll();
  }));
}

function renderCard({grant, info}, index) {
  const following = isFollowed(grant);
  const deadline = info.date ? fmtDate.format(info.date) : (grant.deadlineNote || info.label);
  const followIcon = following
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"></path></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
  return `<article class="grant-card card-enter" style="--accent:${accents[index % accents.length]};--delay:${Math.min(index, 11) * 45}ms">
    <div class="card-top">
      <span class="card-index">SK-${String(index + 1).padStart(2, '0')}</span>
      <div class="card-tools">
        <span class="status-pill status-${info.key}">${escapeHtml(info.label)}</span>
        <button class="follow-button ${following ? 'is-following' : ''}" data-follow="${escapeHtml(grant.id)}" aria-label="${following ? 'Slutt å følge' : 'Følg'} ${escapeHtml(grant.name)}" title="${following ? 'Følger' : 'Følg'}">${followIcon}</button>
      </div>
    </div>
    <span class="provider">${escapeHtml(grant.provider)}</span>
    <h3>${escapeHtml(grant.name)}</h3>
    <p>${escapeHtml(grant.summary)}</p>
    <div class="tag-list">${grant.categories.slice(0,3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="card-footer">
      <div><span class="deadline-label">${info.key === 'rolling' || info.key === 'unknown' ? 'Frist' : 'Neste frist'}</span><span class="deadline-date">${escapeHtml(deadline)}</span></div>
      <button class="card-open" data-open="${escapeHtml(grant.id)}">Detaljer ↗</button>
    </div>
  </article>`;
}

function renderGrid() {
  const results = filteredGrants();
  el('resultCount').textContent = results.length;
  el('grantGrid').innerHTML = results.map(renderCard).join('');
  el('emptyState').hidden = results.length > 0;
  el('grantGrid').querySelectorAll('[data-follow]').forEach(button => button.addEventListener('click', () => toggleFollow(button.dataset.follow)));
  el('grantGrid').querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openGrant(button.dataset.open)));
}

function renderStats() {
  const infos = state.grants.map(grant => getDeadlineInfo(grant));
  const active = infos.filter(info => info.key !== 'expired').length;
  const soon = infos.filter(info => ['urgent','soon'].includes(info.key)).length;
  const nextPair = state.grants.map(grant => ({grant, info:getDeadlineInfo(grant)})).filter(x => x.info.date && x.info.date >= new Date()).sort((a,b) => a.info.date-b.info.date)[0];
  el('totalCount').textContent = state.grants.length;
  if (el('heroProofCount')) el('heroProofCount').textContent = `${state.grants.length} ordninger`;
  el('openCount').textContent = active;
  el('providerCount').textContent = new Set(state.grants.map(g => g.provider)).size;
  el('verifiedDate').textContent = state.meta.verifiedAt ? fmtDate.format(new Date(`${state.meta.verifiedAt}T12:00:00`)) : '–';
  el('heroSoonCount').textContent = soon;
  el('heroNextDate').textContent = nextPair ? fmtDate.format(nextPair.info.date) : 'Ingen dato';
  el('heroNextName').textContent = nextPair ? nextPair.grant.name : 'Se løpende ordninger';
  el('followCount').textContent = state.followed.size + state.subscribedCategories.size;
  el('dataFreshness').textContent = `Kildedata kontrollert ${state.meta.verifiedAt ? fmtDate.format(new Date(`${state.meta.verifiedAt}T12:00:00`)) : 'ukjent dato'}`;
}

function renderAll() {
  renderCategoryRail();
  renderGrid();
  renderStats();
}

function toggleFollow(id) {
  state.followed.has(id) ? state.followed.delete(id) : state.followed.add(id);
  localStorage.setItem(STORAGE.followed, JSON.stringify([...state.followed]));
  renderAll();
  showToast(state.followed.has(id) ? 'Du følger nå ordningen' : 'Ordningen er fjernet fra følgelisten');
}

function openGrant(id) {
  const grant = state.grants.find(item => item.id === id);
  if (!grant) return;
  const info = getDeadlineInfo(grant);
  const following = isFollowed(grant);
  const deadlines = (grant.deadlines || []).map(value => new Date(value)).filter(date => date >= new Date()).slice(0,5);
  el('grantDialogContent').innerHTML = `
    <span class="detail-provider">${escapeHtml(grant.provider)}</span>
    <h2 class="detail-title">${escapeHtml(grant.name)}</h2>
    <p class="detail-summary">${escapeHtml(grant.summary)}</p>
    <span class="status-pill status-${info.key}">${escapeHtml(info.label)}</span>
    <div class="detail-grid">
      <div class="detail-item"><span>Hvem kan søke</span><strong>${escapeHtml(grant.applicantTypes.join(', '))}</strong></div>
      <div class="detail-item"><span>Geografi</span><strong>${escapeHtml(grant.region)}</strong></div>
      <div class="detail-item"><span>Formål</span><strong>${escapeHtml(grant.categories.join(', '))}</strong></div>
      <div class="detail-item"><span>Beløp</span><strong>${escapeHtml(grant.amount || 'Se retningslinjene')}</strong></div>
    </div>
    <div class="detail-deadlines">
      <strong>Kommende frister</strong>
      ${deadlines.length ? `<ul>${deadlines.map(date => `<li>${fmtDateTime.format(date)}</li>`).join('')}</ul>` : `<p>${escapeHtml(grant.deadlineNote || 'Ingen ny frist er registrert.')}</p>`}
    </div>
    <div class="detail-actions">
      <a class="button button-primary" href="${escapeHtml(grant.applyUrl)}" target="_blank" rel="noreferrer">Gå til søknad ↗</a>
      <button class="button button-secondary" id="dialogAssistantButton">Skriv søknadsutkast</button>
      <button class="button button-secondary" id="dialogFollowButton">${following ? 'Slutt å følge' : 'Følg ordningen'}</button>
      <a class="button button-ghost" href="${escapeHtml(grant.sourceUrl)}" target="_blank" rel="noreferrer">Offisiell kilde ↗</a>
    </div>
    <p class="fine-print">Kilde kontrollert ${fmtDate.format(new Date(`${grant.verifiedAt}T12:00:00`))}. Frister kan endres; kontroller alltid den offisielle siden.</p>`;
  el('dialogAssistantButton').addEventListener('click', () => startApplicationForGrant(grant.id));
  el('dialogFollowButton').addEventListener('click', () => { toggleFollow(grant.id); openGrant(grant.id); });
  if (!el('grantDialog').open) el('grantDialog').showModal();
}



function inferTemplateFromGrant(grant) {
  const categories = (grant?.categories || []).map(value => value.toLocaleLowerCase('nb-NO'));
  if (categories.some(value => value.includes('innspilling'))) return 'recording';
  if (categories.some(value => value.includes('utstyr') || value.includes('lokaler'))) return 'equipment';
  if (categories.some(value => value.includes('turné') || value.includes('konsert'))) return 'tour';
  if (categories.some(value => value.includes('stipend'))) return 'stipend';
  if (categories.some(value => value.includes('komposisjon'))) return 'composition';
  if (categories.some(value => value.includes('markedsføring') || value.includes('eksport'))) return 'marketing';
  if (categories.some(value => value.includes('barn') || value.includes('unge'))) return 'youth';
  return 'organizer';
}

function templateCategories(templateKey) {
  const map = {
    recording: ['Innspilling', 'Produksjon', 'Markedsføring'],
    tour: ['Turné', 'Konsert', 'Reise'],
    stipend: ['Stipend', 'Kompetanse'],
    equipment: ['Utstyr', 'Lokaler', 'Produksjon'],
    organizer: ['Arrangør', 'Festival', 'Konsert', 'Arena'],
    composition: ['Komposisjon', 'Produksjon'],
    marketing: ['Markedsføring', 'Eksport'],
    youth: ['Barn og unge', 'Kompetanse']
  };
  return map[templateKey] || [];
}

function populateAssistantGrants() {
  const select = el('assistantGrant');
  if (!select) return;
  const current = select.value;
  const options = [...state.grants]
    .sort((a,b) => a.name.localeCompare(b.name, 'nb'))
    .map(grant => `<option value="${escapeHtml(grant.id)}">${escapeHtml(grant.name)} · ${escapeHtml(grant.provider)}</option>`)
    .join('');
  select.innerHTML = `<option value="">Ingen bestemt ordning</option>${options}`;
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function updateAssistantBackendStatus() {
  const title = el('assistantBackendStatus');
  const description = el('assistantBackendDescription');
  const badge = el('assistantModeBadge');
  if (!title || !description || !badge) return;
  if (STOTTEBOT_API_URL) {
    title.textContent = 'Sikker AI-backend konfigurert';
    description.textContent = 'Prosjektdata sendes bare når du velger «Lag søknadsutkast».';
    badge.textContent = 'AI via sikker backend';
  } else {
    title.textContent = 'Lokalt modus';
    description.textContent = 'Ingen prosjektdata forlater nettleseren.';
    badge.textContent = 'Lokalt og privat';
  }
}

function updateAssistantGuidance() {
  const template = APPLICATION_TEMPLATES[el('assistantTemplate')?.value] || APPLICATION_TEMPLATES.recording;
  const selectedGrant = state.grants.find(grant => grant.id === el('assistantGrant')?.value);
  const sourceHint = selectedGrant
    ? ` Valgt ordning: <strong>${escapeHtml(selectedGrant.name)}</strong>. Kilde kontrollert ${escapeHtml(selectedGrant.verifiedAt || 'ukjent dato')}.`
    : ' Bruk «Finn beste ordninger» for å rangere databasen for Loki Lydstudio AS.';
  el('assistantGuidance').innerHTML = `<strong>Tips:</strong> ${escapeHtml(template.guidance)}${sourceHint}`;
}

function saveAssistantDraft() {
  const draft = {};
  ASSISTANT_FIELD_IDS.forEach(id => { if (el(id)) draft[id] = el(id).value; });
  localStorage.setItem(STORAGE.assistantDraft, JSON.stringify(draft));
}

function loadAssistantDraft() {
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(STORAGE.assistantDraft) || '{}'); } catch (_) {}
  ASSISTANT_FIELD_IDS.forEach(id => {
    if (!el(id) || draft[id] === undefined) return;
    if (id === 'assistantGrant' && ![...el(id).options].some(option => option.value === draft[id])) return;
    el(id).value = draft[id];
  });
  if (!el('assistantApplicant').value.trim()) el('assistantApplicant').value = 'Loki Lydstudio AS';
  updateAssistantGuidance();
  updateAssistantBackendStatus();
  updateAssistantSubmissionControls();
}

function parseMoney(value) {
  const digits = String(value || '').replace(/[^0-9,.-]/g, '').replace(/\s/g, '').replace(',', '.');
  const amount = Number(digits);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function assistantApplicantTypes() {
  return ['Lydstudio', 'Selskap'];
}

function collectAssistantData() {
  const grant = state.grants.find(item => item.id === el('assistantGrant').value);
  const company = {
    name: el('assistantApplicant').value.trim() || 'Loki Lydstudio AS',
    organizationNumber: el('assistantOrgNumber').value.trim(),
    location: el('assistantLocation').value.trim(),
    contactName: el('assistantContact').value.trim(),
    description: el('assistantCompanyDescription').value.trim(),
    documentedStrengths: el('assistantEvidence').value.trim(),
    applicantTypes: assistantApplicantTypes()
  };
  const project = {
    title: el('assistantProject').value.trim(),
    type: el('assistantTemplate').value,
    typeLabel: APPLICATION_TEMPLATES[el('assistantTemplate').value]?.label || 'Musikkprosjekt',
    totalBudget: parseMoney(el('assistantBudget').value),
    requestedAmount: parseMoney(el('assistantFunding').value),
    description: el('assistantIdea').value.trim(),
    goals: el('assistantGoals').value.trim(),
    targetGroupAndEffect: el('assistantAudience').value.trim(),
    plan: el('assistantPlan').value.trim(),
    financing: el('assistantImpact').value.trim(),
    keywords: el('assistantKeywords').value.split(',').map(value => value.trim()).filter(Boolean)
  };
  return {
    templateKey: el('assistantTemplate').value,
    template: APPLICATION_TEMPLATES[el('assistantTemplate').value] || APPLICATION_TEMPLATES.recording,
    company,
    project,
    grant
  };
}

function scoreAssistantGrant(grant, data) {
  const info = getDeadlineInfo(grant);
  if (info.key === 'expired') return null;
  let score = 0;
  const reasons = [];
  const applicants = grant.applicantTypes || [];
  const overlap = applicants.filter(type => data.company.applicantTypes.includes(type));
  if (overlap.length) {
    score += 46 + Math.min(8, (overlap.length - 1) * 4);
    reasons.push(`Søkerprofil: ${overlap.join(' og ')}`);
  } else {
    score -= 22;
    reasons.push('Søkerprofil må kontrolleres særskilt');
  }

  const desiredCategories = templateCategories(data.templateKey);
  const categoryHits = (grant.categories || []).filter(category => desiredCategories.includes(category));
  if (categoryHits.length) {
    score += Math.min(28, categoryHits.length * 12);
    reasons.push(`Formål: ${categoryHits.join(', ')}`);
  }

  const haystack = [grant.name, grant.provider, grant.summary, ...(grant.categories || []), ...(grant.applicantTypes || [])]
    .join(' ').toLocaleLowerCase('nb-NO');
  const words = [...data.project.keywords, ...desiredCategories]
    .map(value => value.toLocaleLowerCase('nb-NO'))
    .filter(value => value.length >= 3);
  const keywordHits = [...new Set(words.filter(word => haystack.includes(word)))];
  if (keywordHits.length) {
    score += Math.min(15, keywordHits.length * 4);
    reasons.push(`Nøkkelord: ${keywordHits.slice(0, 4).join(', ')}`);
  }

  if (grant.region === 'Nasjonal') {
    score += 5;
    reasons.push('Nasjonal ordning');
  }

  const verified = new Date(`${grant.verifiedAt || '1970-01-01'}T12:00:00`);
  const ageDays = (Date.now() - verified.getTime()) / DAY;
  if (ageDays <= 60) score += 6;
  else if (ageDays > 180) {
    score -= 8;
    reasons.push('Kilden bør kontrolleres på nytt');
  }

  if (grant.featured) score += 3;
  return { grant, info, score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

function findAssistantMatches({ autoSelect = true } = {}) {
  const data = collectAssistantData();
  state.assistantMatches = state.grants
    .map(grant => scoreAssistantGrant(grant, data))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (a.info.date?.getTime() || Infinity) - (b.info.date?.getTime() || Infinity))
    .slice(0, 8);

  if (autoSelect && state.assistantMatches.length && !el('assistantGrant').value) {
    el('assistantGrant').value = state.assistantMatches[0].grant.id;
  }
  renderAssistantMatches();
  updateAssistantGuidance();
  updateAssistantSubmissionControls();
  saveAssistantDraft();
}

function renderAssistantMatches() {
  const container = el('assistantMatches');
  if (!container) return;
  if (!state.assistantMatches.length) {
    container.innerHTML = '<p class="muted-copy">Ingen aktive ordninger ble rangert. Kontroller prosjektbeskrivelsen og kildedataene.</p>';
    return;
  }
  container.innerHTML = state.assistantMatches.map((match, index) => {
    const selected = el('assistantGrant').value === match.grant.id;
    const deadline = match.info.date ? fmtDateTime.format(match.info.date) : match.info.label;
    return `<article class="bot-match-card ${selected ? 'is-selected' : ''}">
      <div class="bot-match-score"><strong>${match.score}</strong><span>/100</span></div>
      <div class="bot-match-copy">
        <span class="bot-match-rank">#${index + 1} · ${escapeHtml(match.grant.provider)}</span>
        <h4>${escapeHtml(match.grant.name)}</h4>
        <p>${escapeHtml(match.grant.summary)}</p>
        <small>Frist: ${escapeHtml(deadline)} · ${escapeHtml(match.reasons.join(' · '))}</small>
      </div>
      <button class="button button-secondary bot-match-select" data-assistant-grant="${escapeHtml(match.grant.id)}" type="button">${selected ? 'Valgt' : 'Velg'}</button>
    </article>`;
  }).join('');
  container.querySelectorAll('[data-assistant-grant]').forEach(button => button.addEventListener('click', () => {
    el('assistantGrant').value = button.dataset.assistantGrant;
    el('assistantApproval').checked = false;
    renderAssistantMatches();
    updateAssistantGuidance();
    updateAssistantSubmissionControls();
    saveAssistantDraft();
  }));
}

function sentence(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function moneyText(value) {
  return value === null ? '[må fylles ut]' : `${value.toLocaleString('nb-NO')} kroner`;
}

function buildLocalApplication(data) {
  const missing = [];
  const addMissing = (label, value) => { if (!value && value !== 0) missing.push(label); };
  addMissing('organisasjonsnummer', data.company.organizationNumber);
  addMissing('sted/kommune', data.company.location);
  addMissing('kontaktperson', data.company.contactName);
  addMissing('beskrivelse av studioet', data.company.description);
  addMissing('dokumenterte styrker', data.company.documentedStrengths);
  addMissing('prosjektnavn', data.project.title);
  addMissing('målgruppe og forventet effekt', data.project.targetGroupAndEffect);
  addMissing('plan og tidsrom', data.project.plan);
  addMissing('egeninnsats og annen finansiering', data.project.financing);
  addMissing('totalbudsjett', data.project.totalBudget);
  addMissing('søknadsbeløp', data.project.requestedAmount);

  const applicantOverlap = (data.grant?.applicantTypes || []).filter(type => data.company.applicantTypes.includes(type));
  const eligibility = data.grant
    ? {
        assessment: applicantOverlap.length ? 'Foreløpig relevant' : 'Må avklares før innsending',
        confidence: applicantOverlap.length ? 'middels' : 'lav',
        reasons: applicantOverlap.length
          ? [`Ordningen oppgir ${applicantOverlap.join(' og ')} som søkergruppe.`, `Prosjektet er koblet til malen ${data.template.label}.`]
          : ['Lydstudio eller selskap er ikke uttrykkelig listet som søkergruppe.'],
        blockers: applicantOverlap.length ? [] : ['Kontroller om Loki Lydstudio AS er støtteberettiget søker.']
      }
    : { assessment: 'Ingen ordning valgt', confidence: 'lav', reasons: ['Velg en ordning før innsending.'], blockers: ['Mangler støtteordning.'] };

  const grantContext = data.grant ? `${data.grant.name} hos ${data.grant.provider}` : 'en aktuell støtteordning';
  const projectName = data.project.title || '[prosjektnavn mangler]';
  return {
    eligibility,
    executiveSummary: `${data.company.name} søker ${moneyText(data.project.requestedAmount)} gjennom ${grantContext} til «${projectName}». ${sentence(data.project.description, '[prosjektbeskrivelse mangler]')}`,
    projectDescription: `${sentence(data.project.description, '[prosjektbeskrivelse mangler]')} ${sentence(data.project.goals, '[mål og begrunnelse mangler]')}`,
    artisticRelevance: `${sentence(data.project.goals, '[mål og begrunnelse mangler]')} Prosjektets relevans må underbygges med dokumenterte behov, kompetanse og forventet verdi for målgruppen.`,
    plan: sentence(data.project.plan, '[gjennomføringsplan og tidsrom mangler]'),
    targetGroup: sentence(data.project.targetGroupAndEffect, '[målgruppe og forventet effekt mangler]'),
    budgetText: `Prosjektets totalbudsjett er ${moneyText(data.project.totalBudget)}. Det søkes om ${moneyText(data.project.requestedAmount)}. ${sentence(data.project.financing, '[egeninnsats og annen finansiering må beskrives]')}`,
    requestedAmountRationale: 'Det søkte beløpet skal knyttes til konkrete, dokumenterbare kostnader i et balansert budsjett. Kontroller maksimal støtteandel og hvilke kostnader ordningen godtar.',
    expectedEffect: sentence(data.project.targetGroupAndEffect, '[forventet effekt mangler]'),
    companyBasis: `${sentence(data.company.description, '[beskrivelse av studioet mangler]')} ${sentence(data.company.documentedStrengths, '[dokumenterte styrker mangler]')}`,
    suggestedAnswers: [
      { question: 'Hva skal gjennomføres?', answer: data.project.description || '[må fylles ut]' },
      { question: 'Hvorfor er prosjektet viktig?', answer: data.project.goals || '[må fylles ut]' },
      { question: 'Hvordan skal prosjektet gjennomføres?', answer: data.project.plan || '[må fylles ut]' }
    ],
    missingInformation: missing,
    complianceCheck: [
      'Kontroller at Loki Lydstudio AS er støtteberettiget søker.',
      'Kontroller at prosjektet ikke er påbegynt i strid med vilkårene.',
      'Kontroller støtteandel, budsjettkrav og godkjente kostnadstyper.',
      'Kontroller obligatoriske vedlegg og signatur/fullmakt.',
      'Kontroller frist og klokkeslett hos originalkilden.'
    ],
    submissionNote: 'Lokalt førsteutkast. Ingen generativ AI ble brukt. Alle fakta, tall og vilkår må kontrolleres før innsending.'
  };
}

async function generateApplicationDraft(event) {
  event?.preventDefault();
  const data = collectAssistantData();
  if (!data.project.description && !data.project.goals) {
    showToast('Skriv litt om prosjektet eller målet først');
    el('assistantIdea').focus();
    return;
  }
  if (!data.grant) {
    findAssistantMatches({ autoSelect: true });
    data.grant = state.grants.find(item => item.id === el('assistantGrant').value);
  }

  el('assistantStatus').className = 'bot-inline-status';
  el('assistantStatus').textContent = STOTTEBOT_API_URL ? 'Lager AI-utkast via sikker backend …' : 'Lager lokalt utkast …';
  const submitButton = el('applicationAssistantForm').querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    let draft;
    if (STOTTEBOT_API_URL) {
      const response = await fetch(`${STOTTEBOT_API_URL}/api/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: data.company, project: data.project, grant: data.grant })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Backend returnerte en ukjent feil.');
      draft = payload.draft;
      el('assistantStatus').textContent = 'AI-utkastet er klart. Kontroller alle fakta og markerte mangler.';
      el('assistantStatus').classList.add('is-good');
    } else {
      draft = buildLocalApplication(data);
      el('assistantStatus').textContent = 'Lokalt utkast er klart. Koble til backend for et mer tilpasset AI-utkast.';
      el('assistantStatus').classList.add('is-good');
    }
    state.assistantPayload = { generatedAt: new Date().toISOString(), company: data.company, project: data.project, grant: data.grant, draft };
    renderApplicationDraft(draft, data);
    saveAssistantDraft();
    showToast('Søknadsutkastet er klart');
  } catch (error) {
    console.error(error);
    const draft = buildLocalApplication(data);
    state.assistantPayload = { generatedAt: new Date().toISOString(), company: data.company, project: data.project, grant: data.grant, draft, fallbackReason: error.message };
    renderApplicationDraft(draft, data);
    el('assistantStatus').textContent = `Backend feilet: ${error.message} Et lokalt reserveutkast ble laget.`;
    el('assistantStatus').classList.add('is-error');
  } finally {
    submitButton.disabled = false;
    updateAssistantSubmissionControls();
  }
}

function eligibilityText(eligibility = {}) {
  return [
    `Vurdering: ${eligibility.assessment || 'ukjent'}`,
    `Sikkerhet: ${eligibility.confidence || 'ukjent'}`,
    ...(eligibility.reasons || []).map(value => `• ${value}`),
    ...(eligibility.blockers || []).map(value => `HINDRING: ${value}`)
  ].join('\n');
}

function listText(items) {
  return Array.isArray(items) && items.length ? items.map(value => `• ${value}`).join('\n') : 'Ingen registrert.';
}

function renderApplicationDraft(draft, data) {
  const sections = [
    ['Kvalifikasjonsvurdering', eligibilityText(draft.eligibility)],
    ['Kort sammendrag', draft.executiveSummary],
    ['Om søker', draft.companyBasis],
    ['Prosjektbeskrivelse', draft.projectDescription],
    ['Kunstnerisk og faglig relevans', draft.artisticRelevance],
    ['Gjennomføringsplan', draft.plan],
    ['Målgruppe', draft.targetGroup],
    ['Budsjett og finansiering', draft.budgetText],
    ['Begrunnelse for søknadsbeløpet', draft.requestedAmountRationale],
    ['Forventet effekt', draft.expectedEffect],
    ['Manglende informasjon', listText(draft.missingInformation)],
    ['Kontrollpunkter', listText(draft.complianceCheck)],
    ['Merknad om innsending', draft.submissionNote]
  ];
  const answers = (draft.suggestedAnswers || []).map(item => `<h4>${escapeHtml(item.question)}</h4><p>${escapeHtml(item.answer)}</p>`).join('');
  const output = el('assistantOutput');
  output.classList.remove('is-empty');
  output.contentEditable = 'true';
  output.setAttribute('aria-label', 'Redigerbart søknadsutkast');
  output.innerHTML = `<div class="assistant-generated">
    <h3>${escapeHtml(data.project.title || 'Søknadsutkast')}</h3>
    <p class="generated-meta">${STOTTEBOT_API_URL ? 'AI-utkast' : 'Lokalt førsteutkast'} · ${escapeHtml(data.grant?.name || 'ingen ordning valgt')} · ${escapeHtml(data.company.name)}</p>
    ${sections.map(([heading, body]) => `<h4>${escapeHtml(heading)}</h4><p>${escapeHtml(body || '[ikke utfylt]')}</p>`).join('')}
    ${answers ? `<h4>Forslag til skjemasvar</h4>${answers}` : ''}
  </div>`;
  state.assistantText = output.innerText.trim();
  el('assistantCopy').disabled = false;
  el('assistantDownload').disabled = false;
  el('assistantPackage').disabled = false;
  el('assistantApproval').checked = false;
}

async function copyAssistantDraft() {
  const text = el('assistantOutput').innerText.trim();
  if (!text || el('assistantOutput').classList.contains('is-empty')) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  showToast('Søknadsutkastet er kopiert');
}

function assistantSlug(value) {
  return String(value || 'soknadsutkast').toLocaleLowerCase('nb-NO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zæøå0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'soknadsutkast';
}

function downloadAssistantDraft() {
  const text = el('assistantOutput').innerText.trim();
  if (!text || el('assistantOutput').classList.contains('is-empty')) return;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${assistantSlug(el('assistantProject').value)}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Utkastet er lastet ned');
}

function downloadAssistantPackage() {
  if (!state.assistantPayload) return;
  const packageData = {
    ...state.assistantPayload,
    editedText: el('assistantOutput').innerText.trim(),
    approval: {
      approved: el('assistantApproval').checked,
      approvalPhraseEntered: el('assistantApprovalPhrase').value === 'GODKJENT FOR INNSENDING'
    }
  };
  const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${assistantSlug(el('assistantProject').value)}-soknadspakke.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Søknadspakken er lastet ned');
}

function invalidateAssistantGeneratedDraft() {
  if (!state.assistantPayload) return;
  state.assistantPayload = null;
  el('assistantApproval').checked = false;
  el('assistantPackage').disabled = true;
  el('assistantStatus').textContent = 'Prosjektopplysningene er endret. Lag et nytt utkast før innsending.';
  el('assistantStatus').className = 'bot-inline-status';
  updateAssistantSubmissionControls();
}

function updateAssistantSubmissionControls() {
  const grant = state.grants.find(item => item.id === el('assistantGrant')?.value);
  const approved = Boolean(el('assistantApproval')?.checked && state.assistantPayload);
  if (el('assistantOpenPortal')) el('assistantOpenPortal').disabled = !approved || !grant;
  const emailReady = Boolean(STOTTEBOT_API_URL && grant?.submission?.type === 'email' && grant.submission.email);
  if (el('assistantEmailSubmit')) {
    el('assistantEmailSubmit').hidden = !emailReady;
    el('assistantEmailSubmit').disabled = !approved || !emailReady;
  }
}

async function openAssistantPortal() {
  const grant = state.grants.find(item => item.id === el('assistantGrant').value);
  if (!grant || !state.assistantPayload || !el('assistantApproval').checked) return;
  await copyAssistantDraft();
  window.open(grant.applyUrl || grant.sourceUrl, '_blank', 'noopener,noreferrer');
  el('assistantSubmissionNote').textContent = 'Søknadsteksten er kopiert, og den offisielle søknadssiden er åpnet. Kontroller og send manuelt i portalen.';
}

async function submitAssistantEmail() {
  const grant = state.grants.find(item => item.id === el('assistantGrant').value);
  if (!STOTTEBOT_API_URL || !grant?.submission?.email || !state.assistantPayload || !el('assistantApproval').checked) return;
  el('assistantStatus').textContent = 'Klargjør e-post via sikker backend …';
  try {
    const response = await fetch(`${STOTTEBOT_API_URL}/api/submit/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state.assistantPayload,
        editedText: el('assistantOutput').innerText.trim(),
        approved: true,
        approvalPhrase: el('assistantApprovalPhrase').value
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'E-postintegrasjonen feilet.');
    el('assistantStatus').textContent = payload.mode === 'send' ? `E-posten er sendt. ID: ${payload.id}` : `Gmail-utkast er opprettet. ID: ${payload.id}`;
    el('assistantStatus').className = 'bot-inline-status is-good';
  } catch (error) {
    el('assistantStatus').textContent = error.message;
    el('assistantStatus').className = 'bot-inline-status is-error';
  }
}

function resetAssistant() {
  el('applicationAssistantForm').reset();
  el('assistantTemplate').value = 'recording';
  el('assistantApplicant').value = 'Loki Lydstudio AS';
  localStorage.removeItem(STORAGE.assistantDraft);
  state.assistantPayload = null;
  state.assistantMatches = [];
  const output = el('assistantOutput');
  output.contentEditable = 'false';
  output.classList.add('is-empty');
  output.innerHTML = `<div class="assistant-placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6V3Z"></path><path d="M14 3v4h4M9 12h6M9 16h6M9 8h2"></path></svg><h3>Utkastet vises her</h3><p>Velg en ordning og lag et utkast. Manglende informasjon markeres tydelig, og teksten kan redigeres før godkjenning.</p></div>`;
  el('assistantMatches').innerHTML = '<p class="muted-copy">Fyll inn prosjektet og velg «Finn beste ordninger».</p>';
  el('assistantStatus').textContent = '';
  el('assistantApproval').checked = false;
  el('assistantApprovalPhrase').value = '';
  ['assistantCopy','assistantDownload','assistantPackage','assistantOpenPortal'].forEach(id => { el(id).disabled = true; });
  state.assistantText = '';
  updateAssistantGuidance();
  updateAssistantSubmissionControls();
  showToast('Støtteboten er nullstilt');
}

function openAssistantDialog({ grantId = '', focusField = true } = {}) {
  const dialog = el('assistantDialog');
  if (!dialog) return;
  if (grantId) {
    const grant = state.grants.find(item => item.id === grantId);
    if (grant) {
      el('assistantGrant').value = grant.id;
      el('assistantTemplate').value = inferTemplateFromGrant(grant);
      updateAssistantGuidance();
      saveAssistantDraft();
    }
  }
  if (!dialog.open) dialog.showModal();
  if (focusField) window.setTimeout(() => el('assistantProject')?.focus(), 120);
}

function startApplicationForGrant(grantId) {
  const grant = state.grants.find(item => item.id === grantId);
  if (!grant) return;
  if (el('grantDialog')?.open) el('grantDialog').close();
  openAssistantDialog({ grantId: grant.id });
}

function persistSubscriptions() {
  localStorage.setItem(STORAGE.categories, JSON.stringify([...state.subscribedCategories]));
}

function updateReminderStorage() {
  state.reminderDays = new Set([...el('reminderDays').querySelectorAll('input:checked')].map(input => Number(input.value)));
  localStorage.setItem(STORAGE.reminders, JSON.stringify([...state.reminderDays]));
}

function notificationText() {
  if (!('Notification' in window)) return 'Ikke støttet i denne nettleseren';
  if (Notification.permission === 'granted') return 'Aktivert på denne enheten';
  if (Notification.permission === 'denied') return 'Blokkert i nettleserinnstillingene';
  return 'Ikke aktivert';
}

async function requestNotifications() {
  if (!('Notification' in window)) return showToast('Nettleseren støtter ikke varsler');
  const permission = await Notification.requestPermission();
  el('notificationStatus').textContent = notificationText();
  el('notificationButton').textContent = permission === 'granted' ? 'Aktivert' : 'Aktiver';
  if (permission === 'granted') {
    showToast('Varsler er aktivert');
    sendNotification('Støtteklang er klar', 'Du får beskjed om fulgte frister når appen sjekker oppdateringer.');
    checkReminders();
  }
}

async function sendNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    return registration.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: `stotteklang-${title}`, data: { url: './#oversikt' } });
  }
  new Notification(title, { body });
}

function checkReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notified = new Set(JSON.parse(localStorage.getItem(STORAGE.notified) || '[]'));
  const now = new Date();
  state.grants.filter(isFollowed).forEach(grant => {
    const info = getDeadlineInfo(grant, now);
    if (!info.date || !state.reminderDays.has(info.days)) return;
    const key = `${grant.id}-${info.date.toISOString()}-${info.days}`;
    if (notified.has(key)) return;
    sendNotification(`${info.days === 1 ? 'I morgen' : `${info.days} dager`} til fristen`, `${grant.name} – ${fmtDate.format(info.date)}`);
    notified.add(key);
  });
  localStorage.setItem(STORAGE.notified, JSON.stringify([...notified].slice(-250)));
}

function exportCalendar() {
  const followed = state.grants.filter(isFollowed);
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Støtteklang//NO','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  followed.forEach(grant => {
    (grant.deadlines || []).map(value => new Date(value)).filter(date => date >= new Date()).slice(0,4).forEach(date => {
      const start = toIcsDate(date);
      const uid = `${grant.id}-${date.getTime()}@stotteklang`;
      lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${toIcsDate(new Date())}`, `DTSTART:${start}`, `SUMMARY:${icsEscape(`Søknadsfrist: ${grant.name}`)}`, `DESCRIPTION:${icsEscape(`${grant.summary}\n${grant.sourceUrl}`)}`, `URL:${grant.applyUrl}`, 'BEGIN:VALARM','TRIGGER:-P7D','ACTION:DISPLAY',`DESCRIPTION:${icsEscape(`7 dager til fristen for ${grant.name}`)}`,'END:VALARM','END:VEVENT');
    });
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'stotteklang-frister.ics';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`${followed.length} fulgte ordninger eksportert`);
}
function toIcsDate(date) { return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''); }
function icsEscape(text) { return String(text).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  el('toast').textContent = message;
  el('toast').classList.add('show');
  toastTimer = setTimeout(() => el('toast').classList.remove('show'), 2500);
}

function setupVisualEffects() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = el('siteHeader');
  const progress = el('scrollProgress');
  const parallaxItems = [...document.querySelectorAll('[data-parallax]')];
  let ticking = false;

  const updateScene = () => {
    const scrollY = window.scrollY;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    if (progress) progress.style.setProperty('--scroll-progress', `${Math.min(100, (scrollY / maxScroll) * 100)}%`);
    if (header) header.classList.toggle('is-scrolled', scrollY > 24);

    if (!reducedMotion) {
      parallaxItems.forEach(item => {
        const speed = Number(item.dataset.parallax || 0);
        const rect = item.getBoundingClientRect();
        const centerDelta = rect.top + rect.height / 2 - window.innerHeight / 2;
        const offset = Math.max(-85, Math.min(85, centerDelta * speed));
        item.style.translate = `0 ${offset.toFixed(1)}px`;
      });
    }
    ticking = false;
  };

  const requestScene = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScene);
  };

  window.addEventListener('scroll', requestScene, { passive: true });
  window.addEventListener('resize', requestScene);
  requestScene();

  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .13, rootMargin: '0px 0px -35px' });
    document.querySelectorAll('.reveal').forEach(node => observer.observe(node));
  } else {
    document.querySelectorAll('.reveal').forEach(node => node.classList.add('is-visible'));
  }

  const tiltArea = document.querySelector('[data-tilt]');
  if (tiltArea && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    tiltArea.addEventListener('pointermove', event => {
      const rect = tiltArea.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      tiltArea.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`);
      tiltArea.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
    });
    tiltArea.addEventListener('pointerleave', () => {
      tiltArea.style.setProperty('--tilt-y', '0deg');
      tiltArea.style.setProperty('--tilt-x', '0deg');
    });
  }
}

function bindEvents() {
  el('searchInput').addEventListener('input', event => { state.query = event.target.value; renderGrid(); });
  el('applicantFilter').addEventListener('change', event => { state.applicant = event.target.value; renderGrid(); });
  el('statusFilter').addEventListener('change', event => { state.status = event.target.value; renderGrid(); });
  el('resetFilters').addEventListener('click', () => {
    state.query = ''; state.category = ''; state.applicant = ''; state.status = 'active'; state.view = 'all';
    el('searchInput').value = ''; el('applicantFilter').value = ''; el('statusFilter').value = 'active';
    document.querySelectorAll('.tab').forEach((tab, i) => { tab.classList.toggle('is-active', i === 0); tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); });
    renderAll();
  });
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    state.view = tab.dataset.view;
    document.querySelectorAll('.tab').forEach(item => { const active = item === tab; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', active ? 'true' : 'false'); });
    renderGrid();
  }));
  el('settingsButton').addEventListener('click', () => el('settingsDialog').showModal());
  el('heroNotifyButton').addEventListener('click', () => el('settingsDialog').showModal());
  el('assistantOpenButton')?.addEventListener('click', () => openAssistantDialog());
  el('footerAssistantButton')?.addEventListener('click', () => openAssistantDialog());
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  }));
  el('notificationButton').addEventListener('click', requestNotifications);
  el('testNotificationButton').addEventListener('click', () => sendNotification('Test fra Støtteklang', 'Varslene fungerer på denne enheten.'));
  el('exportCalendarButton').addEventListener('click', exportCalendar);
  el('reminderDays').querySelectorAll('input').forEach(input => { input.checked = state.reminderDays.has(Number(input.value)); input.addEventListener('change', updateReminderStorage); });
  el('applicationAssistantForm').addEventListener('submit', generateApplicationDraft);
  el('assistantReset').addEventListener('click', resetAssistant);
  el('assistantCopy').addEventListener('click', copyAssistantDraft);
  el('assistantDownload').addEventListener('click', downloadAssistantDraft);
  el('assistantPackage').addEventListener('click', downloadAssistantPackage);
  el('assistantMatch').addEventListener('click', () => findAssistantMatches({ autoSelect: true }));
  el('assistantApproval').addEventListener('change', updateAssistantSubmissionControls);
  el('assistantOpenPortal').addEventListener('click', openAssistantPortal);
  el('assistantEmailSubmit').addEventListener('click', submitAssistantEmail);
  ASSISTANT_FIELD_IDS.forEach(id => {
    el(id).addEventListener('input', () => { saveAssistantDraft(); invalidateAssistantGeneratedDraft(); });
    el(id).addEventListener('change', () => {
      if (id === 'assistantGrant') {
        if (el(id).value) {
          const grant = state.grants.find(item => item.id === el(id).value);
          if (grant) el('assistantTemplate').value = inferTemplateFromGrant(grant);
        }
        invalidateAssistantGeneratedDraft();
        el('assistantApproval').checked = false;
        renderAssistantMatches();
        updateAssistantSubmissionControls();
      }
      updateAssistantGuidance();
      saveAssistantDraft();
    });
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); el('searchInput').focus(); }
    if (event.key === '/' && document.activeElement.tagName !== 'INPUT') { event.preventDefault(); el('searchInput').focus(); }
  });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.deferredInstall = event; el('installButton').hidden = false; });
  el('installButton').addEventListener('click', async () => { if (!state.deferredInstall) return; state.deferredInstall.prompt(); await state.deferredInstall.userChoice; state.deferredInstall = null; el('installButton').hidden = true; });
}

async function init() {
  bindEvents();
  setupVisualEffects();
  try {
    const response = await fetch('data/grants.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.grants = data.grants || [];
    state.meta = data.meta || {};
    populateAssistantGrants();
    loadAssistantDraft();
    renderApplicantOptions();
    renderSubscriptions();
    renderAll();
    el('notificationStatus').textContent = notificationText();
    el('notificationButton').textContent = ('Notification' in window && Notification.permission === 'granted') ? 'Aktivert' : 'Aktiver';
    checkReminders();
  } catch (error) {
    console.error(error);
    el('dataFreshness').textContent = 'Kunne ikke laste støtteordningene.';
    el('grantGrid').innerHTML = '<div class="empty-state"><h3>Databasen kunne ikke lastes</h3><p>Prøv å laste siden på nytt.</p></div>';
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
}

init();
