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
    // Altura canónica de referencia para el modelo de ML Kit (rango ideal de caligrafía: 120-200 dp)
    private const val TARGET_CANONICAL_HEIGHT = 160f

    suspend fun recognizeStrokes(strokes: List<InkStrokeData>): RecognitionResult {
        val recognizer = DigitalInkModelManager.getRecognizer()
        if (recognizer == null || strokes.isEmpty()) {
            return RecognitionResult(null, 0f, emptyList(), false)
        }

        // 1. Calcular el Bounding Box envolvente en World Space
        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE
        var pointCount = 0

        for (s in strokes) {
            for (p in s.points) {
                if (p.x < minX) minX = p.x
                if (p.x > maxX) maxX = p.x
                if (p.y < minY) minY = p.y
                if (p.y > maxY) maxY = p.y
                pointCount++
            }
        }

        if (pointCount == 0) {
            return RecognitionResult(null, 0f, emptyList(), false)
        }

        val width = maxX - minX
        val height = maxY - minY

        // 2. Escala canónica isotrópica (mantiene estrictamente el aspect ratio para no deformar letras ni círculos)
        val scale = when {
            height > 5f -> (TARGET_CANONICAL_HEIGHT / height).coerceIn(0.01f, 50.0f)
            width > 5f -> (TARGET_CANONICAL_HEIGHT / width).coerceIn(0.01f, 50.0f)
            else -> 1.0f
        }

        Log.d(TAG, "📐 Normalización canónica ML Kit: Dim original ${width}x${height} -> Escala: $scale (Zoom-invariante)")

        // 3. Proyectar trazos normalizados al origen (0,0) con escala canónica
        val inkBuilder = Ink.builder()
        for (strokeData in strokes) {
            val strokeBuilder = Ink.Stroke.builder()
            for (p in strokeData.points) {
                val normX = (p.x - minX) * scale
                val normY = (p.y - minY) * scale
                strokeBuilder.addPoint(Ink.Point.create(normX, normY, p.t))
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
