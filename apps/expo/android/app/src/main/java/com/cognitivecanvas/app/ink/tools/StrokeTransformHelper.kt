package com.cognitivecanvas.app.ink.tools

import android.graphics.Matrix
import androidx.ink.brush.Brush
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput

/**
 * Utilidad robusta para transformar trazos vectoriales en Jetpack Ink.
 * Garantiza que la reconstrucción de trazos cumpla con los invariantes nativos de C++:
 * - Evita duplicados consecutivos de posición (x, y) y elapsed_time.
 * - Asegura monotonía temporal en los puntos (elapsed_time no decreciente).
 * - Descarta puntos con valores NaN o infinitos.
 * - Provee tolerancia a fallos individual por punto ante excepciones nativas.
 */
object StrokeTransformHelper {

    class InputState {
        var lastX: Float = Float.NaN
        var lastY: Float = Float.NaN
        var lastTime: Long = Long.MIN_VALUE
        var hasPoints: Boolean = false
    }

    /**
     * Agrega un StrokeInput a un MutableStrokeInputBatch validando invariantes nativos.
     * Retorna true si el punto fue agregado exitosamente, o false si fue descartado.
     */
    fun appendInputSafely(
        batch: MutableStrokeInputBatch,
        state: InputState,
        candidate: StrokeInput
    ): Boolean {
        // 1. Descartar coordenadas inválidas
        if (candidate.x.isNaN() || candidate.y.isNaN() || candidate.x.isInfinite() || candidate.y.isInfinite()) {
            return false
        }

        // 2. Invariante Jetpack Ink: Inputs must not have duplicate `position` and `elapsed_time`
        if (state.hasPoints &&
            candidate.x == state.lastX &&
            candidate.y == state.lastY &&
            candidate.elapsedTimeMillis == state.lastTime
        ) {
            return false
        }

        // 3. Invariante de monotonía temporal: elapsed_time debe ser no decreciente
        val safeTime = if (state.hasPoints && candidate.elapsedTimeMillis < state.lastTime) {
            state.lastTime + 1L
        } else {
            candidate.elapsedTimeMillis
        }

        val safeInput = if (safeTime != candidate.elapsedTimeMillis) {
            StrokeInput.create(
                candidate.x,
                candidate.y,
                safeTime,
                candidate.toolType,
                candidate.strokeUnitLengthCm,
                candidate.pressure,
                candidate.tiltRadians,
                candidate.orientationRadians
            )
        } else {
            candidate
        }

        return try {
            batch.add(safeInput)
            state.lastX = safeInput.x
            state.lastY = safeInput.y
            state.lastTime = safeInput.elapsedTimeMillis
            state.hasPoints = true
            true
        } catch (_: IllegalArgumentException) {
            false
        }
    }

    /**
     * Traslada un trazo aplicando dx y dy (en World DP) escalados a pixeles nativos.
     */
    fun translateStroke(stroke: Stroke, dx: Float, dy: Float, density: Float = 1.0f): Stroke {
        if (dx == 0f && dy == 0f) return stroke
        val inputs = stroke.inputs
        val count = inputs.size
        if (count == 0) return stroke

        val batch = MutableStrokeInputBatch()
        val state = InputState()
        val dxPx = dx * density
        val dyPx = dy * density

        for (i in 0 until count) {
            val pt = inputs.get(i)
            val translated = StrokeInput.create(
                pt.x + dxPx,
                pt.y + dyPx,
                pt.elapsedTimeMillis,
                pt.toolType,
                pt.strokeUnitLengthCm,
                pt.pressure,
                pt.tiltRadians,
                pt.orientationRadians
            )
            appendInputSafely(batch, state, translated)
        }

        if (batch.size < 1) return stroke
        return try {
            Stroke(stroke.brush, batch.toImmutable())
        } catch (_: Exception) {
            stroke
        }
    }

    /**
     * Escala un trazo en torno a un pivote (en World DP) y ajusta proporcionalmente el pincel.
     */
    fun scaleStroke(stroke: Stroke, scale: Float, pivotX: Float, pivotY: Float, density: Float = 1.0f): Stroke {
        if (scale == 1.0f) return stroke
        val inputs = stroke.inputs
        val count = inputs.size
        if (count == 0) return stroke

        val batch = MutableStrokeInputBatch()
        val state = InputState()
        val pivotXPx = pivotX * density
        val pivotYPx = pivotY * density

        for (i in 0 until count) {
            val pt = inputs.get(i)
            val sx = pivotXPx + (pt.x - pivotXPx) * scale
            val sy = pivotYPx + (pt.y - pivotYPx) * scale
            val scaled = StrokeInput.create(
                sx,
                sy,
                pt.elapsedTimeMillis,
                pt.toolType,
                pt.strokeUnitLengthCm,
                pt.pressure,
                pt.tiltRadians,
                pt.orientationRadians
            )
            appendInputSafely(batch, state, scaled)
        }

        if (batch.size < 1) return stroke
        val origBrush = stroke.brush
        val scaledBrush = Brush.createWithColorIntArgb(
            family = origBrush.family,
            colorIntArgb = origBrush.colorIntArgb,
            size = (origBrush.size * scale).coerceIn(1.0f, 60.0f),
            epsilon = origBrush.epsilon
        )
        return try {
            Stroke(scaledBrush, batch.toImmutable())
        } catch (_: Exception) {
            stroke
        }
    }

    /**
     * Transforma un trazo aplicando una matriz afín arbitraria (Matrix).
     */
    fun transformStrokeWithMatrix(stroke: Stroke, matrix: Matrix): Stroke {
        if (matrix.isIdentity) return stroke
        val inputs = stroke.inputs
        val count = inputs.size
        if (count == 0) return stroke

        val batch = MutableStrokeInputBatch()
        val state = InputState()
        val pts = FloatArray(2)

        for (i in 0 until count) {
            val pt = inputs.get(i)
            pts[0] = pt.x
            pts[1] = pt.y
            matrix.mapPoints(pts)
            val transformed = StrokeInput.create(
                pts[0],
                pts[1],
                pt.elapsedTimeMillis,
                pt.toolType,
                pt.strokeUnitLengthCm,
                pt.pressure,
                pt.tiltRadians,
                pt.orientationRadians
            )
            appendInputSafely(batch, state, transformed)
        }

        if (batch.size < 1) return stroke
        return try {
            Stroke(stroke.brush, batch.toImmutable())
        } catch (_: Exception) {
            stroke
        }
    }
}
