package com.cognitivecanvas.app.ink.input

import android.view.MotionEvent

class StylusInputHandler(
    var stylusOnly: Boolean = true,
    private val onBarrelButtonPressed: (x: Float, y: Float) -> Unit = { _, _ -> }
) {

    fun isStylus(event: MotionEvent, pointerIndex: Int = 0): Boolean {
        if (pointerIndex < 0 || pointerIndex >= event.pointerCount) return false
        val toolType = event.getToolType(pointerIndex)
        return toolType == MotionEvent.TOOL_TYPE_STYLUS || toolType == MotionEvent.TOOL_TYPE_ERASER
    }

    fun isStylusEraser(event: MotionEvent, pointerIndex: Int = 0): Boolean {
        if (pointerIndex < 0 || pointerIndex >= event.pointerCount) return false
        return event.getToolType(pointerIndex) == MotionEvent.TOOL_TYPE_ERASER
    }

    fun isBarrelButtonPressed(event: MotionEvent): Boolean {
        val state = event.buttonState
        return (state and MotionEvent.BUTTON_STYLUS_PRIMARY) != 0 ||
               (state and MotionEvent.BUTTON_STYLUS_SECONDARY) != 0
    }

    fun shouldAcceptDrawingTouch(event: MotionEvent, pointerIndex: Int = 0): Boolean {
        if (!stylusOnly) {
            // Both finger and stylus can draw
            return true
        }
        // Palm rejection: Only accept drawing if the active pointer is a stylus
        return isStylus(event, pointerIndex)
    }

    fun checkBarrelButton(event: MotionEvent) {
        if (isBarrelButtonPressed(event)) {
            val pointerIndex = event.actionIndex
            val x = event.getX(pointerIndex)
            val y = event.getY(pointerIndex)
            onBarrelButtonPressed(x, y)
        }
    }
}
