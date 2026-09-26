# Cognitive Canvas - Especificación de Arquitectura

## 1. Misión
Compilador cognitivo de mapas mentales dibujados a mano alzada para convertir trazos libres en un grafo semántico ejecutable basado en:
- Metodología Dr. Justin Sung (GRINDE + PACER).
- Ciencias Cognitivas (Ausubel, Novak, Perkins & Salomon, Schwartz, Bjork).

## 2. Stack Tecnológico
- **Frontend**: React Native + Expo con TypeScript.
  - Trazos y baja latencia: Native UI Component / TurboModule puenteando `PencilKit` (iOS) y `Jetpack Ink API` (Android).
  - Rechazo de palma y predictive inking a bajo nivel.
  - UI de soporte, modales y panel lateral en React Native.
- **Backend**: AWS Serverless desplegado con SST (v3 / Ion).
  - AWS S3 (Bucket para render PNG de canvas).
  - AWS Lambda (TypeScript/Node) con timeout >= 60s.
  - Google Gen AI SDK (`gemini-2.0-flash`) con Structured Outputs.
- **Integraciones**:
  - AnkiConnect (`localhost:8765`) para inyección directa de notas `EVIDENCE` y `REFERENCE`.

## 3. Modelo de Datos y JSON Schema
El backend debe exigir a Gemini una respuesta validada contra el esquema:
- Nodos: `id`, `visual_bounding_box`, `detected_content`, `passive_context`, `pacer_classification` (PROCEDURAL | ANALOGOUS | CONCEPTUAL | EVIDENCE | REFERENCE), `deducible_from_context`.
- Edges: `source_node_id`, `target_node_id`, `label`, `is_cross_link`, `relation_nature`.
- Auditoría GRINDE: `cross_link_density_score`, `linear_thinking_risk`, `feedback_critique`.
- Salidas cognitivas: `anki_flashcards` (SOLO Evidence/Reference no deducibles), `high_road_transfer_prompts`, `derring_effect_challenges`, `contrasting_cases_icc`.

## 4. Dinámica de Lienzo & Atributos Pasivos
- Doble toque o lazo sobre el trazo activa el micro-tooltip.
- Captura multimodal (Voz vía native speech recognition o chip rápido) para asignar `passive_context`.
- Badge sutil en el nodo sin sobrecargar la vista.