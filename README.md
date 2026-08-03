# Støtteklang

En statisk, mobilvennlig PWA for å finne og følge støtteordninger for musikere, komponister, lydstudioer, konsertarrangører, festivaler og kulturarenaer.

## Funksjoner

- Lys og ryddig profesjonell profil med Inter-typografi, marineblått, kobolt og varme aksenter.
- Subtil responsiv parallax som respekterer `prefers-reduced-motion`.
- Ingen grønne profilfarger.

- Friststatus beregnes automatisk: utløpt, haster, snart, åpen, løpende eller ikke publisert.
- Søk og filtrering etter formål, søkergruppe og status.
- Følg enkeltordninger eller hele kategorier; lagres lokalt i nettleseren.
- Nettleservarsler ved åpning/bakgrunnssynk der nettleseren støtter det.
- Kalender-eksport (`.ics`) for pålitelige systemvarsler på mobil.
- Installerbar PWA med offline-cache.
- Integrert støttebot for Loki Lydstudio AS med studioprofil, prosjektdata og automatisk rangering av aktive støtteordninger.
- Redigerbart lokalt førsteutkast, kvalifikasjonskontroll, mangelliste, tekstnedlasting og komplett JSON-søknadspakke.
- Menneskelig godkjenningsport før teksten kopieres og den offisielle søknadsportalen åpnes.
- Valgfri Cloudflare Worker for AI-utkast og Gmail-utkast/-sending; API-nøkler ligger aldri i GitHub Pages.
- Daglig GitHub Action som ruller frem gjentakende årlige frister og validerer data.

## Publiser på GitHub Pages

1. Opprett et nytt GitHub-repository.
2. Last opp innholdet i denne mappen til roten av repositoriet.
3. Gå til **Settings → Pages**.
4. Under **Build and deployment**, velg **Deploy from a branch**.
5. Velg `main` og mappen `/ (root)`, og trykk **Save**.

Nettsiden blir tilgjengelig på `https://BRUKERNAVN.github.io/REPO/`.

## Redigere eller legge til støtteordninger

Oppføringene ligger i `data/grants.json`. Kjør validering før publisering:

```bash
python scripts/validate_data.py
```

Hver oppføring bør minst ha:

- unik `id`
- navn, støtteaktør og kort beskrivelse
- kategorier og søkergrupper
- `deadlineType`: `fixed`, `rolling` eller `announced_later`
- ISO-datoer med norsk tidssone i `deadlines`
- offisiell `sourceUrl` og `applyUrl`
- dato for kildekontroll i `verifiedAt`

## Hva som faktisk oppdateres automatisk

Selve nettsiden beregner status fra dagens dato, så en frist flyttes automatisk fra «snart» til «haster» og «utløpt». GitHub Action ruller frem ordninger med stabile, årlige fristmønstre.

Engangsfrister, lokale ordninger, regelendringer og nye utlysninger må fortsatt kildekontrolleres og legges inn. En helt uttømmende nasjonal database krever redaksjonelt ansvar eller egne integrasjoner mot hver støtteaktør.

## Støttebot og valgfri AI

Støtteboten fungerer lokalt uten konto eller backend. Den rangerer aktive ordninger, lager et strukturert førsteutkast, markerer manglende informasjon og krever godkjenning før portal eller e-postintegrasjon åpnes.

Mappen `worker/` inneholder en valgfri Cloudflare Worker for generative utkast og Gmail-utkast/-sending. Frontend konfigureres i `bot-config.js`; hemmelige API- og OAuth-nøkler skal bare lagres som Worker-hemmeligheter. Se `docs/STOTTEBOT.md`.

## Varsler og GitHub Pages

GitHub Pages har ingen server som kan sende ekte push-varsler når appen er helt lukket. Løsningen sjekker og viser varsler når PWA-en åpnes. Kalender-eksport er den mest robuste løsningen uten backend.

For full web-push kan du senere koble til en serverless funksjon, for eksempel Cloudflare Workers, Firebase Cloud Messaging eller en egen VAPID-tjeneste.

## Lokal testing

Service worker krever HTTP/HTTPS:

```bash
python -m http.server 8080
```

Åpne deretter `http://localhost:8080`.

## Lisens

MIT – bruk og tilpass fritt. Kontroller alltid støttefristene hos offisiell kilde.


## Visuelt uttrykk

Forsiden bruker den urbane plakatprofilen med Archivo/Inter, off-white rutenett, lilla, korall, gult og blått. Søknadsassistenten åpnes i en dialog, slik at den opprinnelige forsidelayouten ikke endres. Teksten i plakatgrafikken er «Søk og Skap».

## Rettelse: søknadsassistent

Versjon 6.0.1 retter åpning av søknadsassistenten fra hovedknappen, footeren og detaljvisningen til en støtteordning. Dialoginnholdet vises nå umiddelbart, og valgt støtteordning overføres automatisk til riktig mal.


## Støttebot

Støtteboten er implementert i hovedgrensesnittet. Lokal modus fungerer uten backend. Se `docs/STOTTEBOT.md` for sikker AI- og Gmail-konfigurasjon.
