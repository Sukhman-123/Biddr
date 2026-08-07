# Biddr Mobile

The Expo/React Native client for Biddr. It reuses the existing Express API,
MongoDB data, and Socket.IO auction events while providing native Android and
iOS screens.

## Prerequisites

- Node.js 22.13 or newer (Expo SDK 57 requirement)
- The Biddr API running locally or deployed to a staging environment
- Expo Go or a simulator

## Configure

```bash
cp .env.example .env.local
```

For a physical phone, replace `127.0.0.1` with the Mac's LAN IP address. Both
devices must be on the same network. Production and staging should use HTTPS.
Never add secrets to `EXPO_PUBLIC_` variables because they are bundled into the
app.

## Run

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or press `i` for the iOS simulator and `a` for
the Android emulator.

## Source layout

```text
src/
├── app/          Expo Router screens and layouts
├── config/       Public runtime configuration
├── features/     Feature-owned queries, screens, and components
├── providers/    Application-wide React providers
├── services/     API, authentication storage, and Socket.IO infrastructure
└── theme/        Biddr design tokens
```

The first screen performs a real API health check. Authentication, tournament,
profile, and live-auction screens will be added as feature modules in subsequent
stages.
