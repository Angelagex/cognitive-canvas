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

  it("Level 2: should robustly cluster a word despite handwriting pauses and delayed t-crossing", () => {
    // Letter 'P': x: 100..120, y: 200..230
    const strkP: RawInkStroke = {
      id: "p",
      color: "#000",
      width: 2,
      timestamp: 1000,
      points: [
        { x: 100, y: 200 },
        { x: 120, y: 230 },
      ],
    };

    // Letter 'h': x: 130..145, y: 205..230 (drawn 200ms later)
    const strkH: RawInkStroke = {
      id: "h",
      color: "#000",
      width: 2,
      timestamp: 1200,
      points: [
        { x: 130, y: 205 },
        { x: 145, y: 230 },
      ],
    };

    // Letter 't' stem: x: 155..165, y: 200..230 (drawn 2500ms later after a thinking pause!)
    const strkTStem: RawInkStroke = {
      id: "t_stem",
      color: "#000",
      width: 2,
      timestamp: 3700,
      points: [
        { x: 160, y: 200 },
        { x: 160, y: 230 },
      ],
    };

    // Delayed t-crossing: x: 150..170, y: 210 (drawn at the end, 6000ms later!)
    const strkTCross: RawInkStroke = {
      id: "t_cross",
      color: "#000",
      width: 2,
      timestamp: 9700,
      points: [
        { x: 150, y: 210 },
        { x: 170, y: 210 },
      ],
    };

    // A separate word "Camera": x: 260..290, y: 205..230 (>80px horizontal gap)
    const strkCamera: RawInkStroke = {
      id: "camera",
      color: "#000",
      width: 2,
      timestamp: 11000,
      points: [
        { x: 260, y: 205 },
        { x: 290, y: 230 },
      ],
    };

    const result = engine.parseVisualAST([strkP, strkH, strkTStem, strkTCross, strkCamera]);

    // Should yield exactly 2 entities: "Pht" word and "Camera" word
    expect(result.entities).toHaveLength(2);

    const wordEntity = result.entities.find((e) => e.stroke_ids.includes("p"));
    expect(wordEntity).toBeDefined();
    expect(wordEntity?.stroke_ids).toContain("p");
    expect(wordEntity?.stroke_ids).toContain("h");
    expect(wordEntity?.stroke_ids).toContain("t_stem");
    expect(wordEntity?.stroke_ids).toContain("t_cross");
    expect(wordEntity?.type).toBe("TEXT_BLOCK");

    const cameraEntity = result.entities.find((e) => e.stroke_ids.includes("camera"));
    expect(cameraEntity).toBeDefined();
    expect(cameraEntity?.stroke_ids).toEqual(["camera"]);
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

  // -------------------------------------------------------------
  // ADVANCED FEATURE 1: ADAPTIVE HANDWRITING SCALING THRESHOLDS (H-tilde)
  // -------------------------------------------------------------
  it("Feature 1: should adapt horizontal clustering threshold dynamically based on stroke height", () => {
    // Large Headline Strokes (height ~ 60px): gap of 50px SHOULD be clustered together
    const headlinePart1: RawInkStroke = {
      id: "head_1",
      color: "#000",
      width: 3,
      points: [
        { x: 100, y: 100 },
        { x: 120, y: 160 },
      ],
    };
    const headlinePart2: RawInkStroke = {
      id: "head_2",
      color: "#000",
      width: 3,
      points: [
        { x: 170, y: 100 }, // dx = 170 - 120 = 50px (clustered because H ~ 60px, maxAllowedDx >= 50)
        { x: 190, y: 160 },
      ],
    };

    // Small Margin Notes (height ~ 16px): gap of 32px SHOULD NOT be clustered (separate words)
    const smallWord1: RawInkStroke = {
      id: "small_1",
      color: "#000",
      width: 1,
      points: [
        { x: 100, y: 400 },
        { x: 110, y: 416 },
      ],
    };
    const smallWord2: RawInkStroke = {
      id: "small_2",
      color: "#000",
      width: 1,
      points: [
        { x: 142, y: 400 }, // dx = 142 - 110 = 32px (separate because H ~ 16px, maxAllowedDx <= 24px)
        { x: 152, y: 416 },
      ],
    };

    const result = engine.parseVisualAST([headlinePart1, headlinePart2, smallWord1, smallWord2]);

    // Headline should be 1 merged entity
    const headlineEntity = result.entities.find((e) => e.stroke_ids.includes("head_1"));
    expect(headlineEntity).toBeDefined();
    expect(headlineEntity?.stroke_ids).toContain("head_1");
    expect(headlineEntity?.stroke_ids).toContain("head_2");

    // Small words should be 2 distinct entities
    const smallEntity1 = result.entities.find((e) => e.stroke_ids.includes("small_1"));
    const smallEntity2 = result.entities.find((e) => e.stroke_ids.includes("small_2"));
    expect(smallEntity1?.id).not.toBe(smallEntity2?.id);
  });

  // -------------------------------------------------------------
  // ADVANCED FEATURE 2: CURVED BÉZIER AND ORTHOGONAL ELBOW ARROWS
  // -------------------------------------------------------------
  it("Feature 2: should recognize curved and orthogonal elbow connectors with arrowheads", () => {
    // Curved arc connector: (100, 100) -> curved via (150, 140) -> (200, 100)
    const curvedArcShaft: RawInkStroke = {
      id: "strk_curved_shaft",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 100 },
        { x: 125, y: 130 },
        { x: 150, y: 145 },
        { x: 175, y: 130 },
        { x: 200, y: 100 },
      ],
    };
    const curvedTip: RawInkStroke = {
      id: "strk_curved_tip",
      color: "#000",
      width: 2,
      points: [
        { x: 185, y: 95 },
        { x: 200, y: 100 },
        { x: 195, y: 115 },
      ],
    };

    // Orthogonal elbow connector (L-shape): (300, 100) -> (300, 180) -> (380, 180)
    const elbowShaft: RawInkStroke = {
      id: "strk_elbow_shaft",
      color: "#000",
      width: 2,
      points: [
        { x: 300, y: 100 },
        { x: 300, y: 140 },
        { x: 300, y: 180 },
        { x: 340, y: 180 },
        { x: 380, y: 180 },
      ],
    };
    const elbowTip: RawInkStroke = {
      id: "strk_elbow_tip",
      color: "#000",
      width: 2,
      points: [
        { x: 365, y: 170 },
        { x: 380, y: 180 },
        { x: 365, y: 190 },
      ],
    };

    const result = engine.parseVisualAST([curvedArcShaft, curvedTip, elbowShaft, elbowTip]);

    expect(result.connectors).toHaveLength(2);

    const curvedConn = result.connectors.find((c) => c.stroke_ids.includes("strk_curved_shaft"));
    expect(curvedConn).toBeDefined();
    expect(curvedConn?.type).toBe("ARROW");
    expect(curvedConn?.is_curved).toBe(true);
    expect(curvedConn?.geometry_type).toBe("CURVED");

    const elbowConn = result.connectors.find((c) => c.stroke_ids.includes("strk_elbow_shaft"));
    expect(elbowConn).toBeDefined();
    expect(elbowConn?.type).toBe("ARROW");
    expect(elbowConn?.is_curved).toBe(true);
    expect(elbowConn?.geometry_type).toBe("ELBOW");
  });

  // -------------------------------------------------------------
  // ADVANCED FEATURE 3: MULTI-STROKE CONTAINER LOOP DETECTION
  // -------------------------------------------------------------
  it("Feature 3: should assemble 4 separate line strokes into a CONTAINER_BOX and infer containment", () => {
    // 4 straight line strokes forming a rectangular box: (100, 100) to (300, 250)
    const topEdge: RawInkStroke = {
      id: "edge_top",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
      ],
    };
    const rightEdge: RawInkStroke = {
      id: "edge_right",
      color: "#000",
      width: 2,
      points: [
        { x: 300, y: 100 },
        { x: 300, y: 250 },
      ],
    };
    const bottomEdge: RawInkStroke = {
      id: "edge_bottom",
      color: "#000",
      width: 2,
      points: [
        { x: 300, y: 250 },
        { x: 100, y: 250 },
      ],
    };
    const leftEdge: RawInkStroke = {
      id: "edge_left",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 250 },
        { x: 100, y: 100 },
      ],
    };

    // An entity inside the container
    const innerEntityStroke: RawInkStroke = {
      id: "strk_inside",
      color: "#000",
      width: 2,
      points: [
        { x: 150, y: 150 },
        { x: 170, y: 170 },
      ],
    };

    const result = engine.parseVisualAST([topEdge, rightEdge, bottomEdge, leftEdge, innerEntityStroke]);

    // Should detect the CONTAINER_BOX entity containing all 4 stroke IDs
    const container = result.entities.find((e) => e.type === "CONTAINER_BOX");
    expect(container).toBeDefined();
    expect(container?.stroke_ids).toContain("edge_top");
    expect(container?.stroke_ids).toContain("edge_right");
    expect(container?.stroke_ids).toContain("edge_bottom");
    expect(container?.stroke_ids).toContain("edge_left");

    // Inner entity should be in child_ids
    const innerEntity = result.entities.find((e) => e.stroke_ids.includes("strk_inside"));
    expect(container?.child_ids).toContain(innerEntity?.id);

    // None of the edges should be left as standalone connectors
    expect(result.connectors).toHaveLength(0);
  });

  // -------------------------------------------------------------
  // ADVANCED FEATURE 4: TOPOLOGICAL FLOW & CAUSAL FEEDBACK LOOP DETECTION
  // -------------------------------------------------------------
  it("Feature 4: should detect closed causal loops (cycles) and calculate root & sink metrics", () => {
    // Entities A at (100, 100), B at (300, 100), C at (200, 300)
    const strokeA: RawInkStroke = { id: "node_A", color: "#000", width: 2, points: [{ x: 90, y: 90 }, { x: 110, y: 110 }] };
    const strokeB: RawInkStroke = { id: "node_B", color: "#000", width: 2, points: [{ x: 290, y: 90 }, { x: 310, y: 110 }] };
    const strokeC: RawInkStroke = { id: "node_C", color: "#000", width: 2, points: [{ x: 190, y: 290 }, { x: 210, y: 310 }] };

    // Directed Arrow A -> B
    const arrowAB_shaft: RawInkStroke = { id: "ab_s", color: "#000", width: 2, points: [{ x: 120, y: 100 }, { x: 280, y: 100 }] };
    const arrowAB_tip: RawInkStroke = { id: "ab_t", color: "#000", width: 2, points: [{ x: 270, y: 90 }, { x: 280, y: 100 }, { x: 270, y: 110 }] };

    // Directed Arrow B -> C
    const arrowBC_shaft: RawInkStroke = { id: "bc_s", color: "#000", width: 2, points: [{ x: 290, y: 120 }, { x: 210, y: 280 }] };
    const arrowBC_tip: RawInkStroke = { id: "bc_t", color: "#000", width: 2, points: [{ x: 220, y: 270 }, { x: 210, y: 280 }, { x: 210, y: 265 }] };

    // Directed Arrow C -> A (Closes the Causal Feedback Cycle: A -> B -> C -> A)
    const arrowCA_shaft: RawInkStroke = { id: "ca_s", color: "#000", width: 2, points: [{ x: 190, y: 280 }, { x: 110, y: 120 }] };
    const arrowCA_tip: RawInkStroke = { id: "ca_t", color: "#000", width: 2, points: [{ x: 110, y: 135 }, { x: 110, y: 120 }, { x: 125, y: 125 }] };

    const result = engine.parseVisualAST([
      strokeA, strokeB, strokeC,
      arrowAB_shaft, arrowAB_tip,
      arrowBC_shaft, arrowBC_tip,
      arrowCA_shaft, arrowCA_tip,
    ]);

    expect(result.entities).toHaveLength(3);
    expect(result.connectors).toHaveLength(3);

    // Causal loops should detect exactly 1 feedback cycle of length 3
    expect(result.causal_loops).toBeDefined();
    expect(result.causal_loops).toHaveLength(1);
    expect(result.causal_loops![0].node_count).toBe(3);

    // In a pure cycle, every node has inDegree = 1 and outDegree = 1 (no root, no sink)
    expect(result.topology_metrics?.root_entity_ids).toHaveLength(0);
    expect(result.topology_metrics?.sink_entity_ids).toHaveLength(0);
  });

  // -------------------------------------------------------------
  // ADVANCED FEATURE 5: INHIBITORY CONNECTORS AND BIDIRECTIONAL ARROWS
  // -------------------------------------------------------------
  it("Feature 5: should recognize perpendicular T-bar caps as INHIBITION and dual heads as BIDIRECTIONAL", () => {
    // 1. Inhibitory Connector: horizontal shaft with vertical perpendicular T-bar at the end
    const inhibShaft: RawInkStroke = {
      id: "inhib_shaft",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 200 },
        { x: 250, y: 200 },
      ],
    };
    const tBarCap: RawInkStroke = {
      id: "t_bar_cap",
      color: "#000",
      width: 2,
      points: [
        { x: 250, y: 185 },
        { x: 250, y: 215 },
      ],
    };

    // 2. Bidirectional Connector: shaft with arrowheads at both start and end
    const bidiShaft: RawInkStroke = {
      id: "bidi_shaft",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 350 },
        { x: 250, y: 350 },
      ],
    };
    const bidiHeadStart: RawInkStroke = {
      id: "bidi_head_start",
      color: "#000",
      width: 2,
      points: [
        { x: 115, y: 340 },
        { x: 100, y: 350 },
        { x: 115, y: 360 },
      ],
    };
    const bidiHeadEnd: RawInkStroke = {
      id: "bidi_head_end",
      color: "#000",
      width: 2,
      points: [
        { x: 235, y: 340 },
        { x: 250, y: 350 },
        { x: 235, y: 360 },
      ],
    };

    const result = engine.parseVisualAST([inhibShaft, tBarCap, bidiShaft, bidiHeadStart, bidiHeadEnd]);

    expect(result.connectors).toHaveLength(2);

    const inhibConn = result.connectors.find((c) => c.stroke_ids.includes("inhib_shaft"));
    expect(inhibConn).toBeDefined();
    expect(inhibConn?.type).toBe("INHIBITION");
    expect(inhibConn?.directionality).toBe("FORWARD");
    expect(inhibConn?.stroke_ids).toContain("t_bar_cap");

    const bidiConn = result.connectors.find((c) => c.stroke_ids.includes("bidi_shaft"));
    expect(bidiConn).toBeDefined();
    expect(bidiConn?.type).toBe("ARROW");
    expect(bidiConn?.directionality).toBe("BIDIRECTIONAL");
    expect(bidiConn?.stroke_ids).toContain("bidi_head_start");
    expect(bidiConn?.stroke_ids).toContain("bidi_head_end");
  });

  // -------------------------------------------------------------
  // ADVANCED FEATURE 6: IN-AST SCRATCH-OUT GESTURE DETECTION & PRUNING
  // -------------------------------------------------------------
  it("Feature 6: should prune entities crossed out with a rapid horizontal zig-zag gesture", () => {
    // Entity 1: Word to be crossed out at (100..180, 200..230)
    const wordStroke1: RawInkStroke = {
      id: "strk_bad_1",
      color: "#000",
      width: 2,
      points: [
        { x: 100, y: 200 },
        { x: 140, y: 230 },
      ],
    };
    const wordStroke2: RawInkStroke = {
      id: "strk_bad_2",
      color: "#000",
      width: 2,
      points: [
        { x: 145, y: 200 },
        { x: 180, y: 230 },
      ],
    };

    // Scratch-out gesture drawn directly over the bad word: 5 horizontal oscillations (left-right-left-right-left-right)
    const scratchStroke: RawInkStroke = {
      id: "strk_scratch",
      color: "#f00",
      width: 3,
      points: [
        { x: 95, y: 215 },
        { x: 185, y: 215 },
        { x: 95, y: 220 },
        { x: 185, y: 220 },
        { x: 95, y: 225 },
        { x: 185, y: 225 },
        { x: 95, y: 210 },
        { x: 185, y: 210 },
      ],
    };

    // Valid Entity 2: Clean word drawn elsewhere at (300..380, 200..230)
    const validWordStroke: RawInkStroke = {
      id: "strk_good",
      color: "#000",
      width: 2,
      points: [
        { x: 300, y: 200 },
        { x: 320, y: 230 },
        { x: 350, y: 205 },
        { x: 380, y: 230 },
      ],
    };

    const result = engine.parseVisualAST([wordStroke1, wordStroke2, scratchStroke, validWordStroke]);

    // The bad word should be pruned from the active entities list, and the scratch stroke should not form an entity
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].stroke_ids).toEqual(["strk_good"]);
    expect(result.entities[0].type).toBe("TEXT_BLOCK");
  });

  // -------------------------------------------------------------
  // REAL-WORLD TABLET TEST: PHOTOGRAPHY
  // -------------------------------------------------------------
  it("should cluster the full word 'Photography' into a single TEXT_BLOCK entity without fracturing into connectors", () => {
    const strokes: RawInkStroke[] = [
      // P: stem + loop
      { id: "P_stem", color: "#000", width: 3, points: [{ x: 650, y: 230 }, { x: 650, y: 450 }] },
      { id: "P_loop", color: "#000", width: 3, points: [{ x: 650, y: 230 }, { x: 690, y: 280 }, { x: 650, y: 330 }] },
      // h: stem + arch
      { id: "h1_stem", color: "#000", width: 3, points: [{ x: 710, y: 220 }, { x: 710, y: 450 }] },
      { id: "h1_arch", color: "#000", width: 3, points: [{ x: 710, y: 340 }, { x: 745, y: 330 }, { x: 755, y: 450 }] },
      // o: oval
      { id: "o1", color: "#000", width: 3, points: [{ x: 770, y: 380 }, { x: 790, y: 330 }, { x: 810, y: 390 }, { x: 790, y: 450 }, { x: 770, y: 380 }] },
      // t: stem + cross
      { id: "t_stem", color: "#000", width: 3, points: [{ x: 835, y: 250 }, { x: 835, y: 450 }] },
      { id: "t_cross", color: "#000", width: 3, points: [{ x: 820, y: 310 }, { x: 855, y: 310 }] },
      // o: oval
      { id: "o2", color: "#000", width: 3, points: [{ x: 865, y: 380 }, { x: 885, y: 330 }, { x: 905, y: 390 }, { x: 885, y: 450 }, { x: 865, y: 380 }] },
      // g: loop + descender
      { id: "g_loop", color: "#000", width: 3, points: [{ x: 920, y: 380 }, { x: 940, y: 330 }, { x: 960, y: 390 }, { x: 940, y: 450 }, { x: 920, y: 380 }] },
      { id: "g_desc", color: "#000", width: 3, points: [{ x: 960, y: 390 }, { x: 960, y: 480 }, { x: 930, y: 500 }] },
      // r: stem + hook
      { id: "r_stem", color: "#000", width: 3, points: [{ x: 975, y: 330 }, { x: 975, y: 450 }] },
      { id: "r_hook", color: "#000", width: 3, points: [{ x: 975, y: 350 }, { x: 1000, y: 330 }] },
      // a: oval + tail
      { id: "a_loop", color: "#000", width: 3, points: [{ x: 1020, y: 380 }, { x: 1040, y: 330 }, { x: 1060, y: 390 }, { x: 1040, y: 450 }, { x: 1020, y: 380 }] },
      { id: "a_tail", color: "#000", width: 3, points: [{ x: 1060, y: 350 }, { x: 1060, y: 450 }] },
      // p: stem + loop
      { id: "p_stem", color: "#000", width: 3, points: [{ x: 1080, y: 330 }, { x: 1080, y: 500 }] },
      { id: "p_loop", color: "#000", width: 3, points: [{ x: 1080, y: 330 }, { x: 1120, y: 380 }, { x: 1080, y: 440 }] },
      // h: stem + arch
      { id: "h2_stem", color: "#000", width: 3, points: [{ x: 1140, y: 220 }, { x: 1140, y: 450 }] },
      { id: "h2_arch", color: "#000", width: 3, points: [{ x: 1140, y: 340 }, { x: 1175, y: 330 }, { x: 1185, y: 450 }] },
      // y: slash + descender
      { id: "y_slash", color: "#000", width: 3, points: [{ x: 1200, y: 330 }, { x: 1225, y: 420 }] },
      { id: "y_desc", color: "#000", width: 3, points: [{ x: 1245, y: 330 }, { x: 1210, y: 450 }, { x: 1190, y: 500 }] },
    ];

    const result = engine.parseVisualAST(strokes);
    console.log("PHOTOGRAPHY ENTITIES COUNT:", result.entities.length);
    result.entities.forEach((ent, idx) => {
      console.log(`Entity ${idx + 1} (${ent.type}):`, ent.stroke_ids.join(", "), "bbox:", ent.bbox);
    });
    console.log("PHOTOGRAPHY CONNECTORS COUNT:", result.connectors.length);
    result.connectors.forEach((conn, idx) => {
      console.log(`Connector ${idx + 1} (${conn.type}, ${conn.geometry_type}):`, conn.stroke_ids.join(", "));
    });

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe("TEXT_BLOCK");
    expect(result.connectors).toHaveLength(0);
  });
});

