package com.cognitivecanvas.app.ink

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class JetpackInkViewManager : SimpleViewManager<JetpackInkView>() {

    override fun getName(): String {
        return "JetpackInkView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): JetpackInkView {
        return JetpackInkView(reactContext)
    }

    @ReactProp(name = "strokeColor")
    fun setStrokeColor(view: JetpackInkView, color: String?) {
        if (!color.isNullOrEmpty()) {
            view.setStrokeColor(color)
        }
    }

    @ReactProp(name = "strokeWidth")
    fun setStrokeWidth(view: JetpackInkView, width: Float) {
        view.setStrokeWidth(width)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any>? {
        return MapBuilder.of(
            "onStrokeEnd",
            MapBuilder.of("registrationName", "onStrokeEnd")
        )
    }
}
