package com.cognitivecanvas.app.ink

import android.graphics.Color
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class JetpackInkViewManager : SimpleViewManager<JetpackInkView>() {

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): JetpackInkView {
        return JetpackInkView(reactContext)
    }

    @ReactProp(name = "strokeColor")
    fun setStrokeColor(view: JetpackInkView, colorString: String?) {
        if (!colorString.isNullOrEmpty()) {
            try {
                view.strokeColor = Color.parseColor(colorString)
            } catch (e: IllegalArgumentException) {
                // Fallback
            }
        }
    }

    @ReactProp(name = "strokeWidth", defaultFloat = 18f)
    fun setStrokeWidth(view: JetpackInkView, width: Float) {
        view.strokeWidth = width
    }

    @ReactProp(name = "brushType")
    fun setBrushType(view: JetpackInkView, type: String?) {
        if (!type.isNullOrEmpty()) {
            view.brushType = type
        }
    }

    @ReactProp(name = "eraserMode")
    fun setEraserMode(view: JetpackInkView, mode: String?) {
        if (!mode.isNullOrEmpty()) {
            view.eraserMode = mode
        }
    }

    @ReactProp(name = "backgroundType")
    fun setBackgroundType(view: JetpackInkView, type: String?) {
        if (!type.isNullOrEmpty()) {
            view.backgroundType = type
        }
    }

    @ReactProp(name = "stylusOnly", defaultBoolean = true)
    fun setStylusOnly(view: JetpackInkView, enabled: Boolean) {
        view.stylusOnly = enabled
    }

    @ReactProp(name = "zoomInTrigger")
    fun setZoomInTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.zoomIn()
        }
    }

    @ReactProp(name = "zoomOutTrigger")
    fun setZoomOutTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.zoomOut()
        }
    }

    @ReactProp(name = "resetZoomTrigger")
    fun setResetZoomTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.resetZoom()
        }
    }

    @ReactProp(name = "clearTrigger")
    fun setClearTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.clearStrokes()
        }
    }

    @ReactProp(name = "undoTrigger")
    fun setUndoTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.undoStroke()
        }
    }

    @ReactProp(name = "redoTrigger")
    fun setRedoTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.redoStroke()
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.of(
            "topStrokeEnd",
            MapBuilder.of("registrationName", "onStrokeEnd"),
            "topTransform",
            MapBuilder.of("registrationName", "onTransform"),
            "topBarrelButton",
            MapBuilder.of("registrationName", "onBarrelButton")
        )
    }

    companion object {
        const val REACT_CLASS = "JetpackInkView"
    }
}
