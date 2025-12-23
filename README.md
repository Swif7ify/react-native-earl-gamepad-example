# react-native-earl-gamepad-example

Small Expo demo that shows using a controller in React Native via
`react-native-earl-gamepad` (WebView-based bridge). It includes a tiny
collect-the-dot game (Game mode) and a visual controller inspector (Debug
mode).

## Features

-   Renders the WebView-based gamepad bridge and consumes state via
    `useGamepad`.
-   Game mode: move a player with left stick or D-pad, collect orange targets,
    score counter, button-driven effects (rotation, scale, turbo).
-   Debug mode: visual controller state using `GamepadDebug`.
-   Button HUD in-game showing all buttons; pressed ones highlight.
-   Uses `requestAnimationFrame` for the game loop (avoid timer drift).

## Quick start

Prerequisites: Node.js, npm/yarn, and an Expo-capable device or simulator.

Install dependencies:

```bash
npm install
```

Start the Metro dev server:

```bash
npx expo start
# or
npm start
```

Open on your device/emulator and pair a Bluetooth controller (PS4/generic
controllers are known to work). The app reads the first connected controller
(`navigator.getGamepads()[0]`).

## Files of interest

-   `app/_layout.tsx` — root stack with header shown.
-   `app/index.tsx` — main screen: mounts the gamepad bridge, game loop, and
    switches between Game and Debug modes.
-   `components/GameView.tsx` — game UI (player, target, HUD).
-   `components/DebugView.tsx` — wraps `GamepadDebug` for the visual inspector.

## Controller notes & tips

-   Tested controllers: PS4 and generic Bluetooth controllers (standard mapping).
-   Keep the bridge mounted (the app keeps it mounted while swapping modes) so
    you don't lose transient events.
-   Default deadzone is `0.12` in this example; adjust if your sticks are noisy.
-   Use the Debug mode to visually confirm button/axis mappings.

## Performance tips

-   Movement/game loops should use `requestAnimationFrame` (this project does)
    to avoid jitter caused by timer drift.

## Troubleshooting

-   If you see an Invariant Violation about `RNCWebView` being registered twice,
    check for multiple `react-native-webview` installs: `npm ls react-native-webview`.

## License

MIT
