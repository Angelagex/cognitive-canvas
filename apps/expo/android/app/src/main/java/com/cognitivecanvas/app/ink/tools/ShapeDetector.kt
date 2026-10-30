package com.cognitivecanvas.app.ink.tools

import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import androidx.ink.strokes.StrokeInput
import kotlin.math.*

class ShapeDetector {

    data class Point(val x: Float, val y: Float)

    /**
     * Attempts to recognize a geometric shape from [stroke].
     * Returns a new regularized [Stroke] if a shape is identified, or null if no shape matched.
     * Recognized shapes:
     * - Straight Line (with horizontal, vertical, and 45-degree angle snapping)
     * - Arrow (straight shaft with directional arrowhead tip)
     * - Circle (high isoperimetric quotient Q > 0.84, aspect ~ 1:1)
     * - Ellipse (Q > 0.82, elongated aspect ratio)
     * - Rectangle / Square (Q <= 0.84, 4 dominant RDP vertices with ~90 deg corners)
     * - Triangle (Q <= 0.84, 3 dominant RDP vertices)
     */
    fun detectAndSnap(stroke: Stroke, density: Float = 1f, canvasScale: Float = 1f): Stroke? {
        val inputs = stroke.inputs
        val count = inputs.size
        if (count < 6) return null

        val points = ArrayList<Point>(count)
        var totalLength = 0f
        var prevX = inputs.get(0).x
        var prevY = inputs.get(0).y
        points.add(Point(prevX, prevY))

        var minX = prevX
        var maxX = prevX
        var minY = prevY
        var maxY = prevY

        for (i in 1 until count) {
            val pt = inputs.get(i)
            val dx = pt.x - prevX
            val dy = pt.y - prevY
            val segLen = hypot(dx, dy)
            if (segLen > 0.5f) {
                totalLength += segLen
                points.add(Point(pt.x, pt.y))
                if (pt.x < minX) minX = pt.x
                if (pt.x > maxX) maxX = pt.x
                if (pt.y < minY) minY = pt.y
                if (pt.y > maxY) maxY = pt.y
                prevX = pt.x
                prevY = pt.y
            }
        }

        if (totalLength < 35f || points.size < 6) return null

        val start = points.first()
        val end = points.last()
        val directDist = hypot(end.x - start.x, end.y - start.y)
        val directDistDp = if (density > 0f) directDist / density else directDist
        val boxWidth = maxX - minX
        val boxHeight = maxY - minY
        val boxDiag = hypot(boxWidth, boxHeight)

        // Trazo cerrado: distance(start, end) < 30f dp
        val isClosed = (directDistDp < 30f) || (directDist / totalLength <= 0.20f)

        // -------------------------------------------------------------
        // 1. TRAZOS ABIERTOS: Rectas vs Flechas vs Arcos Curvos
        // -------------------------------------------------------------
        if (!isClosed) {
            // Distancia perpendicular máxima de cualquier punto respecto a la cuerda (start -> end)
            var dMax = 0f
            var apex = start
            for (p in points) {
                val d = perpendicularDistance(p, start, end)
                if (d > dMax) {
                    dMax = d
                    apex = p
                }
            }
            val sagittaRatio = if (directDist > 0.001f) dMax / directDist else 0f

            // 1A. Flechas bidireccionales: doble vértice agudo en extremos
            val bidiArrowStroke = trySnapBidirectionalArrow(stroke, points, totalLength, density, canvasScale)
            if (bidiArrowStroke != null) {
                return bidiArrowStroke
            }

            // 1B. Flechas unidireccionales: eje + punta aguda (rectas o curvas)
            val arrowStroke = trySnapArrow(stroke, points, density, canvasScale)
            if (arrowStroke != null) {
                return arrowStroke
            }

            // 1C. Si sagittaRatio < 0.12: La línea es intencionalmente recta
            if (sagittaRatio < 0.12f && directDist > 25f) {
                return snapToStraightLine(stroke, start, end, directDist)
            }

            // 1C. Si sagittaRatio >= 0.12: El usuario dibujó intencionalmente un ARCO CURVO
            if (sagittaRatio >= 0.12f && directDist > 25f && dMax > 6f) {
                return snapToArcCurve(stroke, start, apex, end)
            }

            return null
        }

        // -------------------------------------------------------------
        // 2. TRAZOS CERRADOS: Círculo / Elipse vs Rectángulo / Triángulo
        // -------------------------------------------------------------
        if (boxWidth < 20f || boxHeight < 20f) return null

        val cx = (minX + maxX) / 2f
        val cy = (minY + maxY) / 2f
        val rx = boxWidth / 2f
        val ry = boxHeight / 2f
        val ar = min(boxWidth, boxHeight) / max(boxWidth, boxHeight)

        // Evalúa la desviación radial respecto a una elipse
        var sumDeltaR = 0.0
        for (p in points) {
            val normX = (p.x - cx) / rx
            val normY = (p.y - cy) / ry
            val distNorm = sqrt((normX * normX + normY * normY).toDouble())
            sumDeltaR += abs(distNorm - 1.0)
        }
        val meanDeltaR = sumDeltaR / points.size

        // Si el error medio < 0.20: Es un CÍRCULO o ELIPSE
        if (meanDeltaR < 0.20) {
            val isCircle = ar >= 0.82f
            val finalRx = if (isCircle) (rx + ry) / 2f else rx
            val finalRy = if (isCircle) (rx + ry) / 2f else ry
            return snapToCubicBezierEllipse(stroke, cx, cy, finalRx, finalRy)
        }

        // Si meanDeltaR >= 0.20: Es un RECTÁNGULO / CUADRADO o TRIÁNGULO
        val rdpEpsilon = max(boxDiag * 0.08f, 12f)
        val corners = extractClosedCorners(points, rdpEpsilon)
        val simplifiedCorners = mergeCloseCorners(corners, 20f)
        val cornerCount = simplifiedCorners.size

        // Triángulo
        if (cornerCount == 3) {
            return snapToPolygon(stroke, simplifiedCorners + simplifiedCorners.first())
        }

        val polygonArea = computeShoelaceArea(points)
        val boxArea = boxWidth * boxHeight
        val areaRatio = if (boxArea > 0f) (polygonArea / boxArea).toFloat() else 0f

        // Rectángulo o Cuadrado
        if (cornerCount in 3..6 || areaRatio in 0.60f..1.15f) {
            if (ar >= 0.85f) {
                // Cuadrado
                val side = (boxWidth + boxHeight) / 2f
                val sqMinX = cx - side / 2f
                val sqMaxX = cx + side / 2f
                val sqMinY = cy - side / 2f
                val sqMaxY = cy + side / 2f
                return snapToPolygon(
                    stroke,
                    listOf(
                        Point(sqMinX, sqMinY),
                        Point(sqMaxX, sqMinY),
                        Point(sqMaxX, sqMaxY),
                        Point(sqMinX, sqMaxY),
                        Point(sqMinX, sqMinY)
                    )
                )
            } else {
                // Rectángulo
                return snapToPolygon(
                    stroke,
                    listOf(
                        Point(minX, minY),
                        Point(maxX, minY),
                        Point(maxX, maxY),
                        Point(minX, maxY),
                        Point(minX, minY)
                    )
                )
            }
        }

        return null
    }

