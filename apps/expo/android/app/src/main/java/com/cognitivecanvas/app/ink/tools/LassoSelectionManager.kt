package com.cognitivecanvas.app.ink.tools

import android.graphics.*
import androidx.ink.brush.Brush
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput
import java.util.concurrent.CopyOnWriteArrayList

class LassoSelectionManager {

    val lassoPoints = mutableListOf<PointF>()
    val selectedStrokes = mutableListOf<Stroke>()
    var selectionBounds: RectF? = null

    private var isDraggingSelection = false
    private var lastDragX = 0f
    private var lastDragY = 0f
    private var totalDragDx = 0f
    private var totalDragDy = 0f

    // Selection Paints
    private val lassoPathPaint = Paint().apply {
        color = Color.parseColor("#38BDF8")
        style = Paint.Style.STROKE
        strokeWidth = 2.5f
        pathEffect = DashPathEffect(floatArrayOf(14f, 8f), 0f)
        isAntiAlias = true
    }

    private val selectionBoxPaint = Paint().apply {
        color = Color.parseColor("#38BDF8")
        style = Paint.Style.STROKE
        strokeWidth = 2.0f
        pathEffect = DashPathEffect(floatArrayOf(10f, 6f), 0f)
        isAntiAlias = true
    }

    private val handlePaint = Paint().apply {
        color = Color.parseColor("#38BDF8")
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    private val handleBorderPaint = Paint().apply {
        color = Color.parseColor("#0F172A")
        style = Paint.Style.STROKE
        strokeWidth = 2f
        isAntiAlias = true
    }

    fun isHandlingSelection(worldX: Float, worldY: Float): Boolean {
        val bounds = selectionBounds ?: return false
        val padding = 20f
        return worldX >= bounds.left - padding && worldX <= bounds.right + padding &&
               worldY >= bounds.top - padding && worldY <= bounds.bottom + padding
    }

    fun onTouchDown(worldX: Float, worldY: Float): Boolean {
        if (selectedStrokes.isNotEmpty() && isHandlingSelection(worldX, worldY)) {
            // Touch landed inside active selection -> begin dragging strokes
            isDraggingSelection = true
            lastDragX = worldX
            lastDragY = worldY
            totalDragDx = 0f
            totalDragDy = 0f
            return true
        }

        // New lasso stroke -> clear old selection and begin lasso path
        clearSelection()
        isDraggingSelection = false
        lassoPoints.clear()
        lassoPoints.add(PointF(worldX, worldY))
        return false
    }

    fun onTouchMove(
        worldX: Float,
        worldY: Float,
        completedStrokes: CopyOnWriteArrayList<Stroke>
    ) {
        if (isDraggingSelection) {
            val dx = worldX - lastDragX
            val dy = worldY - lastDragY
            if (dx == 0f && dy == 0f) return

            totalDragDx += dx
            totalDragDy += dy

            // Translate selected strokes in place
            val newSelected = mutableListOf<Stroke>()
            for (stroke in selectedStrokes) {
                val translated = translateStroke(stroke, dx, dy)
                val idx = completedStrokes.indexOf(stroke)
                if (idx != -1) {
                    completedStrokes[idx] = translated
                }
                newSelected.add(translated)
            }
            selectedStrokes.clear()
            selectedStrokes.addAll(newSelected)

            // Update bounding box
            selectionBounds?.offset(dx, dy)

            lastDragX = worldX
            lastDragY = worldY
        } else {
            lassoPoints.add(PointF(worldX, worldY))
        }
    }

    fun onTouchUp(completedStrokes: List<Stroke>): Boolean {
        if (isDraggingSelection) {
            isDraggingSelection = false
            return selectedStrokes.isNotEmpty()
        }

        if (lassoPoints.size < 6) {
            clearSelection()
            lassoPoints.clear()
            return false
        }

        // Evaluate point-in-polygon containment for completed strokes
        val newlySelected = mutableListOf<Stroke>()
        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        for (stroke in completedStrokes) {
            val inputs = stroke.inputs
            val inputCount = inputs.size
            if (inputCount == 0) continue

            var pointsInside = 0
            for (i in 0 until inputCount) {
                val pt = inputs.get(i)
                if (isPointInPolygon(pt.x, pt.y, lassoPoints)) {
                    pointsInside++
                }
            }

            // If at least 35% of the stroke's points fall inside the loop, select it
            if (pointsInside > 0 && (pointsInside.toFloat() / inputCount) >= 0.35f) {
                newlySelected.add(stroke)
                for (i in 0 until inputCount) {
                    val pt = inputs.get(i)
                    if (pt.x < minX) minX = pt.x
                    if (pt.x > maxX) maxX = pt.x
                    if (pt.y < minY) minY = pt.y
                    if (pt.y > maxY) maxY = pt.y
                }
            }
        }

        lassoPoints.clear()

        if (newlySelected.isNotEmpty()) {
            selectedStrokes.clear()
            selectedStrokes.addAll(newlySelected)
            val padding = 12f
            selectionBounds = RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
            return true
        } else {
            clearSelection()
            return false
        }
    }

    fun recolorSelected(
        newColor: Int,
        completedStrokes: CopyOnWriteArrayList<Stroke>
    ) {
        if (selectedStrokes.isEmpty()) return
        val newSelected = mutableListOf<Stroke>()
        for (stroke in selectedStrokes) {
            val origBrush = stroke.brush
            val newBrush = Brush.createWithColorIntArgb(
                family = origBrush.family,
                colorIntArgb = newColor,
                size = origBrush.size,
                epsilon = origBrush.epsilon
            )
            val recolored = Stroke(newBrush, stroke.inputs)
            val idx = completedStrokes.indexOf(stroke)
            if (idx != -1) {
                completedStrokes[idx] = recolored
            }
            newSelected.add(recolored)
        }
        selectedStrokes.clear()
        selectedStrokes.addAll(newSelected)
    }

    fun deleteSelected(completedStrokes: CopyOnWriteArrayList<Stroke>): List<Stroke> {
        val removed = ArrayList(selectedStrokes)
        completedStrokes.removeAll(removed)
        clearSelection()
        return removed
    }

    fun clearSelection() {
        selectedStrokes.clear()
        selectionBounds = null
        isDraggingSelection = false
        lassoPoints.clear()
    }

    fun draw(canvas: Canvas, scale: Float) {
        // 1. Draw ongoing lasso loop
        if (lassoPoints.size >= 2) {
            val path = Path()
            path.moveTo(lassoPoints[0].x, lassoPoints[0].y)
            for (i in 1 until lassoPoints.size) {
                path.lineTo(lassoPoints[i].x, lassoPoints[i].y)
            }
            canvas.drawPath(path, lassoPathPaint)
        }

        // 2. Draw selection bounding box and handles
        val bounds = selectionBounds
        if (bounds != null && selectedStrokes.isNotEmpty()) {
            canvas.drawRect(bounds, selectionBoxPaint)

            // Draw corner grab handles
            val handleRadius = (7f / scale).coerceIn(4f, 12f)
            val corners = arrayOf(
                PointF(bounds.left, bounds.top),
                PointF(bounds.right, bounds.top),
                PointF(bounds.right, bounds.bottom),
                PointF(bounds.left, bounds.bottom)
            )
            for (c in corners) {
                canvas.drawCircle(c.x, c.y, handleRadius, handlePaint)
                canvas.drawCircle(c.x, c.y, handleRadius, handleBorderPaint)
            }
        }
    }

    private fun translateStroke(stroke: Stroke, dx: Float, dy: Float): Stroke {
        val inputs = stroke.inputs
        val count = inputs.size
        val batch = MutableStrokeInputBatch()
        for (i in 0 until count) {
            val pt = inputs.get(i)
            val translated = StrokeInput.create(
                pt.x + dx,
                pt.y + dy,
                pt.elapsedTimeMillis,
                pt.toolType,
                pt.strokeUnitLengthCm,
                pt.pressure,
                pt.tiltRadians,
                pt.orientationRadians
            )
            batch.addOrIgnore(translated)
        }
        return Stroke(stroke.brush, batch.asImmutable())
    }

    private fun isPointInPolygon(px: Float, py: Float, polygon: List<PointF>): Boolean {
        var inside = false
        val n = polygon.size
        var j = n - 1
        for (i in 0 until n) {
            val xi = polygon[i].x
            val yi = polygon[i].y
            val xj = polygon[j].x
            val yj = polygon[j].y
            val intersect = ((yi > py) != (yj > py)) &&
                    (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
            j = i
        }
        return inside
    }
}
