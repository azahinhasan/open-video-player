# Open Video Player 🎬

An open-source video player for Android. It plays videos straight from your device's storage — no accounts, no ads, no internet required — and the source is here for anyone to use, modify, or contribute to.

[![Download Latest Release](https://img.shields.io/github/v/release/azahinhasan/open-video-player?label=Download&style=for-the-badge&color=2081ED)](https://github.com/azahinhasan/open-video-player/releases/latest)

## Features

- Gesture controls — swipe for brightness/volume, swipe to seek, double-tap to play/pause
- Three zoom modes (Fit / Fill / Stretch) with a one-tap cycle button
- Folder-based library scanning — scan everything, or pick specific/custom folders
- A private vault for hiding videos behind device authentication
- Subtitles, external subtitle files, and audio track switching
- Playback speed control, loop, and picture-in-picture
- System / Light / Dark / Warm theme modes with a customizable accent color

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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## License

MIT — see [LICENSE](./LICENSE).
