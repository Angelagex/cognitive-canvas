package com.cognitivecanvas.app.ink.events

import android.content.Context
import android.graphics.RectF
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter

class InkEventEmitter(
    private val context: Context,
    private val viewIdProvider: () -> Int
) {
    private val density: Float
        get() = context.resources.displayMetrics.density

    private fun sendEvent(eventName: String, event: WritableMap) {
        val reactContext = context as? ReactContext ?: return
        val id = viewIdProvider()
        @Suppress("DEPRECATION")
        reactContext.getJSModule(RCTEventEmitter::class.java)?.receiveEvent(id, eventName, event)
    }

    fun emitStrokeStatsImmediate(strokeCount: Int, canUndo: Boolean, canRedo: Boolean) {
        val event = Arguments.createMap().apply {
            putInt("strokeCount", strokeCount)
            putBoolean("canUndo", canUndo)
            putBoolean("canRedo", canRedo)
        }
        sendEvent("topStrokeEnd", event)
    }

    fun emitStrokeCountChanged(strokeCount: Int, canUndo: Boolean, canRedo: Boolean, strokes: WritableArray?) {
        val event = Arguments.createMap().apply {
            putInt("strokeCount", strokeCount)
            putBoolean("canUndo", canUndo)
            putBoolean("canRedo", canRedo)
            if (strokes != null) {
                putArray("strokes", strokes)
            }
        }
        sendEvent("topStrokeEnd", event)
    }

    fun emitTransformChanged(scale: Float, tx: Float, ty: Float) {
        val event = Arguments.createMap().apply {
            putDouble("scale", scale.toDouble())
            putDouble("translateX", (tx / density).toDouble())
            putDouble("translateY", (ty / density).toDouble())
        }
        sendEvent("topTransform", event)
    }

    fun emitBarrelButton(x: Float, y: Float, canvasTranslateX: Float, canvasTranslateY: Float, canvasScale: Float) {
        val dpX = x / density
        val dpY = y / density
        val dpTx = canvasTranslateX / density
        val dpTy = canvasTranslateY / density
        val worldX = (dpX - dpTx) / canvasScale
        val worldY = (dpY - dpTy) / canvasScale

        val event = Arguments.createMap().apply {
            putDouble("x", dpX.toDouble())
            putDouble("y", dpY.toDouble())
            putDouble("worldX", worldX.toDouble())
            putDouble("worldY", worldY.toDouble())
        }
        sendEvent("topBarrelButton", event)
    }

    fun emitSelectionChanged(hasSelection: Boolean, count: Int, bounds: RectF?) {
        val event = Arguments.createMap().apply {
            putBoolean("hasSelection", hasSelection)
            putInt("selectedCount", count)
            if (hasSelection && bounds != null) {
                val boundsMap = Arguments.createMap().apply {
                    putDouble("minX", bounds.left.toDouble())
                    putDouble("minY", bounds.top.toDouble())
                    putDouble("maxX", bounds.right.toDouble())
                    putDouble("maxY", bounds.bottom.toDouble())
                    putDouble("centerX", bounds.centerX().toDouble())
                    putDouble("centerY", bounds.centerY().toDouble())
                }
                putMap("bounds", boundsMap)
            }
        }
        sendEvent("topSelectionChanged", event)
    }

    fun emitStrokesTransformed(dx: Float, dy: Float, count: Int) {
        val event = Arguments.createMap().apply {
            putDouble("dx", dx.toDouble())
            putDouble("dy", dy.toDouble())
            putInt("affectedStrokeCount", count)
        }
        sendEvent("topStrokesTransformed", event)
    }

    fun emitHover(
        worldX: Float,
        worldY: Float,
        screenX: Float,
        screenY: Float,
        isHovering: Boolean,
        entityBounds: RectF?
    ) {
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
        sendEvent("topHover", event)
    }

    fun emitHoverTimeout(
        worldX: Float,
        worldY: Float,
        screenX: Float,
        screenY: Float,
        durationMs: Int,
        entityBounds: RectF?
    ) {
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
        sendEvent("topHoverTimeout", event)
    }

    fun emitFingerTap(worldX: Float, worldY: Float, screenX: Float, screenY: Float, entityBounds: RectF?) {
        val event = Arguments.createMap().apply {
            putDouble("worldX", worldX.toDouble())
            putDouble("worldY", worldY.toDouble())
            putDouble("screenX", screenX.toDouble())
            putDouble("screenY", screenY.toDouble())
            if (entityBounds != null) {
                putMap("entityBounds", Arguments.createMap().apply {
                    putDouble("xmin", entityBounds.left.toDouble())
                    putDouble("ymin", entityBounds.top.toDouble())
                    putDouble("xmax", entityBounds.right.toDouble())
                    putDouble("ymax", entityBounds.bottom.toDouble())
                })
            }
        }
        sendEvent("topFingerTap", event)
    }

    fun emitScratchOut(deletedCount: Int, remainingCount: Int) {
        val event = Arguments.createMap().apply {
            putInt("deletedCount", deletedCount)
            putInt("remainingCount", remainingCount)
        }
        sendEvent("topScratchOut", event)
    }
}
