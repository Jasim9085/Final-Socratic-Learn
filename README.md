# Socratic Tutor AI

Socratic Tutor AI is a sophisticated web application that simulates a dynamic educational conversation between an AI student and an AI teacher, guided by an AI validator. Built with React and TypeScript, this application brings the logic of a multi-agent learning system to life with a rich, interactive, and highly customizable user interface.

## Core Features

- **Multi-Agent Socratic Dialogue**: An AI "student" asks questions, and an AI "teacher" provides Socratic-style explanations. An AI "validator" can periodically check the teacher's accuracy.
- **Direct Chat Mode**: Switch from the automated agent mode to a direct chatbot experience to ask questions and get immediate answers.
- **Session Management**: All conversations are automatically saved. Users can create, switch between, delete, export, and import sessions.
- **Quiz & Summary Generation**: End a session at any time to generate a comprehensive summary and an interactive multiple-choice quiz based on the conversation.
- **Concept Visualization**: Generate an interactive concept map (mind map, tree, flow chart, or table) to visually explore the key topics discussed.
- **Deep Customization**: A comprehensive settings page allows users to:
    - Configure multiple Gemini API keys with automatic rotation.
    - Assign different AI models (including custom ones) to different tasks (student, teacher, quiz generation, etc.).
    - Fine-tune AI personality, including the teacher's tone and the intensity of the Socratic method.
    - Customize system prompts for advanced control over AI behavior.
    - Adjust the application's appearance, including theme (dark/light) and font size.
- **Rich Content Support**: Full Markdown and LaTeX rendering for clear, well-formatted text, tables, and mathematical equations.
- **Google Search Integration**: Optionally ground the AI teacher's responses in up-to-date information from Google Search.
- **Offline & Native Ready**: Works seamlessly offline using the browser's Local Storage or can integrate with a native Android wrapper via a JavaScript Bridge for enhanced data persistence.

## Technologies Used

- **Frontend**: React, TypeScript
- **AI**: Google Gemini API via `@google/genai`
- **Styling**: Tailwind CSS
- **Markdown/Math**: `react-markdown`, KaTeX, `remark-math`, `remark-gfm`

---

## Project Structure & File Breakdown

This section provides a detailed overview of the application's architecture, explaining the purpose of each file and the key functions within them.

### Root Files

-   **`index.html`**: The main entry point of the web application. It sets up the HTML document structure, imports fonts, Tailwind CSS, and KaTeX. It includes an `importmap` to manage browser-native ES module dependencies (like React and `@google/genai`), eliminating the need for a separate build step.
-   **`index.tsx`**: The top-level script that bootstraps the React application. It finds the `<div id="root">` element in `index.html` and renders the main `<App />` component into it.
-   **`App.tsx`**: The heart of the application. This is the main component that orchestrates all state, logic, and UI rendering.
    -   **State Management**: Uses React hooks (`useState`, `useRef`, `useEffect`) to manage all application state, including settings, session data, UI visibility (modals, sidebars), and the current conversation. `useRef` is used to prevent stale closures in async callbacks.
    -   **Effects (`useEffect`)**: Handles initial data loading, saving session progress, applying theme changes, and managing the core agent conversation loop.
    -   **Session Lifecycle Functions**: Contains all logic for creating, loading, starting, and managing new sessions (e.g., `createNewSession`, `loadSession`, `handleStartSession`).
    -   **Agent Logic (`runAgentTurn`)**: The core function for the Socratic Tutor mode. It executes a single student-teacher exchange. A `useEffect` hook calls this function in a loop when the app is in `'running_auto'` state.
    -   **User Action Handlers**: A collection of callback functions (`handleSend`, `handleRegenerate`, `handleRephrase`, etc.) that are passed down to child components to handle user interactions.
    -   **Component Rendering**: Uses `React.Suspense` and `React.lazy` to code-split and lazy-load major components, improving initial load times. It conditionally renders different views (`SessionStart`, `ConversationDisplay`) based on the application's `sessionState`.
