package io.github.alsatplazacommits.ordusavasi;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.util.HashMap;

/* Ordu Savaşı Ultra — Android yerel kabuk.
   Kilitler: kabuk komutu yok; oyun dosyaları sadece APK içinden; ağ sadece tek izinli HTTPS paket adresi;
   dosya/içerik erişimi kapalı; izin istekleri (kamera, mikrofon, konum) reddedilir. */
public class MainActivity extends Activity {
  static final String HOST = "appassets.androidplatform.net";
  static final String BASE = "https://" + HOST + "/oyun/";
  static final String PACK = "https://alsatplaza-commits.github.io/ordu-savasi-ultra/packs/";
  WebView web;
  ValueCallback<Uri[]> fileCb;

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
    web = new WebView(this);
    setContentView(web);
    immersive();
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setJavaScriptCanOpenWindowsAutomatically(false);
    s.setSupportMultipleWindows(false);
    s.setGeolocationEnabled(false);
    s.setSupportZoom(false);
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
        Uri u = req.getUrl();
        String url = u.toString();
        if (HOST.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith("/oyun/")) {
          String rel = u.getPath().substring(6);
          if (rel.length() == 0) rel = "index.html";
          if (rel.contains("..")) return deny();
          try {
            InputStream in = getAssets().open("oyun/" + rel);
            WebResourceResponse r = new WebResourceResponse(mime(rel), rel.endsWith(".html") || rel.endsWith(".js") || rel.endsWith(".css") ? "utf-8" : null, in);
            HashMap<String,String> h = new HashMap<>(); h.put("Cache-Control", "no-cache"); r.setResponseHeaders(h);
            return r;
          } catch (IOException e) { return notFound(); }
        }
        if (url.startsWith(PACK)) return null; // tek izinli ağ adresi: imzalı içerik paketleri
        return deny();
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) { return !req.getUrl().toString().startsWith(BASE); }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (fileCb != null) fileCb.onReceiveValue(null);
        fileCb = cb;
        Intent i = new Intent(Intent.ACTION_GET_CONTENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        try { startActivityForResult(Intent.createChooser(i, "Kayıt dosyası seç"), 7); } catch (Exception e) { fileCb = null; return false; }
        return true;
      }
      @Override public void onPermissionRequest(PermissionRequest r) { r.deny(); }
      @Override public void onGeolocationPermissionsShowPrompt(String o, GeolocationPermissions.Callback cb) { cb.invoke(o, false, false); }
    });
    web.addJavascriptInterface(new Kopru(this), "OrduYerel");
    web.loadUrl(BASE + "index.html");
  }

  static String mime(String p) {
    if (p.endsWith(".html")) return "text/html"; if (p.endsWith(".js")) return "application/javascript"; if (p.endsWith(".css")) return "text/css";
    if (p.endsWith(".png")) return "image/png"; if (p.endsWith(".ogg")) return "audio/ogg"; if (p.endsWith(".json")) return "application/json"; return "application/octet-stream";
  }
  static WebResourceResponse deny() { return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", new HashMap<String,String>(), new ByteArrayInputStream(new byte[0])); }
  static WebResourceResponse notFound() { return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String,String>(), new ByteArrayInputStream(new byte[0])); }

  void immersive() {
    web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
  }
  @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
  @Override protected void onActivityResult(int rq, int rc, Intent data) {
    if (rq == 7 && fileCb != null) { fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(rc, data)); fileCb = null; }
    else super.onActivityResult(rq, rc, data);
  }
  /* Geri tuşu oyunu kapatmaz: menüyü açar (yanlışlıkla çıkış olmasın). */
  @Override public void onBackPressed() { web.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))", null); }
  @Override protected void onPause() { web.evaluateJavascript("try{saveGame(true)}catch(e){}", null); web.onPause(); super.onPause(); }
  @Override protected void onResume() { super.onResume(); web.onResume(); immersive(); }
}
