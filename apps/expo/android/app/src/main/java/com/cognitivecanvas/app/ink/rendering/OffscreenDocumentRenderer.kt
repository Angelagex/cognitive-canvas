package com.cognitivecanvas.app.ink.rendering

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.RectF
import androidx.ink.rendering.android.canvas.CanvasStrokeRenderer
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.transform.CanvasTransformManager

object OffscreenDocumentRenderer {

    data class OffscreenRenderResult(
        val bitmap: Bitmap,
        val renderedRect: RectF
    )

    fun computeRenderedWorldRect(
        completedStrokes: List<Stroke>,
        fullDocument: Boolean,
        viewWidth: Int,
        viewHeight: Int,
        density: Float,
        transformManager: CanvasTransformManager,
        getStrokeBounds: (Stroke) -> RectF?
    ): RectF {
        val viewW = if (viewWidth > 0) viewWidth.toFloat() else 1920f
        val viewH = if (viewHeight > 0) viewHeight.toFloat() else 1080f
        val safeDensity = if (density > 0f) density else 1f

        if (fullDocument && completedStrokes.isNotEmpty()) {
            var minX = Float.MAX_VALUE
            var maxX = -Float.MAX_VALUE
            var minY = Float.MAX_VALUE
            var maxY = -Float.MAX_VALUE

            for (stroke in completedStrokes) {
                val b = getStrokeBounds(stroke) ?: continue
                if (b.left < minX) minX = b.left
                if (b.right > maxX) maxX = b.right
                if (b.top < minY) minY = b.top
                if (b.bottom > maxY) maxY = b.bottom
            }

            if (minX < maxX && minY < maxY) {
                val padding = 40f
                val contentLeft = minX - padding
                val contentTop = minY - padding
                val contentRight = maxX + padding
                val contentBottom = maxY + padding
                val contentW = (contentRight - contentLeft).coerceAtLeast(50f)
                val contentH = (contentBottom - contentTop).coerceAtLeast(50f)

                val calculatedFit = minOf(viewW / contentW, viewH / contentH)
                val offsetX = (viewW - contentW * calculatedFit) / 2f
                val offsetY = (viewH - contentH * calculatedFit) / 2f

                val worldMinX = (contentLeft - offsetX / calculatedFit) / safeDensity
                val worldMinY = (contentTop - offsetY / calculatedFit) / safeDensity
                val worldMaxX = (contentLeft + (viewW - offsetX) / calculatedFit) / safeDensity
                val worldMaxY = (contentTop + (viewH - offsetY) / calculatedFit) / safeDensity
                return RectF(worldMinX, worldMinY, worldMaxX, worldMaxY)
            }
        }

        val scale = transformManager.canvasScale.coerceAtLeast(0.01f)
        val tx = transformManager.canvasTranslateX
        val ty = transformManager.canvasTranslateY
        val wMinX = (-tx / scale) / safeDensity
        val wMinY = (-ty / scale) / safeDensity
        val wMaxX = ((viewW - tx) / scale) / safeDensity
        val wMaxY = ((viewH - ty) / scale) / safeDensity
        return RectF(wMinX, wMinY, wMaxX, wMaxY)
    }

