# Exhibition Kiosk

A fullscreen kiosk application for displaying media content in exhibitions. Built with HTML5, CSS3, and JavaScript, running on Firefox in kiosk mode with multilingual support.

## Features

- **Fullscreen Kiosk Mode**: Runs as a dedicated exhibition display
- **Multilingual Support**: Content organized by language (English, French, Portuguese, Spanish, Chinese)
- **Media Management**: Add, remove, and scan for media without restarting
- **Local Server**: Runs on a local HTTP server for secure file handling and thumbnail generation
- **Windows Shortcuts**: Easy desktop integration with auto-generated shortcuts

## How to Run

### Quick Start

Double-click one of these to launch the kiosk:

1. **`Launch Kiosk.cmd`** (easiest) - Starts the application immediately
2. **`kiosk.exe.lnk`** - Desktop shortcut (created via powershell if needed)

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
  ├── Launch Kiosk.cmd              # Quick launch script
  ├── README.md                     # This file
  │
  ├── bin/
  │   ├── launch-kiosk.ps1          # Main launcher (starts server + Firefox)
  │   ├── serve-kiosk.ps1           # Local HTTP server
  │   ├── generate-media-manifest.ps1 # Creates manifest.js from media files
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

### Firefox won't start
- Ensure Firefox is installed in a standard location (Program Files, AppData, etc.)
- Check that no other kiosk instance is running on port 8765

### Videos not appearing
- Verify video files are in the correct `media/[language]/` folder
- Run the app's media scan (or restart the app)
- Check `logs/.kiosk-server.log` for errors

### Port 8765 already in use
- Another application is using this port
- Close any running kiosk instances
- Restart the application

## Shutdown

Not yet implemented

## License

MIT LICENSE
