# Støttebot – drift og sikkerhet

Støtteboten er integrert i den eksisterende søknadsassistent-dialogen.

## Lokal modus

Uten backend fungerer matching, utkast, kopiering, tekstnedlasting, JSON-søknadspakke og åpning av offisiell portal direkte på GitHub Pages. Opplysninger lagres i nettleserens `localStorage`.

## Sikker AI-backend

Frontend leser backend-adressen fra `bot-config.js`. API-nøkler skal aldri ligge i denne filen eller i GitHub-repositoryet.

```js
window.STOTTEBOT_API_URL = 'https://stotteklang-bot.DITT-NAVN.workers.dev';
```

Publiser Worker:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

## Gmail-utkast og sending

Legg inn OAuth-hemmeligheter i Worker:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

Standard i `wrangler.toml` er `SUBMISSION_MODE = "draft"`, som bare oppretter et Gmail-utkast. Direkte sending krever både `SUBMISSION_MODE = "send"` og frasen `GODKJENT FOR INNSENDING` i grensesnittet.

En ordning må ha en offisielt bekreftet mottaker:

```json
"submission": {
  "type": "email",
  "email": "bekreftet-adresse@stotteaktor.no"
}
```

Ikke legg inn e-postadresser som ikke uttrykkelig er bekreftet av støtteaktøren.

## Portaler

Ordninger uten e-postintegrasjon behandles som portalinnsending. Boten kopierer teksten og åpner `applyUrl`. Brukeren må logge inn, kontrollere feltene og sende manuelt.

## Produksjonskrav

Før løsningen brukes av flere enn studioets egne autoriserte personer bør dere legge til autentisering, rate limiting, kostnadsgrenser, revisjonslogg, kryptert tokenlagring og personvernerklæring.
