# Implementert støttebot

## Endringer i hovedappen

- Søknadsassistenten er erstattet med en samlet støttebot for Loki Lydstudio AS.
- Studioprofil og prosjektopplysninger lagres lokalt i nettleseren.
- Aktive støtteordninger rangeres mot søkergruppene `Lydstudio` og `Selskap`, prosjektkategori, nøkkelord, region, frist og kildeferskhet.
- Valgt ordning kan fortsatt hentes direkte fra detaljvisningen i Støtteklang.
- Lokalt søknadsutkast inneholder kvalifikasjonsvurdering, prosjekttekst, budsjetttekst, mangelliste og kontrollpunkter.
- Utkastet kan redigeres, kopieres, lastes ned som tekst eller eksporteres som en komplett JSON-søknadspakke.
- Endring av prosjektopplysninger etter generering ugyldiggjør godkjenningen og krever nytt utkast.
- Innsending krever eksplisitt avkrysning. Portalordninger kopierer teksten og åpner offisiell `applyUrl`.

## Backend

- `worker/` inneholder en valgfri Cloudflare Worker.
- `/api/draft` lager strukturert AI-utkast med OpenAI Responses API.
- `/api/submit/email` oppretter Gmail-utkast som standard.
- Direkte e-postsending krever serverinnstillingen `SUBMISSION_MODE = "send"` og eksakt godkjenningsfrase.
- Mottakeren må være bekreftet og lagret i ordningens valgfrie `submission`-felt.

## PWA

- `bot-config.js` er lagt til i offline-cachen.
- Service worker-cache er økt til versjon 11 for å sikre at den nye appkoden lastes.
