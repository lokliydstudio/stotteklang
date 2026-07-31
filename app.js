const STORAGE = {
  followed: 'stotteklang-followed-v1',
  categories: 'stotteklang-categories-v1',
  reminders: 'stotteklang-reminders-v1',
  notified: 'stotteklang-notified-v1',
  assistantDraft: 'stotteklang-assistant-draft-v1'
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
  deferredInstall: null
};

const el = id => document.getElementById(id);
const fmtDate = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const DAY = 86400000;
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

const ASSISTANT_FIELD_IDS = ['assistantTemplate','assistantGrant','assistantApplicant','assistantProject','assistantIdea','assistantGoals','assistantAudience','assistantPlan','assistantBudget','assistantFunding','assistantImpact'];

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
  if (categories.some(value => value.includes('turné') || value.includes('konsert'))) return 'tour';
  if (categories.some(value => value.includes('stipend'))) return 'stipend';
  if (categories.some(value => value.includes('utstyr') || value.includes('lokaler'))) return 'equipment';
  if (categories.some(value => value.includes('komposisjon'))) return 'composition';
  if (categories.some(value => value.includes('markedsføring') || value.includes('eksport'))) return 'marketing';
  if (categories.some(value => value.includes('barn') || value.includes('unge'))) return 'youth';
  return 'organizer';
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

function updateAssistantGuidance() {
  const template = APPLICATION_TEMPLATES[el('assistantTemplate')?.value] || APPLICATION_TEMPLATES.recording;
  const selectedGrant = state.grants.find(grant => grant.id === el('assistantGrant')?.value);
  const sourceHint = selectedGrant
    ? ` Du har valgt <strong>${escapeHtml(selectedGrant.name)}</strong>; bruk kriteriene på den offisielle siden som siste kontroll.`
    : '';
  el('assistantGuidance').innerHTML = `<strong>Tips for denne malen:</strong> ${escapeHtml(template.guidance)}${sourceHint}`;
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
  updateAssistantGuidance();
}

function collectAssistantData() {
  const grant = state.grants.find(item => item.id === el('assistantGrant').value);
  return {
    templateKey: el('assistantTemplate').value,
    template: APPLICATION_TEMPLATES[el('assistantTemplate').value] || APPLICATION_TEMPLATES.recording,
    grant,
    applicant: el('assistantApplicant').value.trim(),
    project: el('assistantProject').value.trim(),
    idea: el('assistantIdea').value.trim(),
    goals: el('assistantGoals').value.trim(),
    audience: el('assistantAudience').value.trim(),
    plan: el('assistantPlan').value.trim(),
    budget: el('assistantBudget').value.trim(),
    funding: el('assistantFunding').value.trim(),
    impact: el('assistantImpact').value.trim()
  };
}

