<p align="center">
  <img src=".\bin\favicon.jpg" alt="Kiosk logo" width="220" />
</p>

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/8041q/kiosk_media?style=flat)](https://github.com/8041q/kiosk_media/stargazers)
[![Issues](https://img.shields.io/github/issues/8041q/kiosk_media)](https://github.com/8041q/kiosk_media/issues)

</div>

### Exhibition Kiosk — Portable
<p align="center"><em>Fullscreen media kiosk for exhibitions, with multilingual playback, admin controls, and portable local hosting.</em></p>

---

# Exhibition Kiosk

A fullscreen kiosk application for displaying media content in exhibitions. Built with HTML5, CSS3, and JavaScript, running on Firefox in kiosk mode with multilingual support.

Currently only works on Windows. Linux compatibility will be the next implementation.

## Features

- **Fullscreen Kiosk Mode**: Runs as a dedicated exhibition display
- **Multilingual Support**: Content organized by language (English, French, Portuguese, Spanish, Chinese)
- **Media Management**: Add, remove, and scan for media without restarting
- **Local Server**: Runs on a local HTTP server for secure file handling and thumbnail generation
- **Windows Shortcuts**: Easy desktop integration with auto-generated shortcuts

## How to Run

### Quick Start

Double-click one of these to launch the kiosk:

1. **`kiosk.exe`** (recommended) - Root launcher with app icon
2. **`kiosk.exe.lnk`** - Shortcut (can be recreated via PowerShell)
3. **`bin\\launch-kiosk.cmd`** - Script fallback launcher

### What Happens

- A local web server starts on `http://127.0.0.1:8765`
- Firefox opens in fullscreen kiosk mode
- Media manifest is generated and loaded from the `media/` folder

### Manual Setup (Windows PowerShell)

If shortcuts need to be recreated after moving the folder:

```powershell
.\bin\create-kiosk-shortcut.ps1
```

## Media Folder Structure

The `media/` folder contains videos organized by language:

```
media/
  ├── en/          # English videos
  ├── fr/          # French videos
  ├── pt-pt/       # Portuguese videos
  ├── sp/          # Spanish videos
  ├── zh/          # Chinese videos
  └── manifest.js  # Auto-generated list of media files
```

### Adding Videos

1. **Place video files** in the appropriate language folder (e.g., `media/en/`)
   - Supported formats: MP4, WebM, OGG, etc.
   - Example: `media/en/my-video.mp4`

2. **Scan for new media** using the app interface
   - Press the scan button in the app to refresh the media list
   - OR restart the kiosk to auto-scan

3. **App displays the videos** in the content grid

### Removing Videos

1. **Delete video files** from the media folder
2. **Scan again** in the app to update the list
3. Videos are removed from the display

### Manifest File

The `media/manifest.js` file is **auto-generated** each time the app starts or a scan is made. It contains:

- List of all available videos by language
- File paths and metadata
- Used by the app to populate the display grid

Do NOT edit `manifest.js` manually—it's regenerated on every startup.

## Project Structure

```
kiosk_media/
  ├── index.html                    # Main application UI
  ├── kiosk.exe                     # Portable launcher executable
  ├── README.md                     # This file
  │
  ├── bin/
  │   ├── launch-kiosk.cmd          # Script wrapper used by kiosk.exe
  │   ├── launch-kiosk.ps1          # Main launcher (starts server + Firefox)
  │   ├── serve-kiosk.ps1           # Local HTTP server
  │   ├── generate-media-manifest.ps1 # Creates manifest.js from media files
  │   ├── kiosk-launcher.cs         # Source for root kiosk.exe launcher
  │   └── create-kiosk-shortcut.ps1 # Creates desktop shortcut
  │
  ├── media/
  │   ├── en/, fr/, pt-pt/, sp/, zh/  # Language-specific media folders
  │   └── manifest.js                 # Auto-generated media list
  │
  ├── assets/                        # Images, styles, and static files
  ├── logs/                          # Application logs
  └── .git/                          # Version control
```

## System Requirements

- **Windows 7 or later**
- **Firefox**
- **PowerShell**

## Troubleshooting

### Admin mode/Settings
- Password: 1234

### Firefox won't start
- Ensure Firefox is installed in a standard location (Program Files, AppData, etc.)
- Check that no other kiosk instance is running on port 8765

### Videos not appearing
- Verify video files are in the correct `media/[language]/` folder
- Run the app's media scan (or restart the app)
- Check `logs/.kiosk-server.log` for errors

### Port 8765 already in use
- Another application or previous session is using this port
- Close any running kiosk or Powershell instances
- Restart the application

## Shutdown
Firefox's HTML5 video player only supports certain video codecs: **H.264 (recommended), H.265, VP9, AV1**. Some older files (e.g., MPEG-4 Part 2, DivX/Xvid) will not play—audio may work, but video will be blank or missing.

**How to check a video's codec:**
```powershell
ffmpeg\bin\ffprobe.exe -v error -select_streams v:0 -show_entries stream=codec_name,profile,pix_fmt -of default=nw=1 "your_file_path.mp4"
```
If you see `mpeg4` or `Simple Profile` or the pixel format is yuv420p10le, you must re-encode the file.

**How to re-encode to H.264 (recommended for Firefox):**
```powershell
ffmpeg\bin\ffmpeg.exe -i YOUR_ORIGINAL_FILE.mp4 -c:v libx264 -pix_fmt yuv420p -crf 18 -preset fast -movflags faststart -c:a copy YOUR_EDITED_FILE_NEW_NAME.mp4
```

**Tip:**
You will need ffmpeg/ffprobe to run those commands above, download from https://www.gyan.dev/ffmpeg/builds/ and choose "ffmpeg-git-essentials.7z" under the section "git master builds", then unzip it, rename it to "ffmpeg" for easier use. Place it next to the videos or a fixed path.

## License

MIT LICENSE
