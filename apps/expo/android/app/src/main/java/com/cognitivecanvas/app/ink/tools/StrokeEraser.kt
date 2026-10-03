package com.cognitivecanvas.app.ink.tools

import androidx.ink.strokes.Stroke
import java.util.concurrent.CopyOnWriteArrayList

class StrokeEraser {

    private fun distanceToSegmentSquared(
        px: Float, py: Float,
        x1: Float, y1: Float,
        x2: Float, y2: Float
    ): Float {
        val dx = x2 - x1
        val dy = y2 - y1
        val l2 = dx * dx + dy * dy
        if (l2 == 0f) {
            val dpx = px - x1
            val dpy = py - y1
            return dpx * dpx + dpy * dpy
        }
        val t = ((px - x1) * dx + (py - y1) * dy) / l2
        val clampedT = t.coerceIn(0f, 1f)
        val projX = x1 + clampedT * dx
        val projY = y1 + clampedT * dy
        val distDx = px - projX
        val distDy = py - projY
        return distDx * distDx + distDy * distDy
    }

    fun eraseAt(
        screenX: Float,
        screenY: Float,
        canvasTranslateX: Float,
        canvasTranslateY: Float,
        canvasScale: Float,
        strokeWidth: Float,
        completedStrokes: CopyOnWriteArrayList<Stroke>,
        onStrokesRemoved: (removed: List<Stroke>) -> Unit
    ) {
        val worldX = (screenX - canvasTranslateX) / canvasScale
        val worldY = (screenY - canvasTranslateY) / canvasScale
        // Radius adapted for stylus and fingertip swiping
        val eraseRadius = (strokeWidth * 3.0f).coerceAtLeast(100f) / canvasScale
        val eraseRadiusSq = eraseRadius * eraseRadius

        val toRemove = mutableListOf<Stroke>()
        for (stroke in completedStrokes) {
            val inputs = stroke.inputs
            val inputCount = inputs.size
            if (inputCount == 0) continue

            var hit = false
            for (i in 0 until inputCount) {
                val pt = inputs.get(i)
                val dx = pt.x - worldX
                val dy = pt.y - worldY
                if (dx * dx + dy * dy <= eraseRadiusSq) {
                    hit = true
                    break
                }
                if (i < inputCount - 1) {
                    val pNext = inputs.get(i + 1)
                    if (distanceToSegmentSquared(worldX, worldY, pt.x, pt.y, pNext.x, pNext.y) <= eraseRadiusSq) {
                        hit = true
                        break
                    }
                }
            }

            if (hit) {
                toRemove.add(stroke)
            }
        }

        if (toRemove.isNotEmpty()) {
            completedStrokes.removeAll(toRemove)
            onStrokesRemoved(toRemove)
        }
    }
}