function sentence(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function generateApplicationDraft(event) {
  event?.preventDefault();
  const data = collectAssistantData();
  if (!data.idea && !data.goals) {
    showToast('Skriv litt om prosjektet eller målet først');
    el('assistantIdea').focus();
    return;
  }
  const applicant = data.applicant || 'Søker';
  const project = data.project || 'Prosjektet';
  const grantContext = data.grant ? `${data.grant.name} hos ${data.grant.provider}` : 'den aktuelle støtteordningen';
  const budgetText = data.budget || 'må ferdigstilles';
  const fundingText = data.funding || 'må avklares';
  const projectIntro = `${applicant} søker støtte til «${project}», et prosjekt med hovedvekt på ${data.template.focus}. ${sentence(data.idea, 'Prosjektet skal utvikles og gjennomføres i tråd med en tydelig kunstnerisk og praktisk plan.')}`;
  const goalText = sentence(data.goals, 'Målet er å skape et kunstnerisk relevant resultat med tydelig verdi for prosjektets målgruppe og for søkerens videre utvikling.');
  const planText = sentence(data.plan, 'Prosjektet deles inn i forberedelse, gjennomføring og ferdigstilling, med ansvar og milepæler som konkretiseres før oppstart.');
  const audienceText = sentence(data.audience, 'Målgruppen defineres nærmere ut fra prosjektets format, geografi og formidlingsplan.');
  const impactText = sentence(data.impact, 'Søker vil bidra med egeninnsats og arbeide videre med supplerende finansiering og samarbeid som styrker gjennomføringen.');
  const sourceNote = data.grant ? `Ordningen beskrives som: ${data.grant.summary}` : 'Velg gjerne en konkret støtteordning for å gjøre utkastet mer målrettet.';

  const html = `<div class="assistant-generated">
    <h3>${escapeHtml(project)}</h3>
    <p class="generated-meta">Førsteutkast · ${escapeHtml(data.template.label)} · tilpasset ${escapeHtml(grantContext)}</p>
    <h4>Prosjektbeskrivelse</h4>
    <p>${escapeHtml(projectIntro)}</p>
    <h4>Kunstnerisk mål og relevans</h4>
    <p>${escapeHtml(goalText)} Støtten vil gi nødvendig handlingsrom til å prioritere kvalitet, gjennomføring og formidling.</p>
    <h4>${escapeHtml(data.template.sectionTitle)}</h4>
    <p>${escapeHtml(planText)}</p>
    <h4>Målgruppe og forventet effekt</h4>
    <p>${escapeHtml(audienceText)} ${escapeHtml(impactText)}</p>
    <h4>Budsjett og finansiering</h4>
    <p>Prosjektets totale budsjett er ${escapeHtml(budgetText)}, og det søkes om ${escapeHtml(fundingText)} fra ${escapeHtml(grantContext)}. Budsjettet skal være balansert og vise honorarer, produksjonskostnader, egeninnsats, andre tilskudd og eventuelle inntekter på en etterprøvbar måte.</p>
    <h4>Sjekkliste før innsending</h4>
    <ul>${data.template.checklist.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    <p class="generated-note"><strong>Tilpasning til ordningen:</strong> ${escapeHtml(sourceNote)} Kontroller formål, søknadskriterier, vedlegg, beløpsgrenser og frist hos originalkilden.</p>
  </div>`;

  const output = el('assistantOutput');
  output.classList.remove('is-empty');
  output.innerHTML = html;
  output.contentEditable = 'true';
  output.setAttribute('aria-label', 'Redigerbart søknadsutkast');
  state.assistantText = output.innerText.trim();
  el('assistantCopy').disabled = false;
  el('assistantDownload').disabled = false;
  saveAssistantDraft();
  showToast('Førsteutkastet er klart');
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

function downloadAssistantDraft() {
  const text = el('assistantOutput').innerText.trim();
  if (!text || el('assistantOutput').classList.contains('is-empty')) return;
  const project = el('assistantProject').value.trim().toLocaleLowerCase('nb-NO').replace(/[^a-zæøå0-9]+/g, '-').replace(/^-|-$/g, '') || 'soknadsutkast';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${project}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Utkastet er lastet ned');
}

function resetAssistant() {
  el('applicationAssistantForm').reset();
  el('assistantTemplate').value = 'recording';
  localStorage.removeItem(STORAGE.assistantDraft);
  const output = el('assistantOutput');
  output.contentEditable = 'false';
  output.classList.add('is-empty');
  output.innerHTML = `<div class="assistant-placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6V3Z"></path><path d="M14 3v4h4M9 12h6M9 16h6M9 8h2"></path></svg><h3>Utkastet vises her</h3><p>Fyll inn feltene til venstre. Assistenten bygger en tydelig prosjektbeskrivelse, begrunnelse, gjennomføringsplan og budsjetttekst.</p></div>`;
  el('assistantCopy').disabled = true;
  el('assistantDownload').disabled = true;
  state.assistantText = '';
  updateAssistantGuidance();
  showToast('Søknadsassistenten er nullstilt');
}

function startApplicationForGrant(grantId) {
  const grant = state.grants.find(item => item.id === grantId);
  if (!grant) return;
  el('assistantGrant').value = grant.id;
  el('assistantTemplate').value = inferTemplateFromGrant(grant);
  updateAssistantGuidance();
  saveAssistantDraft();
  el('grantDialog').close();
  document.querySelector('#soknadsassistent').scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => el('assistantApplicant').focus(), 500);
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
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  el('notificationButton').addEventListener('click', requestNotifications);
  el('testNotificationButton').addEventListener('click', () => sendNotification('Test fra Støtteklang', 'Varslene fungerer på denne enheten.'));
  el('exportCalendarButton').addEventListener('click', exportCalendar);
  el('reminderDays').querySelectorAll('input').forEach(input => { input.checked = state.reminderDays.has(Number(input.value)); input.addEventListener('change', updateReminderStorage); });
  el('applicationAssistantForm').addEventListener('submit', generateApplicationDraft);
  el('assistantReset').addEventListener('click', resetAssistant);
  el('assistantCopy').addEventListener('click', copyAssistantDraft);
  el('assistantDownload').addEventListener('click', downloadAssistantDraft);
  ASSISTANT_FIELD_IDS.forEach(id => {
    el(id).addEventListener('input', saveAssistantDraft);
    el(id).addEventListener('change', () => {
      if (id === 'assistantGrant' && el(id).value) {
        const grant = state.grants.find(item => item.id === el(id).value);
        if (grant) el('assistantTemplate').value = inferTemplateFromGrant(grant);
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
