# Exhibition Kiosk — v2

Portable Windows exhibition kiosk for multilingual local video playback. The application runs in Firefox kiosk mode and is served by a loopback-only PowerShell HTTP server.

## Upgrade / drop-in installation

This package is designed to be extracted **over the existing repository**. Do not delete the existing repo first. The existing `kiosk.exe`, `assets/logo.png`, `assets/simple-keyboard.js`, `assets/simple-keyboard.css`, `bin/favicon.ico`, `bin/favicon.jpg`, your `media/` folders, `bin/kiosk-config.json`, and `bin/.firefox-kiosk-profile/` are intentionally preserved.

The v2 launcher continues to use the original Firefox profile path (`bin/.firefox-kiosk-profile`) and the original PID/config locations, so an existing kiosk installation keeps its browser state and settings. The legacy `generate-media-manifest.ps1` and `ffmpeg-wrapper.ps1` are retained for manual/backward-compatible tooling, but the v2 UI no longer depends on the generated manifest.

If startup fails, `bin/launch-kiosk.cmd` now keeps the console open and points to `logs/.kiosk-server.err.log` and `logs/.kiosk-server.out.log`.

## v2 architecture

```text
kiosk_media/
├─ index.html
├─ kiosk.exe                       # existing launcher; unchanged
├─ assets/
│  ├─ app.css                      # new application styles
│  ├─ simple-keyboard.js           # existing vendor asset, preserved
│  ├─ simple-keyboard.css          # existing vendor asset, preserved
│  └─ logo.*                       # existing branding, preserved
├─ src/
│  ├─ app.js                       # bootstrap only
│  ├─ core/
│  │  ├─ api.js                    # localhost API + session token
│  │  ├─ state.js                  # state + persistence + migration
│  │  ├─ ui.js                     # common UI/theme/screen helpers
│  │  └─ i18n.js                   # translations
│  └─ features/
│     ├─ library.js                # catalog/language/thumbnails
│     ├─ player.js                 # playback/HUD/volume
│     ├─ admin.js                  # settings/auth/navigation
│     ├─ video-processing.js       # media health + job client
│     └─ keyboard.js               # on-screen keyboard logic
├─ server/
│  ├─ media.ps1                    # catalog/ffprobe/remux/transcode
│  └─ media-job.ps1                # background processing worker
├─ bin/
│  ├─ launch-kiosk.cmd
│  ├─ launch-kiosk.ps1             # keeps the original Firefox-profile/PID paths
│  ├─ serve-kiosk.ps1              # HTTP server + API/static files
│  ├─ generate-media-manifest.ps1  # retained legacy/manual helper
│  ├─ ffmpeg-wrapper.ps1           # retained legacy/manual helper
│  ├─ create-kiosk-shortcut.ps1
│  ├─ kiosk-launcher.cs
│  ├─ kiosk-config.json            # existing user settings; not overwritten
│  └─ .firefox-kiosk-profile/      # existing Firefox profile; preserved
├─ media/
│  ├─ en/ zh/ pt/ es/ fr/
│  └─ .originals/                  # backups created by video processing
└─ logs/
```

No v2 startup step deletes the old assets, profile, configuration, or helper scripts. The new UI simply stops depending on `media/manifest.js`.

## Run

Double-click `kiosk.exe` as before. The existing executable still calls `bin\launch-kiosk.cmd`, so it does not need to be rebuilt for this refactor.

The local server listens only on `http://127.0.0.1:8765`.

## Media

Place videos in one of:

```text
media/en/
media/zh/
media/pt/
media/es/
media/fr/
```

The browser now reads the catalog directly from `GET /api/catalog`; `media/manifest.js` is no longer generated or used.

## Video Processing

The admin **Video Processing** page analyses every video once with `ffprobe` and classifies it as:

- **Ready** — already compatible H.264/AAC MP4 with fast-start.
- **Optimize** — compatible streams that can be remuxed to MP4 with `-c copy`; no quality loss.
- **Transcode** — incompatible codec/pixel-format/audio that must be converted to H.264/AAC/yuv420p.
- **Error** — file could not be inspected.

Processing runs in a background PowerShell worker. The UI polls job state, shows per-file/overall progress, keeps a technical log, and can request cancellation.

Before a processed output replaces an active file, the output is probed and verified. The original is then moved under `media/.originals/...` so it can be restored if necessary.

### Profiles

- **Recommended:** H.264 CRF 20 / AAC 192 kbps
- **High quality:** H.264 CRF 17 / AAC 256 kbps
- **Smaller files:** H.264 CRF 24 / AAC 128 kbps

Profiles only affect transcoding. Optimize/remux operations always use stream copy.

## FFmpeg discovery

v2 looks for `ffmpeg` and `ffprobe` in this order:

1. system `PATH`
2. `tools/ffmpeg/bin/`
3. `ffmpeg/bin/`
4. `bin/ffmpeg/bin/`
5. WinGet Gyan.FFmpeg package directories

## Configuration behavior

Admin changes are now transactional: controls edit a draft, **Save & Return** persists it, and **Return** discards it. Server persistence must succeed before the UI reports settings as saved.

Media settings now use the complete relative source path (for example `media/pt/intro.mp4`) as the stable ID. v2 migrates matching legacy filename-based selections, volumes and titles when the catalog first loads.

## Logs and troubleshooting

Server output:

```text
logs/.kiosk-server.out.log
logs/.kiosk-server.err.log
```

If Video Processing says FFmpeg is missing, install FFmpeg or place a build under `tools/ffmpeg/bin/` containing both `ffmpeg.exe` and `ffprobe.exe`.

## License

MIT
