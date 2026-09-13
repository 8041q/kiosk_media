# Exhibition Kiosk — v2.2

Portable Windows exhibition kiosk for multilingual local video playback. The UI runs in Firefox kiosk mode and is served by a loopback-only PowerShell HTTP server.

## Run

Double-click `kiosk.exe` in the repository root.

`kiosk.exe` starts `bin\launch-kiosk.cmd`, which starts the PowerShell launcher, the local server, and Firefox in kiosk mode.

`bin\launch-kiosk.cmd` is also the recovery entry point. If `kiosk.exe` has been deleted, running `launch-kiosk.cmd` rebuilds it from `bin\kiosk-launcher.cs` through `bin\build-kiosk-exe.ps1`, then starts the kiosk normally.

If startup fails, the CMD window stays open and the server logs are written to:

```text
logs/.kiosk-server.out.log
logs/.kiosk-server.err.log
```

The server listens only on `http://127.0.0.1:8765`.

## Repository layout

```text
kiosk_media/
├─ index.html
├─ kiosk.exe                         # normal user entry point
├─ assets/
│  ├─ app.css
│  ├─ favicon.ico
│  ├─ favicon.jpg
│  ├─ logo.png
│  ├─ simple-keyboard.js             # vendor library
│  └─ simple-keyboard.css            # vendor library
├─ bin/
│  ├─ launch-kiosk.cmd               # native-launcher target + EXE recovery entry point
│  ├─ launch-kiosk.ps1               # runtime launcher
│  ├─ kiosk-launcher.cs              # source for kiosk.exe
│  ├─ build-kiosk-exe.ps1            # EXE build implementation
│  └─ create-kiosk-shortcut.cmd      # creates a Desktop shortcut
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
│  ├─ en/ zh/ pt/ es/ fr/           # local installation media; intentionally not committed
│  └─ .originals/                    # created when processing replaces media
├─ logs/
└─ .runtime/                         # generated: Firefox profile, PID files, jobs
```

The Simple Keyboard files in `assets/` are third-party vendor assets. The kiosk-specific keyboard behavior lives in `src/features/keyboard.js`; these are intentionally separate.

`server/media-job.ps1` is intentionally separate because it is launched as a background process for long-running FFmpeg work.

## Building `kiosk.exe`

Normally you do not need to build the EXE manually. If `kiosk.exe` is missing, run:

```text
bin\launch-kiosk.cmd
```

It rebuilds the EXE automatically before launching the kiosk.

For a manual rebuild from PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\bin\build-kiosk-exe.ps1
```

The build script looks for the .NET Framework C# compiler (`csc.exe`) included on most Windows 10/11 installations. If `csc.exe` is unavailable, Windows PowerShell 5.1's `Add-Type` compiler is used as a fallback.

The build is transactional: it creates `kiosk.new.exe` first and replaces `kiosk.exe` only after compilation succeeds. If the custom icon causes compilation to fail, it retries once without the icon and reports the compiler output if the build still fails.

To create or refresh the Desktop shortcut, run:

```text
bin\create-kiosk-shortcut.cmd
```

The shortcut points to the root `kiosk.exe` and uses `assets\favicon.ico` as its icon.

## Media

Place videos in one of:

```text
media/en/
media/zh/
media/pt/
media/es/
media/fr/
```

These installation-specific media files are intentionally ignored by Git because they can be very large.

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

Video Processing uses the FFmpeg installation already present on the Windows machine.

The kiosk looks for `ffmpeg` and `ffprobe` in this order:

1. system `PATH`
2. WinGet `Gyan.FFmpeg` package directories under `%LOCALAPPDATA%\Microsoft\WinGet\Packages`

FFmpeg is required only for the Video Processing feature; normal video playback does not depend on it.

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
