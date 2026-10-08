package com.cognitivecanvas.app.ink

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.widget.FrameLayout
import androidx.ink.authoring.InProgressStrokesView
import androidx.ink.authoring.InProgressStrokesFinishedListener
import androidx.ink.authoring.InProgressStrokeId
import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.rendering.android.view.ViewStrokeRenderer
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput
import com.cognitivecanvas.app.ink.input.GestureShortcutDetector
import com.cognitivecanvas.app.ink.input.StylusInputHandler
import com.cognitivecanvas.app.ink.tools.StrokeEraser
import com.cognitivecanvas.app.ink.transform.CanvasTransformManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.math.hypot

class JetpackInkView(context: Context) : FrameLayout(context) {

    companion object {
        var activeInstance: java.lang.ref.WeakReference<JetpackInkView>? = null
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        activeInstance = java.lang.ref.WeakReference(this)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (activeInstance?.get() == this) {
            activeInstance = null
        }
    }

    // Submodules
    private val transformManager = CanvasTransformManager(context) { scale, tx, ty ->
        postInvalidateOnAnimation()
        notifyTransformChanged(scale, tx, ty)
    }
    private val strokeEraser = StrokeEraser()
    private val shapeDetector = com.cognitivecanvas.app.ink.tools.ShapeDetector()
    private val lassoManager = com.cognitivecanvas.app.ink.tools.LassoSelectionManager()
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
                if (brushType == "lasso" && lassoManager.selectedStrokes.isNotEmpty()) {
                    lassoManager.recolorSelected(value, completedStrokes)
                    postInvalidateOnAnimation()
                }
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
                if (field == "lasso" && value != "lasso") {
                    lassoManager.clearSelection()
                    notifySelectionChanged(false, 0)
                    postInvalidateOnAnimation()
                }
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
    private var fingerDownX = 0f
    private var fingerDownY = 0f
    private var fingerDownTime = 0L

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

    // Draw-and-Hold Shape Detection Dwell
    private val dwellHandler = Handler(Looper.getMainLooper())
    private var dwellAnchorX = 0f
    private var dwellAnchorY = 0f
    private var dwellPointerId = -1
    private var isStrokeSnapped = false

    private val dwellRunnable = Runnable {
        triggerDrawAndHold()
    }

    // Cache for stroke bounding boxes to eliminate O(N * points) recomputations on hover and hit-testing
    private val strokeBoundsCache = java.util.IdentityHashMap<Stroke, RectF>()
    private val strokeColorMap = java.util.IdentityHashMap<Stroke, String>()
    var pendingLoadedStrokesJson: String? = null

    // Stroke Finish Notification Debounce (eliminates UI-thread serialization lag during fast handwriting)
    private val strokeFinishDebounceHandler = Handler(Looper.getMainLooper())
    private val strokeFinishDebounceRunnable = Runnable {
        notifyStrokeCountChanged()
    }

    // S-Pen Hover Dwell for Semantic Anchoring (ADR 3.1 & Master Spec 4)
    private val hoverDwellHandler = Handler(Looper.getMainLooper())
    private var hoverDwellAnchorRawX = 0f
    private var hoverDwellAnchorRawY = 0f
    private var isHoverDwellActive = false
    private var hoverDwellTriggered = false
    private var lastHoverWorldX = 0f
    private var lastHoverWorldY = 0f
    private var lastHoverDpScreenX = 0f
    private var lastHoverDpScreenY = 0f
    private var lastHoverEntityBounds: RectF? = null
    private var lastHoverDispatchTime = 0L
    private val HOVER_THROTTLE_INTERVAL_MS = 32L // Max 30 FPS over React Native bridge

    private val hoverDwellRunnable = Runnable {
        if (isHoverDwellActive && !hoverDwellTriggered) {
            hoverDwellTriggered = true
            try {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            } catch (_: Exception) {}
            notifyHoverTimeout(lastHoverWorldX, lastHoverWorldY, lastHoverDpScreenX, lastHoverDpScreenY, 800, lastHoverEntityBounds)
        }
    }

    private fun cancelHoverDwell() {
        hoverDwellHandler.removeCallbacks(hoverDwellRunnable)
        isHoverDwellActive = false
        hoverDwellTriggered = false
        lastHoverEntityBounds = null
    }

