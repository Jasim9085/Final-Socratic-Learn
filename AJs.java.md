# Android-JavaScript Bridge Implementation (Java)

This file contains the complete Java code for the `AndroidBridge`. It consists of two main classes:
1.  `DatabaseHelper.java`: Manages the creation and versioning of the SQLite database.
2.  `WebAppInterface.java`: The core bridge class that exposes native Java functions to the JavaScript running in the WebView.

This implementation fulfills all requirements, including:
- Using an SQLite database for persistence.
- Storing sessions and settings in two separate tables.
- **Dual-Save Mechanism**: Saving a backup of the entire database to external public storage (`/storage/emulated/0/SocLearn/`) after every data modification to ensure data is accessible and preserved.

---

### 1. Android Manifest Permissions

First, you must declare the necessary permissions in your `AndroidManifest.xml` file. For writing to a custom public directory and saving files, you will need `WRITE_EXTERNAL_STORAGE`. For modern Android (API 30+), you may need to request `MANAGE_EXTERNAL_STORAGE` for direct access to paths like `/SocLearn/`, or use the Storage Access Framework. You will also need to handle runtime permission requests in your Activity.

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
<!-- For Android 11 (API 30) and above, writing to arbitrary public directories is restricted.
     You may need to request all files access or use the Storage Access Framework.
     For this specific requirement, MANAGE_EXTERNAL_STORAGE might be necessary.
     <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
-->
```

---

### 2. `DatabaseHelper.java`

This class sets up and manages the SQLite database and its tables.

```java
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DatabaseHelper extends SQLiteOpenHelper {

    // Database Info
    private static final String DATABASE_NAME = "SocraticTutor.db";
    private static final int DATABASE_VERSION = 1;

    // Table Names
    public static final String TABLE_SESSIONS = "sessions";
    public static final String TABLE_SETTINGS = "settings";

    // Sessions Table Columns
    public static final String COLUMN_SESSION_ID = "session_id";
    public static final String COLUMN_UPDATED_AT = "updated_at";
    public static final String COLUMN_SESSION_JSON_DATA = "json_data";

    // Settings Table Columns
    public static final String COLUMN_SETTINGS_ID = "settings_id"; // Always 1 for the single settings row
    public static final String COLUMN_SETTINGS_JSON_DATA = "json_data";

    // Create Sessions Table Statement
    private static final String CREATE_TABLE_SESSIONS =
        "CREATE TABLE " + TABLE_SESSIONS + "("
        + COLUMN_SESSION_ID + " TEXT PRIMARY KEY,"
        + COLUMN_UPDATED_AT + " INTEGER,"
        + COLUMN_SESSION_JSON_DATA + " TEXT"
        + ")";

    // Create Settings Table Statement
    private static final String CREATE_TABLE_SETTINGS =
        "CREATE TABLE " + TABLE_SETTINGS + "("
        + COLUMN_SETTINGS_ID + " INTEGER PRIMARY KEY DEFAULT 1,"
        + COLUMN_SETTINGS_JSON_DATA + " TEXT"
        + ")";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(CREATE_TABLE_SESSIONS);
        db.execSQL(CREATE_TABLE_SETTINGS);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // A simple upgrade policy for this example is to drop and recreate
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_SESSIONS);
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_SETTINGS);
        onCreate(db);
    }
}
```

---

### 3. `WebAppInterface.java`

This is the core bridge class. An instance of this class is attached to the WebView.

```java
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;

public class WebAppInterface {
    private static final String LOG_TAG = "WebAppInterface";
    private final Context context;
    private final WebView webView;
    private final DatabaseHelper dbHelper;

    public WebAppInterface(Context context, WebView webView) {
        this.context = context;
        this.webView = webView;
        this.dbHelper = new DatabaseHelper(context);
    }

    // --- Session Management ---

    @JavascriptInterface
    public void saveSession(String sessionData) {
        Log.d(LOG_TAG, "saveSession called");
        try (SQLiteDatabase db = dbHelper.getWritableDatabase()) {
            JSONObject json = new JSONObject(sessionData);
            String sessionId = json.getString("id");
            long updatedAt = json.getLong("updatedAt");

            ContentValues values = new ContentValues();
            values.put(DatabaseHelper.COLUMN_SESSION_ID, sessionId);
            values.put(DatabaseHelper.COLUMN_UPDATED_AT, updatedAt);
            values.put(DatabaseHelper.COLUMN_SESSION_JSON_DATA, sessionData);

            db.replace(DatabaseHelper.TABLE_SESSIONS, null, values);
            copyDatabaseToExternalStorage(); // Sync with external storage
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error saving session", e);
        }
    }

