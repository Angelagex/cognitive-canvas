package com.cognitivecanvas.app.ink

import android.util.Log
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.DigitalInkRecognizerOptions

/**
 * Gestor de Modelos Offline de Google ML Kit Digital Ink Recognition
 * Permite inicializar y descargar bajo demanda el modelo de idioma para caligrafía local.
 */
object DigitalInkModelManager {
    private const val TAG = "DigitalInkModelManager"
    private var recognizer: DigitalInkRecognizer? = null
    private var isDownloading = false
    private var isModelReady = false

    fun isReady(): Boolean = isModelReady && recognizer != null

    /**
     * Asegura que el reconocedor esté descargado y listo para inferir trazos offline.
     */
    fun ensureModelReady(languageTag: String = "es", onComplete: ((Boolean) -> Unit)? = null) {
        if (recognizer != null && isModelReady) {
            onComplete?.invoke(true)
            return
        }

        val modelIdentifier: DigitalInkRecognitionModelIdentifier? = try {
            DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag)
                ?: DigitalInkRecognitionModelIdentifier.fromLanguageTag("en")
        } catch (e: Exception) {
            Log.e(TAG, "Error identificando lenguaje $languageTag", e)
            DigitalInkRecognitionModelIdentifier.fromLanguageTag("en")
        }

        if (modelIdentifier == null) {
            Log.e(TAG, "No se encontró identificador de modelo para $languageTag")
            onComplete?.invoke(false)
            return
        }

        val model = DigitalInkRecognitionModel.builder(modelIdentifier).build()
        val remoteModelManager = RemoteModelManager.getInstance()

        // Verificar si ya está descargado
        remoteModelManager.isModelDownloaded(model)
            .addOnSuccessListener { isDownloaded ->
                if (isDownloaded) {
                    val options = DigitalInkRecognizerOptions.builder(model).build()
                    recognizer = DigitalInkRecognition.getClient(options)
                    isModelReady = true
                    Log.d(TAG, "✅ Modelo Digital Ink ($languageTag) ya disponible localmente.")
                    onComplete?.invoke(true)
                } else if (!isDownloading) {
                    isDownloading = true
                    Log.d(TAG, "📥 Descargando modelo Digital Ink ($languageTag) para uso offline...")
                    val conditions = DownloadConditions.Builder().build()
                    remoteModelManager.download(model, conditions)
                        .addOnSuccessListener {
                            isDownloading = false
                            isModelReady = true
                            val options = DigitalInkRecognizerOptions.builder(model).build()
                            recognizer = DigitalInkRecognition.getClient(options)
                            Log.d(TAG, "✅ Modelo Digital Ink ($languageTag) descargado exitosamente.")
                            onComplete?.invoke(true)
                        }
                        .addOnFailureListener { e ->
                            isDownloading = false
                            Log.e(TAG, "❌ Falló la descarga del modelo Digital Ink ($languageTag): ${e.message}")
                            onComplete?.invoke(false)
                        }
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error verificando modelo local", e)
                onComplete?.invoke(false)
            }
    }

    fun getRecognizer(): DigitalInkRecognizer? = recognizer
}