    private fun triggerDrawAndHold() {
        val ptrId = dwellPointerId
        if (ptrId >= 0 && activeStrokeIds.containsKey(ptrId)) {
            val strokeId = activeStrokeIds[ptrId] ?: return
            isStrokeSnapped = true
            try {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            } catch (_: Exception) {}

            val finishEvent = MotionEvent.obtain(
                SystemClock.uptimeMillis(),
                SystemClock.uptimeMillis(),
                MotionEvent.ACTION_UP,
                dwellAnchorX,
                dwellAnchorY,
                0
            )
            activeStrokeIds.remove(ptrId)
            inProgressStrokesView.finishStroke(finishEvent, ptrId, strokeId)
            finishEvent.recycle()
        }
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
                val shouldSnap = brushType == "shapes" || isStrokeSnapped
                val finalStrokes = mutableListOf<Stroke>()

                for (stroke in strokes.values) {
                    if (isScratchOutStroke(stroke)) {
                        val erased = handleScratchOut(stroke)
                        if (erased) {
                            android.util.Log.d("JetpackInkView", "Scratch-out gesture detected! Erased entity.")
                            strokeFinishDebounceHandler.removeCallbacks(strokeFinishDebounceRunnable)
                            notifyStrokeCountChanged()
                            continue // Scratch stroke deleted the entity, do not keep scratch stroke
                        }
                    }
                    val snapped = if (shouldSnap) {
                        shapeDetector.detectAndSnap(stroke) ?: stroke
                    } else {
                        stroke
                    }
                    val colorHex = String.format("#%06X", 0xFFFFFF and strokeColor)
                    strokeColorMap[snapped] = colorHex
                    finalStrokes.add(snapped)
                }

                if (finalStrokes.isNotEmpty()) {
                    completedStrokes.addAll(finalStrokes)
                    undoneStrokes.clear() // New stroke clears redo history
                }

                synchronized(strokesToHandOff) {
                    strokesToHandOff.addAll(strokes.keys)
                }
                postInvalidateOnAnimation()
                strokeFinishDebounceHandler.removeCallbacks(strokeFinishDebounceRunnable)
                // 280ms debounce allows continuous letter strokes without UI-thread serialization lag
                strokeFinishDebounceHandler.postDelayed(strokeFinishDebounceRunnable, 280L)
            }
        })
    }

    private fun isScratchOutStroke(stroke: Stroke): Boolean {
        val inputs = stroke.inputs
        val count = inputs.size
        if (count < 6) return false

        val density = context.resources.displayMetrics.density
        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        var totalLength = 0f
        var xReversals = 0
        var yReversals = 0
        var prevDx = 0f
        var prevDy = 0f

        val minDelta = 4f * density // 4dp movement threshold to filter jitter

        for (i in 0 until count) {
            val pt = inputs.get(i)
            if (pt.x < minX) minX = pt.x
            if (pt.x > maxX) maxX = pt.x
            if (pt.y < minY) minY = pt.y
            if (pt.y > maxY) maxY = pt.y

            if (i > 0) {
                val prevPt = inputs.get(i - 1)
                val dx = pt.x - prevPt.x
                val dy = pt.y - prevPt.y
                totalLength += kotlin.math.hypot(dx, dy)

                if (kotlin.math.abs(dx) >= minDelta) {
                    if (prevDx != 0f && (dx > 0) != (prevDx > 0)) {
                        xReversals++
                    }
                    prevDx = dx
                }
                if (kotlin.math.abs(dy) >= minDelta) {
                    if (prevDy != 0f && (dy > 0) != (prevDy > 0)) {
                        yReversals++
                    }
                    prevDy = dy
                }
            }
        }

        val widthDp = (maxX - minX) / density
        val heightDp = (maxY - minY) / density
        val totalLengthDp = totalLength / density

        // A scratch-out has at least 3 direction reversals (zigzag)
        val isHorizontalZigZag = xReversals >= 3 && totalLengthDp >= 45f && widthDp >= 20f
        val isVerticalZigZag = yReversals >= 3 && totalLengthDp >= 45f && heightDp >= 20f

        return isHorizontalZigZag || isVerticalZigZag
    }

    private fun handleScratchOut(scratchStroke: Stroke): Boolean {
        val scratchBounds = getStrokeBounds(scratchStroke) ?: return false

        // Find which strokes in completedStrokes intersect with scratchBounds
        val hitStrokes = mutableListOf<Stroke>()
        for (stroke in completedStrokes) {
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

        if (hitStrokes.isEmpty()) return false

        // Expand to the full cluster so the entire handwritten entity/word is erased
        val strokesToDelete = mutableSetOf<Stroke>()
        strokesToDelete.addAll(hitStrokes)

        // Cluster proximity: any strokes within 40dp of hit strokes belong to the same entity
        val queue = ArrayDeque<Stroke>()
        queue.addAll(hitStrokes)
        val clusterProximity = 40f

        while (queue.isNotEmpty()) {
            val curr = queue.removeFirst()
            val currBounds = getStrokeBounds(curr) ?: continue

            for (other in completedStrokes) {
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

        completedStrokes.removeAll(strokesToDelete)
        undoneStrokes.addAll(strokesToDelete)

        try {
            performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        } catch (_: Exception) {
            try {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            } catch (_: Exception) {}
        }

        return true
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

    fun serializeStrokes(): com.facebook.react.bridge.WritableArray {
        val array = Arguments.createArray()
        val density = context.resources.displayMetrics.density
        // Sub-sampling threshold: points closer than 1.5dp are decimated to prevent UI thread heap exhaustion
        val minDistanceSq = (1.5f * density) * (1.5f * density)

        for ((idx, stroke) in completedStrokes.withIndex()) {
            val strokeMap = Arguments.createMap()
            strokeMap.putString("id", "stroke_${idx + 1}")
            val colorStr = strokeColorMap[stroke] ?: String.format("#%06X", 0xFFFFFF and strokeColor)
            strokeMap.putString("color", colorStr)
            strokeMap.putDouble("width", (stroke.brush.size / density).toDouble())

            val inputs = stroke.inputs
            val count = inputs.size
            val pointsArray = Arguments.createArray()
            val startT = if (count > 0) inputs.get(0).elapsedTimeMillis else 0L
            if (count > 0) {
                strokeMap.putDouble("timestamp", startT.toDouble())

                // Always include the initial touch point
                var lastPt = inputs.get(0)
                val firstMap = Arguments.createMap().apply {
                    putDouble("x", (lastPt.x / density).toDouble())
                    putDouble("y", (lastPt.y / density).toDouble())
                    putDouble("p", lastPt.pressure.toDouble())
                    putDouble("t", 0.0)
                }
                pointsArray.pushMap(firstMap)

                // Decimate intermediate points closer than 1.5dp
                for (i in 1 until count - 1) {
                    val pt = inputs.get(i)
                    val dx = pt.x - lastPt.x
                    val dy = pt.y - lastPt.y
                    if (dx * dx + dy * dy >= minDistanceSq) {
                        val ptMap = Arguments.createMap().apply {
                            putDouble("x", (pt.x / density).toDouble())
                            putDouble("y", (pt.y / density).toDouble())
                            putDouble("p", pt.pressure.toDouble())
                            putDouble("t", (pt.elapsedTimeMillis - startT).toDouble())
                        }
                        pointsArray.pushMap(ptMap)
                        lastPt = pt
                    }
                }

                // Always include the final release point
                if (count > 1) {
                    val endPt = inputs.get(count - 1)
                    val endMap = Arguments.createMap().apply {
                        putDouble("x", (endPt.x / density).toDouble())
                        putDouble("y", (endPt.y / density).toDouble())
                        putDouble("p", endPt.pressure.toDouble())
                        putDouble("t", (endPt.elapsedTimeMillis - startT).toDouble())
                    }
                    pointsArray.pushMap(endMap)
                }
            }

            strokeMap.putArray("points", pointsArray)
            array.pushMap(strokeMap)
        }
        return array
    }

    private fun notifyStrokeCountChanged() {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putInt("strokeCount", completedStrokes.size)
            putBoolean("canUndo", completedStrokes.isNotEmpty())
            putBoolean("canRedo", undoneStrokes.isNotEmpty())
            putArray("strokes", serializeStrokes())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topStrokeEnd",
            event
        )
    }

    private fun notifyTransformChanged(scale: Float, tx: Float, ty: Float) {
        val reactContext = context as? ReactContext ?: return
        val density = context.resources.displayMetrics.density
        val event = Arguments.createMap().apply {
            putDouble("scale", scale.toDouble())
            putDouble("translateX", (tx / density).toDouble())
            putDouble("translateY", (ty / density).toDouble())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topTransform",
            event
        )
    }

    private fun notifyBarrelButton(x: Float, y: Float) {
        val reactContext = context as? ReactContext ?: return
        val density = context.resources.displayMetrics.density
        val dpX = x / density
        val dpY = y / density
        val dpTx = transformManager.canvasTranslateX / density
        val dpTy = transformManager.canvasTranslateY / density
        val scale = transformManager.canvasScale
        val worldX = (dpX - dpTx) / scale
        val worldY = (dpY - dpTy) / scale

        val event = Arguments.createMap().apply {
            putDouble("x", dpX.toDouble())
            putDouble("y", dpY.toDouble())
            putDouble("worldX", worldX.toDouble())
            putDouble("worldY", worldY.toDouble())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topBarrelButton",
            event
        )
    }

    private fun notifyHoverTimeout(worldX: Float, worldY: Float, screenX: Float, screenY: Float, durationMs: Int, entityBounds: RectF? = null) {
        android.util.Log.d("AirViewHover", "notifyHoverTimeout -> worldX=$worldX worldY=$worldY screenX=$screenX screenY=$screenY durationMs=$durationMs bounds=$entityBounds")
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putDouble("worldX", worldX.toDouble())
            putDouble("worldY", worldY.toDouble())
            putDouble("screenX", screenX.toDouble())
            putDouble("screenY", screenY.toDouble())
            putInt("dwellDurationMs", durationMs)
            if (entityBounds != null) {
                putMap("entityBounds", Arguments.createMap().apply {
                    putDouble("xmin", entityBounds.left.toDouble())
                    putDouble("ymin", entityBounds.top.toDouble())
                    putDouble("xmax", entityBounds.right.toDouble())
                    putDouble("ymax", entityBounds.bottom.toDouble())
                })
            }
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topHoverTimeout",
            event
        )
    }

    private fun notifyFingerTap(worldX: Float, worldY: Float, screenX: Float, screenY: Float) {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putDouble("worldX", worldX.toDouble())
            putDouble("worldY", worldY.toDouble())
            putDouble("screenX", screenX.toDouble())
            putDouble("screenY", screenY.toDouble())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topFingerTap",
            event
        )
    }

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)
        return true
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)

        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
            cancelHoverDwell()
        }

        val isStylusTouch = (0 until event.pointerCount).any {
            stylusHandler.isStylus(event, it)
        }
        val isHardwareEraser = stylusHandler.isStylusEraser(event) || stylusHandler.isBarrelButtonPressed(event)

        // Single Finger Tap detection (Word selection & Attribute Pin trigger)
        if (!isStylusTouch && !isHardwareEraser && event.pointerCount == 1) {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    fingerDownX = event.x
                    fingerDownY = event.y
                    fingerDownTime = System.currentTimeMillis()
                }
                MotionEvent.ACTION_UP -> {
                    val dist = hypot(event.x - fingerDownX, event.y - fingerDownY)
                    val elapsed = System.currentTimeMillis() - fingerDownTime
                    val density = context.resources.displayMetrics.density
                    if (dist < 18f * density && elapsed < 350L && !transformManager.isUserInteracting && !isTwoFingerGesture) {
                        val dpX = event.x / density
                        val dpY = event.y / density
                        val dpTx = transformManager.canvasTranslateX / density
                        val dpTy = transformManager.canvasTranslateY / density
                        val scale = transformManager.canvasScale
                        val worldX = (dpX - dpTx) / scale
                        val worldY = (dpY - dpTy) / scale
                        notifyFingerTap(worldX, worldY, dpX, dpY)
                    }
                }
            }
        }

        // Multi-finger gestures (undo/redo, canvas pinch & pan) are STRICTLY for finger touches!
        // Never allow a stylus or barrel button event to feed the scale or gesture detectors.
        if (!isStylusTouch && !isHardwareEraser) {
            gestureDetector.onTouchEvent(event)
            transformManager.onTouchEvent(event)
        }

        // Check for S-Pen hardware barrel button press
        stylusHandler.checkBarrelButton(event)

        // 1. Two-finger Gestures (Infinite Canvas Pinch-to-Zoom & Pan)
        if (!isStylusTouch && !isHardwareEraser && event.pointerCount >= 2) {
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
        if (brushType == "eraser" || isHardwareEraser) {
            // Cancel any pending wet strokes if we switched into eraser mid-stroke
            if (activeStrokeIds.isNotEmpty()) {
                inProgressStrokesView.cancelUnfinishedStrokes()
                activeStrokeIds.clear()
            }

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
                        for (r in removed) { strokeBoundsCache.remove(r) }
                        postInvalidateOnAnimation()
                        strokeFinishDebounceHandler.removeCallbacks(strokeFinishDebounceRunnable)
                        strokeFinishDebounceHandler.postDelayed(strokeFinishDebounceRunnable, 150L)
                    }
                    return true
                }
            }
            return true
        }

        // 4. Lasso Selection Mode
        if (brushType == "lasso") {
            val worldX = (event.x - transformManager.canvasTranslateX) / transformManager.canvasScale
            val worldY = (event.y - transformManager.canvasTranslateY) / transformManager.canvasScale

            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    lassoManager.onTouchDown(worldX, worldY)
                    postInvalidateOnAnimation()
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    lassoManager.onTouchMove(worldX, worldY, completedStrokes)
                    postInvalidateOnAnimation()
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    val hasSelection = lassoManager.onTouchUp(completedStrokes)
                    postInvalidateOnAnimation()
                    notifySelectionChanged(hasSelection, lassoManager.selectedStrokes.size)
                    return true
                }
            }
            return true
        }

        // 5. Drawing Mode (Pen, Marker, Highlighter, Shapes)
        val actionIndex = event.actionIndex
        val pointerId = event.getPointerId(actionIndex)

        // Palm Rejection: If Solo Stylus is enabled, ignore non-stylus touches for drawing
        if (!stylusHandler.shouldAcceptDrawingTouch(event, actionIndex)) {
            return true
        }

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                dwellHandler.removeCallbacksAndMessages(null)
                isStrokeSnapped = false
                dwellAnchorX = event.x
                dwellAnchorY = event.y
                dwellPointerId = pointerId

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

                    // Draw-and-Hold Dwell Tracking: holding stylus still for 450ms regularizes the shape
                    val distMoved = hypot(event.x - dwellAnchorX, event.y - dwellAnchorY)
                    if (distMoved > 16f) {
                        dwellAnchorX = event.x
                        dwellAnchorY = event.y
                        dwellHandler.removeCallbacksAndMessages(null)
                        if (!isStrokeSnapped) {
                            dwellHandler.postDelayed(dwellRunnable, 450L)
                        }
                    }
                } else {
                    inProgressStrokesView.addToStroke(event, pointerId)
                }
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                dwellHandler.removeCallbacksAndMessages(null)
                val strokeId = activeStrokeIds.remove(pointerId)
                if (strokeId != null) {
                    inProgressStrokesView.finishStroke(event, pointerId, strokeId)
                } else if (!isStrokeSnapped) {
                    inProgressStrokesView.finishStroke(event, pointerId)
                }
                isStrokeSnapped = false
                dwellPointerId = -1
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                dwellHandler.removeCallbacksAndMessages(null)
                isStrokeSnapped = false
                dwellPointerId = -1
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

    private fun getStrokeBounds(stroke: Stroke): RectF? {
        val cached = strokeBoundsCache[stroke]
        if (cached != null) return cached

        val inputs = stroke.inputs
        val count = inputs.size
        if (count == 0) return null
        val density = context.resources.displayMetrics.density
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
        val bounds = RectF(minX, minY, maxX, maxY)
        strokeBoundsCache[stroke] = bounds
        return bounds
    }

    private fun findEntityClusterAt(worldX: Float, worldY: Float): RectF? {
        if (completedStrokes.isEmpty()) return null

        val zoomFactor = 1f / transformManager.canvasScale
        val hitMargin = 28f * zoomFactor

        // 1. Broadphase: quickly find strokes near (worldX, worldY) using cached O(1) bounds
        val hitIndices = mutableListOf<Int>()
        for (idx in completedStrokes.indices) {
            val b = getStrokeBounds(completedStrokes[idx]) ?: continue
            if (worldX >= b.left - hitMargin && worldX <= b.right + hitMargin &&
                worldY >= b.top - hitMargin && worldY <= b.bottom + hitMargin) {
                hitIndices.add(idx)
            }
        }
        if (hitIndices.isEmpty()) return null

        // 2. Expand cluster to include all adjacent strokes in the same handwritten word/concept
        val clusterIndices = mutableSetOf<Int>()
        val queue = ArrayDeque<Int>()
        for (idx in hitIndices) {
            clusterIndices.add(idx)
            queue.add(idx)
        }

        val clusterProximity = 45f * zoomFactor
        while (queue.isNotEmpty()) {
            val currentIdx = queue.removeFirst()
            val currentBounds = getStrokeBounds(completedStrokes[currentIdx]) ?: continue

            for (otherIdx in completedStrokes.indices) {
                if (clusterIndices.contains(otherIdx)) continue
                val otherBounds = getStrokeBounds(completedStrokes[otherIdx]) ?: continue

                val dx = maxOf(0f, maxOf(currentBounds.left - otherBounds.right, otherBounds.left - currentBounds.right))
                val dy = maxOf(0f, maxOf(currentBounds.top - otherBounds.bottom, otherBounds.top - currentBounds.bottom))
                if (dx <= clusterProximity && dy <= clusterProximity) {
                    clusterIndices.add(otherIdx)
                    queue.add(otherIdx)
                }
            }
        }

        // 3. Compute merged bounding box covering the entire entity
        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE
        for (idx in clusterIndices) {
            val b = getStrokeBounds(completedStrokes[idx]) ?: continue
            if (b.left < minX) minX = b.left
            if (b.right > maxX) maxX = b.right
            if (b.top < minY) minY = b.top
            if (b.bottom > maxY) maxY = b.bottom
        }

        val padding = 10f
        return RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
    }

    fun handleStylusHover(event: MotionEvent) {
        val location = IntArray(2)
        getLocationOnScreen(location)
        val localX = event.rawX - location[0]
        val localY = event.rawY - location[1]

        val isInside = localX >= 0 && localX <= width && localY >= 0 && localY <= height
        val density = context.resources.displayMetrics.density

        when (event.actionMasked) {
            MotionEvent.ACTION_HOVER_MOVE, MotionEvent.ACTION_HOVER_ENTER -> {
                if (isInside) {
                    val dpScreenX = localX / density
                    val dpScreenY = localY / density
                    val dpTranslateX = transformManager.canvasTranslateX / density
                    val dpTranslateY = transformManager.canvasTranslateY / density
                    val scale = transformManager.canvasScale

                    val worldX = (dpScreenX - dpTranslateX) / scale
                    val worldY = (dpScreenY - dpTranslateY) / scale

                    lastHoverWorldX = worldX
                    lastHoverWorldY = worldY
                    lastHoverDpScreenX = dpScreenX
                    lastHoverDpScreenY = dpScreenY

                    val now = SystemClock.uptimeMillis()
                    val isEnter = event.actionMasked == MotionEvent.ACTION_HOVER_ENTER
                    val shouldDispatch = isEnter || (now - lastHoverDispatchTime >= HOVER_THROTTLE_INTERVAL_MS)

                    if (shouldDispatch) {
                        lastHoverDispatchTime = now
                        val entityBounds = findEntityClusterAt(worldX, worldY)
                        lastHoverEntityBounds = entityBounds
                        notifyHover(worldX, worldY, dpScreenX, dpScreenY, true, entityBounds)
                    }

                    // 800 ms Dwell Timer tracking (tolerance <= 15 dp as per ADR 3.1)
                    val tolerancePx = 15f * density
                    val distMoved = hypot(event.rawX - hoverDwellAnchorRawX, event.rawY - hoverDwellAnchorRawY)

                    if (!isHoverDwellActive || distMoved > tolerancePx) {
                        hoverDwellHandler.removeCallbacks(hoverDwellRunnable)
                        hoverDwellAnchorRawX = event.rawX
                        hoverDwellAnchorRawY = event.rawY
                        isHoverDwellActive = true
                        hoverDwellTriggered = false
                        hoverDwellHandler.postDelayed(hoverDwellRunnable, 800L)
                    }
                } else {
                    cancelHoverDwell()
                    notifyHover(0f, 0f, 0f, 0f, false, null)
                }
            }
            MotionEvent.ACTION_HOVER_EXIT -> {
                cancelHoverDwell()
                notifyHover(0f, 0f, 0f, 0f, false, null)
            }
        }
    }

    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
        return super.dispatchGenericMotionEvent(event)
    }

    override fun onInterceptHoverEvent(event: MotionEvent): Boolean {
        return true
    }

    override fun dispatchHoverEvent(event: MotionEvent): Boolean {
        handleStylusHover(event)
        return true
    }

    override fun onHoverEvent(event: MotionEvent): Boolean {
        return true
    }

    private fun notifyHover(worldX: Float, worldY: Float, screenX: Float, screenY: Float, isHovering: Boolean, entityBounds: RectF? = null) {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putDouble("worldX", worldX.toDouble())
            putDouble("worldY", worldY.toDouble())
            putDouble("screenX", screenX.toDouble())
            putDouble("screenY", screenY.toDouble())
            putBoolean("isHovering", isHovering)
            if (entityBounds != null) {
                putMap("entityBounds", Arguments.createMap().apply {
                    putDouble("xmin", entityBounds.left.toDouble())
                    putDouble("ymin", entityBounds.top.toDouble())
                    putDouble("xmax", entityBounds.right.toDouble())
                    putDouble("ymax", entityBounds.bottom.toDouble())
                })
            }
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topHover",
            event
        )
    }

    private fun drawBackgroundPattern(canvas: Canvas) {
        if (backgroundType == "blank") return

        val scale = transformManager.canvasScale
        val tx = transformManager.canvasTranslateX
        val ty = transformManager.canvasTranslateY

        val viewW = width.toFloat()
        val viewH = height.toFloat()
        if (viewW <= 0f || viewH <= 0f || scale <= 0f) return

        val worldLeft = (0f - tx) / scale
        val worldRight = (viewW - tx) / scale
        val worldTop = (0f - ty) / scale
        val worldBottom = (viewH - ty) / scale

        val baseSpacing = when (backgroundType) {
            "ruled" -> 44f
            else -> 36f
        }

        // Adaptive LOD: When zoomed far out, increase spacing so dot density remains readable and 120 FPS
        var spacing = baseSpacing
        while (spacing * scale < 18f && spacing < 1000f) {
            spacing *= 2f
        }

        val dotRadius = (1.5f / scale).coerceIn(0.8f, 3.5f)

        when (backgroundType) {
            "dot_grid" -> {
                val startX = (kotlin.math.floor(worldLeft / spacing) * spacing)
                val startY = (kotlin.math.floor(worldTop / spacing) * spacing)

                var x = startX
                var xCount = 0
                while (x <= worldRight && xCount < 150) {
                    var y = startY
                    var yCount = 0
                    while (y <= worldBottom && yCount < 150) {
                        canvas.drawCircle(x, y, dotRadius, dotPaint)
                        y += spacing
                        yCount++
                    }
                    x += spacing
                    xCount++
                }
            }
            "graph_grid" -> {
                val startX = (kotlin.math.floor(worldLeft / spacing) * spacing)
                val startY = (kotlin.math.floor(worldTop / spacing) * spacing)

                var x = startX
                var xCount = 0
                while (x <= worldRight && xCount < 150) {
                    canvas.drawLine(x, worldTop, x, worldBottom, gridLinePaint)
                    x += spacing
                    xCount++
                }
                var y = startY
                var yCount = 0
                while (y <= worldBottom && yCount < 150) {
                    canvas.drawLine(worldLeft, y, worldRight, y, gridLinePaint)
                    y += spacing
                    yCount++
                }
            }
            "ruled" -> {
                val startY = (kotlin.math.floor(worldTop / spacing) * spacing)

                var y = startY
                var yCount = 0
                while (y <= worldBottom && yCount < 200) {
                    canvas.drawLine(worldLeft, y, worldRight, y, gridLinePaint)
                    y += spacing
                    yCount++
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

        // 3. Draw Lasso selection loop and bounding box
        lassoManager.draw(canvas, transformManager.canvasScale)

        canvas.restore()

        // 4. Draw in-progress strokes on top
        super.dispatchDraw(canvas)

        // 5. Seamless handoff (removes finished strokes only after they have been rendered)
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
        strokeBoundsCache.clear()
        strokeColorMap.clear()
        lassoManager.clearSelection()
        inProgressStrokesView.cancelUnfinishedStrokes()
        postInvalidateOnAnimation()
        notifyStrokeCountChanged()
        notifySelectionChanged(false, 0)
    }

    fun loadStrokesFromJson(jsonString: String?) {
        pendingLoadedStrokesJson = jsonString
        completedStrokes.clear()
        undoneStrokes.clear()
        strokeBoundsCache.clear()
        strokeColorMap.clear()
        lassoManager.clearSelection()
        inProgressStrokesView.cancelUnfinishedStrokes()

        if (jsonString.isNullOrEmpty() || jsonString == "[]") {
            postInvalidateOnAnimation()
            return
        }

        try {
            val jsonArray = org.json.JSONArray(jsonString)
            val density = context.resources.displayMetrics.density
            val restoredStrokes = mutableListOf<Stroke>()

            for (i in 0 until jsonArray.length()) {
                val strokeObj = jsonArray.optJSONObject(i) ?: continue
                val colorHex = strokeObj.optString("color", "#38BDF8")
                val widthDp = strokeObj.optDouble("width", 18.0).toFloat()
                val strokeColorInt = try {
                    Color.parseColor(colorHex)
                } catch (_: Exception) {
                    Color.parseColor("#38BDF8")
                }

                val strokeBrush = Brush.createWithColorIntArgb(
                    family = StockBrushes.pressurePenLatest,
                    colorIntArgb = strokeColorInt,
                    size = widthDp * density,
                    epsilon = 0.1f
                )

                val pointsArray = strokeObj.optJSONArray("points") ?: continue
                val pointsCount = pointsArray.length()
                if (pointsCount < 2) continue

                val batch = MutableStrokeInputBatch()
                for (j in 0 until pointsCount) {
                    val ptObj = pointsArray.optJSONObject(j) ?: continue
                    val px = ptObj.optDouble("x", 0.0).toFloat() * density
                    val py = ptObj.optDouble("y", 0.0).toFloat() * density
                    val pressure = ptObj.optDouble("p", 0.5).toFloat().coerceIn(0.05f, 1.0f)
                    val t = ptObj.optDouble("t", (j * 12).toDouble()).toLong()

                    val input = StrokeInput.create(
                        px,
                        py,
                        t,
                        InputToolType.STYLUS,
                        0f,
                        pressure,
                        0f,
                        0f
                    )
                    batch.addOrIgnore(input)
                }

                val stroke = Stroke(strokeBrush, batch.asImmutable())
                restoredStrokes.add(stroke)
                strokeColorMap[stroke] = colorHex
            }

            completedStrokes.addAll(restoredStrokes)
            postInvalidateOnAnimation()
        } catch (e: Exception) {
            android.util.Log.e("JetpackInkView", "Error in loadStrokesFromJson: ${e.message}", e)
        }
    }

    fun undoStroke() {
        if (completedStrokes.isNotEmpty()) {
            val last = completedStrokes.removeAt(completedStrokes.size - 1)
            strokeBoundsCache.remove(last)
            undoneStrokes.add(last)
            lassoManager.clearSelection()
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            notifySelectionChanged(false, 0)
        }
    }

    fun redoStroke() {
        if (undoneStrokes.isNotEmpty()) {
            val restored = undoneStrokes.removeAt(undoneStrokes.size - 1)
            completedStrokes.add(restored)
            lassoManager.clearSelection()
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            notifySelectionChanged(false, 0)
        }
    }

    fun deleteSelectedStrokes() {
        val removed = lassoManager.deleteSelected(completedStrokes)
        if (removed.isNotEmpty()) {
            for (r in removed) { strokeBoundsCache.remove(r) }
            undoneStrokes.addAll(removed)
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            notifySelectionChanged(false, 0)
        }
    }

    fun clearSelection() {
        lassoManager.clearSelection()
        postInvalidateOnAnimation()
        notifySelectionChanged(false, 0)
    }

    private fun notifySelectionChanged(hasSelection: Boolean, count: Int) {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putBoolean("hasSelection", hasSelection)
            putInt("selectedCount", count)
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(
            id,
            "topSelectionChanged",
            event
        )
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
