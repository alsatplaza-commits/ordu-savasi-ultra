package io.github.alsatplazacommits.ordusavasi;

import android.app.Activity;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import java.io.*;

  /* Tek köprü: kayıt dosyasını İndirilenler klasörüne yazar. Başka hiçbir şey yapmaz. */
public class Kopru {
  private final Activity act;
  public Kopru(Activity a) { act = a; }
    @JavascriptInterface public String saveText(String name, String text) {
      String safe = name.replaceAll("[^A-Za-z0-9._-]", "_");
      if (!safe.endsWith(".json")) safe += ".json";
      try {
        OutputStream os;
        if (Build.VERSION.SDK_INT >= 29) {
          ContentValues cv = new ContentValues();
          cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
          cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
          cv.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/OrduSavasi");
          Uri uri = act.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
          os = act.getContentResolver().openOutputStream(uri);
        } else {
          File dir = act.getExternalFilesDir(null); os = new FileOutputStream(new File(dir, safe));
        }
        os.write(text.getBytes("UTF-8")); os.close();
        return "ok";
      } catch (Exception e) { return "hata"; }
    }
  }
