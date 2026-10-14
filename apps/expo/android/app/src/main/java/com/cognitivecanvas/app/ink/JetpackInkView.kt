package com.cognitivecanvas.app.ink

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Matrix
import android.graphics.RectF
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.widget.FrameLayout
import androidx.ink.authoring.InProgressStrokeId
import androidx.ink.authoring.InProgressStrokesFinishedListener
import androidx.ink.authoring.InProgressStrokesView
import androidx.ink.brush.Brush
import androidx.ink.brush.StockBrushes
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.events.InkEventEmitter
import com.cognitivecanvas.app.ink.hover.AirViewHoverManager
import com.cognitivecanvas.app.ink.input.GestureShortcutDetector
import com.cognitivecanvas.app.ink.input.StylusInputHandler
import com.cognitivecanvas.app.ink.rendering.CanvasBackgroundRenderer
import com.cognitivecanvas.app.ink.rendering.OffscreenDocumentRenderer
import com.cognitivecanvas.app.ink.serialization.StrokeSerializer
import com.cognitivecanvas.app.ink.spatial.SpatialHashGrid
import com.cognitivecanvas.app.ink.tools.LaserPointerManager
import com.cognitivecanvas.app.ink.tools.LassoSelectionManager
import com.cognitivecanvas.app.ink.tools.ScratchOutDetector
import com.cognitivecanvas.app.ink.tools.ShapeDetector
import com.cognitivecanvas.app.ink.tools.ShapeHoldDetector
import com.cognitivecanvas.app.ink.tools.StrokeEraser
import com.cognitivecanvas.app.ink.rendering.StickerStrokeAnimator
import com.cognitivecanvas.app.ink.tools.StickerPlacementManager
import com.facebook.react.bridge.ReadableMap
import com.cognitivecanvas.app.ink.transform.CanvasTransformManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableArray
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.IdentityHashMap
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

    // ---------------------------------------------------------------------------------------------
    // Submodules & Delegates
    // ---------------------------------------------------------------------------------------------

    private val eventEmitter = InkEventEmitter(context) { id }
    private val backgroundRenderer = CanvasBackgroundRenderer()
    private val laserPointerManager = LaserPointerManager()
    private val scratchOutDetector = ScratchOutDetector()
    private val shapeDetector = ShapeDetector()
    private val strokeEraser = StrokeEraser()
    private val lassoManager = LassoSelectionManager()
    private val spatialGrid = SpatialHashGrid(cellSize = 64f)

    private val shapeHoldDetector = ShapeHoldDetector { ptrId, anchorX, anchorY ->
        if (brushType == "pen" && activeStrokeIds.containsKey(ptrId)) {
            val strokeId = activeStrokeIds.remove(ptrId) ?: return@ShapeHoldDetector
            isStrokeSnapped = true
            try {
                performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK)
            } catch (_: Exception) {}

            val finishEvent = MotionEvent.obtain(
                SystemClock.uptimeMillis(),
                SystemClock.uptimeMillis(),
                MotionEvent.ACTION_UP,
                anchorX,
                anchorY,
                0
            )
            inProgressStrokesView.finishStroke(finishEvent, ptrId, strokeId)
            finishEvent.recycle()
        }
    }

    private val transformManager = CanvasTransformManager(context) { scale, tx, ty ->
        postInvalidateOnAnimation()
        eventEmitter.emitTransformChanged(scale, tx, ty)
    }

    val stylusHandler = StylusInputHandler(stylusOnly = true) { x, y ->
        eventEmitter.emitBarrelButton(
            x, y,
            transformManager.canvasTranslateX,
            transformManager.canvasTranslateY,
            transformManager.canvasScale
        )
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    private val gestureDetector = GestureShortcutDetector(
        onUndoGesture = { mainHandler.post { undoStroke() } },
        onRedoGesture = { mainHandler.post { redoStroke() } }
    )

    private val hoverManager = AirViewHoverManager(
        onHoverDispatch = { wx, wy, sx, sy, isHov, bounds ->
            eventEmitter.emitHover(wx, wy, sx, sy, isHov, bounds)
        },
        onHoverTimeoutDispatch = { wx, wy, sx, sy, dur, bounds ->
            eventEmitter.emitHoverTimeout(wx, wy, sx, sy, dur, bounds)
        },
        onHapticFeedback = {
            try {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            } catch (_: Exception) {}
        }
    )

    // ---------------------------------------------------------------------------------------------
    // Jetpack Ink Native Components & Stroke Collections
    // ---------------------------------------------------------------------------------------------

    private val inProgressStrokesView = InProgressStrokesView(context)
    private val completedStrokes = CopyOnWriteArrayList<Stroke>()
    private val undoneStrokes = CopyOnWriteArrayList<Stroke>()
    private val activeStrokeIds = ConcurrentHashMap<Int, InProgressStrokeId>()
    private val strokesToHandOff = mutableSetOf<InProgressStrokeId>()

    private val strokeRenderer = CanvasStrokeRenderer.create()

    private val strokeBoundsCache = IdentityHashMap<Stroke, RectF>()
    private val strokeColorMap = IdentityHashMap<Stroke, String>()

    private val stickerAnimator = StickerStrokeAnimator(
        hostView = this,
        completedStrokes = completedStrokes,
        spatialGrid = spatialGrid,
        getStrokeBounds = { s -> getStrokeBounds(s) },
        onStrokeCountChanged = { notifyStrokeCountChanged() }
    )

    private val stickerPlacementManager = StickerPlacementManager(
        hostView = this,
        lassoManager = lassoManager,
        animator = stickerAnimator,
        eventEmitter = eventEmitter,
        strokeColorMap = strokeColorMap
    )

    // ---------------------------------------------------------------------------------------------
    // Tool Settings & Properties
    // ---------------------------------------------------------------------------------------------

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

    var brushType: String = "pen"
        set(value) {
            if (field != value) {
                if (field == "lasso" && value != "lasso") {
                    lassoManager.clearSelection()
                    eventEmitter.emitSelectionChanged(false, 0, null)
                    postInvalidateOnAnimation()
                }
                if (field == "eraser" && value != "eraser") {
                    showEraserIndicator = false
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

    var backgroundType: String = "dot_grid"
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

    var canvasBackgroundColor: Int = Color.parseColor("#0F172A")
        set(value) {
            field = value
            postInvalidateOnAnimation()
        }

    var gridColor: Int = Color.parseColor("#27354A")
        set(value) {
            field = value
            backgroundRenderer.setGridColor(value)
            postInvalidateOnAnimation()
        }

    var pendingLoadedStrokesJson: String? = null

    // Touch & Gesture Interaction State
    @Volatile var isUserTouching = false
    private var cachedBrush: Brush? = null
    private var isTwoFingerGesture = false
    private var isMomentaryLassoActive = false
    private var fingerDownX = 0f
    private var fingerDownY = 0f
    private var fingerDownTime = 0L

    // Eraser Diameter Visual Indicator
    private var eraserIndicatorX: Float = 0f
    private var eraserIndicatorY: Float = 0f
    private var showEraserIndicator: Boolean = false
    private var isHardwareEraser: Boolean = false

    private val eraserGuidePaint = android.graphics.Paint().apply {
        style = android.graphics.Paint.Style.STROKE
        strokeWidth = 2f
        color = android.graphics.Color.parseColor("#38BDF8")
        pathEffect = android.graphics.DashPathEffect(floatArrayOf(10f, 10f), 0f)
        isAntiAlias = true
    }
    private val eraserFillPaint = android.graphics.Paint().apply {
        style = android.graphics.Paint.Style.FILL
        color = android.graphics.Color.parseColor("#1A38BDF8") // ~10% de opacidad
        isAntiAlias = true
    }

    // Draw-and-Hold Shape Detection Snapping State
    private var isStrokeSnapped = false

    // Stroke Finish Notification Debounce
    private val strokeFinishDebounceHandler = Handler(Looper.getMainLooper())
    private val strokeFinishDebounceRunnable = Runnable {
        notifyStrokeCountChanged()
    }

    // ---------------------------------------------------------------------------------------------
    // Initialization
    // ---------------------------------------------------------------------------------------------

    init {
        setWillNotDraw(false)
        setLayerType(LAYER_TYPE_NONE, null)
        inProgressStrokesView.setLayerType(LAYER_TYPE_NONE, null)
        inProgressStrokesView.eagerInit()

        addView(
            inProgressStrokesView,
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )

        inProgressStrokesView.addFinishedStrokesListener(object : InProgressStrokesFinishedListener {
            override fun onStrokesFinished(strokes: Map<InProgressStrokeId, Stroke>) {
                if (brushType == "laser") {
                    laserPointerManager.addStrokes(strokes.values)
                    inProgressStrokesView.removeFinishedStrokes(strokes.keys)
                    postInvalidateOnAnimation()
                    return
                }

                val density = context.resources.displayMetrics.density
                val shouldSnap = isStrokeSnapped
                val finalStrokes = mutableListOf<Stroke>()
                val finalStrokeIds = mutableListOf<InProgressStrokeId>()

                val scale = transformManager.canvasScale
                val tx = transformManager.canvasTranslateX
                val ty = transformManager.canvasTranslateY

                for ((strokeId, stroke) in strokes) {
                    if (scratchOutDetector.isScratchOutStroke(stroke, density, scale, tx, ty)) {
                        android.util.Log.d("ScratchOut", "isScratchOutStroke=true! Ejecutando borrado...")
                        val boundsWorld = scratchOutDetector.getScratchBoundsWorld(stroke, density, 8f)
                        val deleted = scratchOutDetector.findStrokesToErase(boundsWorld, spatialGrid) { s -> getStrokeBounds(s) }
                        if (deleted.isNotEmpty()) {
                            android.util.Log.d("ScratchOut", "Borrando ${deleted.size} trazos impactados...")
                            for (s in deleted) {
                                val b = strokeBoundsCache.remove(s)
                                if (b != null) spatialGrid.remove(s, b)
                            }
                            completedStrokes.removeAll(deleted)
                            undoneStrokes.addAll(deleted)
                            eventEmitter.emitScratchOut(deleted.size, completedStrokes.size)
                            try {
                                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                            } catch (_: Exception) {}
                            strokeFinishDebounceHandler.removeCallbacks(strokeFinishDebounceRunnable)
                            notifyStrokeCountChanged()
                        } else {
                            android.util.Log.d("ScratchOut", "ScratchOut no intersectó ningún trazo existente en boundsWorld=$boundsWorld")
                        }
                        // SIEMPRE descartar el trazo del scratch-out (no se agrega a finalStrokes ni completedStrokes)
                        inProgressStrokesView.removeFinishedStrokes(setOf(strokeId))
                        postInvalidateOnAnimation()
                        continue
                    }

                    val snapped = if (shouldSnap) {
                        shapeDetector.detectAndSnap(stroke, density) ?: stroke
                    } else {
                        stroke
                    }
                    val colorHex = String.format("#%06X", 0xFFFFFF and strokeColor)
                    strokeColorMap[snapped] = colorHex
                    finalStrokes.add(snapped)
                    finalStrokeIds.add(strokeId)
                }

                if (finalStrokes.isNotEmpty()) {
                    completedStrokes.addAll(finalStrokes)
                    for (s in finalStrokes) {
                        val b = getStrokeBounds(s)
                        if (b != null) {
                            spatialGrid.insert(s, b)
                        }
                    }
                    undoneStrokes.clear()
                    synchronized(strokesToHandOff) {
                        strokesToHandOff.addAll(finalStrokeIds)
                    }
                    postInvalidateOnAnimation()
                    eventEmitter.emitStrokeStatsImmediate(completedStrokes.size, completedStrokes.isNotEmpty(), undoneStrokes.isNotEmpty())
                    strokeFinishDebounceHandler.removeCallbacks(strokeFinishDebounceRunnable)
                    strokeFinishDebounceHandler.postDelayed(strokeFinishDebounceRunnable, 120L)
                }
            }
        })
    }

    // ---------------------------------------------------------------------------------------------
    // Touch & Gesture Event Pipeline
    // ---------------------------------------------------------------------------------------------

    override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)
        return true
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        parent?.requestDisallowInterceptTouchEvent(true)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                isUserTouching = true
                hoverManager.cancelHoverDwell()
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                isUserTouching = false
                if (showEraserIndicator) {
                    showEraserIndicator = false
                    this.isHardwareEraser = false
                    postInvalidateOnAnimation()
                }
            }
            MotionEvent.ACTION_POINTER_UP -> {
                if (event.pointerCount <= 2) {
                    isUserTouching = false
                }
            }
        }

        val isStylusTouch = (0 until event.pointerCount).any { stylusHandler.isStylus(event, it) }
        val isBarrelPressed = stylusHandler.isBarrelButtonPressed(event)
        val isHardwareEraser = stylusHandler.isStylusEraser(event)

        // 1. Todos los toques con dedos (simples y multitáctiles) alimentan el detector de atajos gestuales
        if (!isStylusTouch && !isHardwareEraser && !isBarrelPressed) {
            gestureDetector.onTouchEvent(event)
        }

        // 2. Navegación multitáctil (Pinch-to-zoom y Paneo con 2 dedos) ANTES de herramientas
        if (!isStylusTouch && !isHardwareEraser && !isBarrelPressed && event.pointerCount >= 2) {
            if (activeStrokeIds.isNotEmpty()) {
                try {
                    inProgressStrokesView.cancelUnfinishedStrokes()
                } catch (_: Exception) {}
                activeStrokeIds.clear()
            }
            shapeHoldDetector.cancel()
            if (isMomentaryLassoActive) {
                isMomentaryLassoActive = false
            }
            transformManager.isUserInteracting = true
            isTwoFingerGesture = true
            transformManager.onTouchEvent(event)
            return true
        }

        if (isTwoFingerGesture) {
            if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) {
                isTwoFingerGesture = false
                transformManager.isUserInteracting = false
            } else {
                transformManager.onTouchEvent(event)
            }
            return true
        }

        stylusHandler.checkBarrelButton(event)

        // Momentary Lasso via S-Pen barrel button toggle
        if (isStylusTouch && brushType != "lasso") {
            if (isBarrelPressed) {
                isMomentaryLassoActive = true
                if (activeStrokeIds.isNotEmpty()) {
                    try {
                        inProgressStrokesView.cancelUnfinishedStrokes()
                    } catch (_: Exception) {}
                    activeStrokeIds.clear()
                }
            } else if (isMomentaryLassoActive) {
                val density = context.resources.displayMetrics.density
                val worldX = (event.x - transformManager.canvasTranslateX) / (transformManager.canvasScale * density)
                val worldY = (event.y - transformManager.canvasTranslateY) / (transformManager.canvasScale * density)
                if (!lassoManager.isHandlingSelection(worldX, worldY, transformManager.canvasScale)) {
                    lassoManager.clearSelection()
                    isMomentaryLassoActive = false
                    postInvalidateOnAnimation()
                    eventEmitter.emitSelectionChanged(false, 0, null)
                }
            }
        }

        // Single Finger Tap detection (Word selection & Attribute Pin trigger)
        // Desactivado completamente en modo borrador
        if (!isStylusTouch && !isHardwareEraser && !isBarrelPressed && brushType != "eraser" && event.pointerCount == 1) {
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
                    if (dist < 30f * density && elapsed < 500L && !isTwoFingerGesture && brushType != "pan" && brushType != "eraser") {
                        val dpX = event.x / density
                        val dpY = event.y / density
                        val dpTx = transformManager.canvasTranslateX / density
                        val dpTy = transformManager.canvasTranslateY / density
                        val scale = transformManager.canvasScale
                        val worldX = (dpX - dpTx) / scale
                        val worldY = (dpY - dpTy) / scale
                        val cluster = findEntityClusterAt(worldX, worldY)
                        if (cluster != null) {
                            eventEmitter.emitFingerTap(worldX, worldY, dpX, dpY, cluster)
                        }
                    }
                }
            }
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

        // 3. Eraser Mode (Hardware tail eraser or explicit UI eraser)
        if (brushType == "eraser" || isHardwareEraser) {
            if (activeStrokeIds.isNotEmpty()) {
                try {
                    inProgressStrokesView.cancelUnfinishedStrokes()
                } catch (_: Exception) {}
                activeStrokeIds.clear()
            }

            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    eraserIndicatorX = event.x
                    eraserIndicatorY = event.y
                    showEraserIndicator = true
                    this.isHardwareEraser = isHardwareEraser
                    postInvalidateOnAnimation()

                    val density = context.resources.displayMetrics.density
                    strokeEraser.eraseAt(
                        event.x, event.y,
                        transformManager.canvasTranslateX,
                        transformManager.canvasTranslateY,
                        transformManager.canvasScale,
                        strokeWidth,
                        completedStrokes,
                        density
                    ) { removed ->
                        try {
                            inProgressStrokesView.cancelUnfinishedStrokes()
                        } catch (_: Exception) {}
                        undoneStrokes.addAll(removed)
                        for (r in removed) {
                            val b = strokeBoundsCache.remove(r)
                            if (b != null) spatialGrid.remove(r, b)
                        }
                        postInvalidateOnAnimation()
                        notifyStrokeCountChanged()
                    }
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    showEraserIndicator = false
                    this.isHardwareEraser = false
                    postInvalidateOnAnimation()
                    return true
                }
            }
            return true
        }

        // 4. Lasso Selection Tool
        val isLassoActive = brushType == "lasso" || isMomentaryLassoActive || stickerPlacementManager.hasPendingSticker
        if (isLassoActive) {
            val density = context.resources.displayMetrics.density
            val worldX = (event.x - transformManager.canvasTranslateX) / (transformManager.canvasScale * density)
            val worldY = (event.y - transformManager.canvasTranslateY) / (transformManager.canvasScale * density)

            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    if (stickerPlacementManager.hasPendingSticker && !lassoManager.isHandlingSelection(worldX, worldY, transformManager.canvasScale)) {
                        stickerPlacementManager.confirmPendingSticker()
                        return true
                    }
                    lassoManager.onTouchDown(worldX, worldY, transformManager.canvasScale)
                    postInvalidateOnAnimation()
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    lassoManager.onTouchMove(worldX, worldY, density)
                    postInvalidateOnAnimation()
                    return true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    if (stickerPlacementManager.hasPendingSticker) {
                        if (lassoManager.isDraggingSelection || lassoManager.isResizingSelection) {
                            lassoManager.onTouchUp(
                                completedStrokes = completedStrokes,
                                candidateStrokes = null,
                                density = density,
                                onStrokesTransformed = { oldList, newList, dx, dy ->
                                    for (i in oldList.indices) {
                                        val oldS = oldList[i]
                                        val newS = newList[i]
                                        strokeColorMap.remove(oldS)?.let { col ->
                                            strokeColorMap[newS] = col
                                        }
                                    }
                                    eventEmitter.emitStrokesTransformed(dx, dy, newList.size)
                                }
                            )
                        }
                        postInvalidateOnAnimation()
                        eventEmitter.emitSelectionChanged(true, lassoManager.selectedStrokes.size, lassoManager.selectionBounds)
                        return true
                    }
                    val candidateStrokes = if (!lassoManager.isDraggingSelection && !lassoManager.isResizingSelection) {
                        val path = lassoManager.lassoPoints
                        var minX = Float.MAX_VALUE
                        var maxX = -Float.MAX_VALUE
                        var minY = Float.MAX_VALUE
                        var maxY = -Float.MAX_VALUE
                        for (p in path) {
                            if (p.x < minX) minX = p.x
                            if (p.x > maxX) maxX = p.x
                            if (p.y < minY) minY = p.y
                            if (p.y > maxY) maxY = p.y
                        }
                        spatialGrid.query(RectF(minX, minY, maxX, maxY))
                    } else null

                    val hasSelection = lassoManager.onTouchUp(
                        completedStrokes = completedStrokes,
                        candidateStrokes = candidateStrokes,
                        density = density,
                        onStrokesTransformed = { oldList, newList, dx, dy ->
                            for (i in oldList.indices) {
                                val oldS = oldList[i]
                                val newS = newList[i]
                                val oldB = strokeBoundsCache.remove(oldS)
                                if (oldB != null) spatialGrid.remove(oldS, oldB)
                                val newB = getStrokeBounds(newS)
                                if (newB != null) spatialGrid.insert(newS, newB)
                                strokeColorMap.remove(oldS)?.let { col ->
                                    strokeColorMap[newS] = col
                                }
                            }
                            eventEmitter.emitStrokesTransformed(dx, dy, newList.size)
                        }
                    )

                    if (isMomentaryLassoActive && !hasSelection) {
                        isMomentaryLassoActive = false
                    }
                    postInvalidateOnAnimation()
                    eventEmitter.emitSelectionChanged(hasSelection, lassoManager.selectedStrokes.size, lassoManager.selectionBounds)
                    return true
                }
            }
            return true
        }

        // 5. Stylus rejection for drawing: ignore fingers when stylusOnly is active
        if (!stylusHandler.shouldAcceptDrawingTouch(event, 0)) {
            return true
        }

        // 6. Laser Pointer Tool
        if (brushType == "laser") {
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                    val headWorldX = (event.x - transformManager.canvasTranslateX) / transformManager.canvasScale
                    val headWorldY = (event.y - transformManager.canvasTranslateY) / transformManager.canvasScale
                    laserPointerManager.updateHeadPosition(headWorldX, headWorldY)
                    postInvalidateOnAnimation()
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    laserPointerManager.isLaserPointerActive = false
                    postInvalidateOnAnimation()
                }
            }
        }

        // 7. Regular Stroke Drawing (Pen / Marker / Highlighter / Laser)
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                if (!stylusHandler.shouldAcceptDrawingTouch(event, 0)) {
                    return true
                }
                isStrokeSnapped = false
                val pointerId = event.getPointerId(0)
                val brush = getOrCreateBrush()
                val strokeId = inProgressStrokesView.startStroke(
                    event,
                    pointerId,
                    brush,
                    transformManager.getScreenToWorldMatrix()
                )
                activeStrokeIds[pointerId] = strokeId

                if (brushType == "pen") {
                    shapeHoldDetector.onTouchDown(event, pointerId)
                }
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                val pointerId = event.getPointerId(0)
                val strokeId = activeStrokeIds[pointerId]

                if (brushType == "pen") {
                    shapeHoldDetector.onTouchMove(event, pointerId, context.resources.displayMetrics.density)
                }

                if (strokeId != null) {
                    try {
                        inProgressStrokesView.addToStroke(event, pointerId)
                    } catch (_: IllegalArgumentException) {}
                }
                return true
            }

            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                val pointerId = event.getPointerId(0)
                shapeHoldDetector.onTouchUpOrCancel(pointerId)

                val strokeId = activeStrokeIds.remove(pointerId)
                if (strokeId != null) {
                    try {
                        inProgressStrokesView.finishStroke(event, pointerId, strokeId)
                    } catch (_: IllegalArgumentException) {}
                }
                return true
            }
        }

        return super.onTouchEvent(event)
    }

    // ---------------------------------------------------------------------------------------------
    // S-Pen Air View Hover Pipeline
    // ---------------------------------------------------------------------------------------------

    fun handleStylusHover(event: MotionEvent) {
        val location = IntArray(2)
        getLocationOnScreen(location)
        val density = context.resources.displayMetrics.density

        val isHardwareEraser = stylusHandler.isStylusEraser(event)
        val isEraserActive = brushType == "eraser" || isHardwareEraser

        if (isEraserActive) {
            val localX = event.rawX - location[0]
            val localY = event.rawY - location[1]
            val isInside = localX >= 0 && localX <= width && localY >= 0 && localY <= height
            when (event.actionMasked) {
                MotionEvent.ACTION_HOVER_MOVE, MotionEvent.ACTION_HOVER_ENTER -> {
                    if (isInside) {
                        eraserIndicatorX = localX
                        eraserIndicatorY = localY
                        showEraserIndicator = true
                        this.isHardwareEraser = isHardwareEraser
                        postInvalidateOnAnimation()
                    } else if (showEraserIndicator) {
                        showEraserIndicator = false
                        this.isHardwareEraser = false
                        postInvalidateOnAnimation()
                    }
                }
                MotionEvent.ACTION_HOVER_EXIT -> {
                    if (showEraserIndicator) {
                        showEraserIndicator = false
                        this.isHardwareEraser = false
                        postInvalidateOnAnimation()
                    }
                }
            }
        } else if (showEraserIndicator) {
            showEraserIndicator = false
            this.isHardwareEraser = false
            postInvalidateOnAnimation()
        }

        hoverManager.handleStylusHover(
            event = event,
            viewWidth = width,
            viewHeight = height,
            locationOnScreen = location,
            density = density,
            transformManager = transformManager,
            findEntityClusterAt = { wx, wy -> findEntityClusterAt(wx, wy) }
        )
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

    // ---------------------------------------------------------------------------------------------
    // Drawing Pipeline (`dispatchDraw`)
    // ---------------------------------------------------------------------------------------------

    @OptIn(androidx.ink.brush.ExperimentalInkCustomBrushApi::class)
    override fun dispatchDraw(canvas: Canvas) {
        canvas.drawColor(canvasBackgroundColor)
        val renderMatrix = transformManager.getRenderMatrix()
        canvas.save()
        canvas.concat(renderMatrix)

        // 1. Draw native paper template (Dot grid, Graph grid, or Ruled lines)
        backgroundRenderer.draw(
            canvas = canvas,
            viewWidth = width.toFloat(),
            viewHeight = height.toFloat(),
            scale = transformManager.canvasScale,
            translateX = transformManager.canvasTranslateX,
            translateY = transformManager.canvasTranslateY,
            backgroundType = backgroundType
        )

        val density = context.resources.displayMetrics.density
        val currentScale = transformManager.canvasScale

        // 2. Draw completed strokes (with Lasso Matrix transform decoupling)
        if (lassoManager.selectedStrokes.isEmpty()) {
            for (stroke in completedStrokes) {
                strokeRenderer.draw(canvas, stroke, renderMatrix, currentScale)
            }
        } else {
            val selectedSet = lassoManager.selectedStrokesSet
            for (stroke in completedStrokes) {
                if (!selectedSet.contains(stroke)) {
                    strokeRenderer.draw(canvas, stroke, renderMatrix, currentScale)
                }
            }
            canvas.save()
            canvas.concat(lassoManager.selectionMatrix)
            val selectedMatrix = Matrix(renderMatrix).apply {
                preConcat(lassoManager.selectionMatrix)
            }
            if (stickerPlacementManager.hasPendingSticker) {
                // Modo Blueprint: tinta fantasma con opacidad reducida (~37% / alpha = 95)
                canvas.saveLayerAlpha(null, 95)
                for (stroke in lassoManager.selectedStrokes) {
                    strokeRenderer.draw(canvas, stroke, selectedMatrix, currentScale)
                }
                canvas.restore()
            } else {
                for (stroke in lassoManager.selectedStrokes) {
                    strokeRenderer.draw(canvas, stroke, selectedMatrix, currentScale)
                }
            }
            canvas.restore()
        }

        // Draw animated assembling sticker strokes (if animating)
        stickerAnimator.animatedStrokes?.let { animList ->
            for (s in animList) {
                strokeRenderer.draw(canvas, s, renderMatrix, currentScale)
            }
        }

        // Handoff sincronizado: liberar trazos en progreso una vez garantizado su renderizado en completedStrokes
        if (strokesToHandOff.isNotEmpty()) {
            val toRemove = synchronized(strokesToHandOff) {
                val copy = HashSet(strokesToHandOff)
                strokesToHandOff.clear()
                copy
            }
            inProgressStrokesView.removeFinishedStrokes(toRemove)
        }

        // 3. Draw Ephemeral Laser Strokes & Laser Pointer Head
        laserPointerManager.draw(
            canvas = canvas,
            strokeRenderer = strokeRenderer,
            renderMatrix = renderMatrix,
            canvasScale = currentScale,
            onRequestRedraw = { postInvalidateOnAnimation() }
        )

        // 4. Draw Lasso polygon and corner scaling handles
        canvas.save()
        canvas.scale(density, density)
        lassoManager.draw(canvas, transformManager.canvasScale)
        canvas.restore()

        canvas.restore()

        if (showEraserIndicator && (brushType == "eraser" || isHardwareEraser)) {
            val radiusPx = (strokeWidth * currentScale * density) / 2f

            if (isUserTouching) {
                // Estado activo de borrado: círculo sólido, más visible y con relleno translúcido más denso
                eraserFillPaint.color = Color.parseColor("#3338BDF8") // ~20% opacidad
                eraserGuidePaint.pathEffect = null // Línea continua sólida
                eraserGuidePaint.strokeWidth = 3f
                canvas.drawCircle(eraserIndicatorX, eraserIndicatorY, radiusPx, eraserFillPaint)
                canvas.drawCircle(eraserIndicatorX, eraserIndicatorY, radiusPx, eraserGuidePaint)
            } else {
                // Estado de reposo (Air View Hover): borde discontinuo tenue
                eraserFillPaint.color = Color.parseColor("#1438BDF8") // ~8% opacidad
                eraserGuidePaint.pathEffect = DashPathEffect(floatArrayOf(8f, 8f), 0f)
                eraserGuidePaint.strokeWidth = 2f
                canvas.drawCircle(eraserIndicatorX, eraserIndicatorY, radiusPx, eraserFillPaint)
                canvas.drawCircle(eraserIndicatorX, eraserIndicatorY, radiusPx, eraserGuidePaint)
            }
        }

        super.dispatchDraw(canvas)
    }

    // ---------------------------------------------------------------------------------------------
    // Canvas Geometry & Spatial Bounds Helpers
    // ---------------------------------------------------------------------------------------------

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

        val candidates = spatialGrid.queryRadius(worldX, worldY, hitMargin)
        if (candidates.isEmpty()) return null

        val hitStrokes = mutableListOf<Stroke>()
        for (stroke in candidates) {
            val b = getStrokeBounds(stroke) ?: continue
            if (worldX >= b.left - hitMargin && worldX <= b.right + hitMargin &&
                worldY >= b.top - hitMargin && worldY <= b.bottom + hitMargin) {
                hitStrokes.add(stroke)
            }
        }
        if (hitStrokes.isEmpty()) return null

        val clusterStrokes = mutableSetOf<Stroke>()
        val queue = ArrayDeque<Stroke>()
        for (stroke in hitStrokes) {
            clusterStrokes.add(stroke)
            queue.add(stroke)
        }

        val clusterProximity = 45f * zoomFactor
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            val currentBounds = getStrokeBounds(current) ?: continue

            val queryBox = RectF(
                currentBounds.left - clusterProximity,
                currentBounds.top - clusterProximity,
                currentBounds.right + clusterProximity,
                currentBounds.bottom + clusterProximity
            )
            val nearby = spatialGrid.query(queryBox)

            for (other in nearby) {
                if (clusterStrokes.contains(other)) continue
                val otherBounds = getStrokeBounds(other) ?: continue

                val dx = maxOf(0f, maxOf(currentBounds.left - otherBounds.right, otherBounds.left - currentBounds.right))
                val dy = maxOf(0f, maxOf(currentBounds.top - otherBounds.bottom, otherBounds.top - currentBounds.bottom))
                if (dx <= clusterProximity && dy <= clusterProximity) {
                    clusterStrokes.add(other)
                    queue.add(other)
                }
            }
        }

        var minX = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE
        for (stroke in clusterStrokes) {
            val b = getStrokeBounds(stroke) ?: continue
            if (b.left < minX) minX = b.left
            if (b.right > maxX) maxX = b.right
            if (b.top < minY) minY = b.top
            if (b.bottom > maxY) maxY = b.bottom
        }

        val padding = 10f
        return RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
    }

    private fun getOrCreateBrush(): Brush {
        var brush = cachedBrush
        if (brush == null) {
            val family = when (brushType) {
                "highlighter" -> StockBrushes.highlighter()
                else -> StockBrushes.marker()
            }

            val colorToUse = when (brushType) {
                "highlighter" -> Color.argb(120, Color.red(strokeColor), Color.green(strokeColor), Color.blue(strokeColor))
                "laser" -> Color.parseColor("#EF4444")
                else -> strokeColor
            }

            val widthToUse = when (brushType) {
                "highlighter" -> strokeWidth * 2.2f
                "laser" -> strokeWidth * 1.2f
                else -> strokeWidth
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
        val count = completedStrokes.size
        val canUndo = completedStrokes.isNotEmpty()
        val canRedo = undoneStrokes.isNotEmpty()

        CoroutineScope(Dispatchers.Default).launch {
            try {
                val serialized = serializeStrokes()
                Handler(Looper.getMainLooper()).post {
                    eventEmitter.emitStrokeCountChanged(count, canUndo, canRedo, serialized)
                }
            } catch (e: Exception) {
                android.util.Log.e("JetpackInkView", "Failed to serialize strokes in background", e)
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Public Canvas API (Undo, Redo, Zoom, Selection, Serialization, Rendering)
    // ---------------------------------------------------------------------------------------------

    fun undoStroke() {
        inProgressStrokesView.cancelUnfinishedStrokes()
        if (completedStrokes.isNotEmpty()) {
            val last = completedStrokes.removeAt(completedStrokes.size - 1)
            val b = strokeBoundsCache.remove(last)
            if (b != null) spatialGrid.remove(last, b)
            undoneStrokes.add(last)
            lassoManager.clearSelection()
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            eventEmitter.emitSelectionChanged(false, 0, null)
        }
    }

    fun redoStroke() {
        inProgressStrokesView.cancelUnfinishedStrokes()
        if (undoneStrokes.isNotEmpty()) {
            val restored = undoneStrokes.removeAt(undoneStrokes.size - 1)
            completedStrokes.add(restored)
            val b = getStrokeBounds(restored)
            if (b != null) spatialGrid.insert(restored, b)
            lassoManager.clearSelection()
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            eventEmitter.emitSelectionChanged(false, 0, null)
        }
    }

    fun clearStrokes() {
        inProgressStrokesView.cancelUnfinishedStrokes()
        undoneStrokes.addAll(completedStrokes)
        completedStrokes.clear()
        laserPointerManager.clear()
        strokeBoundsCache.clear()
        strokeColorMap.clear()
        spatialGrid.clear()
        lassoManager.clearSelection()
        postInvalidateOnAnimation()
        notifyStrokeCountChanged()
        eventEmitter.emitSelectionChanged(false, 0, null)
    }

    fun clearCanvas() {
        clearStrokes()
    }

    fun zoomIn() {
        val w = if (width > 0) width.toFloat() else 1920f
        val h = if (height > 0) height.toFloat() else 1080f
        transformManager.zoomIn(w, h)
    }

    fun zoomOut() {
        val w = if (width > 0) width.toFloat() else 1920f
        val h = if (height > 0) height.toFloat() else 1080f
        transformManager.zoomOut(w, h)
    }

    fun resetZoom() {
        transformManager.resetZoom()
    }

    fun deleteSelectedStrokes() {
        inProgressStrokesView.cancelUnfinishedStrokes()
        if (stickerPlacementManager.hasPendingSticker) {
            stickerPlacementManager.cancelPendingSticker()
            return
        }
        val removed = lassoManager.deleteSelected(completedStrokes)
        if (removed.isNotEmpty()) {
            for (r in removed) {
                val b = strokeBoundsCache.remove(r)
                if (b != null) spatialGrid.remove(r, b)
            }
            undoneStrokes.addAll(removed)
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            eventEmitter.emitSelectionChanged(false, 0, null)
        }
    }

    fun duplicateSelectedStrokes() {
        val density = context.resources.displayMetrics.density
        val offset = 24f
        val oldSelected = ArrayList(lassoManager.selectedStrokes)
        val duplicated = lassoManager.duplicateSelected(completedStrokes, offset, density)
        if (duplicated.isNotEmpty()) {
            for (i in duplicated.indices) {
                val stroke = duplicated[i]
                if (i < oldSelected.size) {
                    val orig = oldSelected[i]
                    strokeColorMap[orig]?.let { col -> strokeColorMap[stroke] = col }
                }
                val b = getStrokeBounds(stroke)
                if (b != null) {
                    strokeBoundsCache[stroke] = b
                    spatialGrid.insert(stroke, b)
                }
            }
            postInvalidateOnAnimation()
            notifyStrokeCountChanged()
            eventEmitter.emitSelectionChanged(true, duplicated.size, lassoManager.selectionBounds)
        }
    }

    fun clearSelection() {
        if (stickerPlacementManager.hasPendingSticker) {
            stickerPlacementManager.confirmPendingSticker()
            return
        }
        lassoManager.clearSelection()
        postInvalidateOnAnimation()
        eventEmitter.emitSelectionChanged(false, 0, null)
    }

    fun insertStickerInSelectionMode(stickerData: ReadableMap, worldX: Float, worldY: Float) {
        val density = context.resources.displayMetrics.density
        stickerPlacementManager.placeSticker(
            stickerData = stickerData,
            targetWorldX = worldX,
            targetWorldY = worldY,
            density = density,
            colorInt = strokeColor,
            baseWidth = strokeWidth
        )
    }

    fun serializeStrokesFlat(): WritableArray {
        return StrokeSerializer.serializeStrokesFlat(
            strokes = completedStrokes,
            strokeColorMap = strokeColorMap,
            defaultStrokeColor = strokeColor,
            density = context.resources.displayMetrics.density
        )
    }

    fun serializeStrokes(): WritableArray {
        return serializeStrokesFlat()
    }

    fun loadStrokesFromJson(jsonString: String?) {
        if (jsonString.isNullOrEmpty()) return

        completedStrokes.clear()
        undoneStrokes.clear()
        strokeBoundsCache.clear()
        strokeColorMap.clear()
        spatialGrid.clear()
        lassoManager.clearSelection()

        try {
            val restored = StrokeSerializer.deserializeStrokesFromJson(
                jsonString = jsonString,
                density = context.resources.displayMetrics.density,
                strokeColorMap = strokeColorMap
            )
            completedStrokes.addAll(restored)
            for (s in restored) {
                val b = getStrokeBounds(s)
                if (b != null) {
                    spatialGrid.insert(s, b)
                }
            }
            postInvalidateOnAnimation()
        } catch (e: Exception) {
            android.util.Log.e("JetpackInkView", "Error in loadStrokesFromJson: ${e.message}", e)
        }
    }

    fun exportStrokesAsJson(promise: Promise) {
        try {
            val jsonArray = serializeStrokes()
            promise.resolve(jsonArray)
        } catch (e: Exception) {
            promise.reject("EXPORT_ERROR", e.message, e)
        }
    }

    fun renderToBitmap(scaleMultiplier: Float = 1.0f, fullDocument: Boolean = false): Bitmap {
        return OffscreenDocumentRenderer.renderToBitmap(
            completedStrokes = completedStrokes,
            fullDocument = fullDocument,
            scaleMultiplier = scaleMultiplier,
            viewWidth = width,
            viewHeight = height,
            backgroundColor = canvasBackgroundColor,
            transformManager = transformManager,
            strokeRenderer = strokeRenderer,
            backgroundRenderer = backgroundRenderer,
            backgroundType = backgroundType,
            getStrokeBounds = { stroke -> getStrokeBounds(stroke) }
        )
    }

    fun captureBitmap(scaleMultiplier: Float = 1.0f, fullDocument: Boolean = false): Bitmap {
        return renderToBitmap(scaleMultiplier, fullDocument)
    }
}