-   **`types.ts`**: A central file defining all shared TypeScript types and interfaces (`Turn`, `AppSettings`, `SessionData`, `ConceptMapData`, etc.) used throughout the project to ensure type safety.
-   **`constants.ts`**: Defines application-wide constants, primarily the `DEFAULT_SETTINGS` object, which serves as the fallback and initial state for all user-configurable settings.

### `services/`

This directory contains modules that abstract away external interactions and side effects.

-   **`geminiService.ts`**: Encapsulates all communication with the Google Gemini API.
    -   **`withApiKeyRotation`**: A critical higher-order function that wraps every API call. It transparently cycles through all user-provided API keys, retrying a failed request with the next key. This provides resilience against exhausted or invalid keys.
    -   **API Functions**: Provides specific functions for each AI task (e.g., `getStudentResponseStream`, `getTeacherResponse`, `generateSummaryAndQuiz`, `generateConceptMap`, `generateConceptualImage`). These functions construct the appropriate system prompts, user prompts, and model configurations (like JSON schemas or function calling tools) before making the API call.
-   **`storageService.ts`**: Handles all data persistence logic.
    -   **Android Bridge Integration**: It intelligently detects if the app is running inside a native Android WebView by checking for `window.AndroidBridge`.
    -   **Dual Storage Mechanism**: If the bridge exists, it delegates all storage operations (e.g., `saveSession`, `loadAllSessions`) to the native Android app. If not, it gracefully falls back to using the browser's `localStorage`. This allows the same codebase to work as both a web app and a native-integrated app.

### `components/`

This directory contains all the React components that make up the user interface.

-   **`SessionStart.tsx`**: The initial welcome screen. It prompts the user for a topic and uses `geminiService` to fetch dynamic, relevant topic suggestions.
-   **`ConversationDisplay.tsx`**: The main chat view. It maps over the turns of a conversation and renders a `MessageBubble` for each one. It also manages the auto-scrolling behavior.
-   **`MessageBubble.tsx`**: Renders a single message in the conversation. This is a highly complex component responsible for displaying content (with full Markdown and KaTeX support), role information, attachments, generated images, validator feedback, and all interactive buttons (Copy, Regenerate, Rephrase, Side Discussion, etc.).
-   **`ControlPanel.tsx`**: The user input area at the bottom of the screen. It contains the text area for typing messages, file upload buttons, and all primary action controls (New Chat, Continue Agent, Generate Quiz, etc.).
-   **`SettingsPage.tsx`**: The comprehensive, tabbed modal for all application settings. It allows users to manage API keys, select models for different tasks, customize system prompts, and adjust appearance.
-   **`SessionSidebar.tsx`**: The sidebar for managing all saved conversations. It lists all sessions, allowing the user to switch between them, delete, export, or import sessions.
-   **Modal Components**:
    -   `QuizDisplay.tsx`: Renders the summary and interactive quiz after a session is finished.
    -   `ConceptMapModal.tsx`: The container for the concept map visualization.
    -   `DiscussionModal.tsx`: A modal for having a "side conversation" about a specific message, keeping the main chat clean.
    -   `ImageGenerationModal.tsx`: A tool for generating conceptual images based on conversation context.
    -   `ImageViewerModal.tsx`: A fullscreen modal for viewing, zooming, and panning images.
    -   `ExportModal.tsx`: Provides options to export the current session as a text or JSON file.
    -   `ErrorModal.tsx`: A simple modal to display any critical errors that occur.
-   **UI Elements**:
    -   `Icons.tsx`: Contains all SVG icon components used throughout the app.
    -   `Loader.tsx`: A reusable loading spinner component.
    -   `ThemeToggle.tsx`, `InteractionModeToggle.tsx`: Reusable toggle switch components.

### `utils/`

-   **`markdownComponents.tsx`**: Defines custom renderers for `react-markdown`, enabling features like syntax-highlighted code blocks (using `react-syntax-highlighter`), custom-styled tables, and properly formatted headers.
-   **`fileUtils.ts`**: Contains helper functions for handling file uploads, such as converting a `File` object to a Base64 string for the Gemini API.

### `hooks/`

-   **`useCopyToClipboard.ts`**: A custom React hook that abstracts the logic for copying text to the clipboard and managing the temporary "Copied!" feedback state.

