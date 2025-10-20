import type { AllSessions, AppSettings, SessionData } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const SETTINGS_KEY = 'appSettings';
const SESSIONS_KEY = 'allSessions';

const isBridgeAvailable = (): boolean => {
  return typeof window.AndroidBridge !== 'undefined';
};

// --- Session Storage ---

export const saveSession = (session: SessionData): void => {
  try {
    if (isBridgeAvailable()) {
      window.AndroidBridge!.saveSession(JSON.stringify(session));
    } else {
      const all = loadAllSessions() || { sessions: {}, activeSessionId: null };
      all.sessions[session.id] = session;
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
    }
  } catch (error) {
    console.error("Failed to save session:", error);
    throw new Error(`Failed to save session. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const deleteSession = (sessionId: string): void => {
  try {
    if (isBridgeAvailable()) {
      window.AndroidBridge!.deleteSession(sessionId);
    } else {
      const all = loadAllSessions();
      if (all && all.sessions[sessionId]) {
        delete all.sessions[sessionId];
        if (all.activeSessionId === sessionId) {
          all.activeSessionId = null;
        }
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
      }
    }
  } catch (error) {
    console.error("Failed to delete session:", error);
    throw new Error(`Failed to delete session. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const loadAllSessions = (): AllSessions | null => {
  try {
    if (isBridgeAvailable()) {
      const dataArrayString = window.AndroidBridge!.loadAllSessions();
      const settings = loadSettings(); // Active session ID is stored in settings
      const sessions: Record<string, SessionData> = {};

      if (dataArrayString) {
        const sessionStrings: string[] = JSON.parse(dataArrayString);
        for (const sessionStr of sessionStrings) {
          const sessionData = JSON.parse(sessionStr) as SessionData;
          if (sessionData && sessionData.id) {
            sessions[sessionData.id] = sessionData;
          }
        }
      }
      return { sessions, activeSessionId: settings.activeSessionId };
    } else {
      const data = localStorage.getItem(SESSIONS_KEY);
      if (data && data !== '{}' && data !== '{"sessions":{}}') {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed.sessions === 'object') {
          return parsed as AllSessions;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to load sessions:", error);
    throw new Error(`Failed to load sessions. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const clearAllSessions = (): void => {
  try {
    if (isBridgeAvailable()) {
      window.AndroidBridge!.clearAllSessions();
    } else {
      localStorage.removeItem(SESSIONS_KEY);
    }
  } catch (error)
 {
    console.error("Failed to clear sessions:", error);
    throw new Error(`Failed to clear sessions. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};


// --- Settings Storage ---

export const saveSettings = (settings: AppSettings): void => {
  try {
    const data = JSON.stringify(settings);
    if (isBridgeAvailable()) {
      window.AndroidBridge!.saveSettings(data);
    } else {
      localStorage.setItem(SETTINGS_KEY, data);
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw new Error(`Failed to save settings. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    let data: string | null = null;
    if (isBridgeAvailable()) {
      data = window.AndroidBridge!.loadSettings();
    } else {
      data = localStorage.getItem(SETTINGS_KEY);
    }

    if (data && data !== '{}') {
      const savedSettings = JSON.parse(data);
      // Merge with defaults to ensure any new settings from code updates are included.
      return { ...DEFAULT_SETTINGS, ...savedSettings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to load settings, using defaults:", error);
    return DEFAULT_SETTINGS;
  }
};

// --- App Control ---

export const reloadApp = (): void => {
    try {
        if (isBridgeAvailable()) {
            window.AndroidBridge!.reloadApp();
        } else {
            window.location.reload();
        }
    } catch (error) {
        console.error("Failed to reload app:", error);
        window.location.reload(); // Fallback for any error
    }
}