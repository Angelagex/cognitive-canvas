package com.cognitivecanvas.app.ink.tools

import android.view.MotionEvent
import android.view.View
import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput
import com.cognitivecanvas.app.ink.events.InkEventEmitter
import com.cognitivecanvas.app.ink.rendering.StickerStrokeAnimator
import com.facebook.react.bridge.ReadableMap
import java.util.IdentityHashMap

/**
 * Gestor de instanciación y posicionamiento nativo de stickers vectoriales.
 * Transforma coordenadas relativas (0..100) del catálogo a World DP,
 * inyecta los trazos en el modo selección del Lazo y orquesta el sellado animado.
 */
class StickerPlacementManager(
    private val hostView: View,
    private val lassoManager: LassoSelectionManager,
    private val animator: StickerStrokeAnimator,
    private val eventEmitter: InkEventEmitter,
    private val strokeColorMap: IdentityHashMap<Stroke, String>
) {
    @Volatile
    var hasPendingSticker: Boolean = false
        private set

    /**
     * Instancia los trazos del sticker en coordenadas World DP a partir de su definición JSON.
     */
    fun instantiateStickerStrokes(
        stickerData: ReadableMap,
        targetWorldX: Float,
        targetWorldY: Float,
        density: Float,
        colorInt: Int,
        baseWidth: Float
    ): List<Stroke> {
        val width = if (stickerData.hasKey("default_width")) {
            stickerData.getDouble("default_width").toFloat()
        } else 64.0f

        val height = if (stickerData.hasKey("default_height")) {
            stickerData.getDouble("default_height").toFloat()
        } else 64.0f

        val originX = targetWorldX - (width / 2.0f)
        val originY = targetWorldY - (height / 2.0f)

        val strokesArray = stickerData.getArray("strokes") ?: return emptyList()
        val strokesList = mutableListOf<Stroke>()

        for (sIdx in 0 until strokesArray.size()) {
            val strokeMap = strokesArray.getMap(sIdx) ?: continue
            val relWidth = if (strokeMap.hasKey("relative_width")) {
                strokeMap.getDouble("relative_width").toFloat()
            } else 2.2f

            val pointsArray = strokeMap.getArray("points") ?: continue
            val pointCount = pointsArray.size()
            if (pointCount < 2) continue

            val batch = MutableStrokeInputBatch()
            for (pIdx in 0 until pointCount) {
                val pMap = pointsArray.getMap(pIdx) ?: continue
                val rx = pMap.getDouble("rx").toFloat()
                val ry = pMap.getDouble("ry").toFloat()
                val pressure = if (pMap.hasKey("p")) pMap.getDouble("p").toFloat() else 0.8f

                // Proyección a World DP y escala nativa de pixels
                val wx = originX + (rx / 100.0f) * width
                val wy = originY + (ry / 100.0f) * height
                val px = wx * density
                val py = wy * density

                val input = StrokeInput.create(
                    px,
                    py,
                    (pIdx * 10).toLong(),
                    InputToolType.STYLUS,
                    0f,
                    pressure,
                    0f,
                    0f
                )
                batch.add(input)
            }

            val brushSize = (baseWidth * relWidth * 0.7f).coerceIn(2.0f, 20.0f)
            val brush = Brush.createWithColorIntArgb(
                family = StockBrushes.marker(),
                colorIntArgb = colorInt,
                size = brushSize,
                epsilon = 0.1f
            )

            strokesList.add(Stroke(brush, batch.toImmutable()))
        }

        return strokesList
    }

    /**
     * Coloca el sticker en el lienzo activando inmediatamente el modo de selección Lazo.
     */
    fun placeSticker(
        stickerData: ReadableMap,
        targetWorldX: Float,
        targetWorldY: Float,
        density: Float,
        colorInt: Int,
        baseWidth: Float
    ) {
        // Si había otro sticker pendiente de confirmación, sellarlo primero
        if (hasPendingSticker) {
            confirmPendingSticker()
        }

        val strokes = instantiateStickerStrokes(
            stickerData = stickerData,
            targetWorldX = targetWorldX,
            targetWorldY = targetWorldY,
            density = density,
            colorInt = colorInt,
            baseWidth = baseWidth
        )

        if (strokes.isEmpty()) return

        val colorHex = String.format("#%06X", 0xFFFFFF and colorInt)
        for (s in strokes) {
            strokeColorMap[s] = colorHex
        }

        // 1. Inyección directa en la selección activa sin agregarlo a completedStrokes
        lassoManager.setSelection(strokes, density)
        hasPendingSticker = true

        // 2. Notificar a React Native para mostrar ContextualSelectionPill
        eventEmitter.emitSelectionChanged(true, strokes.size, lassoManager.selectionBounds)
        hostView.postInvalidateOnAnimation()
    }

    /**
     * Confirma la posición del sticker ejecutando la animación de ensamblaje concurrente.
     */
    fun confirmPendingSticker(onCompleted: (() -> Unit)? = null) {
        if (!hasPendingSticker) {
            onCompleted?.invoke()
            return
        }

        val finalStrokes = lassoManager.getTransformedStrokes()
        lassoManager.clearSelection()
        hasPendingSticker = false
        eventEmitter.emitSelectionChanged(false, 0, null)

        animator.animateAndSeal(finalStrokes, onCompleted)
    }

    /**
     * Cancela y descarta el sticker sin dejar residuos en memoria.
     */
    fun cancelPendingSticker() {
        if (!hasPendingSticker) return
        hasPendingSticker = false
        lassoManager.clearSelection()
        eventEmitter.emitSelectionChanged(false, 0, null)
        hostView.postInvalidateOnAnimation()
    }
}