---

## Android Bridge Integration

For enhanced persistence and native device integration (e.g., saving files), the application is designed to work within an Android WebView and communicate with the native Android host app via a JavaScript Bridge.

### Purpose

The bridge provides a robust SQLite database storage mechanism, which is superior to the browser's `localStorage`. When the app is wrapped in an Android WebView, the bridge allows each conversation session to be saved, loaded, and deleted individually in a structured database. This is more efficient and scalable than storing all data in a single text block. It also enables native functionalities like the system's file saver.

### How It Works

The application's `storageService.ts` module handles all data persistence. Upon initialization, it checks for the existence of `window.AndroidBridge`.

-   **If `window.AndroidBridge` is found**: All session-related function calls (e.g., `saveSession`, `deleteSession`, `loadAllSessions`) are delegated to the corresponding methods on the bridge object, which then interact with the native SQLite database.
-   **If `window.AndroidBridge` is not found**: The service gracefully falls back to using the browser's standard `localStorage` API, storing all sessions in a single JSON object.

This design allows the same codebase to run as a standalone web app and as an embedded component in a native Android app without any changes.

### Bridge API Specification

To work correctly, the native Android application must inject a JavaScript object named `AndroidBridge` into the WebView. This object must expose the following methods:

#### Session Management (SQLite Backend)

**1. `saveSession(sessionData: string): void`**
-   **Description**: Saves or updates a single session in the database.
-   **`sessionData` Argument**: A JSON string representing a single `SessionData` object.
-   **Example `sessionData`**:
    ```json
    { "id": "session-id-1", "topic": "Photosynthesis", "turns": {...}, "turnOrder": [...], "createdAt": 167..., "updatedAt": 167... }
    ```
-   **Native Implementation**: The Android host should parse this string to get the `id` and `updatedAt` timestamp. It should then perform an `INSERT OR REPLACE` operation into an SQLite table with columns like `session_id TEXT PRIMARY KEY`, `updated_at INTEGER`, and `json_data TEXT`.

**2. `loadAllSessions(): string`**
-   **Description**: Loads all sessions from the database.
-   **Return Value**: Must return a JSON string representing an *array of session JSON strings*.
-   **Example Return Value**: `[ "{\"id\":\"session-1\",...}", "{\"id\":\"session-2\",...}" ]`
-   **Native Implementation**: The Android host should query all rows from its sessions table, retrieve the `json_data` for each row, and construct a JSON array string from these results.

**3. `deleteSession(sessionId: string): void`**
-   **Description**: Deletes a single session from the database using its ID.
-   **`sessionId` Argument**: The unique ID of the session to delete (e.g., `"session-id-1"`).
-   **Native Implementation**: Execute a `DELETE` statement in SQLite where `session_id` matches the provided argument.

**4. `clearAllSessions(): void`**
-   **Description**: Deletes all sessions from the database.
-   **Native Implementation**: Execute a `DELETE` statement on the sessions table to clear all records.

#### Settings & App Management (Unchanged)

**5. `saveSettings(data: string): void`** & **`loadSettings(): string`**
-   These methods save and load the `AppSettings` object. This can be stored in `SharedPreferences` as it's a single, smaller object.

**6. `saveFile(fileName: string, mimeType: string, content: string): void`**
-   Invoked for exporting. Triggers the native file saver.

**7. `reloadApp(): void`**
-   Instructs the WebView to reload its content.

### Example Native Android Implementation (Kotlin with SQLite)

Here is a sample implementation of the JavaScript Bridge interface using SQLite for session storage.

**1. Create the `DatabaseHelper` Class**: This class manages the database creation and versioning.

```kotlin
// DatabaseHelper.kt
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class DatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    companion object {
        private const val DATABASE_VERSION = 1
        private const val DATABASE_NAME = "SocraticTutor.db"
        const val TABLE_SESSIONS = "sessions"
        const val COLUMN_ID = "session_id"
        const val COLUMN_UPDATED_AT = "updated_at"
        const val COLUMN_JSON_DATA = "json_data"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTable = ("CREATE TABLE " + TABLE_SESSIONS + "("
                + COLUMN_ID + " TEXT PRIMARY KEY,"
                + COLUMN_UPDATED_AT + " INTEGER,"
                + COLUMN_JSON_DATA + " TEXT" + ")")
        db.execSQL(createTable)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SESSIONS")
        onCreate(db)
    }
}
```

