import * as FileSystem from "expo-file-system";
import { KeyStorageService } from "./KeyStorageService";

const commonTechKeyterms = [
  "V8:3",
  "engine:2",
  "Node.js:2",
  "Call Stack:2",
  "Libuv:3",
  "Event Loop:2",
  "Task Queue:2",
  "Bytecode:2",
  "AST:2",
  "RAM:2",
  "prototype pollution:2",
];

const keytermParams = commonTechKeyterms
  .map((k) => `keyterm=${encodeURIComponent(k)}`)
  .join("&");

export const DEEPGRAM_NOVA3_ENDPOINT = `https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&filler_words=false&detect_language=true&${keytermParams}`;

export class TranscriptionService {
  /**
   * Transcribes a recorded audio file (.m4a) strictly via Deepgram Nova-3 with keyword boosting.
   * Key resolution priority (via KeyStorageService.getDeepgramApiKey):
   * 1. EXPO_PUBLIC_DEEPGRAM_API_KEY from .env.local / .env
   * 2. Deepgram API key configured through the app (SecureStore / UserPreferences)
   */
  static async transcribeAudio(fileUri: string, explicitApiKey?: string): Promise<string> {
    const deepgramKey = explicitApiKey?.trim() || (await KeyStorageService.getDeepgramApiKey());
    console.log("[TranscriptionService] Using Deepgram API Key exists:", !!deepgramKey);

    if (!deepgramKey) {
      console.warn("[TranscriptionService] WARNING: No Deepgram API key found in .env.local or app settings.");
      throw new Error(
        "Deepgram API key is missing. Please set EXPO_PUBLIC_DEEPGRAM_API_KEY in .env.local or configure your Deepgram key in Settings."
      );
    }

    const base64Audio = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(
      "[TranscriptionService] Read audio file base64 length:",
      base64Audio.length,
      "from URI:",
      fileUri
    );

    if (!base64Audio || base64Audio.length === 0) {
      throw new Error("Recorded audio payload is empty (0 bytes).");
    }

    console.log(
      "[TranscriptionService] Sending audio file to Deepgram Nova-3 STT endpoint:",
      DEEPGRAM_NOVA3_ENDPOINT
    );
    const binaryString = typeof atob === "function" ? atob(base64Audio) : "";
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const response = await fetch(DEEPGRAM_NOVA3_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey}`,
        "Content-Type": "audio/m4a",
      },
      body: bytes.buffer,
    });

    console.log("[TranscriptionService] Deepgram HTTP Status:", response.status);
    const data = await response.json().catch(() => ({}));
    console.log("[TranscriptionService] Deepgram raw response data:", JSON.stringify(data));

    if (!response.ok) {
      const errMsg = data?.err_msg || data?.message || `HTTP ${response.status}`;
      throw new Error(`Deepgram STT failed: ${errMsg}`);
    }

    const dgTranscript: string =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ||
      data?.transcript ||
      data?.text ||
      "";

    if (!dgTranscript) {
      throw new Error("No speech detected by Deepgram STT.");
    }

    return dgTranscript;
  }
}
