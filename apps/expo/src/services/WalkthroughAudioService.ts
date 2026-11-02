import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import * as FileSystem from "expo-file-system";

interface ActiveRecordingState {
  type: "expo-av" | "native-ink";
  instance?: any;
}

let activeRecording: ActiveRecordingState | null = null;

export class WalkthroughAudioService {
  /**
   * Starts an unblocked walkthrough audio recording session.
   * Returns true on success, false if permissions or native module failed.
   */
  static async startRecording(): Promise<boolean> {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn("[WalkthroughAudioService] Microphone permission denied");
          return false;
        }
      }

      // Stop any orphan session before starting fresh
      if (activeRecording) {
        await WalkthroughAudioService.stopRecording().catch(() => null);
      }

      const dynamicRequire = typeof require !== "undefined" ? require : null;
      let expoAv: any = null;
      try {
        expoAv = dynamicRequire ? dynamicRequire("expo-av") : null;
      } catch {
        expoAv = null;
      }

      if (expoAv?.Audio) {
        await expoAv.Audio.requestPermissionsAsync();
        await expoAv.Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await expoAv.Audio.Recording.createAsync(
          expoAv.Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        activeRecording = { type: "expo-av", instance: recording };
        return true;
      }

      if (NativeModules.JetpackInkModule?.startAudioRecording) {
        await NativeModules.JetpackInkModule.startAudioRecording();
        activeRecording = { type: "native-ink" };
        return true;
      }

      console.warn("[WalkthroughAudioService] No native audio recorder found.");
      return false;
    } catch (err) {
      console.error("[WalkthroughAudioService] Error starting audio recording:", err);
      return false;
    }
  }

  /**
   * Stops the active audio recording and returns the verified file URI.
   */
  static async stopRecording(): Promise<string | null> {
    const session = activeRecording;
    activeRecording = null;
    if (!session) return null;

    try {
      let uri: string | null = null;
      if (session.type === "expo-av" && session.instance) {
        await session.instance.stopAndUnloadAsync();
        uri = session.instance.getURI();
      } else if (session.type === "native-ink" && NativeModules.JetpackInkModule?.stopAudioRecording) {
        uri = await NativeModules.JetpackInkModule.stopAudioRecording();
      }

      if (!uri) return null;

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || (fileInfo as any).size === 0) {
        console.warn("[WalkthroughAudioService] Audio file is empty or missing:", uri);
        return null;
      }

      return uri;
    } catch (err) {
      console.error("[WalkthroughAudioService] Error stopping audio recording:", err);
      return null;
    }
  }
}

