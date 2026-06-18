# Biddr

Real-time cricket auction platform for digital IPL-style auctions. An auctioneer runs the room, team owners bid live, and every bid moves instantly across connected clients.

## Stack

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO for live bidding

## Current Features

- Login / registration auth UI
- Role selection for Auctioneer, Team Owner, and Spectator
- Password visibility toggle and strength indicator
- Real-time Socket.IO server foundation
- MongoDB connection and API health check

## Project Structure

```text
biddr/
  client/                 React frontend
    src/
      features/auth/      Auth page, forms, components, constants
  server/                 Express + Socket.IO backend
    src/
      config/             Database connection
      socket/             Real-time event handlers
```

## Setup

Install dependencies from the root, client, and server folders if they are not already installed:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

Create `server/config.env`:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/biddr
CLIENT_URL=http://127.0.0.1:5173
JWT_SECRET=change_this_later
```

Make sure MongoDB is running locally, then start the app:

```bash
npm start
```

Open:

```text
http://127.0.0.1:5173
```

API health check:

```text
http://127.0.0.1:5001/api/health
```

## Scripts

```bash
npm start      # run frontend and backend together
npm run build  # build frontend
npm run lint   # lint frontend
```

## Status

Biddr is in early development. The auth UI, MERN foundation, MongoDB connection, and live socket base are ready for the next step: real authentication APIs and protected dashboards.
