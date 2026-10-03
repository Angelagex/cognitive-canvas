package com.cognitivecanvas.app.ink.input

import android.os.SystemClock
import android.view.MotionEvent
import kotlin.math.hypot

class GestureShortcutDetector(
    private val onUndoGesture: () -> Unit,
    private val onRedoGesture: () -> Unit
) {
    private var lastTapTime = 0L
    private var lastTapFingerCount = 0
    private var downTime = 0L
    private var startX = 0f
    private var startY = 0f
    private var maxPointersInGesture = 0
    private var hasMoved = false

    companion object {
        private const val DOUBLE_TAP_TIMEOUT_MS = 380L
        private const val MAX_TAP_DURATION_MS = 280L
        private const val TOUCH_SLOP = 45f
    }

    fun onTouchEvent(event: MotionEvent) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downTime = SystemClock.uptimeMillis()
                startX = event.x
                startY = event.y
                maxPointersInGesture = 1
                hasMoved = false
            }
            MotionEvent.ACTION_POINTER_DOWN -> {
                val count = event.pointerCount
                if (count > maxPointersInGesture) {
                    maxPointersInGesture = count
                }
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.x - startX
                val dy = event.y - startY
                if (hypot(dx, dy) > TOUCH_SLOP) {
                    hasMoved = true
                }
            }
            MotionEvent.ACTION_UP -> {
                val duration = SystemClock.uptimeMillis() - downTime
                if (!hasMoved && duration <= MAX_TAP_DURATION_MS) {
                    handleTap(maxPointersInGesture)
                }
            }
        }
    }

    private fun handleTap(pointerCount: Int) {
        val now = SystemClock.uptimeMillis()
        if (now - lastTapTime <= DOUBLE_TAP_TIMEOUT_MS && lastTapFingerCount == pointerCount) {
            // Multi-finger double tap detected!
            if (pointerCount == 2) {
                onUndoGesture()
            } else if (pointerCount == 3) {
                onRedoGesture()
            }
            lastTapTime = 0L
            lastTapFingerCount = 0
        } else {
            // First tap recorded
            lastTapTime = now
            lastTapFingerCount = pointerCount
        }
    }
}
