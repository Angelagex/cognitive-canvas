package com.cognitivecanvas.app.ink

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.view.MotionEvent
import android.widget.FrameLayout
import androidx.ink.authoring.InProgressStrokesView
import androidx.ink.authoring.InProgressStrokesFinishedListener
import androidx.ink.authoring.InProgressStrokeId
import androidx.ink.brush.Brush
import androidx.ink.brush.StockBrushes
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.rendering.android.view.ViewStrokeRenderer
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.input.GestureShortcutDetector
import com.cognitivecanvas.app.ink.input.StylusInputHandler
import com.cognitivecanvas.app.ink.tools.StrokeEraser
import com.cognitivecanvas.app.ink.transform.CanvasTransformManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

class JetpackInkView(context: Context) : FrameLayout(context) {

    // Submodules
    private val transformManager = CanvasTransformManager(context) { scale, tx, ty ->
        postInvalidateOnAnimation()
        notifyTransformChanged(scale, tx, ty)
    }
    private val strokeEraser = StrokeEraser()
    val stylusHandler = StylusInputHandler(stylusOnly = true) { x, y ->
        notifyBarrelButton(x, y)
    }
    private val gestureDetector = GestureShortcutDetector(
        onUndoGesture = { undoStroke() },
        onRedoGesture = { redoStroke() }
    )

    // Jetpack Ink Components
    private val inProgressStrokesView = InProgressStrokesView(context)
    private val completedStrokes = CopyOnWriteArrayList<Stroke>()
    private val undoneStrokes = CopyOnWriteArrayList<Stroke>()
    private val activeStrokeIds = ConcurrentHashMap<Int, InProgressStrokeId>()
    private val strokesToHandOff = mutableSetOf<InProgressStrokeId>()

    private val strokeRenderer = CanvasStrokeRenderer.create()
    private val viewStrokeRenderer = ViewStrokeRenderer(strokeRenderer, this)
    private val identityMatrix = Matrix()

    // Tool Settings
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

    var brushType: String = "pen" // "pen", "marker", "highlighter", "eraser", "pan", "lasso", "shapes"
        set(value) {
            if (field != value) {
                field = value
                cachedBrush = null
            }
        }

    var eraserMode: String
        get() = strokeEraser.eraserMode
        set(value) {
            strokeEraser.eraserMode = value
        }

    var backgroundType: String = "dot_grid" // "blank", "dot_grid", "graph_grid", "ruled"
        set(value) {
            if (field != value) {
                field = value
                postInvalidateOnAnimation()
            }
        }

    var stylusOnly: Boolean
        get() = stylusHandler.stylusOnly
        set(value) {
            stylusHandler.stylusOnly = value
        }

    private var cachedBrush: Brush? = null
    private var isTwoFingerGesture = false

