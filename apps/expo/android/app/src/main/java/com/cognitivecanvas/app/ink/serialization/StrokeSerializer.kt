package com.cognitivecanvas.app.ink.serialization

import android.graphics.Color
import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput
import com.cognitivecanvas.app.ink.tools.StrokeTransformHelper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import org.json.JSONArray

object StrokeSerializer {

    fun serializeStrokesFlat(
        strokes: List<Stroke>,
        strokeColorMap: Map<Stroke, String>,
        defaultStrokeColor: Int,
        density: Float
    ): WritableArray {
        val array = Arguments.createArray()
        val minDistanceSq = (1.5f * density) * (1.5f * density)

        for ((idx, stroke) in strokes.withIndex()) {
            val strokeMap = Arguments.createMap()
            strokeMap.putString("id", "stroke_${idx + 1}")
            val colorStr = strokeColorMap[stroke] ?: String.format("#%06X", 0xFFFFFF and defaultStrokeColor)
            strokeMap.putString("color", colorStr)
            strokeMap.putDouble("width", (stroke.brush.size / density).toDouble())
            val bType = if (stroke.brush.family == StockBrushes.highlighter()) "highlighter" else "pen"
            strokeMap.putString("brushType", bType)

            val inputs = stroke.inputs
            val count = inputs.size
            val flatPointsArray = Arguments.createArray()
            var emittedCount = 0

            if (count > 0) {
                val startT = inputs.get(0).elapsedTimeMillis
                strokeMap.putDouble("timestamp", startT.toDouble())

                // Always include the initial touch point
                var lastPt = inputs.get(0)
                flatPointsArray.pushDouble((lastPt.x / density).toDouble())
                flatPointsArray.pushDouble((lastPt.y / density).toDouble())
                flatPointsArray.pushDouble(lastPt.pressure.toDouble())
                flatPointsArray.pushDouble(0.0)
                emittedCount++

                // Decimate intermediate points closer than 1.5dp
                for (i in 1 until count - 1) {
                    val pt = inputs.get(i)
                    val dx = pt.x - lastPt.x
                    val dy = pt.y - lastPt.y
                    if (dx * dx + dy * dy >= minDistanceSq) {
                        flatPointsArray.pushDouble((pt.x / density).toDouble())
                        flatPointsArray.pushDouble((pt.y / density).toDouble())
                        flatPointsArray.pushDouble(pt.pressure.toDouble())
                        flatPointsArray.pushDouble((pt.elapsedTimeMillis - startT).toDouble())
                        emittedCount++
                        lastPt = pt
                    }
                }

                // Always include the final release point
                if (count > 1) {
                    val endPt = inputs.get(count - 1)
                    flatPointsArray.pushDouble((endPt.x / density).toDouble())
                    flatPointsArray.pushDouble((endPt.y / density).toDouble())
                    flatPointsArray.pushDouble(endPt.pressure.toDouble())
                    flatPointsArray.pushDouble((endPt.elapsedTimeMillis - startT).toDouble())
                    emittedCount++
                }
            }

            strokeMap.putInt("pointCount", emittedCount)
            strokeMap.putArray("flatPoints", flatPointsArray)
            array.pushMap(strokeMap)
        }
        return array
    }

    fun deserializeStrokesFromJson(
        jsonString: String,
        density: Float,
        strokeColorMap: MutableMap<Stroke, String>
    ): List<Stroke> {
        val jsonArray = JSONArray(jsonString)
        val restoredStrokes = mutableListOf<Stroke>()

        for (i in 0 until jsonArray.length()) {
            val strokeObj = jsonArray.optJSONObject(i) ?: continue
            val colorHex = strokeObj.optString("color", "#38BDF8")
            val widthDp = strokeObj.optDouble("width", 4.5).toFloat()
            val strokeType = strokeObj.optString("brushType", "pen")
            val family = when (strokeType) {
                "highlighter" -> StockBrushes.highlighter()
                else -> StockBrushes.marker()
            }
            val strokeColorInt = try {
                Color.parseColor(colorHex)
            } catch (_: Exception) {
                Color.parseColor("#38BDF8")
            }

            val finalColorInt = if (strokeType == "highlighter") {
                Color.argb(120, Color.red(strokeColorInt), Color.green(strokeColorInt), Color.blue(strokeColorInt))
            } else {
                strokeColorInt
            }

            val strokeBrush = Brush.createWithColorIntArgb(
                family = family,
                colorIntArgb = finalColorInt,
                size = widthDp * density,
                epsilon = 0.1f
            )

            val flatPoints = strokeObj.optJSONArray("flatPoints")
            val pointsArray = strokeObj.optJSONArray("points")
            val batch = MutableStrokeInputBatch()
            val state = StrokeTransformHelper.InputState()

            if (flatPoints != null && flatPoints.length() >= 8) {
                val totalFloats = flatPoints.length()
                var j = 0
                while (j + 3 < totalFloats) {
                    val px = flatPoints.optDouble(j, 0.0).toFloat() * density
                    val py = flatPoints.optDouble(j + 1, 0.0).toFloat() * density
                    val pressure = flatPoints.optDouble(j + 2, 0.5).toFloat().coerceIn(0.05f, 1.0f)
                    val t = flatPoints.optDouble(j + 3, (j * 3).toDouble()).toLong()

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
                    StrokeTransformHelper.appendInputSafely(batch, state, input)
                    j += 4
                }
            } else if (pointsArray != null && pointsArray.length() >= 2) {
                val pointsCount = pointsArray.length()
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
                    StrokeTransformHelper.appendInputSafely(batch, state, input)
                }
            } else {
                continue
            }

            if (batch.size < 2) continue

            try {
                val stroke = Stroke(strokeBrush, batch.toImmutable())
                restoredStrokes.add(stroke)
                strokeColorMap[stroke] = colorHex
            } catch (_: Exception) {}
        }

        return restoredStrokes
    }
}
