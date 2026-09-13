# Exhibition Kiosk — UI + Performance Patch

This folder is an **overlay patch** for the existing kiosk project. It preserves the current HTML/JS architecture and backend API paths while updating the front-end files that were provided.

## Replace these files

- `index.html`
- `assets/app.css`
- `src/app.js`
- `src/core/api.js`
- `src/core/i18n.js`
- `src/core/state.js`
- `src/core/ui.js`
- `src/features/admin.js`
- `src/features/keyboard.js`
- `src/features/library.js`
- `src/features/player.js`
- `src/features/video-processing.js`

Keep your existing media, server/backend code, logos/favicons, `assets/simple-keyboard.js`, and `assets/simple-keyboard.css`.

## UI changes

- More consistent card radius, spacing, elevation, and focus treatment.
- Video duration badges are now visible when duration is available.
- Player transport is centered and uses clearer glass-style controls.
- Keyboard focus is restored for player buttons instead of being suppressed.
- Admin navigation and settings use clearer visual hierarchy.
- Enabled media cards have a visible selected state.
- Admin layout adapts to tablet/smaller widths instead of relying on a fixed sidebar.
- Touch targets are larger on coarse-pointer/touch devices.
- Toasts and player controls adapt better on narrow displays.
- Reduced-motion preferences are respected.
- Safe-area insets are supported for edge-to-edge displays.

## Performance changes

In addition to the earlier JS optimization pass:

- Metadata/thumbnail work is deduplicated per video.
- Active metadata probes can be cancelled without holding a concurrency slot until timeout.
- Thumbnail generation is now **viewport-aware** using `IntersectionObserver`; items far outside the visible area are deferred until they approach the viewport.
- Main/admin card rendering uses document fragments and faster `Set` membership checks.
- Images use asynchronous decoding/lazy loading hints.
- CSS `content-visibility` is used where supported to avoid painting far-off cards and processing rows.
- Grid keyboard navigation avoids repeated full-list style updates and reduces layout measurement work.
- Video-processing UI avoids unnecessary re-analysis and reduces repeated log/list work.
- The on-screen keyboard scrolls its active input toward the visible area after opening.

## Notes

This patch intentionally does **not** change the backend API contract, media folder structure, settings format, or language data. It should therefore be much lower risk than a framework rewrite.

Because only the front-end files were supplied, this patch is not a standalone application archive: copy it over the corresponding paths in the full project.

## Interaction refinements

- Player rewind / play-pause / forward controls are grouped at the bottom-left again.
- Active admin navigation no longer uses an accent strip/outline on its edge.
- Main-library video cards no longer show keyboard-focus/kfocus styling.
- Coarse-pointer/touch devices suppress card hover effects that can otherwise become sticky after a tap.
