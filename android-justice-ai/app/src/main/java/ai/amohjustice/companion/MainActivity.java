package ai.amohjustice.companion;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.ContactsContract;
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
import android.widget.Toast;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int MIC_REQUEST = 41;
    private static final int CONTACTS_REQUEST = 43;
    private WebView webView;
    private TextView status;
    private String pendingContactName = "";

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean setupRequested = getIntent() != null && getIntent().getBooleanExtra("showSetup", false);
        boolean setupDone = getSharedPreferences("justice_ai", MODE_PRIVATE).getBoolean("setup_done", false);
        if (setupRequested || !setupDone) showSetup();
        else {
            showJusticeAI(null);
            handleVoiceCommand(getIntent() == null ? null : getIntent().getStringExtra("justicePrompt"));
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
            try { url += "?justicePrompt=" + java.net.URLEncoder.encode(prompt, "UTF-8") + "&justiceVoice=1"; }
            catch (Exception ignored) {}
        }
        return url;
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent.getBooleanExtra("showSetup", false)) showSetup();
        else {
            if (webView == null) showJusticeAI(null);
            handleVoiceCommand(intent.getStringExtra("justicePrompt"));
        }
    }

    private void showSetup() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(28, 32, 28, 32);
        root.setBackgroundColor(0xFF061426);

        TextView title = new TextView(this);
        title.setText("JUSTICE AI");
        title.setTextColor(0xFF55B8FF);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView description = new TextView(this);
        description.setText("Your blue, hands-free voice assistant. Enable the microphone, then say “Justice AI” followed by a command. Try “Justice AI, call my mother.” A visible notification appears while listening.");
        description.setTextColor(0xFFEAF4FF);
        description.setTextSize(16);
        description.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(-1, -2);
        dp.setMargins(0, 24, 0, 24);
        root.addView(description, dp);

        status = new TextView(this);
        status.setTextColor(0xFF9CCFFF);
        status.setText("Microphone and floating-button permissions are required.");
        status.setGravity(Gravity.CENTER);
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        Button enable = new Button(this);
        enable.setText("Enable voice commands");
        root.addView(enable, new LinearLayout.LayoutParams(-1, -2));
        enable.setOnClickListener(v -> enableAssistant());

        Button open = new Button(this);
        open.setText("Open AMOH JUSTICE AI");
        root.addView(open, new LinearLayout.LayoutParams(-1, -2));
        open.setOnClickListener(v -> showJusticeAI(null));

        Button stop = new Button(this);
        stop.setText("Stop listening");
        root.addView(stop, new LinearLayout.LayoutParams(-1, -2));
        stop.setOnClickListener(v -> {
            stopService(new Intent(this, WakeWordService.class));
            status.setText("Voice listening is stopped. Tap Enable to start again.");
        });
        setContentView(root);
    }

    private void enableAssistant() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            return;
        }
        if (!Settings.canDrawOverlays(this)) {
            status.setText("Allow “Display over other apps”, then return to Justice AI.");
            startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName())));
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 42);
        }
        Intent service = new Intent(this, WakeWordService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(service); else startService(service);
        getSharedPreferences("justice_ai", MODE_PRIVATE).edit().putBoolean("setup_done", true).apply();
        Toast.makeText(this, "Justice AI voice commands enabled", Toast.LENGTH_SHORT).show();
        showJusticeAI(null);
    }

    private void handleVoiceCommand(String spoken) {
        if (spoken == null || spoken.trim().isEmpty()) return;
        String command = spoken.trim();
        String lower = command.toLowerCase(Locale.ROOT);
        String contact = null;
        if (lower.matches("^(please\\s+)?(call|phone|ring)\\s+.+")) {
            contact = command.replaceFirst("(?i)^(please\\s+)?(call|phone|ring)\\s+", "").trim();
            if (contact.toLowerCase(Locale.ROOT).startsWith("my ")) contact = contact.substring(3).trim();
        }
        if (contact != null && !contact.isEmpty()) {
            callContactByName(contact);
        } else if (webView != null) {
            webView.loadUrl(buildUrl(command));
        }
    }

    private void callContactByName(String name) {
        pendingContactName = name;
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, CONTACTS_REQUEST);
            return;
        }
        String number = findContactNumber(name);
        if (number == null) {
            Toast.makeText(this, "I couldn't find " + name + " in your contacts.", Toast.LENGTH_LONG).show();
            return;
        }
        Toast.makeText(this, "Opening your dialer for " + name + ". Review the number and tap Call.", Toast.LENGTH_LONG).show();
        Intent dial = new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null));
        startActivity(dial);
    }

    private String findContactNumber(String requestedName) {
        String normalized = requestedName.toLowerCase(Locale.ROOT).trim();
        String[] terms;
        if (normalized.equals("mother") || normalized.equals("mum") || normalized.equals("mom") || normalized.equals("mummy") || normalized.equals("mommy")) {
            terms = new String[]{"mother", "mum", "mom", "mummy", "mommy"};
        } else if (normalized.equals("father") || normalized.equals("dad") || normalized.equals("daddy")) {
            terms = new String[]{"father", "dad", "daddy"};
        } else {
            terms = new String[]{requestedName};
        }
        for (String term : terms) {
            Uri uri = Uri.withAppendedPath(ContactsContract.CommonDataKinds.Phone.CONTENT_FILTER_URI, Uri.encode(term));
            Cursor cursor = null;
            try {
                cursor = getContentResolver().query(uri,
                    new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER},
                    null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC");
                if (cursor != null && cursor.moveToFirst()) {
                    String number = cursor.getString(1);
                    if (number != null && !number.trim().isEmpty()) return number;
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) cursor.close();
            }
        }
        return null;
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MIC_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) enableAssistant();
        if (requestCode == CONTACTS_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED && !pendingContactName.isEmpty()) {
            String name = pendingContactName;
            pendingContactName = "";
            callContactByName(name);
        } else if (requestCode == CONTACTS_REQUEST) {
            Toast.makeText(this, "Contacts permission was not granted. I can't look up that number.", Toast.LENGTH_LONG).show();
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else if (webView != null) moveTaskToBack(true);
        else super.onBackPressed();
    }
}
