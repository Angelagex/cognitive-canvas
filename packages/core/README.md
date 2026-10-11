# Cognitive Canvas Core (`@cognitive-canvas/core`) 🧠⚙️

Este paquete constituye el **núcleo de dominio isomórfico** de Cognitive Canvas. No depende de React Native, Android ni librerías de UI; es código TypeScript puro que puede ejecutarse tanto en el cliente móvil como en funciones serverless de AWS Lambda o scripts de evaluación.

---

## 📦 Contenido y Módulos

### 1. Motor Visual AST (`src/parser/VisualASTEngine.ts`)
Implementa un pipeline determinista de análisis geométrico y topológico sobre trazos de tinta digital:
* **Clasificación Geométrica de Trazos:** Diferenciación entre trazos caligráficos de escritura, trazos rectilíneos de conexión y contornos cerrados (cajas de conceptos o elipses).
* **Clustering Espacial Adaptativo:** Agrupamiento de trazos contiguos en bloques de texto coherentes sin fracturar palabras completas.
* **Detección de Conectores Magnéticos:** Identificación de flechas y líneas que vinculan entidades conceptuales, calculando puntos de anclaje de origen y destino.

### 2. Contratos y Tipos Canónicos (`src/types/`)
* **`ast.ts`:** Definición de estructuras de datos para `VisualAST`, `VisualASTEntity`, `VisualASTConnector` y cajas delimitadoras `EntityBoundingBox`.
* **`pacer.ts`:** Taxonomía PACER (`Procedural`, `Analogous`, `Conceptual`, `Evidence`, `Reference`) y atributos cognitivos (`CAUSAL_MECHANISM`, `ANALOGY`, `EVIDENCE`).
* **`ink.ts`:** Tipos para trazos nativos, batches de entrada y puntos en World DP.
* **`schema.ts`:** Esquemas de validación y serialización del formato universal de persistencia `.cmn`.

---

## 🧪 Pruebas Unitarias

La suite de pruebas automatizadas está construida sobre **Vitest** y valida la precisión matemática del parser y la integridad de los esquemas:

```bash
# Dentro de packages/core:
npx vitest run

# Modo observador (Watch Mode para TDD):
npx vitest
```

Actualmente, **32/32 tests pasan satisfactoriamente**, cubriendo:
* Clustering de palabras completas complejas (e.g. prueba canónica de "Photography").
* Detección y no-fracturación de conectores.
* Invarianza geométrica y validación de esquemas JSON.