    // Background Paint Styles
    private val dotPaint = Paint().apply {
        color = Color.parseColor("#334155")
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    private val gridLinePaint = Paint().apply {
        color = Color.parseColor("#1E293B")
        style = Paint.Style.STROKE
        strokeWidth = 1f
        isAntiAlias = true
    }

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
                undoneStrokes.clear() // New stroke clears redo history
                synchronized(strokesToHandOff) {
                    strokesToHandOff.addAll(strokes.keys)
                }
                postInvalidateOnAnimation()
                notifyStrokeCountChanged()
            }
        })
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
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putInt("strokeCount", completedStrokes.size)
            putBoolean("canUndo", completedStrokes.isNotEmpty())
            putBoolean("canRedo", undoneStrokes.isNotEmpty())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topStrokeEnd",
            event
        )
    }

    private fun notifyTransformChanged(scale: Float, tx: Float, ty: Float) {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putDouble("scale", scale.toDouble())
            putDouble("translateX", tx.toDouble())
            putDouble("translateY", ty.toDouble())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topTransform",
            event
        )
    }

    private fun notifyBarrelButton(x: Float, y: Float) {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putDouble("x", x.toDouble())
            putDouble("y", y.toDouble())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topBarrelButton",
            event
        )
    }

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)
        return true
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)

        // Check for Goodnotes multi-finger gestures (2-finger double tap = undo, 3-finger double tap = redo)
        gestureDetector.onTouchEvent(event)

        // Check for S-Pen hardware barrel button press
        stylusHandler.checkBarrelButton(event)

        // Feed multi-touch scale detector for pinch & pan
        transformManager.onTouchEvent(event)

        // 1. Two-finger Gestures (Infinite Canvas Pinch-to-Zoom & Pan)
        if (event.pointerCount >= 2) {
            transformManager.isUserInteracting = true
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
                transformManager.isUserInteracting = false
            }
            return true
        }

        // 2. Dedicated Single-Finger Pan Tool
        if (brushType == "pan") {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    transformManager.startSingleTouchPan(event.x, event.y)
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    transformManager.updateSingleTouchPan(event.x, event.y)
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    transformManager.endSingleTouchPan()
                    return true
                }
            }
            return true
        }

        // 3. Eraser Mode (or S-Pen barrel button held down)
        val isHardwareEraser = stylusHandler.isStylusEraser(event) || stylusHandler.isBarrelButtonPressed(event)
        if (brushType == "eraser" || isHardwareEraser) {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    strokeEraser.eraseAt(
                        event.x, event.y,
                        transformManager.canvasTranslateX,
                        transformManager.canvasTranslateY,
                        transformManager.canvasScale,
                        strokeWidth,
                        completedStrokes
                    ) { removed ->
                        undoneStrokes.addAll(removed)
                        postInvalidateOnAnimation()
                        notifyStrokeCountChanged()
                    }
                    return true
                }
            }
            return true
        }

        // 4. Drawing Mode (Pen, Marker, Highlighter)
        val actionIndex = event.actionIndex
        val pointerId = event.getPointerId(actionIndex)

        // Palm Rejection: If Solo Stylus is enabled, ignore non-stylus touches for drawing
        if (!stylusHandler.shouldAcceptDrawingTouch(event, actionIndex)) {
            return true
        }

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                val brush = getOrCreateBrush()
                val strokeId = inProgressStrokesView.startStroke(
                    event,
                    pointerId,
                    brush,
                    transformManager.getScreenToWorldMatrix(),
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

    private fun drawBackgroundPattern(canvas: Canvas) {
        if (backgroundType == "blank") return

        val scale = transformManager.canvasScale
        val tx = transformManager.canvasTranslateX
        val ty = transformManager.canvasTranslateY

        val viewW = width.toFloat()
        val viewH = height.toFloat()
        if (viewW <= 0f || viewH <= 0f) return

        val worldLeft = (0f - tx) / scale
        val worldRight = (viewW - tx) / scale
        val worldTop = (0f - ty) / scale
        val worldBottom = (viewH - ty) / scale

        val spacing = 36f

        when (backgroundType) {
            "dot_grid" -> {
                val startX = (kotlin.math.floor(worldLeft / spacing) * spacing)
                val startY = (kotlin.math.floor(worldTop / spacing) * spacing)
                val dotRadius = 1.5f

                var x = startX
                while (x <= worldRight) {
                    var y = startY
                    while (y <= worldBottom) {
                        canvas.drawCircle(x, y, dotRadius, dotPaint)
                        y += spacing
                    }
                    x += spacing
                }
            }
            "graph_grid" -> {
                val startX = (kotlin.math.floor(worldLeft / spacing) * spacing)
                val startY = (kotlin.math.floor(worldTop / spacing) * spacing)

                var x = startX
                while (x <= worldRight) {
                    canvas.drawLine(x, worldTop, x, worldBottom, gridLinePaint)
                    x += spacing
                }
                var y = startY
                while (y <= worldBottom) {
                    canvas.drawLine(worldLeft, y, worldRight, y, gridLinePaint)
                    y += spacing
                }
            }
            "ruled" -> {
                val lineSpacing = 44f
                val startY = (kotlin.math.floor(worldTop / lineSpacing) * lineSpacing)

                var y = startY
                while (y <= worldBottom) {
                    canvas.drawLine(worldLeft, y, worldRight, y, gridLinePaint)
                    y += lineSpacing
                }
            }
        }
    }

    override fun dispatchDraw(canvas: Canvas) {
        val renderMatrix = transformManager.getRenderMatrix()
        canvas.save()
        canvas.concat(renderMatrix)

        // 1. Draw native paper template (Dot grid, Graph grid, or Ruled lines)
        drawBackgroundPattern(canvas)

        // 2. Draw completed strokes
        viewStrokeRenderer.drawWithStrokes(canvas) { scope ->
            for (stroke in completedStrokes) {
                scope.drawStroke(stroke)
            }
        }
        canvas.restore()

        // 3. Draw in-progress strokes on top
        super.dispatchDraw(canvas)

        // 4. Seamless handoff (removes finished strokes only after they have been rendered)
        synchronized(strokesToHandOff) {
            if (strokesToHandOff.isNotEmpty()) {
                inProgressStrokesView.removeFinishedStrokes(strokesToHandOff)
                strokesToHandOff.clear()
            }
        }
    }

    fun zoomIn() {
        transformManager.zoomIn(width.toFloat(), height.toFloat())
    }

    fun zoomOut() {
        transformManager.zoomOut(width.toFloat(), height.toFloat())
    }

    fun resetZoom() {
        transformManager.resetZoom()
    }

    fun clearStrokes() {
        undoneStrokes.addAll(completedStrokes)
        completedStrokes.clear()
        inProgressStrokesView.cancelUnfinishedStrokes()
        postInvalidateOnAnimation()
        notifyStrokeCountChanged()
    }

    fun undoStroke() {
        if (completedStrokes.isNotEmpty()) {
            val last = completedStrokes.removeAt(completedStrokes.size - 1)
            undoneStrokes.add(last)
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
        }
    }

    fun redoStroke() {
        if (undoneStrokes.isNotEmpty()) {
            val restored = undoneStrokes.removeAt(undoneStrokes.size - 1)
            completedStrokes.add(restored)
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
        }
    }

    fun captureBitmap(): Bitmap {
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.parseColor("#090D16"))
        val renderMatrix = transformManager.getRenderMatrix()
        canvas.save()
        canvas.concat(renderMatrix)
        drawBackgroundPattern(canvas)
        viewStrokeRenderer.drawWithStrokes(canvas) { scope ->
            for (stroke in completedStrokes) {
                scope.drawStroke(stroke)
            }
        }
        canvas.restore()
        return bitmap
    }
}
