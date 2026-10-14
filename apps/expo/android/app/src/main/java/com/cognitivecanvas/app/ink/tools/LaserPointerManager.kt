package com.cognitivecanvas.app.ink.tools

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.os.SystemClock
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.Stroke
import java.util.concurrent.CopyOnWriteArrayList

data class LaserStroke(
    val stroke: Stroke,
    val birthTime: Long = SystemClock.uptimeMillis(),
    val durationMs: Long = 1500L
)

class LaserPointerManager {

    val activeLaserStrokes = CopyOnWriteArrayList<LaserStroke>()
    var isLaserPointerActive = false
    var laserHeadWorldX = 0f
    var laserHeadWorldY = 0f

    val laserDotPaint = Paint().apply {
        color = Color.parseColor("#EF4444")
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    val laserGlowPaint = Paint().apply {
        color = Color.parseColor("#FCA5A5")
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    fun addStrokes(strokes: Collection<Stroke>, durationMs: Long = 1500L) {
        val birthTime = SystemClock.uptimeMillis()
        for (stroke in strokes) {
            activeLaserStrokes.add(LaserStroke(stroke = stroke, birthTime = birthTime, durationMs = durationMs))
        }
    }

    fun updateHeadPosition(worldX: Float, worldY: Float) {
        laserHeadWorldX = worldX
        laserHeadWorldY = worldY
        isLaserPointerActive = true
    }

    @OptIn(androidx.ink.brush.ExperimentalInkCustomBrushApi::class)
    fun draw(
        canvas: Canvas,
        strokeRenderer: CanvasStrokeRenderer,
        renderMatrix: Matrix,
        canvasScale: Float,
        onRequestRedraw: () -> Unit
    ) {
        val now = SystemClock.uptimeMillis()
        val expiredLasers = mutableListOf<LaserStroke>()

        for (laser in activeLaserStrokes) {
            val elapsed = now - laser.birthTime
            if (elapsed >= laser.durationMs) {
                expiredLasers.add(laser)
            } else {
                val fraction = elapsed.toFloat() / laser.durationMs.toFloat()
                val alpha = ((1f - fraction) * 255).toInt().coerceIn(0, 255)
                if (alpha > 0) {
                    canvas.saveLayerAlpha(null, alpha)
                    strokeRenderer.draw(canvas, laser.stroke, renderMatrix, canvasScale)
                    canvas.restore()
                }
            }
        }

        if (expiredLasers.isNotEmpty()) {
            activeLaserStrokes.removeAll(expiredLasers)
        }

        if (isLaserPointerActive) {
            val dotRadius = 4f / canvasScale
            val haloRadius = 10f / canvasScale
            canvas.drawCircle(laserHeadWorldX, laserHeadWorldY, haloRadius, laserGlowPaint)
            canvas.drawCircle(laserHeadWorldX, laserHeadWorldY, dotRadius, laserDotPaint)
        }

        if (activeLaserStrokes.isNotEmpty() || isLaserPointerActive) {
            onRequestRedraw()
        }
    }

    fun clear() {
        activeLaserStrokes.clear()
        isLaserPointerActive = false
    }
}
