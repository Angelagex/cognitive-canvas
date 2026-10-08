package com.cognitivecanvas.app.ink

import android.graphics.Bitmap
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.io.FileOutputStream

class JetpackInkModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "JetpackInkModule"

    @ReactMethod
    fun exportHighResPng(options: ReadableMap?, promise: Promise) {
        val inkView = JetpackInkView.activeInstance?.get()
        if (inkView == null) {
            promise.reject("ERR_NO_CANVAS", "No active JetpackInkView found on screen.")
            return
        }

        val scaleMultiplier = if (options?.hasKey("scaleMultiplier") == true) {
            options.getDouble("scaleMultiplier").toFloat()
        } else {
            2.0f
        }

        Handler(Looper.getMainLooper()).post {
            try {
                val bitmap = inkView.captureBitmap(scaleMultiplier)
                Thread {
                    try {
                        val fileName = "canvas_render_${System.currentTimeMillis()}.png"
                        val cacheDir = reactContext.cacheDir
                        val file = File(cacheDir, fileName)
                        val stream = FileOutputStream(file)
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                        stream.flush()
                        stream.close()

                        val result = Arguments.createMap().apply {
                            putString("uri", file.toURI().toString())
                            putString("path", file.absolutePath)
                            putInt("width", bitmap.width)
                            putInt("height", bitmap.height)
                            putDouble("sizeBytes", file.length().toDouble())
                        }
                        promise.resolve(result)
                    } catch (e: Exception) {
                        promise.reject("ERR_PNG_ENCODE", e.message, e)
                    }
                }.start()
            } catch (e: Exception) {
                promise.reject("ERR_CAPTURE_FAILED", e.message, e)
            }
        }
    }
}
