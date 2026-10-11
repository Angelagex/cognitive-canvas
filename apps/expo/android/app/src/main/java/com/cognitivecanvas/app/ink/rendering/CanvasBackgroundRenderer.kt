package com.cognitivecanvas.app.ink.rendering

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint

class CanvasBackgroundRenderer {

    val dotPaint = Paint().apply {
        color = Color.parseColor("#27354A")
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    val gridLinePaint = Paint().apply {
        color = Color.parseColor("#27354A")
        style = Paint.Style.STROKE
        strokeWidth = 1f
        isAntiAlias = true
    }

    fun setGridColor(color: Int) {
        dotPaint.color = color
        gridLinePaint.color = color
    }

    fun computeAutomaticGridColor(bgColor: Int): Int {
        val r = Color.red(bgColor)
        val g = Color.green(bgColor)
        val b = Color.blue(bgColor)
        val luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

        return if (luminance > 0.5) {
            // Light background
            if (r > 245 && g > 240 && b < 250) {
                // Warm Ivory (#FBF9F5)
                Color.parseColor("#E5DEC9")
            } else {
                // Pure White (#FFFFFF)
                Color.parseColor("#E2E8F0")
            }
        } else {
            // Dark background (Dark Slate / Charcoal)
            if (r > 20 && g > 20 && b > 20) {
                // Charcoal Dark (#18181B)
                Color.parseColor("#27272A")
            } else {
                // Dark Slate (#0F172A)
                Color.parseColor("#27354A")
            }
        }
    }

    fun draw(
        canvas: Canvas,
        viewWidth: Float,
        viewHeight: Float,
        scale: Float,
        translateX: Float,
        translateY: Float,
        backgroundType: String
    ) {
        if (backgroundType == "blank") return
        if (viewWidth <= 0f || viewHeight <= 0f || scale <= 0f) return

        val worldLeft = (0f - translateX) / scale
        val worldRight = (viewWidth - translateX) / scale
        val worldTop = (0f - translateY) / scale
        val worldBottom = (viewHeight - translateY) / scale

        val baseSpacing = when (backgroundType) {
            "ruled" -> 44f
            else -> 36f
        }

        // Adaptive LOD: When zoomed far out, increase spacing so dot density remains readable and 120 FPS
        var spacing = baseSpacing
        while (spacing * scale < 18f && spacing < 1000f) {
            spacing *= 2f
        }

        val dotRadius = (1.8f / scale).coerceIn(1.0f, 4.0f)

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
}
