# Chicken Crash Game (Prototype)

This repo contains a prototype of the Chicken Crash game built with React + TypeScript (Vite) and a simple Node.js backend.

Quick start

1. Install dependencies:

```bash
cd "D:/my source/casino_game_group/chicken_group"
npm install
```

2. Start frontend and backend in parallel (requires `concurrently` and `nodemon`):

```bash
npm run dev:all
```

- Frontend will run on `http://localhost:5173`
- Backend server will run on `http://localhost:4000`

Notes

- The frontend `src/GameCanvas.tsx` contains a canvas-based prototype: lanes, cars, coins, and a clickable coin mechanic.
- The backend is a simple Express server in `server/index.js` with `/api/start-bet` and `/api/settle-bet` endpoints for prototyping.

Next steps

- Implement proper bet lifecycle, persist bets, and add fairness (HMAC/verifiable randomness) on the backend.
- Improve art assets, sound, and animations.
- Add unit tests for game logic and backend endpoints.

"# Chicken" 
