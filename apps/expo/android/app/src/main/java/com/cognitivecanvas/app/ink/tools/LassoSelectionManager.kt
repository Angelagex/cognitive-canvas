package com.cognitivecanvas.app.ink.tools

import android.graphics.*
import androidx.ink.brush.Brush
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.math.abs
import kotlin.math.hypot

class LassoSelectionManager {

    val lassoPoints = mutableListOf<PointF>()
    val selectedStrokes = mutableListOf<Stroke>()
    val selectedStrokesSet = HashSet<Stroke>()
    var selectionBounds: RectF? = null

    // V3 Affine Matrix Transformation: Decouples visual dragging/scaling from stroke reallocation
    val selectionMatrix = Matrix()

    var isDraggingSelection = false
        private set
    private var lastDragX = 0f
    private var lastDragY = 0f
    private var totalDragDx = 0f
    private var totalDragDy = 0f

    // Corner handle scaling
    var isResizingSelection = false
        private set
    private var resizePivot = PointF()
    private val initialBounds = RectF()
    private var currentScaleFactor = 1.0f

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

    fun isHandlingSelection(worldX: Float, worldY: Float, canvasScale: Float = 1.0f): Boolean {
        val bounds = selectionBounds ?: return false
        val padding = (20f / canvasScale.coerceAtLeast(0.1f)).coerceIn(10f, 32f)
        return worldX >= bounds.left - padding && worldX <= bounds.right + padding &&
               worldY >= bounds.top - padding && worldY <= bounds.bottom + padding
    }

    private fun hitTestCorner(worldX: Float, worldY: Float, bounds: RectF, scale: Float): Int {
        val hitRadius = (22f / scale.coerceAtLeast(0.1f)).coerceIn(16f, 40f)
        val corners = arrayOf(
            PointF(bounds.left, bounds.top),       // 0: Top-Left
            PointF(bounds.right, bounds.top),      // 1: Top-Right
            PointF(bounds.right, bounds.bottom),   // 2: Bottom-Right
            PointF(bounds.left, bounds.bottom)     // 3: Bottom-Left
        )
        for (i in corners.indices) {
            val dist = hypot(worldX - corners[i].x, worldY - corners[i].y)
            if (dist <= hitRadius) return i
        }
        return -1
    }

    private fun getCornerPivot(cornerIndex: Int, bounds: RectF): PointF {
        return when (cornerIndex) {
            0 -> PointF(bounds.right, bounds.bottom) // Top-Left -> pivot is Bottom-Right
            1 -> PointF(bounds.left, bounds.bottom)  // Top-Right -> pivot is Bottom-Left
            2 -> PointF(bounds.left, bounds.top)     // Bottom-Right -> pivot is Top-Left
            else -> PointF(bounds.right, bounds.top) // Bottom-Left -> pivot is Top-Right
        }
    }

    fun onTouchDown(worldX: Float, worldY: Float, canvasScale: Float = 1.0f): Boolean {
        val bounds = selectionBounds
        if (selectedStrokes.isNotEmpty() && bounds != null) {
            val cornerIdx = hitTestCorner(worldX, worldY, bounds, canvasScale)
            if (cornerIdx != -1) {
                isResizingSelection = true
                isDraggingSelection = false
                resizePivot = getCornerPivot(cornerIdx, bounds)
                initialBounds.set(bounds)
                currentScaleFactor = 1.0f
                return true
            }

            if (isHandlingSelection(worldX, worldY, canvasScale)) {
                // Touch landed inside active selection -> begin dragging strokes
                isDraggingSelection = true
                isResizingSelection = false
                lastDragX = worldX
                lastDragY = worldY
                totalDragDx = 0f
                totalDragDy = 0f
                return true
            }
        }

        // New lasso stroke -> clear old selection and begin lasso path
        clearSelection()
        isDraggingSelection = false
        isResizingSelection = false
        lassoPoints.clear()
        lassoPoints.add(PointF(worldX, worldY))
        return false
    }

