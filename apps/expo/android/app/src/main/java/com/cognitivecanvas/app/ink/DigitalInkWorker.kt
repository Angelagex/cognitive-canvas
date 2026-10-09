package com.cognitivecanvas.app.ink

import android.util.Log
import com.google.mlkit.vision.digitalink.Ink
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

data class InkPointData(val x: Float, val y: Float, val t: Long)
data class InkStrokeData(val id: String, val points: List<InkPointData>)

data class RecognitionResult(
    val transcription: String?,
    val confidence: Float,
    val candidates: List<String>,
    val isTextBlock: Boolean
)

/**
 * Worker en segundo plano para inferencia de trazos manuscritos con ML Kit.
 * Convierte trazos vectoriales a Ink y resuelve candidatos de texto u orden gráfico.
 */
object DigitalInkWorker {
    private const val TAG = "DigitalInkWorker"
    private const val CONFIDENCE_THRESHOLD = 0.65f

    suspend fun recognizeStrokes(strokes: List<InkStrokeData>): RecognitionResult {
        val recognizer = DigitalInkModelManager.getRecognizer()
        if (recognizer == null || strokes.isEmpty()) {
            return RecognitionResult(null, 0f, emptyList(), false)
        }

        val inkBuilder = Ink.builder()
        for (strokeData in strokes) {
            val strokeBuilder = Ink.Stroke.builder()
            for (p in strokeData.points) {
                strokeBuilder.addPoint(Ink.Point.create(p.x, p.y, p.t))
            }
            inkBuilder.addStroke(strokeBuilder.build())
        }
        val ink = inkBuilder.build()

        return suspendCancellableCoroutine { continuation ->
            recognizer.recognize(ink)
                .addOnSuccessListener { result ->
                    val candidateList = result.candidates.map { it.text }
                    val topCandidate = result.candidates.firstOrNull()

                    if (topCandidate != null && topCandidate.text.isNotBlank()) {
                        val score = topCandidate.score ?: 0.85f // ML Kit devuelve score normalizado o null si es muy alto
                        val text = topCandidate.text.trim()
                        val isText = score >= CONFIDENCE_THRESHOLD || text.length > 1
                        
                        Log.d(TAG, "🎯 Inferencia ML Kit: '$text' (Score: $score, isText: $isText)")
                        continuation.resume(RecognitionResult(text, score, candidateList, isText))
                    } else {
                        continuation.resume(RecognitionResult(null, 0f, emptyList(), false))
                    }
                }
                .addOnFailureListener { e ->
                    Log.w(TAG, "Aviso en reconocimiento ML Kit: ${e.message}")
                    continuation.resume(RecognitionResult(null, 0f, emptyList(), false))
                }
        }
    }
}
