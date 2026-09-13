# Exhibition Kiosk — v2.1

Portable Windows exhibition kiosk for multilingual local video playback. The UI runs in Firefox kiosk mode and is served by a loopback-only PowerShell HTTP server.

## Run

Double-click `kiosk.exe` in the repository root. The native launcher starts `bin\launch-kiosk.cmd`, which starts the PowerShell launcher, the local server, and Firefox in kiosk mode.

Fallback: double-click `bin\launch-kiosk.cmd` directly. If startup fails, the window stays open and the server logs are written to:

```text
logs/.kiosk-server.out.log
logs/.kiosk-server.err.log
```

The server listens only on `http://127.0.0.1:8765`.

## Repository layout

```text
kiosk_media/
├─ index.html
├─ kiosk.exe                         # native launcher built from bin/kiosk-launcher.cs
├─ assets/
│  ├─ app.css
│  ├─ favicon.ico
│  ├─ favicon.jpg
│  ├─ logo.png
│  ├─ simple-keyboard.js             # vendor library
│  └─ simple-keyboard.css            # vendor library
├─ bin/
│  ├─ launch-kiosk.cmd               # fallback/native-launcher entry point
│  ├─ launch-kiosk.ps1               # runtime launcher + one-time layout migration
│  ├─ kiosk-launcher.cs              # source for kiosk.exe
│  ├─ build-kiosk-exe.ps1            # builds kiosk.exe
│  ├─ build-kiosk-exe.cmd            # double-click build wrapper
│  └─ create-kiosk-shortcut.ps1      # optional Windows shortcut helper
├─ config/
│  └─ kiosk-config.example.json      # example only; kiosk-config.json is user state
├─ server/
│  ├─ serve-kiosk.ps1                # HTTP server + API/static-file host
│  ├─ media.ps1                      # catalog/ffprobe/remux/transcode helpers
│  └─ media-job.ps1                  # background processing worker
├─ src/
│  ├─ app.js                         # bootstrap only
│  ├─ core/
│  │  ├─ api.js
│  │  ├─ state.js
│  │  ├─ ui.js
│  │  └─ i18n.js
│  └─ features/
│     ├─ library.js
│     ├─ player.js
│     ├─ admin.js
│     ├─ video-processing.js
│     └─ keyboard.js                 # app-side on-screen-keyboard behavior
├─ media/
│  ├─ en/ zh/ pt/ es/ fr/
│  └─ .originals/                    # created when processing replaces media
├─ logs/
├─ tools/
│  └─ ffmpeg/bin/                    # optional bundled ffmpeg.exe + ffprobe.exe
└─ .runtime/                         # generated: Firefox profile, PID files, jobs
```

The Simple Keyboard files in `assets/` are third-party vendor assets. The kiosk-specific keyboard behavior lives in `src/features/keyboard.js`; these are intentionally separate and should not be merged.

`server/media-job.ps1` is also intentionally separate because it is launched as a background process for long-running FFmpeg work.

## v2.1 path cleanup and migration

v2.1 finishes the directory migration started in v2.0:

- favicon references use `assets/favicon.ico` / `assets/favicon.jpg` only;
- the server entry point is `server/serve-kiosk.ps1`;
- persistent settings are stored in `config/kiosk-config.json`;
- Firefox profile, PID files, and video-job state live under `.runtime/`;
- a bundled FFmpeg install belongs under `tools/ffmpeg/bin/`;
- the old `media/manifest.js` architecture is removed;
- the old `bin/generate-media-manifest.ps1` and `bin/ffmpeg-wrapper.ps1` are removed.

On first launch after upgrading, `bin/launch-kiosk.ps1` automatically migrates an existing:

```text
bin/kiosk-config.json          -> config/kiosk-config.json
bin/.firefox-kiosk-profile/   -> .runtime/firefox-profile/
bin/ffmpeg/ or ffmpeg/        -> tools/ffmpeg/
```

It also removes known obsolete v1/v2 compatibility files and generated manifest/report files. It never removes the language media folders or normal video files.

## Building `kiosk.exe`

Close the kiosk first, then double-click:

```text
bin/build-kiosk-exe.cmd
```

or run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bin\build-kiosk-exe.ps1
```

The build script looks for the .NET Framework C# compiler (`csc.exe`) included on most Windows 10/11 installations. If `csc.exe` is not directly available, Windows PowerShell 5.1's `Add-Type` compiler is used as a fallback.

The build is transactional: it creates `kiosk.new.exe` first and replaces `kiosk.exe` only after compilation succeeds. If the custom icon causes compilation to fail, it retries once without the icon and reports the compiler output if the build still fails.

If neither compiler is available, enable/install .NET Framework 4.x or Visual Studio Build Tools and run the build again.

To recreate the optional shortcut after building:

```powershell
.\bin\create-kiosk-shortcut.ps1
```

## Media

Place videos in one of:

```text
media/en/
media/zh/
media/pt/
media/es/
media/fr/
```

The browser reads the catalog directly from `GET /api/catalog`. No generated JavaScript manifest is used.

## Video Processing

The admin **Video Processing** page analyses videos using `ffprobe` and classifies them as:

- **Ready** — compatible H.264/AAC MP4 with fast-start.
- **Optimize** — compatible streams that can be remuxed with `-c copy`; no quality loss.
- **Transcode** — incompatible codec/pixel format/audio that must be converted to H.264/AAC/yuv420p.
- **Error** — the file could not be inspected.

Processing runs in `server/media-job.ps1`. Output is written to a temporary MP4, verified, and only then installed. The original is moved under `media/.originals/` before replacement.

Profiles:

- **Recommended:** H.264 CRF 20 / AAC 192 kbps
- **High quality:** H.264 CRF 17 / AAC 256 kbps
- **Smaller files:** H.264 CRF 24 / AAC 128 kbps

Profiles affect transcoding only. Remux/optimize operations use stream copy.

## FFmpeg discovery

The kiosk looks for `ffmpeg` and `ffprobe` in this order:

1. system `PATH`
2. `tools/ffmpeg/bin/`
3. WinGet Gyan.FFmpeg package directories

## Configuration

Admin settings are transactional: controls edit a draft, **Save & Return** persists it, and **Return** discards it. The UI reports success only after the server confirms the save.

The live settings file is `config/kiosk-config.json` and is intentionally ignored by Git. `config/kiosk-config.example.json` documents the schema.

Media-specific settings use the complete relative media path, such as `media/pt/intro.mp4`, as the stable ID.

## Requirements

- Windows 10 or Windows 11
- Mozilla Firefox
- Windows PowerShell 5.1 or newer
- FFmpeg/ffprobe only for Video Processing

## License

MIT
