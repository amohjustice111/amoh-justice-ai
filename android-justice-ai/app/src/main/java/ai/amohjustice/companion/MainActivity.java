package ai.amohjustice.companion;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int MIC_REQUEST = 41;
    private WebView webView;
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean setupRequested = getIntent() != null && getIntent().getBooleanExtra("showSetup", false);
        boolean setupDone = getSharedPreferences("justice_ai", MODE_PRIVATE).getBoolean("setup_done", false);
        if (setupRequested || !setupDone) {
            showSetup();
        } else {
            showJusticeAI(getIntent() == null ? null : getIntent().getStringExtra("justicePrompt"));
        }
    }

    private void showJusticeAI(String prompt) {
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        setContentView(webView);
        webView.loadUrl(buildUrl(prompt));
    }

    private String buildUrl(String prompt) {
        String url = "https://amoh-justice-ai.vercel.app/";
        if (prompt != null && !prompt.trim().isEmpty()) {
            try {
                url += "?justicePrompt=" + java.net.URLEncoder.encode(prompt, "UTF-8") + "&justiceVoice=1";
            } catch (Exception ignored) {}
        }
        return url;
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent.getBooleanExtra("showSetup", false)) {
            showSetup();
        } else if (webView != null) {
            String prompt = intent.getStringExtra("justicePrompt");
            webView.loadUrl(buildUrl(prompt));
        } else {
            showJusticeAI(intent.getStringExtra("justicePrompt"));
        }
    }

    private void showSetup() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(28, 32, 28, 32);
        root.setBackgroundColor(0xFF050807);

        TextView title = new TextView(this);
        title.setText("JUSTICE AI");
        title.setTextColor(0xFF36F0A0);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView description = new TextView(this);
        description.setText("Enable hands-free mode once. Then say “Justice AI” or “ChatGPT” to wake your assistant. Android will show a microphone notification while listening.");
        description.setTextColor(0xFFE4F2EA);
        description.setTextSize(16);
        description.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(-1, -2);
        dp.setMargins(0, 24, 0, 24);
        root.addView(description, dp);

        status = new TextView(this);
        status.setTextColor(0xFF9DE8C0);
        status.setText("Microphone and floating-button permissions are required.");
        status.setGravity(Gravity.CENTER);
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        Button enable = new Button(this);
        enable.setText("Enable hands-free Justice AI");
        root.addView(enable, new LinearLayout.LayoutParams(-1, -2));
        enable.setOnClickListener(v -> enableAssistant());

        Button open = new Button(this);
        open.setText("Open AMOH JUSTICE AI");
        root.addView(open, new LinearLayout.LayoutParams(-1, -2));
        open.setOnClickListener(v -> {
            getSharedPreferences("justice_ai", MODE_PRIVATE).edit().putBoolean("setup_done", true).apply();
            showJusticeAI(null);
        });

        Button stop = new Button(this);
        stop.setText("Stop listening");
        root.addView(stop, new LinearLayout.LayoutParams(-1, -2));
        stop.setOnClickListener(v -> {
            stopService(new Intent(this, WakeWordService.class));
            status.setText("Hands-free listening is stopped. Tap Enable to start again.");
        });

        setContentView(root);
    }

    private void enableAssistant() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            return;
        }
        if (!Settings.canDrawOverlays(this)) {
            status.setText("Allow “Display over other apps” on the next screen, then return here.");
            startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName())));
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 42);
        }
        Intent service = new Intent(this, WakeWordService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(service); else startService(service);
        getSharedPreferences("justice_ai", MODE_PRIVATE).edit().putBoolean("setup_done", true).apply();
        status.setText("Listening enabled. Keep the Justice AI notification visible.");
        showJusticeAI(null);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MIC_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) enableAssistant();
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else if (webView != null) {
            // Keep the native activity available in Recents; the separate foreground service
            // continues only while Android permits it and the user has not force-stopped it.
            moveTaskToBack(true);
        } else {
            super.onBackPressed();
        }
    }
}
