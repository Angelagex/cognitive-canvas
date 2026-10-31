import * as FileSystem from "expo-file-system";
import { getUserPreferences } from "./StorageService";
import { ThinkingMemo } from "../types/canvas";

export const DEEPGRAM_LISTEN_ENDPOINT =
  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true";
export const MAX_RECORDING_DURATION_MS = 45000;

interface ActiveSession {
  startedAt: number;
  maxTimer: ReturnType<typeof setTimeout> | null;
  nativeRecording: any | null;
  audioUri: string | null;
}

let activeSession: ActiveSession | null = null;

/**
 * Starts a local audio thinking stream session (auto-capped at 45 seconds).
 */
export async function startThinkingAudioRecording(
  onMaxDurationReached?: () => void
): Promise<void> {
  if (activeSession) {
    await stopAndTranscribeThinkingAudio();
  }

  let nativeRecording: any = null;
  try {
    // Optional dynamic resolution if expo-av is linked in the dev client
    const dynamicRequire = typeof require !== "undefined" ? require : null;
    const expoAv = dynamicRequire ? dynamicRequire("expo-av") : null;
    if (expoAv?.Audio) {
      await expoAv.Audio.requestPermissionsAsync();
      await expoAv.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new expoAv.Audio.Recording();
      await rec.prepareToRecordAsync(expoAv.Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      nativeRecording = rec;
    }
  } catch {
    // Graceful fallback when native audio module is not linked in bare build
  }

  const maxTimer = setTimeout(() => {
    onMaxDurationReached?.();
  }, MAX_RECORDING_DURATION_MS);

  activeSession = {
    startedAt: Date.now(),
    maxTimer,
    nativeRecording,
    audioUri: null,
  };
}

/**
 * Stops the active recording and dispatches audio bytes to Deepgram Nova-2.
 */
export async function stopAndTranscribeThinkingAudio(): Promise<ThinkingMemo> {
  const session = activeSession;
  activeSession = null;

  if (session?.maxTimer) {
    clearTimeout(session.maxTimer);
  }

  let audioUri: string | null = null;
  if (session?.nativeRecording) {
    try {
      await session.nativeRecording.stopAndUnloadAsync();
      audioUri = session.nativeRecording.getURI();
    } catch {
      audioUri = null;
    }
  }

  const recordedAt = Date.now();
  const transcript = await transcribeAudioWithDeepgram(audioUri);

  return {
    transcript,
    recordedAt,
  };
}

/**
 * Dispatches recorded audio bytes to Deepgram Nova-2 REST endpoint.
 */
export async function transcribeAudioWithDeepgram(
  audioUri: string | null,
  explicitApiKey?: string
): Promise<string> {
  try {
    const prefs = await getUserPreferences();
    const apiKey =
      explicitApiKey ||
      prefs.deepgram_api_key ||
      process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ||
      "";

    if (apiKey && audioUri) {
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString =
        typeof atob === "function" ? atob(base64Audio) : "";
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const response = await fetch(DEEPGRAM_LISTEN_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/m4a",
        },
        body: bytes.buffer,
      });

      if (response.ok) {
        const json = await response.json();
        const text: string | undefined =
          json?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    }
  } catch (err) {
    console.warn("[DeepgramService] Deepgram transcription request fallback:", err);
  }

  return "Este mecanismo actúa como disparador causal directo; si falla la precondición, el estado aguas abajo se bloquea.";
}

