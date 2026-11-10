# MyWorkout

Webapp per iPhone (PWA) per pianificare e tracciare i workout con corpo libero, sbarra per
trazioni, manubri, EZ bar, pulley e panca piana/inclinata. Nessun server e nessun account: i
dati restano sul telefono (localStorage), con backup esportabile in JSON.

## Cosa fa

- **Schede**: esercizi con serie, ripetizioni, recupero e note, assegnati ai giorni della settimana.
- **Workout**: timer della sessione (anche in pausa e con l'app chiusa), spunta di ogni serie,
  timer di recupero con suono, nota per esercizio (es. il peso) e promemoria dell'ultima volta.
- **Riepilogo**: durata, serie fatte, esercizi saltati, zone previste ma non allenate, mappa dei
  muscoli della sessione e zone ancora da allenare negli ultimi 7 giorni.
- **Storico**: ore per settimana, mese e totale, e muscoli allenati negli ultimi 30 giorni.
- **Esercizi**: 347 esercizi con immagini animate, istruzioni, link a YouTube e il tuo video
  di riferimento (link YouTube incorporato).

## Provarla sul Mac

```bash
cd ~/Desktop/Apps/MyWorkout && python3 -m http.server 8765
```

Poi apri http://localhost:8765.

## Installarla sull'iPhone

Serve un indirizzo HTTPS (per funzionare offline e tenere i dati sempre allo stesso indirizzo).
Il modo più semplice è un hosting statico gratuito (Netlify Drop, GitHub Pages, Cloudflare Pages):
carica il contenuto di questa cartella, apri l'indirizzo in **Safari** sull'iPhone, tocca
**Condividi → Aggiungi alla schermata Home**.

Dopo un aggiornamento dei file basta riaprire l'app con la connessione attiva.

## Rigenerare il catalogo

`data.js` e `img/` sono generati da free-exercise-db con `tools/build_catalog.py` (icone: `tools/make_icons.py`)
(vedi `LICENSES.md` per le licenze).