    @JavascriptInterface
    public String loadAllSessions() {
        Log.d(LOG_TAG, "loadAllSessions called");
        JSONArray sessionsArray = new JSONArray();
        String query = "SELECT " + DatabaseHelper.COLUMN_SESSION_JSON_DATA + " FROM " + DatabaseHelper.TABLE_SESSIONS + " ORDER BY " + DatabaseHelper.COLUMN_UPDATED_AT + " DESC";

        try (SQLiteDatabase db = dbHelper.getReadableDatabase();
             Cursor cursor = db.rawQuery(query, null)) {

            if (cursor.moveToFirst()) {
                do {
                    String jsonData = cursor.getString(cursor.getColumnIndexOrThrow(DatabaseHelper.COLUMN_SESSION_JSON_DATA));
                    sessionsArray.put(jsonData);
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error loading sessions", e);
        }
        return sessionsArray.toString();
    }

    @JavascriptInterface
    public void deleteSession(String sessionId) {
        Log.d(LOG_TAG, "deleteSession called for ID: " + sessionId);
        try (SQLiteDatabase db = dbHelper.getWritableDatabase()) {
            db.delete(DatabaseHelper.TABLE_SESSIONS, DatabaseHelper.COLUMN_SESSION_ID + " = ?", new String[]{sessionId});
            copyDatabaseToExternalStorage();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error deleting session", e);
        }
    }

    @JavascriptInterface
    public void clearAllSessions() {
        Log.d(LOG_TAG, "clearAllSessions called");
        try (SQLiteDatabase db = dbHelper.getWritableDatabase()) {
            db.delete(DatabaseHelper.TABLE_SESSIONS, null, null);
            copyDatabaseToExternalStorage();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error clearing all sessions", e);
        }
    }

    // --- Settings Management ---

    @JavascriptInterface
    public void saveSettings(String data) {
        Log.d(LOG_TAG, "saveSettings called");
        try (SQLiteDatabase db = dbHelper.getWritableDatabase()) {
            ContentValues values = new ContentValues();
            values.put(DatabaseHelper.COLUMN_SETTINGS_ID, 1); // Always use ID 1
            values.put(DatabaseHelper.COLUMN_SETTINGS_JSON_DATA, data);
            db.replace(DatabaseHelper.TABLE_SETTINGS, null, values);
            copyDatabaseToExternalStorage();
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error saving settings", e);
        }
    }

    @JavascriptInterface
    public String loadSettings() {
        Log.d(LOG_TAG, "loadSettings called");
        String settingsJson = "";
        try (SQLiteDatabase db = dbHelper.getReadableDatabase();
             Cursor cursor = db.query(DatabaseHelper.TABLE_SETTINGS, new String[]{DatabaseHelper.COLUMN_SETTINGS_JSON_DATA},
                     DatabaseHelper.COLUMN_SETTINGS_ID + " = ?", new String[]{"1"}, null, null, null)) {
            if (cursor.moveToFirst()) {
                settingsJson = cursor.getString(cursor.getColumnIndexOrThrow(DatabaseHelper.COLUMN_SETTINGS_JSON_DATA));
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error loading settings", e);
        }
        return settingsJson;
    }

    // --- App Control ---

    @JavascriptInterface
    public void reloadApp() {
        Log.d(LOG_TAG, "reloadApp called");
        new Handler(Looper.getMainLooper()).post(() -> webView.reload());
    }

    // --- File Management ---

    @JavascriptInterface
    public void saveFile(String fileName, String mimeType, String content) {
        Log.d(LOG_TAG, "saveFile called for: " + fileName);
        ContentValues contentValues = new ContentValues();
        contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        contentValues.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        }

        Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);

        if (uri != null) {
            try (OutputStream outputStream = context.getContentResolver().openOutputStream(uri)) {
                if (outputStream != null) {
                    outputStream.write(content.getBytes(StandardCharsets.UTF_8));
                    showToast("File saved to Downloads: " + fileName);
                }
            } catch (IOException e) {
                Log.e(LOG_TAG, "Error saving file", e);
                showToast("Failed to save file.");
            }
        } else {
            showToast("Failed to create file entry.");
        }
    }
    
    // --- Private Helper Methods ---

    /**
     * Copies the internal app database to a public external directory.
     * IMPORTANT: This requires WRITE_EXTERNAL_STORAGE permission and may face restrictions
     * on modern Android versions (API 29+). Runtime permission checks are necessary.
     */
    private void copyDatabaseToExternalStorage() {
        Log.d(LOG_TAG, "Attempting to copy database to external storage.");
        try {
            File internalDbFile = context.getDatabasePath(DatabaseHelper.DATABASE_NAME);
            
            // Path: /storage/emulated/0/SocLearn/
            File externalDir = new File(Environment.getExternalStorageDirectory(), "SocLearn");
            if (!externalDir.exists()) {
                if (!externalDir.mkdirs()) {
                    Log.e(LOG_TAG, "Failed to create external directory.");
                    return;
                }
            }

            File externalDbFile = new File(externalDir, DatabaseHelper.DATABASE_NAME);

            if (internalDbFile.exists()) {
                try (FileChannel src = new FileInputStream(internalDbFile).getChannel();
                     FileChannel dst = new FileOutputStream(externalDbFile).getChannel()) {
                    dst.transferFrom(src, 0, src.size());
                    Log.d(LOG_TAG, "Database copied successfully to " + externalDbFile.getAbsolutePath());
                }
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error copying database to external storage", e);
            // Optionally show a toast, but it might be too noisy for the user on every save.
        }
    }

    private void showToast(String message) {
        new Handler(Looper.getMainLooper()).post(() -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
    }
}
```

---

### 4. Integrating with a WebView

In your Android `Activity` or `Fragment` that hosts the `WebView`, you need to enable JavaScript and attach an instance of the `WebAppInterface`.

```java
import android.os.Bundle;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        WebView myWebView = findViewById(R.id.my_webview);

        // Enable JavaScript
        myWebView.getSettings().setJavaScriptEnabled(true);
        
        // Enable DOM Storage API for localStorage fallback
        myWebView.getSettings().setDomStorageEnabled(true);

        // Attach the bridge
        myWebView.addJavascriptInterface(new WebAppInterface(this, myWebView), "AndroidBridge");
        
        // For debugging in Chrome DevTools
        WebView.setWebContentsDebuggingEnabled(true);

        // Load your web application
        myWebView.loadUrl("https://<your-app-url>"); 
        // Or from local assets:
        // myWebView.loadUrl("file:///android_asset/index.html");
    }
    
    // Remember to add runtime permission checks for WRITE_EXTERNAL_STORAGE
    // in this Activity for the dual-save feature to work.
}
```
