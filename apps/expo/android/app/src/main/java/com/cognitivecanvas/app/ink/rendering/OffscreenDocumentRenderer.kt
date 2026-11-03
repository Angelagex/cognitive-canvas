package com.cognitivecanvas.app.ink.rendering

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
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

    /**
     * Computes the document-wide bounding box in World DP across all stroke input points,
     * completely independent of screen dimensions or active camera zoom/pan offsets.
     */
    fun computeDocumentWorldRect(
        completedStrokes: List<Stroke>,
        density: Float
    ): RectF {
        val safeDensity = if (density > 0f) density else 1f
        var minX = Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        for (stroke in completedStrokes) {
            val inputs = stroke.inputs
            for (i in 0 until inputs.size) {
                val pt = inputs.get(i)
                val wx = pt.x / safeDensity
                val wy = pt.y / safeDensity
                if (wx < minX) minX = wx
                if (wy < minY) minY = wy
                if (wx > maxX) maxX = wx
                if (wy > maxY) maxY = wy
            }
        }

        if (minX >= maxX || minY >= maxY || !minX.isFinite() || !minY.isFinite()) {
            minX = 0f
            minY = 0f
            maxX = 1000f
            maxY = 1000f
        }

        val padding = 80f // 80dp margin around all perimeter strokes
        return RectF(minX - padding, minY - padding, maxX + padding, maxY + padding)
    }

    fun computeRenderedWorldRect(
        completedStrokes: List<Stroke>,
        fullDocument: Boolean,
        viewWidth: Int,
        viewHeight: Int,
        density: Float,
        transformManager: CanvasTransformManager,
        getStrokeBounds: (Stroke) -> RectF?
    ): RectF {
        return computeDocumentWorldRect(completedStrokes, density)
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
        getStrokeBounds: (Stroke) -> RectF?,
        density: Float = 2.0f
    ): Bitmap {
        val safeDensity = if (density > 0f) density else 1f
        val docRect = computeDocumentWorldRect(completedStrokes, safeDensity)

        val rawWidth = (docRect.width() * safeDensity).coerceAtLeast(1f)
        val rawHeight = (docRect.height() * safeDensity).coerceAtLeast(1f)

        // Downscale to max 1536px while preserving aspect ratio
        val maxDimension = 1536f
        val scaleFactor = if (rawWidth > maxDimension || rawHeight > maxDimension) {
            maxDimension / maxOf(rawWidth, rawHeight)
        } else {
            1.0f
        }

        val targetWidth = (rawWidth * scaleFactor).toInt().coerceIn(512, 1536)
        val targetHeight = (rawHeight * scaleFactor).toInt().coerceIn(512, 1536)

        val docLeftPx = docRect.left * safeDensity
        val docTopPx = docRect.top * safeDensity
        val docWidthPx = rawWidth
        val docHeightPx = rawHeight

        val scaleX = targetWidth.toFloat() / docWidthPx
        val scaleY = targetHeight.toFloat() / docHeightPx
        val effectiveScale = minOf(scaleX, scaleY).coerceAtLeast(0.1f)

        val renderMatrix = Matrix().apply {
            postTranslate(-docLeftPx, -docTopPx)
            postScale(scaleX, scaleY)
        }

        val bgColor = if (backgroundColor != 0) backgroundColor else Color.parseColor("#0A0F1D")

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            try {
                val renderNode = android.graphics.RenderNode("ink_export").apply {
                    setPosition(0, 0, targetWidth, targetHeight)
                }
                val canvas = renderNode.beginRecording(targetWidth, targetHeight)
                canvas.drawColor(bgColor)
                canvas.save()
                canvas.concat(renderMatrix)
                for (stroke in completedStrokes) {
                    strokeRenderer.draw(canvas, stroke, renderMatrix, effectiveScale)
                }
                canvas.restore()
                renderNode.endRecording()

                val imageReader = android.media.ImageReader.newInstance(
                    targetWidth,
                    targetHeight,
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
                android.util.Log.w("OffscreenDocumentRenderer", "HardwareRenderer capture fallback: ${e.message}", e)
            }
        }

        val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(bgColor)
        canvas.save()
        canvas.concat(renderMatrix)
        for (stroke in completedStrokes) {
            strokeRenderer.draw(canvas, stroke, renderMatrix, effectiveScale)
        }
        canvas.restore()
        return bitmap
    }
}
