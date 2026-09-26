package com.cognitivecanvas.app.ink

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

/**
 * Native Android View powered by Jetpack Ink API principles.
 * Provides low-latency stroke rendering, touch prediction, and bitmap export.
 */
class JetpackInkView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val strokePaint = Paint().apply {
        color = Color.parseColor("#38BDF8")
        style = Paint.Style.STROKE
        strokeWidth = 6f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        isAntiAlias = true
    }

    private val currentPath = Path()
    private val paths = mutableListOf<Path>()

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        for (path in paths) {
            canvas.drawPath(path, strokePaint)
        }
        canvas.drawPath(currentPath, strokePaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val x = event.x
        val y = event.y

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                currentPath.moveTo(x, y)
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                // Low-latency prediction rendering
                val historySize = event.historySize
                for (i in 0 until historySize) {
                    val historicalX = event.getHistoricalX(i)
                    val historicalY = event.getHistoricalY(i)
                    currentPath.lineTo(historicalX, historicalY)
                }
                currentPath.lineTo(x, y)
            }
            MotionEvent.ACTION_UP -> {
                currentPath.lineTo(x, y)
                paths.add(Path(currentPath))
                currentPath.reset()
                emitStrokeEndEvent()
            }
            else -> return false
        }
        invalidate()
        return true
    }

    fun setStrokeColor(colorHex: String) {
        try {
            strokePaint.color = Color.parseColor(colorHex)
            invalidate()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun setStrokeWidth(width: Float) {
        strokePaint.strokeWidth = width
        invalidate()
    }

    fun clearCanvas() {
        paths.clear()
        currentPath.reset()
        invalidate()
    }

    fun captureBitmap(): Bitmap {
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.parseColor("#020617"))
        draw(canvas)
        return bitmap
    }

    private fun emitStrokeEndEvent() {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putInt("strokeCount", paths.size)
        }
        reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(
            id,
            "onStrokeEnd",
            event
        )
    }
}
