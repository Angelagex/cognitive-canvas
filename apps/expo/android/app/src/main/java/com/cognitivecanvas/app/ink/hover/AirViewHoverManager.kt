package com.cognitivecanvas.app.ink.hover

import android.graphics.RectF
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.MotionEvent
import com.cognitivecanvas.app.ink.transform.CanvasTransformManager
import kotlin.math.hypot

class AirViewHoverManager(
    private val onHoverDispatch: (worldX: Float, worldY: Float, screenX: Float, screenY: Float, isHovering: Boolean, entityBounds: RectF?) -> Unit,
    private val onHoverTimeoutDispatch: (worldX: Float, worldY: Float, screenX: Float, screenY: Float, durationMs: Int, entityBounds: RectF?) -> Unit,
    private val onHapticFeedback: () -> Unit
) {
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

    companion object {
        private const val HOVER_THROTTLE_INTERVAL_MS = 32L // Max 30 FPS over bridge
        private const val DWELL_TIMEOUT_MS = 800L
    }

    private val hoverDwellRunnable = Runnable {
        if (isHoverDwellActive && !hoverDwellTriggered) {
            hoverDwellTriggered = true
            onHapticFeedback()
            onHoverTimeoutDispatch(
                lastHoverWorldX,
                lastHoverWorldY,
                lastHoverDpScreenX,
                lastHoverDpScreenY,
                DWELL_TIMEOUT_MS.toInt(),
                lastHoverEntityBounds
            )
        }
    }

    fun cancelHoverDwell() {
        hoverDwellHandler.removeCallbacks(hoverDwellRunnable)
        isHoverDwellActive = false
        hoverDwellTriggered = false
        lastHoverEntityBounds = null
    }

    fun handleStylusHover(
        event: MotionEvent,
        viewWidth: Int,
        viewHeight: Int,
        locationOnScreen: IntArray,
        density: Float,
        transformManager: CanvasTransformManager,
        findEntityClusterAt: (Float, Float) -> RectF?
    ) {
        val localX = event.rawX - locationOnScreen[0]
        val localY = event.rawY - locationOnScreen[1]

        val isInside = localX >= 0 && localX <= viewWidth && localY >= 0 && localY <= viewHeight

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
                        onHoverDispatch(worldX, worldY, dpScreenX, dpScreenY, true, entityBounds)
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
                        hoverDwellHandler.postDelayed(hoverDwellRunnable, DWELL_TIMEOUT_MS)
                    }
                } else {
                    cancelHoverDwell()
                    onHoverDispatch(0f, 0f, 0f, 0f, false, null)
                }
            }
            MotionEvent.ACTION_HOVER_EXIT -> {
                cancelHoverDwell()
                onHoverDispatch(0f, 0f, 0f, 0f, false, null)
            }
        }
    }
}
