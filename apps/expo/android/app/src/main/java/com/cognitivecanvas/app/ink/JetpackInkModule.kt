package com.cognitivecanvas.app.ink

import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.io.FileOutputStream

import com.facebook.react.bridge.ReadableArray
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class JetpackInkModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        // Precargar modelo offline en segundo plano al iniciar la app
        CoroutineScope(Dispatchers.IO).launch {
            DigitalInkModelManager.ensureModelReady("es")
        }
    }

    override fun getName(): String = "JetpackInkModule"

    @ReactMethod
    fun initializeDigitalInk(options: ReadableMap?, promise: Promise) {
        val lang = if (options?.hasKey("language") == true) options.getString("language") ?: "es" else "es"
        DigitalInkModelManager.ensureModelReady(lang) { success ->
            if (success) {
                promise.resolve(true)
            } else {
                promise.reject("ERR_MODEL_INIT", "No se pudo descargar o inicializar el modelo Digital Ink.")
            }
        }
    }

    @ReactMethod
    fun recognizeInkStrokes(strokesArray: ReadableArray, promise: Promise) {
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val strokeList = mutableListOf<InkStrokeData>()
                for (i in 0 until strokesArray.size()) {
                    val strokeMap = strokesArray.getMap(i) ?: continue
                    val id = if (strokeMap.hasKey("id")) strokeMap.getString("id") ?: "stroke_$i" else "stroke_$i"
                    val pointsArray = if (strokeMap.hasKey("points")) strokeMap.getArray("points") else null
                    if (pointsArray == null) continue

                    val pointList = mutableListOf<InkPointData>()
                    for (j in 0 until pointsArray.size()) {
                        val pMap = pointsArray.getMap(j) ?: continue
                        val x = pMap.getDouble("x").toFloat()
                        val y = pMap.getDouble("y").toFloat()
                        val t = if (pMap.hasKey("t")) pMap.getDouble("t").toLong() else (j * 10).toLong()
                        pointList.add(InkPointData(x, y, t))
                    }
                    if (pointList.isNotEmpty()) {
                        strokeList.add(InkStrokeData(id, pointList))
                    }
                }

                val result = DigitalInkWorker.recognizeStrokes(strokeList)
                val resultMap = Arguments.createMap().apply {
                    putString("transcription", result.transcription)
                    putDouble("confidence", result.confidence.toDouble())
                    putBoolean("isTextBlock", result.isTextBlock)
                    val candidatesArray = Arguments.createArray()
                    result.candidates.forEach { candidatesArray.pushString(it) }
                    putArray("candidates", candidatesArray)
                }

                promise.resolve(resultMap)
            } catch (e: Exception) {
                promise.reject("ERR_RECOGNIZE_FAILED", e.message, e)
            }
        }
    }

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
                var bitmap: Bitmap? = null
                try {
                    bitmap = inkView.captureBitmap(scaleMultiplier)
                } catch (e: Exception) {
                    android.util.Log.w("JetpackInkModule", "captureBitmap threw exception: ${e.message}", e)
                }

                if (bitmap != null) {
                    saveBitmapAndResolve(bitmap, promise)
                    return@post
                }

                // Fallback to PixelCopy from Activity Window if HardwareRenderer failed
                val activity = currentActivity
                if (activity != null && activity.window != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val location = IntArray(2)
                    inkView.getLocationInWindow(location)
                    val rect = Rect(
                        location[0],
                        location[1],
                        location[0] + inkView.width,
                        location[1] + inkView.height
                    )
                    val copyBitmap = Bitmap.createBitmap(inkView.width, inkView.height, Bitmap.Config.ARGB_8888)
                    PixelCopy.request(
                        activity.window,
                        rect,
                        copyBitmap,
                        { copyResult ->
                            if (copyResult == PixelCopy.SUCCESS) {
                                saveBitmapAndResolve(copyBitmap, promise)
                            } else {
                                promise.reject("ERR_PIXEL_COPY", "PixelCopy failed with code: $copyResult")
                            }
                        },
                        Handler(Looper.getMainLooper())
                    )
                } else {
                    promise.reject("ERR_CAPTURE_FAILED", "No valid bitmap captured.")
                }
            } catch (e: Exception) {
                promise.reject("ERR_CAPTURE_FAILED", e.message, e)
            }
        }
    }

    private fun saveBitmapAndResolve(bitmap: Bitmap, promise: Promise) {
        Thread {
            try {
                val fileName = "canvas_render_${System.currentTimeMillis()}.jpg"
                val cacheDir = reactContext.cacheDir
                val file = File(cacheDir, fileName)
                val stream = FileOutputStream(file)
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                stream.flush()
                stream.close()

                val result = Arguments.createMap().apply {
                    putString("uri", file.toURI().toString())
                    putString("path", file.absolutePath)
                    putString("mimeType", "image/jpeg")
                    putInt("width", bitmap.width)
                    putInt("height", bitmap.height)
                    putDouble("sizeBytes", file.length().toDouble())
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR_PNG_ENCODE", e.message, e)
            }
        }.start()
    }
}
