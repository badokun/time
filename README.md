# Timezone Bridge

A very small mobile-first web app for converting time between two timezones.

## Features

- Pick a source timezone and a target timezone.
- Edit the date and time on either side and instantly see the converted value on the other side.
- Save favorite timezones and reuse them quickly.
- Persist source timezone, target timezone, favorites, active side, and current instant in localStorage.
- Static Vite build that can be deployed directly to Netlify.

## Development

```bash
npm install
npm run dev
```

Open the local URL that Vite prints, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

The production files are written to `dist/`.

## Netlify

Use these settings:

- Build command: `npm run build`
- Publish directory: `dist`

## VS Code

This repo includes a launch configuration for opening the app in Chrome against the local Vite dev server.