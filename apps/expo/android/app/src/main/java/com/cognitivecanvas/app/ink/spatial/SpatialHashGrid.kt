package com.cognitivecanvas.app.ink.spatial

import android.graphics.RectF
import androidx.ink.strokes.Stroke
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.floor

/**
 * High-performance spatial indexing structure using a 2D Spatial Hash Grid in World Space.
 * Provides O(1) broadphase collision detection for Stylus Hover, Stroke Eraser, and Lasso Selection.
 */
class SpatialHashGrid(
    private val cellSize: Float = 64f
) {
    // 64-bit packed hash keys mapping to concurrent sets of strokes
    private val cells = ConcurrentHashMap<Long, MutableSet<Stroke>>()
    // Internal cache of stroke bounding boxes for fast deregistration
    private val strokeBoundsMap = ConcurrentHashMap<Stroke, RectF>()

    private fun hashKey(cellX: Int, cellY: Int): Long {
        return ((cellX.toLong() and 0xFFFFFFFFL) shl 32) or (cellY.toLong() and 0xFFFFFFFFL)
    }

    /**
     * Inserts a stroke into all grid cells intersected by its bounding box.
     */
    fun insert(stroke: Stroke, bounds: RectF) {
        val cached = RectF(bounds)
        strokeBoundsMap[stroke] = cached

        val minCellX = floor(cached.left / cellSize).toInt()
        val maxCellX = floor(cached.right / cellSize).toInt()
        val minCellY = floor(cached.top / cellSize).toInt()
        val maxCellY = floor(cached.bottom / cellSize).toInt()

        // Clamp to prevent degenerate loop sizes on corrupted input
        val startX = minCellX
        val endX = minOf(maxCellX, startX + 250)
        val startY = minCellY
        val endY = minOf(maxCellY, startY + 250)

        for (cx in startX..endX) {
            for (cy in startY..endY) {
                val key = hashKey(cx, cy)
                cells.computeIfAbsent(key) {
                    Collections.newSetFromMap(ConcurrentHashMap())
                }.add(stroke)
            }
        }
    }

    /**
     * Removes a stroke from all grid cells it occupies.
     */
    fun remove(stroke: Stroke, bounds: RectF? = null) {
        val b = bounds ?: strokeBoundsMap[stroke] ?: return
        strokeBoundsMap.remove(stroke)

        val minCellX = floor(b.left / cellSize).toInt()
        val maxCellX = floor(b.right / cellSize).toInt()
        val minCellY = floor(b.top / cellSize).toInt()
        val maxCellY = floor(b.bottom / cellSize).toInt()

        val startX = minCellX
        val endX = minOf(maxCellX, startX + 250)
        val startY = minCellY
        val endY = minOf(maxCellY, startY + 250)

        for (cx in startX..endX) {
            for (cy in startY..endY) {
                val key = hashKey(cx, cy)
                val set = cells[key]
                if (set != null) {
                    set.remove(stroke)
                    if (set.isEmpty()) {
                        cells.remove(key)
                    }
                }
            }
        }
    }

    /**
     * Queries all candidate strokes intersecting the specified bounding box in O(1) time.
     */
    fun query(bounds: RectF): Set<Stroke> {
        val minCellX = floor(bounds.left / cellSize).toInt()
        val maxCellX = floor(bounds.right / cellSize).toInt()
        val minCellY = floor(bounds.top / cellSize).toInt()
        val maxCellY = floor(bounds.bottom / cellSize).toInt()

        val result = HashSet<Stroke>()
        val startX = minCellX
        val endX = minOf(maxCellX, startX + 250)
        val startY = minCellY
        val endY = minOf(maxCellY, startY + 250)

        for (cx in startX..endX) {
            for (cy in startY..endY) {
                val key = hashKey(cx, cy)
                cells[key]?.let { result.addAll(it) }
            }
        }
        return result
    }

    /**
     * Queries all candidate strokes within a radius around (worldX, worldY).
     */
    fun queryRadius(worldX: Float, worldY: Float, radius: Float): Set<Stroke> {
        val bounds = RectF(worldX - radius, worldY - radius, worldX + radius, worldY + radius)
        return query(bounds)
    }

    /**
     * Clears all indexed strokes and grid cells.
     */
    fun clear() {
        cells.clear()
        strokeBoundsMap.clear()
    }

    fun getBounds(stroke: Stroke): RectF? = strokeBoundsMap[stroke]

    fun size(): Int = strokeBoundsMap.size
}