    private fun snapToStraightLine(stroke: Stroke, start: Point, end: Point, dist: Float): Stroke? {
        var x1 = start.x
        var y1 = start.y
        var x2 = end.x
        var y2 = end.y

        val dx = x2 - x1
        val dy = y2 - y1

        // Horizontal snap (within ~6 degrees)
        if (abs(dy) / dist < 0.105f) {
            val avgY = (y1 + y2) / 2f
            y1 = avgY
            y2 = avgY
        }
        // Vertical snap (within ~6 degrees)
        else if (abs(dx) / dist < 0.105f) {
            val avgX = (x1 + x2) / 2f
            x1 = avgX
            x2 = avgX
        }
        // 45-degree diagonal snap
        else if (abs(abs(dx) - abs(dy)) / dist < 0.10f) {
            val signY = if (dy >= 0) 1f else -1f
            y2 = y1 + signY * abs(dx)
        }

        val steps = 20
        val resultPoints = ArrayList<Point>(steps + 1)
        for (i in 0..steps) {
            val t = i.toFloat() / steps
            resultPoints.add(Point(x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
        }

        return buildStrokeFromPoints(stroke, resultPoints)
    }

    private fun findAcuteVertexInWindow(
        points: List<Point>,
        cumDist: FloatArray,
        minDist: Float,
        maxDist: Float
    ): Int {
        var bestIndex = -1
        var bestCos = 0.50f // cos(60 deg) = 0.50 -> quiebre agudo <= 60 deg
        val n = points.size

        for (i in 2 until n - 2) {
            val d = cumDist[i]
            if (d < minDist || d > maxDist) continue

            // Vector hacia atrás a al menos 4px de distancia de arco para estabilidad
            var prevIdx = i - 1
            while (prevIdx > 0 && cumDist[i] - cumDist[prevIdx] < 4f) {
                prevIdx--
            }
            val prevP = points[prevIdx]
            val uX = prevP.x - points[i].x
            val uY = prevP.y - points[i].y
            val uLen = hypot(uX, uY)

            // Vector hacia adelante a al menos 4px de distancia de arco
            var nextIdx = i + 1
            while (nextIdx < n - 1 && cumDist[nextIdx] - cumDist[i] < 4f) {
                nextIdx++
            }
            val nextP = points[nextIdx]
            val vX = nextP.x - points[i].x
            val vY = nextP.y - points[i].y
            val vLen = hypot(vX, vY)

            if (uLen < 2f || vLen < 2f) continue

            val dot = (uX * vX + uY * vY) / (uLen * vLen)
            if (dot > bestCos) {
                bestCos = dot
                bestIndex = i
            }
        }
        return bestIndex
    }

    private fun appendArrowHead(
        resultPoints: ArrayList<Point>,
        tip: Point,
        w1: Point,
        w2: Point,
        wingSteps: Int = 8,
        baseSteps: Int = 8
    ) {
        // tip -> w1
        for (s in 1..wingSteps) {
            val t = s.toFloat() / wingSteps
            resultPoints.add(Point(tip.x + t * (w1.x - tip.x), tip.y + t * (w1.y - tip.y)))
        }
        // w1 -> w2 (base)
        for (s in 1..baseSteps) {
            val t = s.toFloat() / baseSteps
            resultPoints.add(Point(w1.x + t * (w2.x - w1.x), w1.y + t * (w2.y - w1.y)))
        }
        // w2 -> tip
        for (s in 1..wingSteps) {
            val t = s.toFloat() / wingSteps
            resultPoints.add(Point(w2.x + t * (tip.x - w2.x), w2.y + t * (tip.y - w2.y)))
        }
    }

    /**
     * Recognizes bidirectional arrows: strokes with acute vertices (<= 60 deg)
     * near both the start (first 20% of stroke length) and the end (last 20% of stroke length).
     * Connects interior points with a straight line or quadratic Bézier arc (sagittaRatio),
     * and projects opposing arrowhead wings at both pStart and pEnd.
     */
    private fun trySnapBidirectionalArrow(
        stroke: Stroke,
        points: List<Point>,
        totalLength: Float,
        density: Float = 1f,
        canvasScale: Float = 1f
    ): Stroke? {
        val count = points.size
        if (count < 12 || totalLength < 40f) return null

        val cumDist = FloatArray(count)
        cumDist[0] = 0f
        for (i in 1 until count) {
            cumDist[i] = cumDist[i - 1] + hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
        }

        // Vértice agudo cerca del inicio (dentro del primer 20% de la longitud)
        val startIndex = findAcuteVertexInWindow(points, cumDist, 4f, totalLength * 0.22f)
        if (startIndex == -1) return null

        // Vértice agudo cerca del final (dentro del último 20% de la longitud)
        val endIndex = findAcuteVertexInWindow(points, cumDist, totalLength * 0.78f, totalLength - 4f)
        if (endIndex == -1 || endIndex <= startIndex) return null

        val pStart = points[startIndex]
        val pEnd = points[endIndex]
        val shaftDx = pEnd.x - pStart.x
        val shaftDy = pEnd.y - pStart.y
        val shaftLen = hypot(shaftDx, shaftDy)

        if (shaftLen < 25f) return null

        // El cuerpo debe representar la porción principal del trazo
        val startWingLen = cumDist[startIndex]
        val endWingLen = totalLength - cumDist[endIndex]
        if (startWingLen > shaftLen * 0.60f || endWingLen > shaftLen * 0.60f) return null

        // Evalúa la sagita del cuerpo (shaft) entre ambos vértices
        var dMaxShaft = 0f
        var shaftApex = pStart
        for (k in startIndex..endIndex) {
            val p = points[k]
            val d = perpendicularDistance(p, pStart, pEnd)
            if (d > dMaxShaft) {
                dMaxShaft = d
                shaftApex = p
            }
        }
        val shaftSagittaRatio = if (shaftLen > 0.001f) dMaxShaft / shaftLen else 0f

        val shaftPoints = ArrayList<Point>()
        val thetaStart: Float
        val thetaEnd: Float

        if (shaftSagittaRatio < 0.12f) {
            // Cuerpo recto
            val angle = atan2(shaftDy, shaftDx)
            thetaStart = angle
            thetaEnd = angle
            val shaftSteps = 24
            for (s in 0..shaftSteps) {
                val t = s.toFloat() / shaftSteps
                shaftPoints.add(Point(pStart.x + t * shaftDx, pStart.y + t * shaftDy))
            }
        } else {
            // Cuerpo curvo de Bézier cuadrático que pasa por shaftApex en t = 0.5
            val pcX = 2f * shaftApex.x - 0.5f * (pStart.x + pEnd.x)
            val pcY = 2f * shaftApex.y - 0.5f * (pStart.y + pEnd.y)
            thetaStart = atan2(pcY - pStart.y, pcX - pStart.x)
            thetaEnd = atan2(pEnd.y - pcY, pEnd.x - pcX)

            val shaftSteps = 24
            for (s in 0..shaftSteps) {
                val t = s.toFloat() / shaftSteps
                val u = 1f - t
                val x = u * u * pStart.x + 2f * u * t * pcX + t * t * pEnd.x
                val y = u * u * pStart.y + 2f * u * t * pcY + t * t * pEnd.y
                shaftPoints.add(Point(x, y))
            }
        }

        val strokeWidth = stroke.brush.size
        // Longitud de cabeza base en Screen DP (entre 12dp y 22dp para visibilidad óptima)
        val baseHeadScreenDp = (14f + (strokeWidth * 0.4f)).coerceIn(12f, 24f)
        val effectiveScale = max(canvasScale * density, 0.001f)
        val headLengthWorld = (baseHeadScreenDp / effectiveScale).coerceAtMost(shaftLen * 0.35f)

        // El ángulo de apertura de las alas se mantiene en ~28 grados (0.48 rad)
        val wingAngle = 0.48f

        // Aletas en pStart (orientadas hacia el cuerpo en dirección opuesta a la punta exterior)
        val w1StartX = pStart.x + headLengthWorld * cos(thetaStart - wingAngle)
        val w1StartY = pStart.y + headLengthWorld * sin(thetaStart - wingAngle)
        val w2StartX = pStart.x + headLengthWorld * cos(thetaStart + wingAngle)
        val w2StartY = pStart.y + headLengthWorld * sin(thetaStart + wingAngle)

        // Aletas en pEnd (orientadas hacia el cuerpo retrocediendo desde thetaEnd)
        val w1EndX = pEnd.x - headLengthWorld * cos(thetaEnd - wingAngle)
        val w1EndY = pEnd.y - headLengthWorld * sin(thetaEnd - wingAngle)
        val w2EndX = pEnd.x - headLengthWorld * cos(thetaEnd + wingAngle)
        val w2EndY = pEnd.y - headLengthWorld * sin(thetaEnd + wingAngle)

        val resultPoints = ArrayList<Point>()
        // 1. Aletas iniciales en pStart
        resultPoints.add(pStart)
        appendArrowHead(resultPoints, pStart, Point(w1StartX, w1StartY), Point(w2StartX, w2StartY))

        // 2. Cuerpo continuo desde pStart hasta pEnd
        for (s in 1 until shaftPoints.size) {
            resultPoints.add(shaftPoints[s])
        }

        // 3. Aletas finales en pEnd
        appendArrowHead(resultPoints, pEnd, Point(w1EndX, w1EndY), Point(w2EndX, w2EndY))

        return buildStrokeFromPoints(stroke, resultPoints)
    }

    /**
     * Recognizes single-stroke arrows: a straight or curved shaft followed by an acute fold (arrowhead).
     * If the shaft has sagittaRatio < 0.12: regularizes to a straight shaft.
     * If sagittaRatio >= 0.12: regularizes to a smooth quadratic Bézier arc aligned with the arrowhead.
     */
    private fun trySnapArrow(
        stroke: Stroke,
        points: List<Point>,
        density: Float = 1f,
        canvasScale: Float = 1f
    ): Stroke? {
        val count = points.size
        if (count < 10) return null

        val pStart = points.first()

        // Look for the tip vertex where the stroke folds back towards the shaft
        // The tip occurs between 50% and count-2 points
        var bestTipIndex = -1
        var bestTipAngle = 0.0

        val searchStart = (count * 0.50f).toInt()
        val searchEnd = count - 2

        for (i in searchStart..searchEnd) {
            val pTip = points[i]
            val shaftDx = pTip.x - pStart.x
            val shaftDy = pTip.y - pStart.y
            val shaftLen = hypot(shaftDx, shaftDy)

            if (shaftLen < 25f) continue

            // Vector from tip to end of stroke
            val pEnd = points.last()
            val tipDx = pEnd.x - pTip.x
            val tipDy = pEnd.y - pTip.y
            val tipLen = hypot(tipDx, tipDy)

            if (tipLen < 8f || tipLen > shaftLen * 0.55f) continue

            // Angle between incoming shaft direction and tip fold:
            val dot = (shaftDx * tipDx + shaftDy * tipDy) / (shaftLen * tipLen)
            val clampedDot = dot.coerceIn(-1.0f, 1.0f)
            val chordAngleDeg = Math.toDegrees(acos(clampedDot.toDouble()))

            // Tangent direction entering tip
            val inDx = pTip.x - points[max(0, i - 3)].x
            val inDy = pTip.y - points[max(0, i - 3)].y
            val inLen = hypot(inDx, inDy)
            val localDot = if (inLen > 0.001f) (inDx * tipDx + inDy * tipDy) / (inLen * tipLen) else dot
            val clampedLocalDot = localDot.coerceIn(-1.0f, 1.0f)
            val localAngleDeg = Math.toDegrees(acos(clampedLocalDot.toDouble()))

            val effectiveAngle = max(chordAngleDeg, localAngleDeg)

            if (effectiveAngle > 70.0 && effectiveAngle > bestTipAngle) {
                var travel = 0f
                for (k in 1..i) {
                    travel += hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y)
                }
                if (travel > 0f && shaftLen / travel >= 0.55f) {
                    bestTipAngle = effectiveAngle
                    bestTipIndex = i
                }
            }
        }

        if (bestTipIndex == -1) return null

        val pTip = points[bestTipIndex]
        val shaftDx = pTip.x - pStart.x
        val shaftDy = pTip.y - pStart.y
        val shaftLen = hypot(shaftDx, shaftDy)
        val shaftAngle = atan2(shaftDy, shaftDx)

        // Evalúa la sagita del cuerpo (shaft) de la flecha
        var dMaxShaft = 0f
        var shaftApex = pStart
        for (k in 0..bestTipIndex) {
            val p = points[k]
            val d = perpendicularDistance(p, pStart, pTip)
            if (d > dMaxShaft) {
                dMaxShaft = d
                shaftApex = p
            }
        }
        val shaftSagittaRatio = if (shaftLen > 0.001f) dMaxShaft / shaftLen else 0f

        val resultPoints = ArrayList<Point>()
        val tipAngle: Float

        if (shaftSagittaRatio < 0.12f) {
            // Cuerpo recto
            tipAngle = shaftAngle
            val shaftSteps = 24
            for (s in 0..shaftSteps) {
                val t = s.toFloat() / shaftSteps
                resultPoints.add(Point(pStart.x + t * shaftDx, pStart.y + t * shaftDy))
            }
        } else {
            // Cuerpo curvo de Bézier cuadrático regularizado que pasa por shaftApex en t = 0.5
            val pcX = 2f * shaftApex.x - 0.5f * (pStart.x + pTip.x)
            val pcY = 2f * shaftApex.y - 0.5f * (pStart.y + pTip.y)
            tipAngle = atan2(pTip.y - pcY, pTip.x - pcX)

            val shaftSteps = 24
            for (s in 0..shaftSteps) {
                val t = s.toFloat() / shaftSteps
                val u = 1f - t
                val x = u * u * pStart.x + 2f * u * t * pcX + t * t * pTip.x
                val y = u * u * pStart.y + 2f * u * t * pcY + t * t * pTip.y
                resultPoints.add(Point(x, y))
            }
        }

        val strokeWidth = stroke.brush.size
        // Longitud de cabeza base en Screen DP (entre 12dp y 22dp para visibilidad óptima)
        val baseHeadScreenDp = (14f + (strokeWidth * 0.4f)).coerceIn(12f, 24f)
        val effectiveScale = max(canvasScale * density, 0.001f)
        val headLengthWorld = (baseHeadScreenDp / effectiveScale).coerceAtMost(shaftLen * 0.40f)

        // El ángulo de apertura de las alas se mantiene en ~28 grados (0.48 rad)
        val wingAngle = 0.48f

        // Wing 1 (top wing)
        val w1x = pTip.x - headLengthWorld * cos(tipAngle - wingAngle)
        val w1y = pTip.y - headLengthWorld * sin(tipAngle - wingAngle)

        // Wing 2 (bottom wing)
        val w2x = pTip.x - headLengthWorld * cos(tipAngle + wingAngle)
        val w2y = pTip.y - headLengthWorld * sin(tipAngle + wingAngle)

        appendArrowHead(resultPoints, pTip, Point(w1x, w1y), Point(w2x, w2y))

        return buildStrokeFromPoints(stroke, resultPoints)
    }

    private fun snapToCubicBezierEllipse(stroke: Stroke, cx: Float, cy: Float, rx: Float, ry: Float): Stroke? {
        if (rx <= 5f || ry <= 5f) return null
        val kappa = 0.55228475f
        val kx = kappa * rx
        val ky = kappa * ry

        // 4 curvas cúbicas de Bézier que forman una elipse o círculo cerrado perfecto:
        // Cuadrante 1 (Derecha -> Superior): (cx+rx, cy) -> (cx, cy-ry)
        // Cuadrante 2 (Superior -> Izquierda): (cx, cy-ry) -> (cx-rx, cy)
        // Cuadrante 3 (Izquierda -> Inferior): (cx-rx, cy) -> (cx, cy+ry)
        // Cuadrante 4 (Inferior -> Derecha): (cx, cy+ry) -> (cx+rx, cy)

        val p0 = Point(cx + rx, cy)
        val c0a = Point(cx + rx, cy - ky)
        val c0b = Point(cx + kx, cy - ry)
        val p1 = Point(cx, cy - ry)

        val c1a = Point(cx - kx, cy - ry)
        val c1b = Point(cx - rx, cy - ky)
        val p2 = Point(cx - rx, cy)

        val c2a = Point(cx - rx, cy + ky)
        val c2b = Point(cx - kx, cy + ry)
        val p3 = Point(cx, cy + ry)

        val c3a = Point(cx + kx, cy + ry)
        val c3b = Point(cx + rx, cy + ky)

        val resultPoints = ArrayList<Point>(65)
        val stepsPerQuadrant = 16

        fun sampleCubic(pStart: Point, c1: Point, c2: Point, pEnd: Point, includeFirst: Boolean) {
            val startIdx = if (includeFirst) 0 else 1
            for (s in startIdx..stepsPerQuadrant) {
                val t = s.toFloat() / stepsPerQuadrant
                val u = 1f - t
                val x = u * u * u * pStart.x + 3f * u * u * t * c1.x + 3f * u * t * t * c2.x + t * t * t * pEnd.x
                val y = u * u * u * pStart.y + 3f * u * u * t * c1.y + 3f * u * t * t * c2.y + t * t * t * pEnd.y
                resultPoints.add(Point(x, y))
            }
        }

        sampleCubic(p0, c0a, c0b, p1, true)
        sampleCubic(p1, c1a, c1b, p2, false)
        sampleCubic(p2, c2a, c2b, p3, false)
        sampleCubic(p3, c3a, c3b, p0, false)

        return buildStrokeFromPoints(stroke, resultPoints)
    }

    private fun snapToArcCurve(stroke: Stroke, start: Point, apex: Point, end: Point): Stroke? {
        // Punto de control Pc para que la curva cuadrática pase exactamente por el vértice apex en t = 0.5:
        // Pc = 2 * apex - (start + end) / 2
        val pcX = 2f * apex.x - 0.5f * (start.x + end.x)
        val pcY = 2f * apex.y - 0.5f * (start.y + end.y)
        val pc = Point(pcX, pcY)

        val steps = 36
        val resultPoints = ArrayList<Point>(steps + 1)
        for (i in 0..steps) {
            val t = i.toFloat() / steps
            val u = 1f - t
            val x = u * u * start.x + 2f * u * t * pc.x + t * t * end.x
            val y = u * u * start.y + 2f * u * t * pc.y + t * t * end.y
            resultPoints.add(Point(x, y))
        }
        return buildStrokeFromPoints(stroke, resultPoints)
    }

    private fun snapToPolygon(stroke: Stroke, corners: List<Point>): Stroke? {
        if (corners.size < 4) return null // Need at least triangle (3 corners + 1 repeat closing)

        val resultPoints = ArrayList<Point>()
        for (c in 0 until (corners.size - 1)) {
            val pStart = corners[c]
            val pEnd = corners[c + 1]

            // Repeat anchor points at vertices to ensure zero curvature at polygon corners
            resultPoints.add(pStart)
            resultPoints.add(pStart)

            val segSteps = 10
            for (s in 1 until segSteps) {
                val t = s.toFloat() / segSteps
                resultPoints.add(Point(pStart.x + t * (pEnd.x - pStart.x), pStart.y + t * (pEnd.y - pStart.y)))
            }
        }
        resultPoints.add(corners.last())
        resultPoints.add(corners.last())

        return buildStrokeFromPoints(stroke, resultPoints)
    }

    // -------------------------------------------------------------
    // Corner Extraction & Polygon Simplification
    // -------------------------------------------------------------
    private fun extractClosedCorners(points: List<Point>, epsilon: Float): List<Point> {
        val count = points.size
        if (count < 6) return emptyList()

        // Find the point farthest from points.first()
        var maxD = 0f
        var farIndex = count / 2
        val p0 = points.first()
        for (i in 1 until count) {
            val d = hypot(points[i].x - p0.x, points[i].y - p0.y)
            if (d > maxD) {
                maxD = d
                farIndex = i
            }
        }

        // Simplify both halves using RDP
        val half1 = rdp(points.subList(0, farIndex + 1), epsilon)
        val half2 = rdp(points.subList(farIndex, count), epsilon)

        val combined = ArrayList<Point>()
        combined.addAll(half1.dropLast(1))
        combined.addAll(half2.dropLast(1))

        return mergeCloseCorners(combined, epsilon * 1.2f)
    }

    private fun mergeCloseCorners(corners: List<Point>, threshold: Float): List<Point> {
        if (corners.size <= 3) return corners
        val result = ArrayList<Point>()
        for (pt in corners) {
            val tooClose = result.any { hypot(it.x - pt.x, it.y - pt.y) < threshold }
            if (!tooClose) {
                result.add(pt)
            }
        }
        return result
    }

    private fun rdp(points: List<Point>, epsilon: Float): List<Point> {
        if (points.size < 3) return points

        var maxDist = 0f
        var maxIndex = 0
        val first = points.first()
        val last = points.last()

        for (i in 1 until points.size - 1) {
            val dist = perpendicularDistance(points[i], first, last)
            if (dist > maxDist) {
                maxDist = dist
                maxIndex = i
            }
        }

        return if (maxDist > epsilon) {
            val left = rdp(points.subList(0, maxIndex + 1), epsilon)
            val right = rdp(points.subList(maxIndex, points.size), epsilon)
            left.dropLast(1) + right
        } else {
            listOf(first, last)
        }
    }

    private fun perpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): Float {
        val dx = lineEnd.x - lineStart.x
        val dy = lineEnd.y - lineStart.y
        val lineLen = hypot(dx, dy)
        if (lineLen < 1e-4f) {
            return hypot(pt.x - lineStart.x, pt.y - lineStart.y)
        }
        val area = abs(dx * (lineStart.y - pt.y) - (lineStart.x - pt.x) * dy)
        return area / lineLen
    }

    private fun computeShoelaceArea(points: List<Point>): Double {
        var area = 0.0
        val n = points.size
        for (i in 0 until n) {
            val j = (i + 1) % n
            area += (points[i].x.toDouble() * points[j].y.toDouble())
            area -= (points[j].x.toDouble() * points[i].y.toDouble())
        }
        return abs(area) / 2.0
    }

    private fun buildStrokeFromPoints(originalStroke: Stroke, points: List<Point>): Stroke? {
        if (points.size < 2) return null
        return try {
            val batch = MutableStrokeInputBatch()
            val state = StrokeTransformHelper.InputState()
            for (i in points.indices) {
                val pt = points[i]
                val timeMillis = (i * 12).toLong() + 10L
                val input = StrokeInput.create(pt.x, pt.y, timeMillis)
                StrokeTransformHelper.appendInputSafely(batch, state, input)
            }
            if (batch.size < 2) null else Stroke(originalStroke.brush, batch.toImmutable())
        } catch (_: Exception) {
            null
        }
    }
}
