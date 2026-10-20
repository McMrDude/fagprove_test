# Kursbedriften AS – Kurshåndteringsside

## 1. Beskrivelse

Dette nettstedet er laget for å gjøre det enklere for Kursbedriften AS å planlegge kurs og holde oversikt over deltakere. Kontorarbeidere kan registrere deltakere, melde dem på kurs og se rapporter. Lærere kan planlegge kurs, føre oppmøte og registrere om deltakerne har bestått.

## 2. Egenskaper

### Kontorarbeider

- Registrere nye deltakere og melde dem på kurs.
- Redigere og slette deltakere.
- Dele ut fag til lærere.
- Opprette og holde oversikt over planlagte kurs.
- Se rapporter over kurs, deltakere og gjennomførte kurs.

### Lærere

- Planlegge kurs i faget de har fått tildelt.
- Bestemme datoene for de fem kursøktene.
- Registrere oppmøte for hver kursøkt.
- Registrere om deltakerne har bestått når kurset er ferdig.
- Se oppmøte og informasjon om deltakerne på kursene sine.

## 3. Verktøy og teknologier

- **Node.js** – Kjører JavaScript-verktøyene som brukes i prosjektet.
- **Next.js** – Brukes til å bygge nettsiden og API-rutene.
- **React** – Brukes til å lage brukergrensesnittet.
- **TypeScript** – Brukes til å skrive JavaScript med typer.
- **Tailwind CSS** – Brukes til å style nettsiden.
- **Supabase** – Brukes som database.
- **bcryptjs** – Brukes til å hashe passord.
- **jose** – Brukes til å opprette og kontrollere JWT-tokens for innlogging.

## 4. Database

Supabase brukes til å lagre informasjon om brukere, deltakere og kurs.

Databasen inneholder disse tabellene:

- `users` – Lagrer brukere, innloggingsinformasjon og roller.
- `participants` – Lagrer informasjon om deltakerne.
- `courses` – Lagrer fagene som tilbys.
- `course_offerings` – Lagrer planlagte gjennomføringer av fag.
- `course_sessions` – Lagrer datoene for de enkelte kursøktene.
- `course_participants` – Kobler deltakere til kursgjennomføringer.
- `attendance` – Lagrer om deltakerne var til stede på kursøktene.

## 5. Installasjon og oppsett

### Forutsetninger

- Node.js versjon `v24.11.0`.
- npm, som følger med Node.js.
- Tilgang til et Supabase-prosjekt med databasen satt opp.

### Installer prosjektet

1. Last ned eller klon prosjektfilene.
2. Åpne prosjektmappen i en terminal.
3. Installer avhengighetene:

   ```bash
   npm install
   ```

4. Opprett en `.env.local`-fil i prosjektets hovedmappe.
5. Legg inn miljøvariablene som prosjektet trenger, med verdiene fra ditt eget Supabase-prosjekt og en sikker autentiseringshemmelighet. Bruk de nøyaktige variabelnavnene som koden forventer.
6. Sørg for at databasetabellene er opprettet i Supabase. Bruk SQL-oppsettet funnet i filen schema.sql i supabase sin SQL editor for å kjapt sette opp databasen

### Start nettsiden

Kjør følgende kommando i terminalen:

```bash
npm run dev
```

Åpne deretter [http://localhost:3000](http://localhost:3000) i nettleseren.

### Viktig

Ikke del `.env.local` eller legg inn passord, autentiseringshemmeligheter eller private Supabase-nøkler i GitHub. Disse opplysningene skal holdes hemmelige.