    /**
     * V3 Zero-GC drag & resize handler: Accumulates transforms in selectionMatrix
     * without instantiating or replacing Strokes at 120 Hz.
     */
    fun onTouchMove(
        worldX: Float,
        worldY: Float,
        density: Float = 1.0f,
        completedStrokes: CopyOnWriteArrayList<Stroke>? = null
    ) {
        if (isResizingSelection) {
            val currentDist = hypot(worldX - resizePivot.x, worldY - resizePivot.y)
            val initDist = hypot(initialBounds.centerX() - resizePivot.x, initialBounds.centerY() - resizePivot.y) * 2f
            val newScale = (currentDist / initDist.coerceAtLeast(10f)).coerceIn(0.2f, 5.0f)
            currentScaleFactor = newScale

            selectionMatrix.reset()
            selectionMatrix.setScale(newScale, newScale, resizePivot.x * density, resizePivot.y * density)

            // Update bounding box visually (World DP)
            selectionBounds?.let { b ->
                val m = Matrix()
                m.setScale(newScale, newScale, resizePivot.x, resizePivot.y)
                m.mapRect(b, initialBounds)
            }
        } else if (isDraggingSelection) {
            val dx = worldX - lastDragX
            val dy = worldY - lastDragY
            if (dx == 0f && dy == 0f) return

            totalDragDx += dx
            totalDragDy += dy

            // Accumulate affine transform in Matrix (native pixels for stroke rendering)
            selectionMatrix.postTranslate(dx * density, dy * density)

            // Update bounding box visually (World DP)
            selectionBounds?.offset(dx, dy)

            lastDragX = worldX
            lastDragY = worldY
        } else {
            lassoPoints.add(PointF(worldX, worldY))
        }
    }

