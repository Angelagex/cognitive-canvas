import * as FileSystem from "expo-file-system";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import { ThinkingMemo } from "../types/canvas";
import { TranscriptionService, DEEPGRAM_NOVA3_ENDPOINT } from "./TranscriptionService";

export const DEEPGRAM_LISTEN_ENDPOINT = DEEPGRAM_NOVA3_ENDPOINT;
export const MAX_RECORDING_DURATION_MS = 180000;

interface ActiveSession {
  startedAt: number;
  maxTimer: ReturnType<typeof setTimeout> | null;
  nativeRecording: any | null;
  usesJetpackRecorder: boolean;
}

let activeSession: ActiveSession | null = null;

/**
 * Starts a local audio thinking stream session (auto-capped at 45 seconds).
 */
export async function startThinkingAudioRecording(
  onMaxDurationReached?: () => void
): Promise<void> {
  if (activeSession) {
    await stopAndTranscribeThinkingAudio().catch(() => {});
  }

  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    console.log("[DeepgramService] Android RECORD_AUDIO permission:", granted);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("Microphone permission denied.");
    }
  }

  let nativeRecording: any = null;
  let usesJetpackRecorder = false;

  try {
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
    nativeRecording = null;
  }

  if (!nativeRecording && NativeModules.JetpackInkModule?.startAudioRecording) {
    await NativeModules.JetpackInkModule.startAudioRecording();
    usesJetpackRecorder = true;
  }

  if (!nativeRecording && !usesJetpackRecorder) {
    throw new Error(
      "Native audio recorder is not linked in the current APK. Rebuild Android (npx expo run:android) to enable microphone recording."
    );
  }

  const maxTimer = setTimeout(() => {
    onMaxDurationReached?.();
  }, MAX_RECORDING_DURATION_MS);

  activeSession = {
    startedAt: Date.now(),
    maxTimer,
    nativeRecording,
    usesJetpackRecorder,
  };
}

/**
 * Stops the active recording and dispatches audio bytes to TranscriptionService.
 */
export async function stopAndTranscribeThinkingAudio(): Promise<ThinkingMemo> {
  const session = activeSession;
  activeSession = null;

  if (session?.maxTimer) {
    clearTimeout(session.maxTimer);
  }

  let audioUri: string | null = null;
  if (session?.nativeRecording) {
    await session.nativeRecording.stopAndUnloadAsync();
    audioUri = session.nativeRecording.getURI();
  } else if (session?.usesJetpackRecorder && NativeModules.JetpackInkModule?.stopAudioRecording) {
    audioUri = await NativeModules.JetpackInkModule.stopAudioRecording();
  }

  if (!audioUri) {
    throw new Error("No audio file URI was produced by the recorder.");
  }

  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  console.log("[DeepgramService] Recorded Audio File Info:", JSON.stringify(fileInfo));

  const recordedAt = Date.now();
  const transcript = await TranscriptionService.transcribeAudio(audioUri);

  return {
    transcript,
    recordedAt,
  };
}

export async function transcribeAudioWithDeepgram(
  audioUri: string | null,
  explicitApiKey?: string
): Promise<string> {
  if (!audioUri) {
    throw new Error("Audio URI is missing; cannot transcribe empty recording.");
  }
  return TranscriptionService.transcribeAudio(audioUri, explicitApiKey);
}
