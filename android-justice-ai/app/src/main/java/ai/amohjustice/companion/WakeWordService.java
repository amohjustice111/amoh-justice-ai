package ai.amohjustice.companion;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.widget.TextView;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Locale;

public class WakeWordService extends Service {
    private static final String CHANNEL = "justice_ai_wake";
    private SpeechRecognizer recognizer;
    private WindowManager windowManager;
    private TextView bubble;
    private String pendingPrompt = "";
    private boolean waitingForQuestion = false;
    private boolean listening = false;
    private boolean stopped = false;

    @Override public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, CHANNEL)
            .setContentTitle("Justice AI is ready")
            .setContentText("Listening for “Justice AI”. Tap to manage.")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true).setContentIntent(pi).build();
        startForeground(7, notification);
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        startRecognition(false);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
    @Override public IBinder onBind(Intent intent) { return null; }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Justice AI hands-free assistant", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Persistent notification while the wake phrase listener uses the microphone.");
            ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    private void startRecognition(boolean questionMode) {
        if (stopped || listening) return;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { showBubble("Voice recognition unavailable"); return; }
        try {
            if (recognizer != null) { recognizer.destroy(); recognizer = null; }
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            waitingForQuestion = questionMode;
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(android.os.Bundle params) { listening = true; }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() { listening = false; }
                @Override public void onError(int error) { listening = false; scheduleRestart(); }
                @Override public void onResults(android.os.Bundle results) {
                    listening = false;
                    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    String heard = matches != null && !matches.isEmpty() ? matches.get(0).trim() : "";
                    handleSpeech(heard, questionMode);
                }
                @Override public void onPartialResults(android.os.Bundle partialResults) {}
                @Override public void onEvent(int eventType, android.os.Bundle params) {}
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            recognizer.startListening(intent);
        } catch (Exception e) { listening = false; scheduleRestart(); }
    }

    private void handleSpeech(String heard, boolean questionMode) {
        String lower = heard.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").trim();
        if (questionMode) {
            if (!heard.isEmpty()) {
                pendingPrompt = heard;
                showBubble("💚 Justice AI heard you\nTap to get your answer");
                // Android may block opening another app from the background. The floating
                // bubble remains the reliable, user-initiated route into the conversation.
                try { openPrompt(heard); } catch (Exception ignored) {}
            }
            scheduleRestart();
            return;
        }
        int wake = lower.indexOf("justice ai");
        if (wake >= 0) {
            String remainder = heard.substring(Math.min(heard.length(), wake + "justice ai".length())).trim();
            showBubble("💚 JUSTICE AI IS AWAKE\nTap to talk or hear your answer");
            if (!remainder.isEmpty()) {
                pendingPrompt = remainder;
                try { openPrompt(remainder); } catch (Exception ignored) {}
                scheduleRestart();
            } else {
                startRecognition(true);
            }
        } else {
            scheduleRestart();
        }
    }

    private void scheduleRestart() {
        new android.os.Handler(getMainLooper()).postDelayed(() -> {
            if (!stopped && !listening) startRecognition(false);
        }, 900);
    }

    private void showBubble(String label) {
        if (!Settings.canDrawOverlays(this)) return;
        try {
            if (bubble == null) {
                bubble = new TextView(this);
                bubble.setTextColor(0xFFFFFFFF);
                bubble.setTextSize(13);
                bubble.setGravity(Gravity.CENTER);
                bubble.setPadding(18, 16, 18, 16);
                bubble.setBackgroundColor(0xFF087F4B);
                bubble.setOnClickListener(v -> openPrompt(pendingPrompt));
                WindowManager.LayoutParams p = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
                    Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT);
                p.gravity = Gravity.END | Gravity.CENTER_VERTICAL;
                p.x = 10; p.y = 0;
                windowManager.addView(bubble, p);
                bubble.setOnTouchListener(new android.view.View.OnTouchListener() {
                    private float downX, downY; private int startX, startY;
                    @Override public boolean onTouch(android.view.View v, MotionEvent event) {
                        if (event.getAction() == MotionEvent.ACTION_DOWN) {
                            downX = event.getRawX(); downY = event.getRawY();
                            WindowManager.LayoutParams lp = (WindowManager.LayoutParams) bubble.getLayoutParams();
                            startX = lp.x; startY = lp.y; return true;
                        }
                        if (event.getAction() == MotionEvent.ACTION_UP) {
                            float dx = event.getRawX() - downX, dy = event.getRawY() - downY;
                            if (Math.abs(dx) < 12 && Math.abs(dy) < 12) openPrompt(pendingPrompt);
                            else {
                                WindowManager.LayoutParams lp = (WindowManager.LayoutParams) bubble.getLayoutParams();
                                lp.x = Math.max(0, startX - (int)dx); lp.y = startY + (int)dy;
                                windowManager.updateViewLayout(bubble, lp);
                            }
                            return true;
                        }
                        if (event.getAction() == MotionEvent.ACTION_MOVE) return true;
                        return true;
                    }
                });
            }
            bubble.setText(label);
        } catch (Exception ignored) {}
    }

    private void openPrompt(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
            return;
        }
        try {
            String url = "https://amoh-justice-ai.vercel.app/?justicePrompt=" + URLEncoder.encode(prompt, "UTF-8") + "&justiceVoice=1";
            Intent i = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception ignored) {}
    }

    @Override public void onDestroy() {
        stopped = true;
        if (recognizer != null) { try { recognizer.cancel(); recognizer.destroy(); } catch (Exception ignored) {} }
        if (bubble != null && windowManager != null) { try { windowManager.removeView(bubble); } catch (Exception ignored) {} }
        super.onDestroy();
    }
}
