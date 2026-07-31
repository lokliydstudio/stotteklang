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
