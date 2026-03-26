#  PC Architect

An interactive PC hardware simulator and learning game built with React. Choose a scenario, pick components, check compatibility in real-time, and get AI-powered feedback from **Walter** — your crazy but brilliant PC hardware expert!

##  Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd PC-Architect

# Install dependencies
npm install

# Set up your Gemini API key
cp .env.example .env
# Edit .env and add your Google Gemini API key
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

##  How to Play

1. **Choose a Scenario** — Office (CHF 600), Gaming (CHF 1500), or Workstation (CHF 2500)
2. **Build Your PC** — Select components from 7 categories: CPU, GPU, RAM, Mainboard, PSU, SSD, Cooler
3. **Watch Compatibility** — Real-time checks for socket match, RAM type, and PSU wattage
4. **Ask Walter** — Get AI-powered feedback on your build with a score from A to D

##  Tech Stack

- **React 18** + **Vite**
- **React Router v6** for navigation
- **Context API** for state management
- **Google Gemini API** for AI feedback
- **Plain CSS** with cyberpunk/comic-book design

##  Project Structure

```
src/
├── assets/images/     # Background images and Walter avatars
├── components/        # Reusable UI components
├── pages/             # ScenarioSelect, Configurator, Results
├── context/           # GameContext (global state)
├── data/              # components.json (hardware database)
├── utils/             # Compatibility checker logic
└── App.jsx            # App shell with routing
```

##  Environment Variables

| Variable | Description |
|---|---|
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key |

##  License

MIT
