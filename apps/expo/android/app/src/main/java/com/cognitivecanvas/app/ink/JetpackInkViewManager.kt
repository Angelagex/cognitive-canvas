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

    @ReactProp(name = "canvasBackgroundColor")
    fun setCanvasBackgroundColor(view: JetpackInkView, colorString: String?) {
        if (!colorString.isNullOrEmpty()) {
            try {
                view.canvasBackgroundColor = Color.parseColor(colorString)
            } catch (e: IllegalArgumentException) {
                // Fallback to default
            }
        }
    }

    @ReactProp(name = "gridColor")
    fun setGridColor(view: JetpackInkView, colorString: String?) {
        if (!colorString.isNullOrEmpty()) {
            try {
                view.gridColor = Color.parseColor(colorString)
            } catch (e: IllegalArgumentException) {
                // Fallback to default
            }
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

    @ReactProp(name = "deleteSelectionTrigger")
    fun setDeleteSelectionTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.deleteSelectedStrokes()
        }
    }

    @ReactProp(name = "duplicateSelectionTrigger")
    fun setDuplicateSelectionTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.duplicateSelectedStrokes()
        }
    }

    @ReactProp(name = "clearSelectionTrigger")
    fun setClearSelectionTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0) {
            view.clearSelection()
        }
    }

    @ReactProp(name = "loadedStrokesJson")
    fun setLoadedStrokesJson(view: JetpackInkView, json: String?) {
        view.pendingLoadedStrokesJson = json
    }

    @ReactProp(name = "loadStrokesTrigger")
    fun setLoadStrokesTrigger(view: JetpackInkView, trigger: Int) {
        if (trigger > 0 && !view.pendingLoadedStrokesJson.isNullOrEmpty()) {
            view.loadStrokesFromJson(view.pendingLoadedStrokesJson)
            view.pendingLoadedStrokesJson = null
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return mapOf(
            "topStrokeEnd" to mapOf("registrationName" to "onStrokeEnd"),
            "topTransform" to mapOf("registrationName" to "onTransform"),
            "topBarrelButton" to mapOf("registrationName" to "onBarrelButton"),
            "topSelectionChanged" to mapOf("registrationName" to "onSelectionChanged"),
            "topHover" to mapOf("registrationName" to "onHover"),
            "topHoverTimeout" to mapOf("registrationName" to "onHoverTimeout"),
            "topFingerTap" to mapOf("registrationName" to "onFingerTap"),
            "topScratchOut" to mapOf("registrationName" to "onScratchOut"),
            "topStrokesTransformed" to mapOf("registrationName" to "onStrokesTransformed")
        )
    }

    companion object {
        const val REACT_CLASS = "JetpackInkView"
    }
}
