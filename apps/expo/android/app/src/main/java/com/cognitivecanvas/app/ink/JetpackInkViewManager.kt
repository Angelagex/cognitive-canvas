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
                // Fallback to default
            }
        }
    }

    @ReactProp(name = "strokeWidth", defaultFloat = 6f)
    fun setStrokeWidth(view: JetpackInkView, width: Float) {
        view.strokeWidth = width
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.of(
            "topStrokeEnd",
            MapBuilder.of("registrationName", "onStrokeEnd")
        )
    }

    companion object {
        const val REACT_CLASS = "JetpackInkView"
    }
}
