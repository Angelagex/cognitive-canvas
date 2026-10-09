import { describe, it, expect, vi } from "vitest";

vi.mock("sst", () => ({
  Resource: {
    Database: { name: "TestDatabase" },
    MyBucket: { name: "TestBucket" },
    GeminiApiKey: { value: "test-api-key" },
  },
}));

// Mock GoogleGenAI SDK
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            nodes: [
              {
                id: "node_proc_1",
                visual_bounding_box: [100, 100, 200, 200],
                detected_content: "Paso 1: Inicialización",
                passive_context: null,
                pacer_classification: "PROCEDURAL",
                deducible_from_context: true,
              },
              {
                id: "node_evid_1",
                visual_bounding_box: [300, 100, 400, 200],
                detected_content: "Constante K_d = 0.05 mM",
                passive_context: "Constante de afinidad medida por espectroscopía",
                pacer_classification: "EVIDENCE",
                deducible_from_context: false,
              },
            ],
            edges: [
              {
                source_node_id: "node_proc_1",
                target_node_id: "node_evid_1",
                label: "determinado por",
                is_cross_link: true,
                relation_nature: "causal",
              },
            ],
            grinde_audit: {
              cross_link_density_score: 1.0,
              linear_thinking_risk: false,
              feedback_critique: "Buena interconexión no lineal.",
            },
            anki_flashcards: [
              {
                target_node_id: "node_evid_1",
                card_type: "BASIC",
                front: "¿Cuál es el valor de K_d?",
                back: "0.05 mM",
                deck_name: "CognitiveCanvas::Biomoleculas",
              },
            ],
            high_road_transfer_prompts: [
              "Aplica la constante de afinidad a la tasa de ocupación de servidores en red.",
            ],
            derring_effect_challenges: [
              "Si K_d aumenta a 50 mM, la afinidad es mayor. ¿Verdadero o falso?",
            ],
            contrasting_cases_icc: [
              {
                case_a: "Caso A: Ligando A con K_d = 0.01 mM.",
                case_b: "Caso B: Ligando B con K_d = 10 mM.",
                underlying_invariant_prompt: "Induce la relación inversa entre K_d y afinidad.",
              },
            ],
          }),
        }),
      };
    },
  };
});

// Mock DynamoDB client operations to avoid active AWS calls in test
vi.mock("@cognitive-canvas/core/canvas", () => ({
  CanvasRepository: {
    get: vi.fn().mockResolvedValue({ id: "canvas_1", s3Key: "canvas_1.png" }),
    update: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@cognitive-canvas/core/compilation", () => ({
  CompilationRepository: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@cognitive-canvas/core/cognitivenode", () => ({
  CognitiveNodeRepository: {
    batchCreate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@cognitive-canvas/core/cognitiveedge", () => ({
  CognitiveEdgeRepository: {
    batchCreate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@cognitive-canvas/core/flashcard", () => ({
  FlashcardRepository: {
    batchCreate: vi.fn().mockResolvedValue([]),
  },
}));

import { handler } from "../src/compile";

describe("Phase 2 - Cognitive Compiler Handler Tests", () => {
  it("should return 400 error if canvas_id is missing", async () => {
    const event = {
      body: JSON.stringify({}),
    };
    const response: any = await handler(event, {} as any, () => {});
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain("canvas_id");
  });

  it("should return 400 error if no image source is provided", async () => {
    const event = {
      body: JSON.stringify({ canvas_id: "non_existent_canvas" }),
    };
    // Mock get returning null
    const { CanvasRepository } = await import("@cognitive-canvas/core/canvas");
    vi.mocked(CanvasRepository.get).mockResolvedValueOnce(null as any);

    const response: any = await handler(event, {} as any, () => {});
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain("No image source provided");
  });

  it("should successfully execute full compilation with structured Gemini output", async () => {
    const mockPayload = {
      canvas_id: "canvas_test_123",
      image_base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      passive_context_dictionary: {
        node_evid_1: "Constante de afinidad medida por espectroscopía",
      },
    };

    const event = {
      body: JSON.stringify(mockPayload),
    };

    const response: any = await handler(event, {} as any, () => {});
    expect(response.statusCode).toBe(200);

    const result = JSON.parse(response.body);
    expect(result.canvas_id).toBe("canvas_test_123");
    expect(result.compilation_id).toBeDefined();
    expect(result.output.nodes).toHaveLength(2);

    // ANTI-OVERLOAD ANKI RULE VALIDATION:
    // Only EVIDENCE / REFERENCE nodes with deducible_from_context = false should generate Anki cards
    const proceduralNode = result.output.nodes.find(
      (n: any) => n.pacer_classification === "PROCEDURAL"
    );
    expect(proceduralNode).toBeDefined();

    const flashcard = result.output.anki_flashcards[0];
    expect(flashcard.target_node_id).not.toBe(proceduralNode.id);
    expect(flashcard.target_node_id).toBe("node_evid_1");
  });
});