    /**
     * Commits translation or scaling once on touch release, or performs point-in-polygon selection.
     */
    fun onTouchUp(
        completedStrokes: CopyOnWriteArrayList<Stroke>,
        candidateStrokes: Collection<Stroke>? = null,
        density: Float = 1.0f,
        onStrokesTransformed: ((oldList: List<Stroke>, newList: List<Stroke>, dx: Float, dy: Float) -> Unit)? = null
    ): Boolean {
        if (isResizingSelection) {
            isResizingSelection = false
            if (currentScaleFactor != 1.0f) {
                val oldSelected = ArrayList(selectedStrokes)
                val newSelected = mutableListOf<Stroke>()
                for (stroke in oldSelected) {
                    val scaled = scaleStroke(stroke, currentScaleFactor, resizePivot.x, resizePivot.y, density)
                    val idx = completedStrokes.indexOf(stroke)
                    if (idx != -1) {
                        completedStrokes[idx] = scaled
                    }
                    newSelected.add(scaled)
                }
                selectedStrokes.clear()
                selectedStrokes.addAll(newSelected)
                selectedStrokesSet.clear()
                selectedStrokesSet.addAll(newSelected)

                // Update physical bounding box from scaled strokes (in World DP)
                var minX = Float.MAX_VALUE
                var maxX = -Float.MAX_VALUE
                var minY = Float.MAX_VALUE
                var maxY = -Float.MAX_VALUE
                for (s in newSelected) {
                    val inputs = s.inputs
                    for (i in 0 until inputs.size) {
                        val pt = inputs.get(i)
                        val strokePtX = pt.x / density
                        val strokePtY = pt.y / density
                        if (strokePtX < minX) minX = strokePtX
                        if (strokePtX > maxX) maxX = strokePtX
                        if (strokePtY < minY) minY = strokePtY
                        if (strokePtY > maxY) maxY = strokePtY
                    }
                }
                val padding = 12f
                selectionBounds = RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
                onStrokesTransformed?.invoke(oldSelected, newSelected, 0f, 0f)
            }
            selectionMatrix.reset()
            currentScaleFactor = 1.0f
            return selectedStrokes.isNotEmpty()
        }

        if (isDraggingSelection) {
            isDraggingSelection = false
            if (totalDragDx != 0f || totalDragDy != 0f) {
                val dragDx = totalDragDx
                val dragDy = totalDragDy
                // Apply physical mutation only once upon touch release
                val oldSelected = ArrayList(selectedStrokes)
                val newSelected = mutableListOf<Stroke>()
                for (stroke in oldSelected) {
                    val translated = translateStroke(stroke, dragDx, dragDy, density)
                    val idx = completedStrokes.indexOf(stroke)
                    if (idx != -1) {
                        completedStrokes[idx] = translated
                    }
                    newSelected.add(translated)
                }
                selectedStrokes.clear()
                selectedStrokes.addAll(newSelected)
                selectedStrokesSet.clear()
                selectedStrokesSet.addAll(newSelected)

                onStrokesTransformed?.invoke(oldSelected, newSelected, dragDx, dragDy)
                totalDragDx = 0f
                totalDragDy = 0f
            }
            selectionMatrix.reset()
            return selectedStrokes.isNotEmpty()
        }

        if (lassoPoints.size < 4) {
            clearSelection()
            lassoPoints.clear()
            return false
        }

        // 1. Auto-cierre geométrico del polígono
        val closedLoop = ArrayList(lassoPoints)
        if (closedLoop.size > 2) {
            closedLoop.add(closedLoop.first())
        }

        val newlySelected = mutableListOf<Stroke>()
        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        val strokesToTest = candidateStrokes ?: completedStrokes

        for (stroke in strokesToTest) {
            val inputs = stroke.inputs
            val inputCount = inputs.size
            if (inputCount == 0) continue

            var pointsInside = 0
            var sMinX = Float.MAX_VALUE
            var sMaxX = -Float.MAX_VALUE
            var sMinY = Float.MAX_VALUE
            var sMaxY = -Float.MAX_VALUE

            for (i in 0 until inputCount) {
                val pt = inputs.get(i)
                val strokePtX = pt.x / density
                val strokePtY = pt.y / density
                if (strokePtX < sMinX) sMinX = strokePtX
                if (strokePtX > sMaxX) sMaxX = strokePtX
                if (strokePtY < sMinY) sMinY = strokePtY
                if (strokePtY > sMaxY) sMaxY = strokePtY

                if (isPointInPolygon(strokePtX, strokePtY, closedLoop)) {
                    pointsInside++
                }
            }

            val sCenterX = (sMinX + sMaxX) / 2f
            val sCenterY = (sMinY + sMaxY) / 2f
            val isCenterContained = isPointInPolygon(sCenterX, sCenterY, closedLoop)

            // Criterio flexible: centro dentro o al menos 15% de puntos contenidos
            if (isCenterContained || (pointsInside.toFloat() / inputCount) >= 0.15f) {
                newlySelected.add(stroke)
                minX = minOf(minX, sMinX)
                maxX = maxOf(maxX, sMaxX)
                minY = minOf(minY, sMinY)
                maxY = maxOf(maxY, sMaxY)
            }
        }

        lassoPoints.clear()

        if (newlySelected.isNotEmpty()) {
            selectedStrokes.clear()
            selectedStrokes.addAll(newlySelected)
            selectedStrokesSet.clear()
            selectedStrokesSet.addAll(newlySelected)
            val padding = 12f
            selectionBounds = RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
            selectionMatrix.reset()
            return true
        } else {
            clearSelection()
            return false
        }
    }

    fun duplicateSelected(
        completedStrokes: CopyOnWriteArrayList<Stroke>,
        offsetWorld: Float = 30f,
        density: Float = 1.0f
    ): List<Stroke> {
        if (selectedStrokes.isEmpty()) return emptyList()
        val duplicated = mutableListOf<Stroke>()
        for (stroke in selectedStrokes) {
            val translated = translateStroke(stroke, offsetWorld, offsetWorld, density)
            completedStrokes.add(translated)
            duplicated.add(translated)
        }
        selectedStrokes.clear()
        selectedStrokes.addAll(duplicated)
        selectedStrokesSet.clear()
        selectedStrokesSet.addAll(duplicated)
        selectionBounds?.offset(offsetWorld, offsetWorld)
        return duplicated
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
        selectedStrokesSet.clear()
        selectedStrokesSet.addAll(newSelected)
    }

    fun deleteSelected(completedStrokes: CopyOnWriteArrayList<Stroke>): List<Stroke> {
        val removed = ArrayList(selectedStrokes)
        completedStrokes.removeAll(removed)
        clearSelection()
        return removed
    }

