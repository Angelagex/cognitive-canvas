package com.cognitivecanvas.app.ink.transform

import android.content.Context
import android.graphics.Matrix
import android.view.MotionEvent
import android.view.ScaleGestureDetector

class CanvasTransformManager(
    context: Context,
    private val onTransformChanged: (scale: Float, tx: Float, ty: Float) -> Unit
) {
    var canvasScale: Float = 1.0f
    var canvasTranslateX: Float = 0.0f
    var canvasTranslateY: Float = 0.0f
    var isUserInteracting: Boolean = false

    private var lastFocusX = 0f
    private var lastFocusY = 0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f

    companion object {
        const val MIN_SCALE = 0.10f   // 10% zoom as per UI_AND_CANVAS_SPEC.md
        const val MAX_SCALE = 10.0f   // 1000% zoom as per UI_AND_CANVAS_SPEC.md
    }

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
            lastFocusX = detector.focusX
            lastFocusY = detector.focusY
            return true
        }

        override fun onScale(detector: ScaleGestureDetector): Boolean {
            val factor = detector.scaleFactor
            if (factor.isNaN() || factor.isInfinite() || factor == 0f) return true

            val newScale = (canvasScale * factor).coerceIn(MIN_SCALE, MAX_SCALE)
            val actualFactor = newScale / canvasScale

            val focusX = detector.focusX
            val focusY = detector.focusY

            // 1. Pan delta tracking midpoint of fingers
            canvasTranslateX += (focusX - lastFocusX)
            canvasTranslateY += (focusY - lastFocusY)

            // 2. Focal point scaling
            canvasTranslateX = focusX - (focusX - canvasTranslateX) * actualFactor
            canvasTranslateY = focusY - (focusY - canvasTranslateY) * actualFactor
            canvasScale = newScale

            lastFocusX = focusX
            lastFocusY = focusY

            onTransformChanged(canvasScale, canvasTranslateX, canvasTranslateY)
            return true
        }
    })

    fun onTouchEvent(event: MotionEvent) {
        scaleDetector.onTouchEvent(event)
    }

    fun startSingleTouchPan(x: Float, y: Float) {
        isUserInteracting = true
        lastTouchX = x
        lastTouchY = y
    }

    fun updateSingleTouchPan(x: Float, y: Float) {
        val dx = x - lastTouchX
        val dy = y - lastTouchY
        canvasTranslateX += dx
        canvasTranslateY += dy
        lastTouchX = x
        lastTouchY = y
        onTransformChanged(canvasScale, canvasTranslateX, canvasTranslateY)
    }

    fun endSingleTouchPan() {
        isUserInteracting = false
    }

    fun getRenderMatrix(): Matrix {
        val matrix = Matrix()
        matrix.postScale(canvasScale, canvasScale)
        matrix.postTranslate(canvasTranslateX, canvasTranslateY)
        return matrix
    }

    fun getScreenToWorldMatrix(): Matrix {
        val render = getRenderMatrix()
        val inverse = Matrix()
        render.invert(inverse)
        return inverse
    }

    fun zoomIn(viewWidth: Float, viewHeight: Float) {
        val newScale = (canvasScale * 1.25f).coerceAtMost(MAX_SCALE)
        val centerX = viewWidth / 2f
        val centerY = viewHeight / 2f
        canvasTranslateX = centerX - (centerX - canvasTranslateX) * (newScale / canvasScale)
        canvasTranslateY = centerY - (centerY - canvasTranslateY) * (newScale / canvasScale)
        canvasScale = newScale
        onTransformChanged(canvasScale, canvasTranslateX, canvasTranslateY)
    }

    fun zoomOut(viewWidth: Float, viewHeight: Float) {
        val newScale = (canvasScale / 1.25f).coerceAtLeast(MIN_SCALE)
        val centerX = viewWidth / 2f
        val centerY = viewHeight / 2f
        canvasTranslateX = centerX - (centerX - canvasTranslateX) * (newScale / canvasScale)
        canvasTranslateY = centerY - (centerY - canvasTranslateY) * (newScale / canvasScale)
        canvasScale = newScale
        onTransformChanged(canvasScale, canvasTranslateX, canvasTranslateY)
    }

    fun resetZoom() {
        canvasScale = 1.0f
        canvasTranslateX = 0f
        canvasTranslateY = 0f
        onTransformChanged(canvasScale, canvasTranslateX, canvasTranslateY)
    }
}