**2. Update the `WebAppInterface`**: This class will now use the `DatabaseHelper` to interact with the SQLite database.

```kotlin
// WebAppInterface.kt
import android.content.ContentValues
import android.content.Context
import android.os.Environment
import android.provider.MediaStore
import android.util.JsonReader
import android.util.JsonWriter
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import org.json.JSONObject
import java.io.StringWriter

class WebAppInterface(private val context: Context, private val webView: WebView) {

    private val dbHelper = DatabaseHelper(context)
    private val prefs = context.getSharedPreferences("SocraticTutorPrefs", Context.MODE_PRIVATE)
    private val SETTINGS_KEY = "appSettings"

    // --- Session Management using SQLite ---

    @JavascriptInterface
    fun saveSession(sessionData: String) {
        try {
            val db = dbHelper.writableDatabase
            val json = JSONObject(sessionData)
            val sessionId = json.getString("id")
            val updatedAt = json.getLong("updatedAt")

            val values = ContentValues().apply {
                put(DatabaseHelper.COLUMN_ID, sessionId)
                put(DatabaseHelper.COLUMN_UPDATED_AT, updatedAt)
                put(DatabaseHelper.COLUMN_JSON_DATA, sessionData)
            }
            db.replace(DatabaseHelper.TABLE_SESSIONS, null, values)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @JavascriptInterface
    fun loadAllSessions(): String {
        val db = dbHelper.readableDatabase
        val cursor = db.query(DatabaseHelper.TABLE_SESSIONS, arrayOf(DatabaseHelper.COLUMN_JSON_DATA),
            null, null, null, null, "${DatabaseHelper.COLUMN_UPDATED_AT} DESC")

        val stringWriter = StringWriter()
        val jsonWriter = JsonWriter(stringWriter)
        jsonWriter.beginArray()
        cursor.use {
            while (it.moveToNext()) {
                val jsonData = it.getString(it.getColumnIndexOrThrow(DatabaseHelper.COLUMN_JSON_DATA))
                jsonWriter.value(jsonData) // Write the stringified JSON as a value
            }
        }
        jsonWriter.endArray()
        return stringWriter.toString()
    }

    @JavascriptInterface
    fun deleteSession(sessionId: String) {
        val db = dbHelper.writableDatabase
        db.delete(DatabaseHelper.TABLE_SESSIONS, "${DatabaseHelper.COLUMN_ID} = ?", arrayOf(sessionId))
    }
    
    @JavascriptInterface
    fun clearAllSessions() {
        val db = dbHelper.writableDatabase
        db.delete(DatabaseHelper.TABLE_SESSIONS, null, null)
    }

    // --- Settings, File, and App Management (simplified for brevity) ---
    @JavascriptInterface
    fun saveSettings(data: String) { prefs.edit().putString(SETTINGS_KEY, data).apply() }

    @JavascriptInterface
    fun loadSettings(): String { return prefs.getString(SETTINGS_KEY, "") ?: "" }
    
    @JavascriptInterface
    fun reloadApp() { webView.post { webView.reload() } }

    @JavascriptInterface
    fun saveFile(fileName: String, mimeType: String, content: String) { /* ... implementation ... */ }
}
```

**3. Attach the Bridge to your WebView**: This part remains the same. In your `Activity` or `Fragment`, enable JavaScript and add the interface.

```kotlin
// In your Activity's onCreate or Fragment's onViewCreated
val myWebView: WebView = findViewById(R.id.my_webview)

myWebView.settings.javaScriptEnabled = true
myWebView.settings.domStorageEnabled = true // Enable localStorage fallback

myWebView.addJavascriptInterface(WebAppInterface(this, myWebView), "AndroidBridge")

myWebView.loadUrl("...") // Load the web app
```