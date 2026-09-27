package com.cognitivecanvas.app.ink

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.widget.FrameLayout
import androidx.ink.authoring.InProgressStrokesView
import androidx.ink.authoring.InProgressStrokesFinishedListener
import androidx.ink.authoring.InProgressStrokeId
import androidx.ink.brush.Brush
import androidx.ink.brush.StockBrushes
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.Stroke
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

class JetpackInkView(context: Context) : FrameLayout(context) {

    private val inProgressStrokesView = InProgressStrokesView(context)
    private val completedStrokes = CopyOnWriteArrayList<Stroke>()
    private val activeStrokeIds = ConcurrentHashMap<Int, InProgressStrokeId>()
    private val strokeRenderer = CanvasStrokeRenderer.create()
    private val identityMatrix = Matrix()

    var strokeColor: Int = Color.parseColor("#38BDF8")
        set(value) {
            if (field != value) {
                field = value
                cachedBrush = null
            }
        }

    var strokeWidth: Float = 18f
        set(value) {
            if (field != value) {
                field = value
                cachedBrush = null
            }
        }

    var brushType: String = "pen" // "pen", "marker", "highlighter", "eraser", "pan"
        set(value) {
            if (field != value) {
                field = value
                cachedBrush = null
            }
        }

    var canvasScale: Float = 1.0f
    var canvasTranslateX: Float = 0.0f
    var canvasTranslateY: Float = 0.0f
    var isUserInteracting: Boolean = false

    private var cachedBrush: Brush? = null

