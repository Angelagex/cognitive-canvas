package com.cognitivecanvas.app.ink.tools

import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import kotlin.math.hypot

/**
 * Detector de gesto Draw-and-Hold para bolígrafo regular ("pen").
 * Si la punta del stylus permanece casi inmóvil (jitter <= 8.0 dp en pantalla)
 * durante 400 ms al final del trazo, dispara el callback para reemplazar
 * el trazo en progreso por su regularización geométrica.
 */
class ShapeHoldDetector(
    private val onHoldTriggered: (pointerId: Int, anchorScreenX: Float, anchorScreenY: Float) -> Unit
) {
    companion object {
        const val HOLD_DURATION_MS = 400L
        const val JITTER_TOLERANCE_DP = 8.0f
    }

    private val handler = Handler(Looper.getMainLooper())
    private var anchorScreenX = 0f
    private var anchorScreenY = 0f
    private var activePointerId = -1

    var isHoldTriggered = false
        private set

    private val holdRunnable = Runnable {
        val ptrId = activePointerId
        if (ptrId >= 0 && !isHoldTriggered) {
            isHoldTriggered = true
            onHoldTriggered(ptrId, anchorScreenX, anchorScreenY)
        }
    }

    fun onTouchDown(event: MotionEvent, pointerId: Int) {
        cancel()
        isHoldTriggered = false
        activePointerId = pointerId
        anchorScreenX = event.x
        anchorScreenY = event.y
        handler.postDelayed(holdRunnable, HOLD_DURATION_MS)
    }

    fun onTouchMove(event: MotionEvent, pointerId: Int, density: Float) {
        if (isHoldTriggered || pointerId != activePointerId) return

        val dist = hypot(event.x - anchorScreenX, event.y - anchorScreenY)
        val maxJitterPx = JITTER_TOLERANCE_DP * density

        if (dist > maxJitterPx) {
            // El usuario continúa dibujando activamente: reubicar anchor y reiniciar temporizador
            anchorScreenX = event.x
            anchorScreenY = event.y
            handler.removeCallbacks(holdRunnable)
            handler.postDelayed(holdRunnable, HOLD_DURATION_MS)
        }
        // Si dist <= maxJitterPx: el lápiz reposa dentro del umbral de jitter, el temporizador continúa hacia 400ms
    }

    fun onTouchUpOrCancel(pointerId: Int): Boolean {
        val wasTriggered = isHoldTriggered && pointerId == activePointerId
        cancel()
        return wasTriggered
    }

    fun cancel() {
        handler.removeCallbacks(holdRunnable)
        activePointerId = -1
    }
}
