# Justice AI Android companion (experimental)

This native Android companion is intended to provide a user-enabled, foreground wake-phrase listener and an emerald floating shortcut for AMOH JUSTICE AI.

## Current prototype behavior

- The user must open this companion once, grant microphone permission, and allow “Display over other apps”.
- An ongoing Android notification is shown while the microphone listener is active.
- The service uses Android's available `SpeechRecognizer` service to detect the phrase “Justice AI”.
- After a question is recognized, the companion tries to open the AMOH JUSTICE AI website with the recognized question. Android may block background launches; in that case, tap the floating bubble to continue.
- The website reads the one-time `justicePrompt` query parameter and submits it to the existing chat endpoint. `justiceVoice=1` enables spoken replies for that handoff.
- This does not change Supabase authentication policies, database schema, or server-side secrets.

## Important limitations

This is an experimental prototype, not a verified production-ready always-on assistant. Android's speech-recognition service may depend on the device's installed recognition provider and network connection; continuous listening may stop, consume battery, or behave differently across phone manufacturers. It is not guaranteed to work while the phone is locked, after the OS kills the process, or immediately after a reboot. A native build and real-device tests are required before relying on it.

The current prototype uses the system speech recognizer rather than an offline wake-word model. Do not describe it as offline or guaranteed to listen forever. Microphone use is visible through Android's foreground-service notification. Users can stop listening from Android Settings by force-stopping the companion, or by stopping its service from the app (a stop control is planned).

## Build

The GitHub Actions workflow builds a debug APK and uploads it as an artifact. Open the repository's **Actions** tab, choose **Build Justice AI Android Companion**, and download `justice-ai-android-debug-apk` from a successful run. A debug APK is for testing; it is not a signed Play Store release.
