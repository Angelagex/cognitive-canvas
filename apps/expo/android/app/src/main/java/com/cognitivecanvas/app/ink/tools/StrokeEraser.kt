package com.cognitivecanvas.app.ink.tools

import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import java.util.concurrent.CopyOnWriteArrayList

class StrokeEraser {

    var eraserMode: String = "stroke" // "stroke" or "precision"

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
        density: Float = 1.0f,
        onStrokesRemoved: (removed: List<Stroke>) -> Unit
    ) {
        val worldX = (screenX - canvasTranslateX) / (canvasScale * density)
        val worldY = (screenY - canvasTranslateY) / (canvasScale * density)
        val eraseRadius = strokeWidth / 2f
        val eraseRadiusSq = eraseRadius * eraseRadius

        if (eraserMode == "stroke") {
            // Whole Stroke Eraser Mode
            val toRemove = mutableListOf<Stroke>()
            for (stroke in completedStrokes) {
                val inputs = stroke.inputs
                val inputCount = inputs.size
                if (inputCount == 0) continue

                var hit = false
                for (i in 0 until inputCount) {
                    val pt = inputs.get(i)
                    val ptWorldX = pt.x / density
                    val ptWorldY = pt.y / density
                    val dx = ptWorldX - worldX
                    val dy = ptWorldY - worldY
                    if (dx * dx + dy * dy <= eraseRadiusSq) {
                        hit = true
                        break
                    }
                    if (i < inputCount - 1) {
                        val pNext = inputs.get(i + 1)
                        val pNextWorldX = pNext.x / density
                        val pNextWorldY = pNext.y / density
                        if (distanceToSegmentSquared(worldX, worldY, ptWorldX, ptWorldY, pNextWorldX, pNextWorldY) <= eraseRadiusSq) {
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
        } else {
            // Precision / Segment Eraser Mode
            val toRemove = mutableListOf<Stroke>()
            val toAdd = mutableListOf<Stroke>()

            for (stroke in completedStrokes) {
                val inputs = stroke.inputs
                val inputCount = inputs.size
                if (inputCount == 0) continue

                val isErased = BooleanArray(inputCount)
                var anyPointErased = false

                for (i in 0 until inputCount) {
                    val pt = inputs.get(i)
                    val ptWorldX = pt.x / density
                    val ptWorldY = pt.y / density
                    val dx = ptWorldX - worldX
                    val dy = ptWorldY - worldY
                    if (dx * dx + dy * dy <= eraseRadiusSq) {
                        isErased[i] = true
                        anyPointErased = true
                    }
                }

                if (anyPointErased) {
                    toRemove.add(stroke)

                    // Reconstruct non-erased segments as smaller sub-strokes
                    var currentBatch: MutableStrokeInputBatch? = null
                    var currentRunLength = 0

                    for (i in 0 until inputCount) {
                        if (!isErased[i]) {
                            if (currentBatch == null) {
                                currentBatch = MutableStrokeInputBatch()
                                currentRunLength = 0
                            }
                            currentBatch.addOrIgnore(inputs.get(i))
                            currentRunLength++
                        } else {
                            if (currentBatch != null) {
                                if (currentRunLength >= 2) {
                                    try {
                                        toAdd.add(Stroke(stroke.brush, currentBatch.asImmutable()))
                                    } catch (_: Exception) {}
                                }
                                currentBatch = null
                                currentRunLength = 0
                            }
                        }
                    }

                    if (currentBatch != null && currentRunLength >= 2) {
                        try {
                            toAdd.add(Stroke(stroke.brush, currentBatch.asImmutable()))
                        } catch (_: Exception) {}
                    }
                }
            }

            if (toRemove.isNotEmpty()) {
                completedStrokes.removeAll(toRemove)
                if (toAdd.isNotEmpty()) {
                    completedStrokes.addAll(toAdd)
                }
                onStrokesRemoved(toRemove)
            }
        }
    }
}
