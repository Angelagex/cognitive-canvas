import { getUserPreferences, saveUserPreferences } from "./StorageService";

const GEMINI_KEY_STORAGE_KEY = "cognitive_canvas_gemini_api_key";

/**
 * Safely resolves `expo-secure-store` at runtime only if the native `ExpoSecureStore`
 * module is compiled into the current Android binary. Avoids top-level crash when running
 * on an existing dev-client APK prior to a native Gradle rebuild.
 */
function getNativeSecureStore(): typeof import("expo-secure-store") | null {
  try {
    const { requireOptionalNativeModule } = require("expo-modules-core");
    if (!requireOptionalNativeModule("ExpoSecureStore")) {
      return null;
    }
    return require("expo-secure-store");
  } catch {
    return null;
  }
}

export class KeyStorageService {
  /**
   * Retrieves the Gemini API key.
   * Priority:
   * 1. EXPO_PUBLIC_GEMINI_API_KEY from .env.local (local dev override)
   * 2. Encrypted value in SecureStore (if native module is linked)
   * 3. Local user preferences in FileSystem (fallback when running without native rebuild)
   */
  static async getApiKey(): Promise<string | null> {
    if (process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim()) {
      return process.env.EXPO_PUBLIC_GEMINI_API_KEY.trim();
    }

    const secureStore = getNativeSecureStore();
    if (secureStore) {
      try {
        const storedKey = await secureStore.getItemAsync(GEMINI_KEY_STORAGE_KEY);
        if (storedKey && storedKey.trim().length > 0) {
          return storedKey.trim();
        }
      } catch (error) {
        console.warn("SecureStore read fallback to local preferences:", error);
      }
    }

    try {
      const prefs = await getUserPreferences();
      if (prefs.gemini_api_key && prefs.gemini_api_key.trim().length > 0) {
        return prefs.gemini_api_key.trim();
      }
    } catch {}

    return null;
  }

  static async setApiKey(apiKey: string): Promise<void> {
    const clean = apiKey.trim();
    const secureStore = getNativeSecureStore();
    if (secureStore) {
      try {
        await secureStore.setItemAsync(GEMINI_KEY_STORAGE_KEY, clean);
      } catch (error) {
        console.warn("SecureStore write fallback to local preferences:", error);
      }
    }
    await saveUserPreferences({ gemini_api_key: clean });
  }

  static async clearApiKey(): Promise<void> {
    const secureStore = getNativeSecureStore();
    if (secureStore) {
      try {
        await secureStore.deleteItemAsync(GEMINI_KEY_STORAGE_KEY);
      } catch (error) {
        console.warn("SecureStore delete fallback to local preferences:", error);
      }
    }
    await saveUserPreferences({ gemini_api_key: "" });
  }

  /**
   * Dispatches a lightweight 1-word probe to Google Generative Language API
   * to verify the key before the user compiles a full canvas.
   */
  static async testApiKey(candidateKey?: string): Promise<{ valid: boolean; message: string }> {
    const keyToTest = candidateKey?.trim() || (await KeyStorageService.getApiKey());
    if (!keyToTest) {
      return { valid: false, message: "No Gemini API Key provided." };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
        keyToTest
      )}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with the single word: READY" }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
        }),
      });

      if (res.ok) {
        return { valid: true, message: "Verified! Gemini API key is active and ready." };
      }

      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}`;
      return { valid: false, message: `Invalid API Key (${errMsg})` };
    } catch (err: any) {
      return {
        valid: false,
        message: `Connection error testing key: ${err?.message || "Unknown error"}`,
      };
    }
  }
}
