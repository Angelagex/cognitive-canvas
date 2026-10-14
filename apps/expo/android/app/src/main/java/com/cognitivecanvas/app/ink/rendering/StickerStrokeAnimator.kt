package com.cognitivecanvas.app.ink.rendering

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.RectF
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import com.cognitivecanvas.app.ink.spatial.SpatialHashGrid
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Motor de animación concurrente de ensamblaje de trazos vectoriales (120 FPS).
 * Interpola el despliegue progresivo de los trazos de un sticker durante 450 ms
 * y sella atómicamente el resultado en completedStrokes y SpatialHashGrid.
 */
class StickerStrokeAnimator(
    private val hostView: View,
    private val completedStrokes: CopyOnWriteArrayList<Stroke>,
    private val spatialGrid: SpatialHashGrid,
    private val getStrokeBounds: (Stroke) -> RectF?,
    private val onStrokeCountChanged: () -> Unit
) {
    @Volatile
    var animatedStrokes: List<Stroke>? = null
        private set

    @Volatile
    var isAnimating: Boolean = false
        private set

    private var currentAnimator: ValueAnimator? = null

    /**
     * Inicia la animación de ensamblaje progresivo para los trazos del sticker.
     */
    fun animateAndSeal(strokes: List<Stroke>, onCompleted: (() -> Unit)? = null) {
        if (strokes.isEmpty()) {
            onCompleted?.invoke()
            return
        }

        currentAnimator?.cancel()
        isAnimating = true

        val animator = ValueAnimator.ofFloat(0.0f, 1.0f).apply {
            duration = 450L
            interpolator = DecelerateInterpolator()
            addUpdateListener { animation ->
                val progress = animation.animatedValue as Float
                val partialList = mutableListOf<Stroke>()

                for (stroke in strokes) {
                    val inputs = stroke.inputs
                    val total = inputs.size
                    val visibleCount = (total * progress).toInt().coerceIn(2, total)
                    val batch = MutableStrokeInputBatch()

                    for (i in 0 until visibleCount) {
                        batch.add(inputs.get(i))
                    }

                    partialList.add(Stroke(stroke.brush, batch.toImmutable()))
                }

                animatedStrokes = partialList
                hostView.postInvalidateOnAnimation()
            }

            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    animatedStrokes = null
                    isAnimating = false

                    // 1. Sellado definitivo en el motor de tinta permanente
                    completedStrokes.addAll(strokes)

                    // 2. Indexación espacial en World DP
                    for (stroke in strokes) {
                        val bounds = getStrokeBounds(stroke)
                        if (bounds != null) {
                            spatialGrid.insert(stroke, bounds)
                        }
                    }

                    // 3. Feedback táctil háptico sutil
                    try {
                        hostView.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                    } catch (_: Exception) {}

                    // 4. Notificar actualización de estadísticas y redibujar
                    onStrokeCountChanged()
                    hostView.postInvalidateOnAnimation()
                    onCompleted?.invoke()
                }

                override fun onAnimationCancel(animation: Animator) {
                    animatedStrokes = null
                    isAnimating = false
                    hostView.postInvalidateOnAnimation()
                }
            })
        }

        currentAnimator = animator
        animator.start()
    }

    fun cancelAnimation() {
        currentAnimator?.cancel()
        animatedStrokes = null
        isAnimating = false
        hostView.postInvalidateOnAnimation()
    }
}
