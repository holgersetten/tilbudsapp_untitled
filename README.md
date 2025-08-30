# Middagstilbud-App

En norsk web-applikasjon som hjelper deg å finne de beste tilbudene på ingredienser fra forskjellige butikkkjeder.

## 🚀 Funksjoner

- **Ingrediens-søk**: Søk etter tilbud basert på ingredienser du trenger
- **Butikkfilter**: Filtrer tilbud etter spesifikke butikkkjeder
- **Lokal logo-system**: Rask lasting av butikklogoer
- **Responsiv design**: Fungerer på desktop og mobil
- **NLP-server**: Intelligent matching av produkter

## 🏪 Støttede butikker

### Butikker
- Rema 1000
- Kiwi
- Meny
- Coop Extra
- Bunnpris
- Coop Mega
- Coop Marked
- Coop Prix
- Coop Obs
- Spar

## 🛠 Teknisk stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Node.js + Express
- **NLP**: Python med lokale AI-modeller
- **Data**: JSON-basert tilbudsdata

## 📦 Installasjon

### Backend
```bash
cd backend
npm install
node server.js
```

### Frontend
Serves automatisk fra backend på http://localhost:5000

## 📁 Prosjektstruktur

```
project/
├── frontend/           # Web-applikasjon
│   ├── index.html     # Hovedside
│   └── script.js      # (hvis separert ut)
├── backend/           # Server og API
│   ├── server.js      # Express server
│   ├── src/           # Server kildekode
│   │   └── img/       # Butikklogoer
│   ├── offers/        # Tilbudsdata (JSON)
│   ├── models/        # AI-modeller
│   └── package.json   # Dependencies
└── README.md          # Denne filen
```

## 🎯 Bruk

1. Åpne http://localhost:5000
2. Skriv inn ingredienser (f.eks. "kjøttdeig", "ost")
3. Klikk "Søk"
4. Filtrer etter butikk med logoknappene
5. Se de beste tilbudene!

## 🔧 Utvikling

Prosjektet bruker:
- Moderne CSS med CSS Grid og Flexbox
- Vanilla JavaScript (ingen framework-avhengigheter)
- RESTful API design
- Lokale ressurser for rask lasting

## 📝 Notater

- Tilbudsdata oppdateres manuelt via Python-skript
- NLP-server kjører lokalt for personvernhensyn
