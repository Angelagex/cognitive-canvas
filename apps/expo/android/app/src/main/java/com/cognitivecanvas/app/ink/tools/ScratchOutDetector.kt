package com.cognitivecanvas.app.ink.tools

import android.graphics.RectF
import android.util.Log
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.spatial.SpatialHashGrid
import kotlin.math.abs
import kotlin.math.hypot

class ScratchOutDetector {

    /**
     * Evalúa la cinemática del tachado (scratch-out) en SCREEN DP.
     * Dado que el movimiento de la mano sobre el cristal de la pantalla física es constante,
     * las coordenadas del trazo se proyectan al espacio de pantalla divididas por [density].
     *
     * Umbrales calibrados en Screen DP:
     * - Inversiones: [dominantReversals] >= 2 o [totalReversals] >= 3 con paso mínimo [minDelta] >= 4.0f dp
     * - Longitud física acumulada >= 22f dp
     * - Ratio de tortuosidad >= 1.6f
     */
    fun isScratchOutStroke(
        stroke: Stroke,
        density: Float,
        canvasScale: Float = 1.0f,
        canvasTranslateX: Float = 0f,
        canvasTranslateY: Float = 0f
    ): Boolean {
        val inputs = stroke.inputs
        val count = inputs.size
        if (count < 6) {
            Log.d("ScratchOut", "FAIL count: count=$count (< 6)")
            return false
        }

        val scale = if (canvasScale > 0.001f) canvasScale else 1.0f
        val firstPt = inputs.get(0)
        var prevSx = (firstPt.x * scale + canvasTranslateX) / density
        var prevSy = (firstPt.y * scale + canvasTranslateY) / density
        var minSx = prevSx
        var maxSx = prevSx
        var minSy = prevSy
        var maxSy = prevSy

        var totalLengthScreenDp = 0f
        var xReversals = 0
        var yReversals = 0
        var prevDx = 0f
        var prevDy = 0f
        val minDelta = 3.5f // Screen DP: permite detectar oscilaciones cortas sobre texto minúsculo

        for (i in 1 until count) {
            val pt = inputs.get(i)
            val sx = (pt.x * scale + canvasTranslateX) / density
            val sy = (pt.y * scale + canvasTranslateY) / density

            if (sx < minSx) minSx = sx
            if (sx > maxSx) maxSx = sx
            if (sy < minSy) minSy = sy
            if (sy > maxSy) maxSy = sy

            val dx = sx - prevSx
            val dy = sy - prevSy
            totalLengthScreenDp += hypot(dx, dy)

            if (abs(dx) >= minDelta) {
                if (prevDx != 0f && (dx > 0) != (prevDx > 0)) {
                    xReversals++
                }
                prevDx = dx
            }

            if (abs(dy) >= minDelta) {
                if (prevDy != 0f && (dy > 0) != (prevDy > 0)) {
                    yReversals++
                }
                prevDy = dy
            }

            prevSx = sx
            prevSy = sy
        }

        val boxDiagScreenDp = hypot(maxSx - minSx, maxSy - minSy)
        val tortuosity = if (boxDiagScreenDp > 0.001f) totalLengthScreenDp / boxDiagScreenDp else 0f
        val dominantReversals = maxOf(xReversals, yReversals)
        val totalReversals = xReversals + yReversals

        Log.d("ScratchOut", "EVAL: count=$count, pt0=(${firstPt.x}, ${firstPt.y}), xRev=$xReversals, yRev=$yReversals, domRev=$dominantReversals, totRev=$totalReversals, lenScreenDp=$totalLengthScreenDp, diag=$boxDiagScreenDp, tortuosity=$tortuosity (scale=$scale, tx=$canvasTranslateX, ty=$canvasTranslateY, density=$density)")

        // 1. Reversiones omnidireccionales físicas (2 inversiones completas ya denotan intención de tachado)
        if (dominantReversals < 2 && totalReversals < 3) {
            Log.d("ScratchOut", "FAIL reversals: count=$count, xRev=$xReversals, yRev=$yReversals, domRev=$dominantReversals (<2), totRev=$totalReversals (<3)")
            return false
        }

        // 2. Longitud acumulada total en pantalla física (>= 22 dp)
        if (totalLengthScreenDp < 22f) {
            Log.d("ScratchOut", "FAIL totalLength: count=$count, lenScreenDp=$totalLengthScreenDp (< 22dp)")
            return false
        }

        // 3. Ratio de tortuosidad en pantalla (>= 1.6f)
        if (tortuosity < 1.6f) {
            Log.d("ScratchOut", "FAIL tortuosity: count=$count, lenScreenDp=$totalLengthScreenDp, diag=$boxDiagScreenDp, tortuosity=$tortuosity (< 1.6f)")
            return false
        }

        Log.d("ScratchOut", "SUCCESS: ScratchOut detectado! count=$count, xRev=$xReversals, yRev=$yReversals, lenScreenDp=$totalLengthScreenDp, tortuosity=$tortuosity")
        return true
    }

