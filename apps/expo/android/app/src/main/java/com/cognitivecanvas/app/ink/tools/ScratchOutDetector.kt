package com.cognitivecanvas.app.ink.tools

import android.graphics.RectF
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.spatial.SpatialHashGrid

class ScratchOutDetector {

    /**
     * Determines whether the given stroke represents a scratch-out gesture.
     * Stroke inputs captured via inProgressStrokesView.startStroke are already transformed
     * into infinite canvas world space by the inverse camera matrix.
     * Coordinates are strictly normalized to World DP dividing by [density] to guarantee zoom invariance.
     */
    fun isScratchOutStroke(stroke: Stroke, density: Float, canvasScale: Float = 1f): Boolean {
        val inputs = stroke.inputs
        val count = inputs.size
        if (count < 8) return false

        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        var totalLengthWorldDp = 0f
        var xReversals = 0
        var prevDx = 0f

        val minDeltaWorldDp = 3.5f // Umbral en World DP para registrar reversión de dirección inmune al zoom

        for (i in 0 until count) {
            val pt = inputs.get(i)
            val px = pt.x / density
            val py = pt.y / density
            if (px < minX) minX = px
            if (px > maxX) maxX = px
            if (py < minY) minY = py
            if (py > maxY) maxY = py

            if (i > 0) {
                val prevPt = inputs.get(i - 1)
                val dx = (pt.x - prevPt.x) / density
                val dy = (pt.y - prevPt.y) / density
                totalLengthWorldDp += kotlin.math.hypot(dx, dy)

                if (kotlin.math.abs(dx) >= minDeltaWorldDp) {
                    if (prevDx != 0f && (dx > 0) != (prevDx > 0)) {
                        xReversals++
                    }
                    prevDx = dx
                }
            }
        }

        // Reversiones horizontales: xReversals >= 4
        if (xReversals < 4) return false

        // Longitud acumulada total: totalLengthWorldDp >= 40f
        if (totalLengthWorldDp < 40f) return false

        // Ratio de tortuosidad: totalLengthWorldDp / boxDiag >= 3.8f
        val boxDiag = kotlin.math.hypot(maxX - minX, maxY - minY)
        if (boxDiag <= 0.001f) return false
        val tortuosity = totalLengthWorldDp / boxDiag
        if (tortuosity < 3.8f) return false

        return true
    }

    /**
     * Finds existing strokes covered by the scratch-out gesture and expands to the full word cluster.
     * All spatial evaluations and the bounding box of the scratch are performed in World DP.
     */
    fun findStrokesToErase(
        scratchStroke: Stroke,
        spatialGrid: SpatialHashGrid,
        density: Float,
        getStrokeBounds: (Stroke) -> RectF?
    ): Set<Stroke> {
        val inputs = scratchStroke.inputs
        val count = inputs.size
        if (count == 0) return emptySet()

        // 1. scratchBounds generado estrictamente en World DP (px, py normalizados por density)
        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE
        for (i in 0 until count) {
            val pt = inputs.get(i)
            val px = pt.x / density
            val py = pt.y / density
            if (px < minX) minX = px
            if (px > maxX) maxX = px
            if (py < minY) minY = py
            if (py > maxY) maxY = py
        }
        val scratchBounds = RectF(minX, minY, maxX, maxY)

        // 2. Consulta al SpatialHashGrid compartiendo el mismo espacio de referencia (World DP)
        val candidateStrokes = spatialGrid.query(scratchBounds)
        val hitStrokes = mutableListOf<Stroke>()
        for (stroke in candidateStrokes) {
            val b = getStrokeBounds(stroke) ?: continue
            val interLeft = maxOf(scratchBounds.left, b.left)
            val interRight = minOf(scratchBounds.right, b.right)
            val interTop = maxOf(scratchBounds.top, b.top)
            val interBottom = minOf(scratchBounds.bottom, b.bottom)

            if (interRight > interLeft && interBottom > interTop) {
                val strokeW = b.width()
                val strokeH = b.height()
                val interW = interRight - interLeft
                val interH = interBottom - interTop

                val centerX = b.centerX()
                val centerY = b.centerY()
                val centerInScratch = scratchBounds.contains(centerX, centerY)

                if (centerInScratch || (interW >= strokeW * 0.25f) || interW >= 15f || (interW > 0 && interH > 0 && strokeW <= 20f)) {
                    hitStrokes.add(stroke)
                }
            }
        }

        if (hitStrokes.isEmpty()) return emptySet()

        // 3. Expansión del clúster (borrado de la palabra completa)
        val strokesToDelete = mutableSetOf<Stroke>()
        strokesToDelete.addAll(hitStrokes)

        val queue = ArrayDeque<Stroke>()
        queue.addAll(hitStrokes)
        val clusterProximity = (scratchBounds.height() * 0.4f).coerceIn(8f, 24f)

        while (queue.isNotEmpty()) {
            val curr = queue.removeFirst()
            val currBounds = getStrokeBounds(curr) ?: continue

            val queryBox = RectF(
                currBounds.left - clusterProximity,
                currBounds.top - clusterProximity,
                currBounds.right + clusterProximity,
                currBounds.bottom + clusterProximity
            )
            val nearby = spatialGrid.query(queryBox)

            for (other in nearby) {
                if (strokesToDelete.contains(other)) continue
                val otherBounds = getStrokeBounds(other) ?: continue

                val dx = maxOf(0f, maxOf(currBounds.left - otherBounds.right, otherBounds.left - currBounds.right))
                val dy = maxOf(0f, maxOf(currBounds.top - otherBounds.bottom, otherBounds.top - currBounds.bottom))

                // Solo absorbe trazos cuya distancia horizontal respete la cercanía de la palabra para no borrar términos adyacentes
                if (dx <= clusterProximity && dy <= clusterProximity) {
                    strokesToDelete.add(other)
                    queue.add(other)
                }
            }
        }

        return strokesToDelete
    }

    fun findStrokesToErase(
        scratchStroke: Stroke,
        spatialGrid: SpatialHashGrid,
        getStrokeBounds: (Stroke) -> RectF?
    ): Set<Stroke> {
        val scratchBounds = getStrokeBounds(scratchStroke) ?: return emptySet()
        val candidateStrokes = spatialGrid.query(scratchBounds)
        val hitStrokes = mutableListOf<Stroke>()
        for (stroke in candidateStrokes) {
            val b = getStrokeBounds(stroke) ?: continue
            if (RectF.intersects(scratchBounds, b)) {
                hitStrokes.add(stroke)
            }
        }
        return hitStrokes.toSet()
    }
}
