package ai.amohjustice.companion;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int MIC_REQUEST = 41;
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
        description.setText("Hands-free wake assistant\n\nEnable listening, then say “Justice AI”. Android will show an ongoing microphone notification while listening.");
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
        open.setOnClickListener(v -> openWebsite(null));

        setContentView(root);
        if (getIntent() != null && getIntent().hasExtra("justicePrompt")) openWebsite(getIntent().getStringExtra("justicePrompt"));
    }

    private void enableAssistant() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            return;
        }
        if (!Settings.canDrawOverlays(this)) {
            status.setText("Allow “Display over other apps” on the next screen, then return here.");
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
            startActivity(i);
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 42);
        }
        Intent service = new Intent(this, WakeWordService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(service); else startService(service);
        status.setText("Listening is enabled. Keep the Justice AI notification visible.");
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MIC_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) enableAssistant();
    }

    private void openWebsite(String prompt) {
        String url = "https://amoh-justice-ai.vercel.app/";
        if (prompt != null && !prompt.trim().isEmpty()) {
            try { url += "?justicePrompt=" + java.net.URLEncoder.encode(prompt, "UTF-8") + "&justiceVoice=1"; }
            catch (Exception ignored) {}
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Exception e) { status.setText("Could not open the AMOH JUSTICE AI website."); }
    }
}
