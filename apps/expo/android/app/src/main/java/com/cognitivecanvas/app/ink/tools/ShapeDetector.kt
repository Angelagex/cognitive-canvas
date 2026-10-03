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
    fun detectAndSnap(stroke: Stroke): Stroke? {
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
        val boxWidth = maxX - minX
        val boxHeight = maxY - minY
        val boxDiag = hypot(boxWidth, boxHeight)

        // A stroke is considered closed if endpoints meet within 25% of length or 28% of box diagonal
        val isClosed = (directDist / totalLength) <= 0.25f || (directDist < boxDiag * 0.28f && points.size > 14)

        // -------------------------------------------------------------
        // 1. OPEN STROKES: Lines vs. Arrows
        // -------------------------------------------------------------
        if (!isClosed) {
            // First check if the user drew an Arrow: shaft + acute fold at the end
            val arrowStroke = trySnapArrow(stroke, points, totalLength)
            if (arrowStroke != null) return arrowStroke

            // Check if the entire stroke is a Straight Line (direct chord >= 88% of travel)
            if (directDist > 30f && (directDist / totalLength) >= 0.88f) {
                return snapToStraightLine(stroke, start, end, directDist)
            }
            return null
        }

        // -------------------------------------------------------------
        // 2. CLOSED STROKES: Circle, Ellipse, Triangle, Rectangle/Square
        // -------------------------------------------------------------
        if (boxWidth < 25f || boxHeight < 25f) return null

        // Calculate centroid and isoperimetric quotient Q = 4 * PI * Area / Perimeter^2
        // Circle: Q ~ 0.88 - 1.0
        // Square: Q ~ 0.75 - 0.81 (Theoretical max for square is PI/4 = 0.785)
        // Rectangle: Q ~ 0.60 - 0.75
        // Triangle: Q ~ 0.48 - 0.65
        val polygonArea = computeShoelaceArea(points)
        val perimeter = totalLength
        val isoperimetricQuotient = if (perimeter > 0f) {
            (4.0 * Math.PI * polygonArea) / (perimeter * perimeter)
        } else 0.0

        var sumX = 0f
        var sumY = 0f
        for (pt in points) {
            sumX += pt.x
            sumY += pt.y
        }
        val cx = sumX / points.size
        val cy = sumY / points.size

        val aspect = abs(boxWidth - boxHeight) / max(boxWidth, boxHeight)

        // A. CIRCLE & ELLIPSE (High circularity: Q > 0.84)
        if (isoperimetricQuotient > 0.84) {
            // Check radial distance variance from centroid
            var sumR = 0f
            val radii = FloatArray(points.size)
            for (i in points.indices) {
                val r = hypot(points[i].x - cx, points[i].y - cy)
                radii[i] = r
                sumR += r
            }
            val meanR = sumR / points.size

            if (aspect < 0.22f) {
                return snapToCircle(stroke, cx, cy, meanR)
            } else {
                return snapToEllipse(stroke, cx, cy, boxWidth / 2f, boxHeight / 2f)
            }
        }

        // B. POLYGONS: Triangle, Rectangle, Square (Q <= 0.84)
        // Find dominant corner vertices using RDP on the closed perimeter
        val rdpEpsilon = max(boxDiag * 0.08f, 12f)
        val corners = extractClosedCorners(points, rdpEpsilon)

        // 3 Corners -> TRIANGLE
        if (corners.size == 3) {
            val v1 = corners[0]
            val v2 = corners[1]
            val v3 = corners[2]
            return snapToPolygon(stroke, listOf(v1, v2, v3, v1))
        }

        // 4 Corners -> RECTANGLE or SQUARE
        if (corners.size == 4) {
            val v0 = corners[0]
            val v1 = corners[1]
            val v2 = corners[2]
            val v3 = corners[3]

            // If aspect ratio is close to 1:1, snap to perfect Square
            if (aspect < 0.18f) {
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
            }

            // Snap to Axis-Aligned Rectangle
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

        // Fallback for rough polygons: if corners ~ 3 or 4 after merging
        if (corners.size in 3..5) {
            val simplifiedCorners = mergeCloseCorners(corners, 20f)
            if (simplifiedCorners.size == 3) {
                return snapToPolygon(stroke, simplifiedCorners + simplifiedCorners.first())
            }
            if (simplifiedCorners.size == 4) {
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

        // If stroke is elongated and relatively smooth, snap to ellipse
        if (aspect >= 0.35f && isoperimetricQuotient > 0.65) {
            return snapToEllipse(stroke, cx, cy, boxWidth / 2f, boxHeight / 2f)
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

    /**
     * Recognizes single-stroke arrows: a straight shaft followed by an acute fold (arrowhead).
     * If the user just drew a straight line without folding back, returns null!
     */
    private fun trySnapArrow(stroke: Stroke, points: List<Point>, totalLength: Float): Stroke? {
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

            // Angle between shaft vector and tip vector:
            // A fold backwards has angle > 75 degrees
            val dot = (shaftDx * tipDx + shaftDy * tipDy) / (shaftLen * tipLen)
            val clampedDot = dot.coerceIn(-1.0f, 1.0f)
            val angleDeg = Math.toDegrees(acos(clampedDot.toDouble()))

            if (angleDeg > 75.0 && angleDeg > bestTipAngle) {
                var travel = 0f
                for (k in 1..i) {
                    travel += hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y)
                }
                if (shaftLen / travel >= 0.78f) {
                    bestTipAngle = angleDeg
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

        val headLength = min(max(shaftLen * 0.25f, 55f), 95f)
        val wingAngle = Math.toRadians(30.0).toFloat()

        // Wing 1 (top wing)
        val w1x = pTip.x - headLength * cos(shaftAngle - wingAngle)
        val w1y = pTip.y - headLength * sin(shaftAngle - wingAngle)

        // Wing 2 (bottom wing)
        val w2x = pTip.x - headLength * cos(shaftAngle + wingAngle)
        val w2y = pTip.y - headLength * sin(shaftAngle + wingAngle)

        val resultPoints = ArrayList<Point>()
        // 1. Shaft: pStart -> pTip
        val shaftSteps = 24
        for (s in 0..shaftSteps) {
            val t = s.toFloat() / shaftSteps
            resultPoints.add(Point(pStart.x + t * shaftDx, pStart.y + t * shaftDy))
        }

        // 2. Wing 1: pTip -> w1
        val wingSteps = 8
        for (s in 1..wingSteps) {
            val t = s.toFloat() / wingSteps
            resultPoints.add(Point(pTip.x + t * (w1x - pTip.x), pTip.y + t * (w1y - pTip.y)))
        }

        // 3. Base of arrowhead: w1 -> w2
        val baseSteps = 8
        for (s in 1..baseSteps) {
            val t = s.toFloat() / baseSteps
            resultPoints.add(Point(w1x + t * (w2x - w1x), w1y + t * (w2y - w1y)))
        }

        // 4. Wing 2: w2 -> pTip
        for (s in 1..wingSteps) {
            val t = s.toFloat() / wingSteps
            resultPoints.add(Point(w2x + t * (pTip.x - w2x), w2y + t * (pTip.y - w2y)))
        }

        return buildStrokeFromPoints(stroke, resultPoints)
    }

    private fun snapToCircle(stroke: Stroke, cx: Float, cy: Float, radius: Float): Stroke? {
        val steps = 54
        val resultPoints = ArrayList<Point>(steps + 1)
        for (i in 0..steps) {
            val angle = (2.0 * Math.PI * i / steps).toFloat()
            val x = cx + radius * cos(angle)
            val y = cy + radius * sin(angle)
            resultPoints.add(Point(x, y))
        }
        return buildStrokeFromPoints(stroke, resultPoints)
    }

    private fun snapToEllipse(stroke: Stroke, cx: Float, cy: Float, rx: Float, ry: Float): Stroke? {
        if (rx <= 5f || ry <= 5f) return null
        val steps = 54
        val resultPoints = ArrayList<Point>(steps + 1)
        for (i in 0..steps) {
            val angle = (2.0 * Math.PI * i / steps).toFloat()
            val x = cx + rx * cos(angle)
            val y = cy + ry * sin(angle)
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
            for (i in points.indices) {
                val pt = points[i]
                val timeMillis = (i * 12).toLong() + 10L
                val input = StrokeInput.create(pt.x, pt.y, timeMillis)
                batch.addOrIgnore(input)
            }
            Stroke(originalStroke.brush, batch.asImmutable())
        } catch (_: Exception) {
            null
        }
    }
}
