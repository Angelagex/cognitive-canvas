import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Lasso, Trash2, X, BookmarkPlus, Copy, Mic, Check } from "@sketchyicons/react-native";
import { SelectionBounds, ThinkingMemo } from "../../../types/canvas";
import {
  startThinkingAudioRecording,
  stopAndTranscribeThinkingAudio,
  MAX_RECORDING_DURATION_MS,
} from "../../../services/DeepgramService";
import { styles } from "./ContextualToolPill.styles";

export interface ContextualSelectionPillProps {
  hasSelection: boolean;
  selectedCount: number;
  selectionBounds: SelectionBounds | null;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  activeThinkingMemo?: ThinkingMemo | null;
  onSaveThinkingMemo?: (memo: ThinkingMemo, bounds: SelectionBounds) => void;
  onOpenAttributeModal: () => void;
  onDuplicateSelection?: () => void;
  onDeleteSelection?: () => void;
  onClearSelection?: () => void;
}

export const ContextualSelectionPill: React.FC<ContextualSelectionPillProps> = ({
  hasSelection,
  selectedCount,
  selectionBounds,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  activeThinkingMemo,
  onSaveThinkingMemo,
  onOpenAttributeModal,
  onDuplicateSelection,
  onDeleteSelection,
  onClearSelection,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [draftTranscript, setDraftTranscript] = useState<string>("");
  const [recordedAt, setRecordedAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeThinkingMemo) {
      setDraftTranscript(activeThinkingMemo.transcript);
      setRecordedAt(activeThinkingMemo.recordedAt);
    } else if (!hasSelection) {
      setDraftTranscript("");
      setRecordedAt(null);
      setIsRecording(false);
      setElapsedSec(0);
    }
  }, [activeThinkingMemo, hasSelection]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!hasSelection || !selectionBounds) return null;

  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const memo = await stopAndTranscribeThinkingAudio();
      setDraftTranscript(memo.transcript);
      setRecordedAt(memo.recordedAt);
      onSaveThinkingMemo?.(memo, selectionBounds);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleMic = async () => {
    if (isRecording) {
      await handleStopRecording();
      return;
    }
    setElapsedSec(0);
    setIsRecording(true);
    await startThinkingAudioRecording(() => handleStopRecording());
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= MAX_RECORDING_DURATION_MS / 1000) {
          handleStopRecording();
          return 45;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleConfirmTranscriptEdit = () => {
    if (!draftTranscript.trim()) return;
    onSaveThinkingMemo?.(
      { transcript: draftTranscript.trim(), recordedAt: recordedAt || Date.now() },
      selectionBounds
    );
  };

  const { width: screenW, height: screenH } = Dimensions.get("window");
  const screenX = selectionBounds.centerX * canvasScale + canvasTranslateX;
  const screenY = selectionBounds.minY * canvasScale + canvasTranslateY;

  const PILL_WIDTH = 295;
  const PILL_HEIGHT = 44;
  const left = Math.max(16, Math.min(screenW - PILL_WIDTH - 16, screenX - PILL_WIDTH / 2));
  const top = Math.max(76, Math.min(screenH - PILL_HEIGHT - 20, screenY - PILL_HEIGHT - 12));

  return (
    <View style={[styles.floatingWrapper, { left, top }]} pointerEvents="box-none">
      {(recordedAt !== null || isTranscribing) && (
        <View style={styles.memoPill}>
          <Text style={styles.memoLabel}>🎙️ Thinking Memo (Deepgram Nova-2)</Text>
          {isTranscribing ? (
            <View style={styles.transcribingRow}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.transcribingText}>Transcribiendo razonamiento verbal...</Text>
            </View>
          ) : (
            <View style={styles.memoInputRow}>
              <TextInput
                style={styles.memoInput}
                value={draftTranscript}
                onChangeText={setDraftTranscript}
                onBlur={handleConfirmTranscriptEdit}
                multiline
                placeholder="Edita tu razonamiento causal..."
                placeholderTextColor="#64748B"
              />
              <TouchableOpacity
                style={styles.memoSaveBtn}
                onPress={handleConfirmTranscriptEdit}
                activeOpacity={0.8}
              >
                <Check size={13} color="#10B981" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={styles.pillContainer}>
        <View style={styles.badge}>
          <Lasso size={13} color="#38BDF8" strokeWidth={1.8} />
          <Text style={styles.badgeText}>{selectedCount}</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.attributeChip}
          onPress={onOpenAttributeModal}
          activeOpacity={0.8}
        >
          <BookmarkPlus size={13} color="#38BDF8" strokeWidth={1.8} />
          <Text style={styles.attributeChipText}>Atributo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.micBtn, isRecording && styles.micBtnRecording]}
          onPress={handleToggleMic}
          activeOpacity={0.8}
          accessibilityLabel="Grabar Thinking Memo de voz (máx 45s)"
        >
          <Mic size={13} color={isRecording ? "#FECACA" : "#38BDF8"} strokeWidth={1.9} />
          <Text style={[styles.micBtnText, isRecording && styles.micBtnTextActive]}>
            {isRecording ? `${elapsedSec}s/45s` : "🎙️"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {onDuplicateSelection && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onDuplicateSelection}
            activeOpacity={0.8}
          >
            <Copy size={13} color="#38BDF8" strokeWidth={1.8} />
          </TouchableOpacity>
        )}

        {onDeleteSelection && (
          <TouchableOpacity style={styles.actionBtn} onPress={onDeleteSelection} activeOpacity={0.8}>
            <Trash2 size={13} color="#EF4444" strokeWidth={1.8} />
          </TouchableOpacity>
        )}

        {onClearSelection && (
          <TouchableOpacity style={styles.actionBtn} onPress={onClearSelection} activeOpacity={0.8}>
            <X size={13} color="#94A3B8" strokeWidth={2.0} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const ContextualToolPill = ContextualSelectionPill;