    // Panning & Pinch Tracking
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var lastFocusX = 0f
    private var lastFocusY = 0f
    private var isTwoFingerGesture = false

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
            lastFocusX = detector.focusX
            lastFocusY = detector.focusY
            return true
        }

        override fun onScale(detector: ScaleGestureDetector): Boolean {
            val factor = detector.scaleFactor
            if (factor.isNaN() || factor.isInfinite() || factor == 0f) return true

            val newScale = (canvasScale * factor).coerceIn(0.25f, 4.0f)
            val actualFactor = newScale / canvasScale

            val focusX = detector.focusX
            val focusY = detector.focusY

            // 1. Pan delta
            canvasTranslateX += (focusX - lastFocusX)
            canvasTranslateY += (focusY - lastFocusY)

            // 2. Scale around focus point
            canvasTranslateX = focusX - (focusX - canvasTranslateX) * actualFactor
            canvasTranslateY = focusY - (focusY - canvasTranslateY) * actualFactor
            canvasScale = newScale

            lastFocusX = focusX
            lastFocusY = focusY

            postInvalidate()
            notifyTransformChanged()
            return true
        }
    })

    init {
        setWillNotDraw(false)
        inProgressStrokesView.eagerInit()

        addView(
            inProgressStrokesView,
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )

        inProgressStrokesView.addFinishedStrokesListener(object : InProgressStrokesFinishedListener {
            override fun onStrokesFinished(strokes: Map<InProgressStrokeId, Stroke>) {
                completedStrokes.addAll(strokes.values)
                // Remove from inProgressStrokesView internal finished view so strokeRenderer is sole owner
                inProgressStrokesView.removeFinishedStrokes(strokes.keys)
                postInvalidate()
                notifyStrokeCountChanged()
            }
        })
    }

    private fun getRenderMatrix(): Matrix {
        val matrix = Matrix()
        matrix.postScale(canvasScale, canvasScale)
        matrix.postTranslate(canvasTranslateX, canvasTranslateY)
        return matrix
    }

    private fun getScreenToWorldMatrix(): Matrix {
        val render = getRenderMatrix()
        val inverse = Matrix()
        render.invert(inverse)
        return inverse
    }

    private fun getOrCreateBrush(): Brush {
        var brush = cachedBrush
        if (brush == null) {
            val family = when (brushType) {
                "highlighter" -> StockBrushes.highlighterLatest
                "marker" -> StockBrushes.markerLatest
                else -> StockBrushes.pressurePenLatest
            }

            val colorToUse = if (brushType == "highlighter") {
                Color.argb(120, Color.red(strokeColor), Color.green(strokeColor), Color.blue(strokeColor))
            } else {
                strokeColor
            }

            val widthToUse = if (brushType == "highlighter") {
                strokeWidth * 2.2f
            } else if (brushType == "marker") {
                strokeWidth * 1.4f
            } else {
                strokeWidth
            }

            brush = Brush.createWithColorIntArgb(
                family = family,
                colorIntArgb = colorToUse,
                size = widthToUse,
                epsilon = 0.1f
            )
            cachedBrush = brush
        }
        return brush
    }

    private fun notifyStrokeCountChanged() {
        val reactContext = context as? ReactContext
        val event = Arguments.createMap().apply {
            putInt("strokeCount", completedStrokes.size)
        }
        reactContext?.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topStrokeEnd",
            event
        )
    }

    private fun notifyTransformChanged() {
        val reactContext = context as? ReactContext
        val event = Arguments.createMap().apply {
            putDouble("scale", canvasScale.toDouble())
            putDouble("translateX", canvasTranslateX.toDouble())
            putDouble("translateY", canvasTranslateY.toDouble())
        }
        reactContext?.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topTransform",
            event
        )
    }

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)
        return true
    }

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

    private fun eraseStrokesAt(screenX: Float, screenY: Float) {
        val worldX = (screenX - canvasTranslateX) / canvasScale
        val worldY = (screenY - canvasTranslateY) / canvasScale
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
            postInvalidate()
            notifyStrokeCountChanged()
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)

        // Pass all events to scaleDetector for pinch-to-zoom tracking
        scaleDetector.onTouchEvent(event)

        // 1. Two-finger Pinch & Pan (Infinite Canvas Gestures)
        if (event.pointerCount >= 2) {
            isUserInteracting = true
            if (!isTwoFingerGesture) {
                isTwoFingerGesture = true
                inProgressStrokesView.cancelUnfinishedStrokes()
                activeStrokeIds.clear()
            }
            return true
        }

        if (isTwoFingerGesture) {
            if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) {
                isTwoFingerGesture = false
                isUserInteracting = false
            }
            return true
        }

        // 2. Dedicated Pan Mode (Single Finger Dragging Infinite Canvas)
        if (brushType == "pan") {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    isUserInteracting = true
                    lastTouchX = event.x
                    lastTouchY = event.y
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.x - lastTouchX
                    val dy = event.y - lastTouchY
                    canvasTranslateX += dx
                    canvasTranslateY += dy
                    lastTouchX = event.x
                    lastTouchY = event.y
                    postInvalidate()
                    notifyTransformChanged()
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    isUserInteracting = false
                    return true
                }
            }
            return true
        }

        // 3. Eraser Mode (Instant Segment Collision Removal)
        if (brushType == "eraser") {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    eraseStrokesAt(event.x, event.y)
                    return true
                }
            }
            return true
        }

        // 4. Drawing Mode (Pen, Marker, Highlighter) - Ultra Low Latency
        val actionIndex = event.actionIndex
        val pointerId = event.getPointerId(actionIndex)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                val brush = getOrCreateBrush()
                val strokeId = inProgressStrokesView.startStroke(
                    event,
                    pointerId,
                    brush,
                    getScreenToWorldMatrix(),
                    identityMatrix
                )
                activeStrokeIds[pointerId] = strokeId
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val strokeId = activeStrokeIds[pointerId]
                if (strokeId != null) {
                    inProgressStrokesView.addToStroke(event, pointerId, strokeId)
                } else {
                    inProgressStrokesView.addToStroke(event, pointerId)
                }
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                val strokeId = activeStrokeIds.remove(pointerId)
                if (strokeId != null) {
                    inProgressStrokesView.finishStroke(event, pointerId, strokeId)
                } else {
                    inProgressStrokesView.finishStroke(event, pointerId)
                }
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                val strokeId = activeStrokeIds.remove(pointerId)
                if (strokeId != null) {
                    inProgressStrokesView.cancelStroke(strokeId, event)
                } else {
                    inProgressStrokesView.cancelStroke(event, pointerId)
                }
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    override fun dispatchDraw(canvas: Canvas) {
        // Child InProgressStrokesView renders front-buffered active stroke in screen space
        super.dispatchDraw(canvas)

        // Completed strokes rendered with canvas transform applied
        val renderMatrix = getRenderMatrix()
        canvas.save()
        canvas.concat(renderMatrix)
        for (stroke in completedStrokes) {
            strokeRenderer.draw(canvas, stroke, renderMatrix)
        }
        canvas.restore()
    }

    fun zoomIn() {
        val newScale = (canvasScale * 1.25f).coerceAtMost(4.0f)
        val centerX = width / 2f
        val centerY = height / 2f
        canvasTranslateX = centerX - (centerX - canvasTranslateX) * (newScale / canvasScale)
        canvasTranslateY = centerY - (centerY - canvasTranslateY) * (newScale / canvasScale)
        canvasScale = newScale
        postInvalidate()
        notifyTransformChanged()
    }

    fun zoomOut() {
        val newScale = (canvasScale / 1.25f).coerceAtLeast(0.25f)
        val centerX = width / 2f
        val centerY = height / 2f
        canvasTranslateX = centerX - (centerX - canvasTranslateX) * (newScale / canvasScale)
        canvasTranslateY = centerY - (centerY - canvasTranslateY) * (newScale / canvasScale)
        canvasScale = newScale
        postInvalidate()
        notifyTransformChanged()
    }

    fun resetZoom() {
        canvasScale = 1.0f
        canvasTranslateX = 0f
        canvasTranslateY = 0f
        postInvalidate()
        notifyTransformChanged()
    }

    fun clearStrokes() {
        completedStrokes.clear()
        inProgressStrokesView.cancelUnfinishedStrokes()
        postInvalidate()
        notifyStrokeCountChanged()
    }

    fun undoStroke() {
        if (completedStrokes.isNotEmpty()) {
            completedStrokes.removeAt(completedStrokes.size - 1)
            postInvalidate()
            notifyStrokeCountChanged()
        }
    }

    fun captureBitmap(): Bitmap {
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.parseColor("#020617"))
        val renderMatrix = getRenderMatrix()
        canvas.save()
        canvas.concat(renderMatrix)
        for (stroke in completedStrokes) {
            strokeRenderer.draw(canvas, stroke, renderMatrix)
        }
        canvas.restore()
        return bitmap
    }
}
