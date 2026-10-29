# AMOH JUSTICE AI — native Android app prototype

The native Android project packages the existing AMOH JUSTICE AI website inside a WebView and includes an optional foreground microphone listener. The intent is for a user to install **one Justice AI app**, not install a separate wake-word companion plus a website shortcut.

## Setup

1. Install the debug APK from the successful GitHub Actions artifact.
2. Open Justice AI. On first launch, choose **Enable hands-free Justice AI**.
3. Grant microphone permission and allow **Display over other apps**. Tap Enable again if Android returns to the setup screen after the overlay permission step.
4. Keep the ongoing microphone notification visible.
5. Say “Justice AI” or “ChatGPT”. When a question is recognized, the app attempts to open its own Justice AI screen with the recognized prompt. If Android blocks a background activity launch, tap the floating green bubble.

The main Justice AI site runs inside the same native app's WebView. Users sign in within that app's WebView; browser sessions are not automatically shared with Chrome.

## Important limitations

This is an experimental prototype, not a verified production-ready always-on assistant. It uses Android's system `SpeechRecognizer` to continuously start and restart speech-recognition sessions; it is not a dedicated low-power wake-word engine. Recognition may require a network connection, may consume battery, and may behave differently across devices and speech-recognition providers. “Justice AI” and “ChatGPT” are phrase matches, not system-level hotword integrations.

Android may restrict microphone services or launching an app from the background. Listening is not guaranteed while the phone is locked, after a force-stop, or after a reboot. The user must explicitly enable microphone and overlay permissions. A foreground-service notification remains visible while listening. The service is not designed to bypass Android permissions or privacy indicators.

The prototype has been compiled by GitHub Actions but must be tested on physical Android devices before production use. It does not change Supabase auth policies, database schema, or server secrets.

## Build

Open the repository's **Actions** tab and choose **Build Justice AI Android Companion**. Download the `justice-ai-android-debug-apk` artifact from a successful run. A debug APK is for testing and is not a signed Play Store release.
