# NIGHT CITY GPS — Navigation Prototype (v1.0.0)

**Own project, no map subscription required.** Real-world maps inspired by Cyberpunk 2077's Night City HUD. Not affiliated with CD Projekt RED. It is a **functional installable web app** and an **iOS shell project**; it is **NOT yet a CarPlay app** or certified vehicle-navigation product.

## What works in the web app

- Night City-like visual treatment: electric cyan streets, deep blue ground, dark burgundy 3D building layer when vector tile heights are available, gold route.
- GPS tracking (when permission granted), vehicle marker, heading following, drive-mode camera and speed readout.
- Address/POI searches via Photon **only when Search is pressed**, with nearby ranking and a map-tap destination option.
- Driving-route calculation via OSRM, alternatives if offered by OSRM, shared destination URLs.
- Next turn / upcoming-road guidance, distance, estimated time and ETA; progression along route; approximate route completion.
- Conservative automatic rerouting after repeated good GPS fixes outside the route; 30-second cooldown, and no repeated request flood.
- Optional browser text-to-speech guidance (German or English), favorites and recent destinations stored locally, km/mi, adjustable camera pitch.
- iPhone Home Screen install (PWA), versioned app-shell caching and network-first refresh. **Internet needed for maps/search/routes.**
- Native SwiftUI/WKWebView iOS *shell* source and a GitHub Actions macOS **simulator** build workflow.

## What is NOT done / critical limitations

- **No Apple CarPlay integration:** requires approved Apple navigation entitlement, native CarPlay scene and a native CarPlay-appropriate navigation renderer. See `ios/README.md`.
- **Not offline navigation:** app shell can be cached; tile downloads, new routes and place search require internet. Do not use offline while driving.
- No real-time traffic, closures, speed-limit warnings, lane-level navigation, speed-camera data, or guaranteed accessible streets. OSRM is based on OSM and can return imperfect routing.
- Speech playback and GPS may pause in the background on iOS. Speech output can be restricted by the browser and muted sound settings.
- The public **Photon** and **OSRM** endpoints are demos, limited and unavailable without notice. Not for production/public high traffic. They process submitted destinations and routing coordinates.
- Calculated ETA assumes static routing time, not live congestion. Rerouting and maneuvers are prototypes, not road-tested/safety-certified.
- iOS native web shell loads the public GitHub Pages URL. WKWebView location permissions can behave differently from Safari and must be tested on an actual device. No signed device install/IPA is supplied.
- This is not an authorized Cyberpunk 2077 game asset reproduction; no CDPR graphics/assets included.

## Windows: run locally

1. Extract the entire folder `NightCityGPS` (keep `index.html`, `app.mjs`, `styles.css`, other files together).
2. Open this folder in Visual Studio Code.
3. In VS Code Terminal (in this folder) run `py -m http.server 8000`.
4. Open http://localhost:8000/ . Avoid double-clicking `index.html`: it expects a local web server.
5. Allow location permissions when prompted; on a desktop PC, GPS may be approximate or absent. Route preview uses the current map center until live GPS is obtained.
6. You can click **SELECT ON MAP** to plan without geocoding; click **START** only once GPS is active.

## ONE GitHub update (recommended: GitHub Desktop on Windows)

Your repository is `https://github.com/MINQ236/night-city-gps` and live URL is `https://minq236.github.io/night-city-gps/`.

1. Install GitHub Desktop (https://desktop.github.com/) and sign in.
2. **File → Clone repository**, select `MINQ236/night-city-gps`, clone it on your PC.
3. Extract this ZIP. **Copy ALL CONTENTS INSIDE `NightCityGPS/`**, including `index.html`, `.github`, `assets`, `ios`, `tests` and `.mjs` files **into the cloned repository's root folder**. It is okay to overwrite the old `index.html`. Avoid creating a nested `NightCityGPS/NightCityGPS` folder. On Windows, hidden `.github` folder is normally visible in Explorer (it starts with a dot, not a Windows hidden attribute).
4. Return to GitHub Desktop. It should display modified/new files. Enter commit message: `Night City GPS full navigation prototype` → click **Commit to main** → **Push origin**.
5. Your existing GitHub Pages setting (`main` branch, `/ (root)`) stays unchanged. Check **Actions → pages build and deployment** until it succeeds.
6. Open `https://minq236.github.io/night-city-gps/?v=full1` in iPhone Safari to force a fresh initial URL. If an old Home Screen button still shows the prior version, remove the shortcut and use Safari → Share → Add to Home Screen again. Because the new service worker uses network-first caching, subsequent online code updates should be easier.

**Alternative via Git command line** (if you already have Git installed):

```powershell
git clone https://github.com/MINQ236/night-city-gps.git
# Copy every file and directory from extracted NightCityGPS into the cloned night-city-gps folder.
cd night-city-gps
git add -A
git commit -m "Full Night City GPS navigation prototype"
git push origin main
```

GitHub Pages publishes the web app. **It does not publish a native iOS app.**

## iPhone setup / safe testing

1. Open the published HTTPS address in Safari. Add it to the Home Screen and choose Open as Web App if offered.
2. Open the app while **stationary**, grant location access and wait until the top-right signal says `GPS // LIVE`.
3. Search for an address, select it, check the yellow route and start only after GPS is active.
4. **DRIVE** follows vehicle position; dragging the map disables following until re-enabled. **VOICE** toggles browser text-to-speech; first play must be initiated by a tap.
5. Turn instructions are approximate, based on OSRM maneuvers. Never handle the screen while driving. For actual journeys use an established navigation application as the primary guidance until thoroughly tested.

## Technical layout

| File/folder | Purpose |
|---|---|
| `index.html` | Accessible interactive UI, app manifest and resource links |
| `styles.css` | Cyberpunk-inspired responsive iPhone design |
| `app.mjs` | MapLibre styling, GPS, search, route & navigation UI |
| `nav-core.mjs` | Pure routing geometry, progress, maneuvers, formats |
| `providers.mjs` | Search/routing demo API requests; replaceable later |
| `service-worker.js` | Versioned app shell update / limited offline shell |
| `manifest.webmanifest`, `assets/` | Home Screen icon, PWA metadata |
| `tests/` | Automated JavaScript geometry/unit tests |
| `.github/workflows/` | Test workflow and cloud Mac iOS simulator compilation |
| `ios/` | Native app shell and future CarPlay integration references |

## Test from Windows

Install Node.js 22+ if you want to run automated tests:

```powershell
node --check app.mjs
node --test tests/*.test.mjs
```

The cloud checks run automatically on pushes through GitHub Actions.

## Change providers later

- Base map: `https://tiles.openfreemap.org/styles/dark` in `app.mjs`; restyling in `recolorMap()`.
- Search: Photon `https://photon.komoot.io/api/` in `providers.mjs`.
- Routes: public OSRM `https://router.project-osrm.org/route/v1/driving/` in `providers.mjs`.

You must respect the providers' current terms, fair-use requirements and data attribution. Public demo APIs are not a sustainable navigation backend. For a real CarPlay-ready app, replace these with appropriately hosted/reliable providers and implement native map navigation and GPS management.

## Licensing notes

This project code may be modified for your personal project. OpenStreetMap map data is subject to ODbL and attribution requirements; third-party JS library and external provider terms apply. No original Cyberpunk art, music, UI assets or trademarks are distributed beyond descriptive references.