    /**
     * Calcula el Bounding Box de borrado en World DP usando las coordenadas
     * de [stroke.inputs] divididas por [density] (coherente con getStrokeBounds en JetpackInkView)
     * con un padding de dilatación configurable (default = 8.0f World DP).
     */
    fun getScratchBoundsWorld(
        stroke: Stroke,
        density: Float,
        padding: Float = 8.0f
    ): RectF {
        val inputs = stroke.inputs
        val count = inputs.size
        if (count == 0) return RectF()

        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        val dens = if (density > 0.001f) density else 1f

        for (i in 0 until count) {
            val pt = inputs.get(i)
            val px = pt.x / dens
            val py = pt.y / dens
            if (px < minX) minX = px
            if (px > maxX) maxX = px
            if (py < minY) minY = py
            if (py > maxY) maxY = py
        }

        val bounds = RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
        Log.d("ScratchOut", "getScratchBoundsWorld: count=$count, bounds=$bounds (dens=$dens, padding=$padding)")
        return bounds
    }

    fun getScratchBoundsWorld(
        stroke: Stroke,
        padding: Float = 8.0f
    ): RectF = getScratchBoundsWorld(stroke, 1f, padding)

    /**
     * Localiza los trazos a eliminar consultando el SpatialHashGrid en World DP.
     * Solo elimina los trazos que intersectan directamente el Bounding Box del tachado,
     * garantizando cero borrado de palabras o trazos adyacentes por simpatía.
     */
    fun findStrokesToErase(
        scratchBoundsWorld: RectF,
        spatialGrid: SpatialHashGrid,
        getStrokeBounds: (Stroke) -> RectF?
    ): Set<Stroke> {
        val candidateStrokes = spatialGrid.query(scratchBoundsWorld)
        Log.d("ScratchOut", "Scratch DETECTADO. boundsWorld=$scratchBoundsWorld. Candidatos en spatialGrid=${candidateStrokes.size}")

        val hitStrokes = mutableSetOf<Stroke>()
        for (stroke in candidateStrokes) {
            val b = getStrokeBounds(stroke) ?: continue
            if (RectF.intersects(scratchBoundsWorld, b)) {
                Log.d("ScratchOut", "Hit stroke bounds=$b")
                hitStrokes.add(stroke)
            }
        }

        Log.d("ScratchOut", "Hit strokes count=${hitStrokes.size}")
        return hitStrokes
    }

    fun findStrokesToErase(
        scratchStroke: Stroke,
        spatialGrid: SpatialHashGrid,
        density: Float,
        getStrokeBounds: (Stroke) -> RectF?
    ): Set<Stroke> {
        val scratchBoundsWorld = getScratchBoundsWorld(scratchStroke, density, 8.0f)
        return findStrokesToErase(scratchBoundsWorld, spatialGrid, getStrokeBounds)
    }
}
