package com.cognitivecanvas.app.ink.tools

import android.graphics.RectF
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.spatial.SpatialHashGrid

class ScratchOutDetector {

    fun isScratchOutStroke(stroke: Stroke, density: Float, canvasScale: Float): Boolean {
        val scaleDensity = density * canvasScale.coerceAtLeast(0.1f)
        val inputs = stroke.inputs
        val count = inputs.size
        if (count < 8) return false

        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        var totalLengthWorldDp = 0f
        var xReversals = 0
        var yReversals = 0
        var prevDx = 0f
        var prevDy = 0f

        val minDeltaWorldDp = 4f // 4dp movement threshold in world space to filter jitter invariant to zoom

        for (i in 0 until count) {
            val pt = inputs.get(i)
            val px = pt.x / scaleDensity
            val py = pt.y / scaleDensity
            if (px < minX) minX = px
            if (px > maxX) maxX = px
            if (py < minY) minY = py
            if (py > maxY) maxY = py

            if (i > 0) {
                val prevPt = inputs.get(i - 1)
                val dx = (pt.x - prevPt.x) / scaleDensity
                val dy = (pt.y - prevPt.y) / scaleDensity
                totalLengthWorldDp += kotlin.math.hypot(dx, dy)

                if (kotlin.math.abs(dx) >= minDeltaWorldDp) {
                    if (prevDx != 0f && (dx > 0) != (prevDx > 0)) {
                        xReversals++
                    }
                    prevDx = dx
                }
                if (kotlin.math.abs(dy) >= minDeltaWorldDp) {
                    if (prevDy != 0f && (dy > 0) != (prevDy > 0)) {
                        yReversals++
                    }
                    prevDy = dy
                }
            }
        }

        // Reversiones de dirección: mínimo 5 reversiones en X o en Y
        if (xReversals < 5 && yReversals < 5) return false

        val widthWorldDp = maxX - minX
        if (totalLengthWorldDp < 45f) return false

        // Filtro de Tortuosidad: totalLength / boxDiag >= 4.5f
        val boxDiag = kotlin.math.hypot(maxX - minX, maxY - minY)
        if (boxDiag <= 0.001f) return false
        val tortuosity = totalLengthWorldDp / boxDiag
        if (tortuosity < 4.5f) return false

        // Filtro de Regresión Horizontal
        if (widthWorldDp > totalLengthWorldDp * 0.28f) return false

        return true
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
            val interLeft = maxOf(scratchBounds.left, b.left)
            val interRight = minOf(scratchBounds.right, b.right)
            val interTop = maxOf(scratchBounds.top, b.top)
            val interBottom = minOf(scratchBounds.bottom, b.bottom)

            if (interRight > interLeft && interBottom > interTop) {
                val strokeW = b.right - b.left
                val strokeH = b.bottom - b.top
                val interW = interRight - interLeft
                val interH = interBottom - interTop

                val centerX = (b.left + b.right) / 2f
                val centerY = (b.top + b.bottom) / 2f
                val centerInScratch = centerX >= scratchBounds.left && centerX <= scratchBounds.right &&
                        centerY >= scratchBounds.top && centerY <= scratchBounds.bottom

                if (centerInScratch || (interW >= strokeW * 0.3f && interH >= 10f) || interW >= 20f) {
                    hitStrokes.add(stroke)
                }
            }
        }

        if (hitStrokes.isEmpty()) return emptySet()

        // Expand to the full cluster so the entire handwritten entity/word is erased
        val strokesToDelete = mutableSetOf<Stroke>()
        strokesToDelete.addAll(hitStrokes)

        val queue = ArrayDeque<Stroke>()
        queue.addAll(hitStrokes)
        val scratchHeight = scratchBounds.bottom - scratchBounds.top
        val clusterProximity = minOf(15f, maxOf(6f, scratchHeight * 0.35f))

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

                if (dx <= clusterProximity && dy <= clusterProximity) {
                    strokesToDelete.add(other)
                    queue.add(other)
                }
            }
        }

        return strokesToDelete
    }
}
