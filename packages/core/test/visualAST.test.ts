import { describe, it, expect } from "vitest";
import { VisualASTEngine } from "../src/parser/VisualASTEngine";
import { RawInkStroke } from "../src/types/cognitive";

describe("5-Level Digital Ink Parsing & 3-Layer Persistence (ARCHITECTURE_SPEC.md Sec 5)", () => {
  const engine = new VisualASTEngine();

  // -------------------------------------------------------------
  // LEVEL 1: STROKE CLASSIFICATION
  // -------------------------------------------------------------
  it("Level 1: should correctly classify strokes into boxes, lines, and text", () => {
    // A closed box stroke
    const boxStroke: RawInkStroke = {
      id: "strk_box_1",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 300 },
        { x: 100, y: 300 },
        { x: 100, y: 100 },
      ],
    };

    // A straight horizontal line
    const lineStroke: RawInkStroke = {
      id: "strk_line_1",
      color: "#000",
      width: 2,
      points: [
        { x: 320, y: 200 },
        { x: 420, y: 200 },
      ],
    };

    const result = engine.parseVisualAST([boxStroke, lineStroke]);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("CONTAINER_BOX");
    expect(result.connectors).toHaveLength(1);
    expect(result.connectors[0].type).toBe("LINE");
  });

  // -------------------------------------------------------------
  // LEVEL 2: SPATIO-TEMPORAL CLUSTERING (< 600 ms)
  // -------------------------------------------------------------
  it("Level 2: should cluster strokes drawn within 600 ms into a single entity", () => {
    const stroke1: RawInkStroke = {
      id: "s1",
      color: "#000",
      width: 2,
      timestamp: 1000,
      points: [
        { x: 50, y: 50 },
        { x: 55, y: 52 },
      ],
    };

    // Drawn 300ms later nearby (< 600ms threshold)
    const stroke2: RawInkStroke = {
      id: "s2",
      color: "#000",
      width: 2,
      timestamp: 1300,
      points: [
        { x: 58, y: 50 },
        { x: 62, y: 53 },
      ],
    };

    // Drawn 5000ms later far away (> 600ms)
    const stroke3: RawInkStroke = {
      id: "s3",
      color: "#000",
      width: 2,
      timestamp: 6300,
      points: [
        { x: 250, y: 250 },
        { x: 260, y: 255 },
      ],
    };

    const result = engine.parseVisualAST([stroke1, stroke2, stroke3]);

    // s1 and s2 should be fused into one entity, s3 into another
    expect(result.entities).toHaveLength(2);
    const fusedEntity = result.entities.find((e) => e.stroke_ids.includes("s1"));
    expect(fusedEntity?.stroke_ids).toEqual(["s1", "s2"]);

    const separateEntity = result.entities.find((e) => e.stroke_ids.includes("s3"));
    expect(separateEntity?.stroke_ids).toEqual(["s3"]);
  });

  // -------------------------------------------------------------
  // LEVEL 3: COMPOSITE ARROWS
  // -------------------------------------------------------------
  it("Level 3: should unify shaft stroke and arrowhead tip stroke into a directed ARROW connector", () => {
    // Shaft: (100, 200) to (250, 200)
    const shaftStroke: RawInkStroke = {
      id: "strk_shaft",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 200 },
        { x: 250, y: 200 },
      ],
    };

    // Tip: V-shape arrowhead near (250, 200)
    const tipStroke: RawInkStroke = {
      id: "strk_tip",
      color: "#000",
      width: 2,
      points: [
        { x: 235, y: 190 },
        { x: 250, y: 200 },
        { x: 235, y: 210 },
      ],
    };

    const result = engine.parseVisualAST([shaftStroke, tipStroke]);

    expect(result.connectors).toHaveLength(1);
    const arrow = result.connectors[0];
    expect(arrow.type).toBe("ARROW");
    expect(arrow.directionality).toBe("FORWARD");
    expect(arrow.stroke_ids).toEqual(["strk_shaft", "strk_tip"]);
  });

  // -------------------------------------------------------------
  // LEVEL 4: HIERARCHICAL CONTAINMENT
  // -------------------------------------------------------------
  it("Level 4: should infer parent-child containment when an entity is inside a CONTAINER_BOX", () => {
    // Container Box from (50, 50) to (400, 400)
    const containerBox: RawInkStroke = {
      id: "strk_box_parent",
      color: "#000",
      width: 2,
      points: [
        { x: 50, y: 50 },
        { x: 400, y: 50 },
        { x: 400, y: 400 },
        { x: 50, y: 400 },
        { x: 50, y: 50 },
      ],
    };

    // Child entity inside the box at (100, 100) to (140, 120)
    const childStroke: RawInkStroke = {
      id: "strk_child",
      color: "#000",
      width: 2,
      timestamp: 1000,
      points: [
        { x: 100, y: 100 },
        { x: 110, y: 115 },
        { x: 125, y: 105 },
        { x: 140, y: 120 },
      ],
    };

    // Entity outside the box at (600, 600)
    const outsideStroke: RawInkStroke = {
      id: "strk_outside",
      color: "#000",
      width: 2,
      timestamp: 5000,
      points: [
        { x: 600, y: 600 },
        { x: 615, y: 615 },
        { x: 630, y: 605 },
        { x: 640, y: 620 },
      ],
    };

    const result = engine.parseVisualAST([containerBox, childStroke, outsideStroke]);

    const boxEntity = result.entities.find((e) => e.type === "CONTAINER_BOX");
    expect(boxEntity).toBeDefined();

    const childEntity = result.entities.find((e) => e.stroke_ids.includes("strk_child"));
    const outsideEntity = result.entities.find((e) => e.stroke_ids.includes("strk_outside"));

    expect(boxEntity?.child_ids).toContain(childEntity?.id);
    expect(boxEntity?.child_ids).not.toContain(outsideEntity?.id);
  });

  // -------------------------------------------------------------
  // LEVEL 5: MAGNETIC DOCKING & RELATIONAL LABELS
  // -------------------------------------------------------------
  it("Level 5: should dock arrow to nearest source/target entities and bind adjacent label", () => {
    // Entity A (Source) at (50, 200)
    const sourceStroke: RawInkStroke = {
      id: "strk_src",
      color: "#000",
      width: 2,
      points: [
        { x: 40, y: 190 },
        { x: 60, y: 210 },
      ],
    };

    // Entity B (Target) at (300, 200)
    const targetStroke: RawInkStroke = {
      id: "strk_target",
      color: "#000",
      width: 2,
      points: [
        { x: 290, y: 190 },
        { x: 310, y: 210 },
      ],
    };

    // Arrow shaft connecting (70, 200) to (280, 200)
    const arrowShaft: RawInkStroke = {
      id: "strk_arrow",
      color: "#000",
      width: 2,
      points: [
        { x: 70, y: 200 },
        { x: 280, y: 200 },
      ],
    };

    // Arrowhead tip at (280, 200)
    const arrowTip: RawInkStroke = {
      id: "strk_arrow_tip",
      color: "#000",
      width: 2,
      points: [
        { x: 265, y: 190 },
        { x: 280, y: 200 },
        { x: 265, y: 210 },
      ],
    };

    // Adjacent Text Label "inhibe" written near shaft midpoint (175, 190)
    const labelStroke: RawInkStroke = {
      id: "strk_label",
      color: "#000",
      width: 2,
      points: [
        { x: 170, y: 185 },
        { x: 180, y: 195 },
      ],
    };

    const passiveMap = {
      strk_label: "inhibe",
    };

    const result = engine.parseVisualAST(
      [sourceStroke, targetStroke, arrowShaft, arrowTip, labelStroke],
      passiveMap
    );

    const arrow = result.connectors.find((c) => c.type === "ARROW");
    expect(arrow).toBeDefined();

    const srcEntity = result.entities.find((e) => e.stroke_ids.includes("strk_src"));
    const tgtEntity = result.entities.find((e) => e.stroke_ids.includes("strk_target"));

    expect(arrow?.source_entity_id).toBe(srcEntity?.id);
    expect(arrow?.target_entity_id).toBe(tgtEntity?.id);
    expect(arrow?.label).toBe("inhibe");
  });

  // -------------------------------------------------------------
  // DUAL 3-LAYER PERSISTENCE (.cmn FORMAT - Spec Section 5.2)
  // -------------------------------------------------------------
  it("should create full 3-layer .cmn document format with raw, visual_ast and compiled layers", () => {
    const strokes: RawInkStroke[] = [
      {
        id: "s1",
        points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
        color: "#38BDF8",
        width: 18,
        timestamp: 1727989200000,
      },
    ];

    const doc = engine.parseToDocument("map_test_01", "Arquitectura Cognitiva", strokes);

    expect(doc.map_id).toBe("map_test_01");
    expect(doc.version).toBe("1.0.0");
    expect(doc.metadata.title).toBe("Arquitectura Cognitiva");

    // Layer 1: raw_ink_layer
    expect(doc.raw_ink_layer.strokes).toHaveLength(1);
    expect(doc.raw_ink_layer.strokes[0].id).toBe("s1");

    // Layer 2: visual_ast_layer
    expect(doc.visual_ast_layer).toBeDefined();
    expect(doc.visual_ast_layer.entities).toHaveLength(1);

    // Layer 3: compiled_cognitive_layer
    expect(doc.compiled_cognitive_layer).toBeNull();
  });
});
