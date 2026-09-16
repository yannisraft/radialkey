# RadialKey

<p align="center">
  <img src="public/icons/radial-key-logo.png" alt="RadialKey logo" width="180" />
</p>

A Chrome extension that adds a game-style **radial writing / reaction wheel** to [x.com](https://x.com). Hold your trigger (default **Ctrl + Right Click**) while writing in a composer, aim with the mouse, and release to insert an emoji, reaction, or snippet at the caret.

This is not a conventional emoji picker. The product is the radial interaction itself. Items are generic actions (`insert-text` today) so more action types can be added later.

## Features

- Opens only inside genuine X writing surfaces (post, reply, quote, DM, and similar composers)
- Does not hijack ordinary right-click
- Angular primary categories + distance-based secondary items
- Caret-aware insertion that fires input events X can see
- Isolated Shadow DOM UI so X styles cannot leak in or out
- Settings page with layout, content editor, appearance, and a live preview that uses the **same** wheel engine
- **Ctrl+Shift+G** pins the wheel on screen for inspection (press again to hide). Mouse trigger and release-to-insert are unchanged.

## Development

```bash
npm install
npm run dev
```

`npm run dev` rebuilds `dist/` on file changes. In Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder
5. After each rebuild, click **Reload** on the RadialKey card

The content script is a single `content.js` file (no dynamic import). That is required for Chrome to inject it on x.com.

Useful commands:

```bash
npm run build
npm run lint
```

`npm run build` type-checks and writes a production bundle to `dist/`. Load that folder as an unpacked extension.

## Usage

1. Open x.com and click into a composer.
2. Press **Ctrl + Right Click** (or the trigger you chose in settings).
3. Move around the center to highlight a category; move farther out to reveal children.
4. Release the right mouse button to insert. **Esc**, the close control, or releasing on nothing cancels.

Open settings from the extension icon, or via **Details → Extension options**.

## Architecture

- `src/wheel/` — reusable radial engine (geometry, store, React UI, Shadow host)
- `src/content/` — X adapter, composer detection, caret insertion, gesture controller
- `src/storage/` — versioned settings, `chrome.storage.sync` for prefs, `chrome.storage.local` for profiles
- `src/options/` — settings UI and preview playground

X-specific selectors live only in `src/content/x-adapter.ts` and `src/content/composer-detector.ts`.
