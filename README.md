# Open Video Player

An open-source video player for Android. It plays videos straight from your device's storage — no accounts, no ads, no internet required — and the source is here for anyone to use, modify, or contribute to.

[![Download the latest release](https://img.shields.io/badge/Download-Latest%20Release-CC5500?style=for-the-badge&logo=android&logoColor=white)](https://github.com/azahinhasan/open-video-player/releases/latest)

## Features

- Gesture controls — swipe for brightness/volume, swipe to seek, double-tap to play/pause
- Three zoom modes (Fit / Fill / Stretch) with a one-tap cycle button
- Folder-based library scanning — scan everything, or pick specific/custom folders
- A private vault for hiding videos behind device authentication
- Subtitles, external subtitle files, and audio track switching
- Playback speed control, loop, and picture-in-picture
- System / Light / Dark / Warm theme modes with a customizable accent color

## Screenshots

<img width="265" height="550" alt="Screenshot_20260910_142254" src="https://github.com/user-attachments/assets/c7570979-ca19-41c0-ab36-60ec98187972" />
<img width="265" height="550" alt="Screenshot_20260910_111019" src="https://github.com/user-attachments/assets/fe1ef624-4970-4217-acdb-f3a881f89d5b" />
<img width="265" height="550" alt="Screenshot_20260910_110929" src="https://github.com/user-attachments/assets/a0495f7f-07d3-4db4-b277-bd87d3fa6e8d" />

## Get started

```bash
npm install
npx expo start
```

This is an Expo (SDK 54) project using [file-based routing](https://docs.expo.dev/router/introduction). App code lives in the **app** and **components** directories.

To build a release APK locally:

```bash
npm run build:local
```

## License

MIT — see [LICENSE](./LICENSE).