    fun clearSelection() {
        selectedStrokes.clear()
        selectedStrokesSet.clear()
        selectionBounds = null
        isDraggingSelection = false
        isResizingSelection = false
        currentScaleFactor = 1.0f
        selectionMatrix.reset()
        totalDragDx = 0f
        totalDragDy = 0f
        lassoPoints.clear()
    }

    fun setSelection(strokes: List<Stroke>, density: Float = 1.0f) {
        clearSelection()
        if (strokes.isEmpty()) return
        selectedStrokes.addAll(strokes)
        selectedStrokesSet.addAll(strokes)

        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE
        for (s in strokes) {
            val inputs = s.inputs
            for (i in 0 until inputs.size) {
                val pt = inputs.get(i)
                val strokePtX = pt.x / density
                val strokePtY = pt.y / density
                if (strokePtX < minX) minX = strokePtX
                if (strokePtX > maxX) maxX = strokePtX
                if (strokePtY < minY) minY = strokePtY
                if (strokePtY > maxY) maxY = strokePtY
            }
        }
        val padding = 12f
        selectionBounds = RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
        selectionMatrix.reset()
    }

    fun getTransformedStrokes(): List<Stroke> {
        if (selectedStrokes.isEmpty()) return emptyList()
        if (selectionMatrix.isIdentity) return ArrayList(selectedStrokes)

        val transformedList = mutableListOf<Stroke>()
        val pts = FloatArray(2)
        for (stroke in selectedStrokes) {
            val inputs = stroke.inputs
            val count = inputs.size
            val batch = MutableStrokeInputBatch()
            for (i in 0 until count) {
                val pt = inputs.get(i)
                pts[0] = pt.x
                pts[1] = pt.y
                selectionMatrix.mapPoints(pts)
                val transformed = StrokeInput.create(
                    pts[0],
                    pts[1],
                    pt.elapsedTimeMillis,
                    pt.toolType,
                    pt.strokeUnitLengthCm,
                    pt.pressure,
                    pt.tiltRadians,
                    pt.orientationRadians
                )
                batch.add(transformed)
            }
            transformedList.add(Stroke(stroke.brush, batch.toImmutable()))
        }
        return transformedList
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
            val handleRadius = (7f / scale).coerceIn(5f, 13f)
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

    private fun translateStroke(stroke: Stroke, dx: Float, dy: Float, density: Float = 1.0f): Stroke {
        val inputs = stroke.inputs
        val count = inputs.size
        val batch = MutableStrokeInputBatch()
        val dxPx = dx * density
        val dyPx = dy * density
        for (i in 0 until count) {
            val pt = inputs.get(i)
            val translated = StrokeInput.create(
                pt.x + dxPx,
                pt.y + dyPx,
                pt.elapsedTimeMillis,
                pt.toolType,
                pt.strokeUnitLengthCm,
                pt.pressure,
                pt.tiltRadians,
                pt.orientationRadians
            )
            batch.add(translated)
        }
        return Stroke(stroke.brush, batch.toImmutable())
    }

    private fun scaleStroke(stroke: Stroke, scale: Float, pivotX: Float, pivotY: Float, density: Float = 1.0f): Stroke {
        val inputs = stroke.inputs
        val count = inputs.size
        val batch = MutableStrokeInputBatch()
        val pivotXPx = pivotX * density
        val pivotYPx = pivotY * density
        for (i in 0 until count) {
            val pt = inputs.get(i)
            val sx = pivotXPx + (pt.x - pivotXPx) * scale
            val sy = pivotYPx + (pt.y - pivotYPx) * scale
            val scaled = StrokeInput.create(
                sx,
                sy,
                pt.elapsedTimeMillis,
                pt.toolType,
                pt.strokeUnitLengthCm,
                pt.pressure,
                pt.tiltRadians,
                pt.orientationRadians
            )
            batch.add(scaled)
        }
        val origBrush = stroke.brush
        val scaledBrush = Brush.createWithColorIntArgb(
            family = origBrush.family,
            colorIntArgb = origBrush.colorIntArgb,
            size = (origBrush.size * scale).coerceIn(1.0f, 60.0f),
            epsilon = origBrush.epsilon
        )
        return Stroke(scaledBrush, batch.toImmutable())
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