    @OptIn(androidx.ink.brush.ExperimentalInkCustomBrushApi::class)
    fun renderToBitmap(
        completedStrokes: List<Stroke>,
        fullDocument: Boolean,
        scaleMultiplier: Float,
        viewWidth: Int,
        viewHeight: Int,
        backgroundColor: Int,
        transformManager: CanvasTransformManager,
        strokeRenderer: CanvasStrokeRenderer,
        backgroundRenderer: CanvasBackgroundRenderer,
        backgroundType: String,
        getStrokeBounds: (Stroke) -> RectF?
    ): Bitmap {
        val viewW = if (viewWidth > 0) viewWidth.toFloat() else 1920f
        val viewH = if (viewHeight > 0) viewHeight.toFloat() else 1080f

        val targetW = (viewW * scaleMultiplier).toInt().coerceAtLeast(1)
        val targetH = (viewH * scaleMultiplier).toInt().coerceAtLeast(1)

        var fitScale = 0f
        val renderMatrix: Matrix = if (fullDocument && completedStrokes.isNotEmpty()) {
            var minX = Float.MAX_VALUE
            var maxX = -Float.MAX_VALUE
            var minY = Float.MAX_VALUE
            var maxY = -Float.MAX_VALUE

            for (stroke in completedStrokes) {
                val b = getStrokeBounds(stroke) ?: continue
                if (b.left < minX) minX = b.left
                if (b.right > maxX) maxX = b.right
                if (b.top < minY) minY = b.top
                if (b.bottom > maxY) maxY = b.bottom
            }

            if (minX < maxX && minY < maxY) {
                val padding = 40f
                val contentLeft = minX - padding
                val contentTop = minY - padding
                val contentRight = maxX + padding
                val contentBottom = maxY + padding
                val contentW = (contentRight - contentLeft).coerceAtLeast(50f)
                val contentH = (contentBottom - contentTop).coerceAtLeast(50f)

                val calculatedFit = minOf(viewW / contentW, viewH / contentH)
                fitScale = calculatedFit
                val offsetX = (viewW - contentW * calculatedFit) / 2f
                val offsetY = (viewH - contentH * calculatedFit) / 2f

                Matrix().apply {
                    postTranslate(-contentLeft, -contentTop)
                    postScale(calculatedFit, calculatedFit)
                    postTranslate(offsetX, offsetY)
                }
            } else {
                transformManager.getRenderMatrix()
            }
        } else {
            transformManager.getRenderMatrix()
        }

        val exportMatrix = Matrix(renderMatrix).apply {
            postScale(scaleMultiplier, scaleMultiplier)
        }
        val exportScale = (if (fitScale > 0f) fitScale else transformManager.canvasScale) * scaleMultiplier

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            try {
                val renderNode = android.graphics.RenderNode("ink_export").apply {
                    setPosition(0, 0, targetW, targetH)
                }
                val canvas = renderNode.beginRecording(targetW, targetH)
                canvas.drawColor(backgroundColor)
                canvas.scale(scaleMultiplier, scaleMultiplier)
                canvas.save()
                canvas.concat(renderMatrix)
                backgroundRenderer.draw(
                    canvas,
                    viewW,
                    viewH,
                    transformManager.canvasScale,
                    transformManager.canvasTranslateX,
                    transformManager.canvasTranslateY,
                    backgroundType
                )
                for (stroke in completedStrokes) {
                    strokeRenderer.draw(canvas, stroke, exportMatrix, exportScale)
                }
                canvas.restore()
                renderNode.endRecording()

                val imageReader = android.media.ImageReader.newInstance(
                    targetW,
                    targetH,
                    android.graphics.PixelFormat.RGBA_8888,
                    1,
                    android.hardware.HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE or android.hardware.HardwareBuffer.USAGE_GPU_COLOR_OUTPUT
                )

                val renderer = android.graphics.HardwareRenderer().apply {
                    setSurface(imageReader.surface)
                    setContentRoot(renderNode)
                }

                val request = renderer.createRenderRequest()
                request.setWaitForPresent(true)
                request.syncAndDraw()

                val image = imageReader.acquireNextImage()
                val hardwareBuffer = image?.hardwareBuffer
                val hwBitmap = if (hardwareBuffer != null) {
                    Bitmap.wrapHardwareBuffer(hardwareBuffer, null)
                } else null

                val softwareBitmap = hwBitmap?.copy(Bitmap.Config.ARGB_8888, false)

                image?.close()
                hardwareBuffer?.close()
                imageReader.close()
                renderer.destroy()

                if (softwareBitmap != null) {
                    return softwareBitmap
                }
            } catch (e: Exception) {
                android.util.Log.w("OffscreenDocumentRenderer", "HardwareRenderer offscreen capture failed: ${e.message}", e)
            }
        }

        // Fallback for devices without HardwareRenderer
        val fallbackBitmap = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(fallbackBitmap)
        canvas.drawColor(backgroundColor)
        canvas.scale(scaleMultiplier, scaleMultiplier)
        canvas.save()
        canvas.concat(renderMatrix)
        backgroundRenderer.draw(
            canvas,
            viewW,
            viewH,
            transformManager.canvasScale,
            transformManager.canvasTranslateX,
            transformManager.canvasTranslateY,
            backgroundType
        )
        for (stroke in completedStrokes) {
            strokeRenderer.draw(canvas, stroke, exportMatrix, exportScale)
        }
        canvas.restore()
        return fallbackBitmap
    }
}
