import {
  RawInkStroke,
  VisualASTConnector,
  VisualASTEntity,
} from "../../types/cognitive";
import { SkeletalDistance } from "../clustering/SkeletalDistance";

export class EntityDocker {
  /**
   * Magnetic Docking (Level 5): Connects connectors to nearest source & target entities
   * and binds adjacent relational text labels.
   */
  public static dockAndBindLabels(
    connectors: VisualASTConnector[],
    entities: VisualASTEntity[],
    strokes: RawInkStroke[]
  ): void {
    const maxDockDist = 130;

    for (const conn of connectors) {
      const connStrokes = strokes.filter((s) => conn.stroke_ids.includes(s.id));
      if (connStrokes.length === 0) continue;

      const mainShaft = connStrokes[0];
      const pStart = mainShaft.points[0];
      const pEnd = mainShaft.points[mainShaft.points.length - 1];

      let nearestSource: { entity: VisualASTEntity; dist: number } | null = null;
      let nearestTarget: { entity: VisualASTEntity; dist: number } | null = null;

      for (const ent of entities) {
        const dStart = SkeletalDistance.distancePointToBBox(pStart, ent.bbox);
        const dEnd = SkeletalDistance.distancePointToBBox(pEnd, ent.bbox);

        if (!nearestSource || dStart < nearestSource.dist) {
          nearestSource = { entity: ent, dist: dStart };
        }
        if (!nearestTarget || dEnd < nearestTarget.dist) {
          nearestTarget = { entity: ent, dist: dEnd };
        }
      }

      if (nearestSource && nearestSource.dist <= maxDockDist) {
        conn.source_entity_id = nearestSource.entity.id;
      }
      if (nearestTarget && nearestTarget.dist <= maxDockDist) {
        if (nearestTarget.entity.id !== conn.source_entity_id) {
          conn.target_entity_id = nearestTarget.entity.id;
        } else {
          let secondTarget: { entity: VisualASTEntity; dist: number } | null = null;
          for (const ent of entities) {
            if (ent.id === conn.source_entity_id) continue;
            const dEnd = SkeletalDistance.distancePointToBBox(pEnd, ent.bbox);
            if (!secondTarget || dEnd < secondTarget.dist) {
              secondTarget = { entity: ent, dist: dEnd };
            }
          }
          if (secondTarget && secondTarget.dist <= maxDockDist) {
            conn.target_entity_id = secondTarget.entity.id;
          }
        }
      }

      // Adjacent Label Binding: Find text block close to the shaft midpoint
      const shaftMid = {
        x: (pStart.x + pEnd.x) / 2,
        y: (pStart.y + pEnd.y) / 2,
      };

      for (const ent of entities) {
        if (ent.id === conn.source_entity_id || ent.id === conn.target_entity_id) continue;
        if (ent.type === "TEXT_BLOCK") {
          const dMid = SkeletalDistance.distancePointToBBox(shaftMid, ent.bbox);
          if (dMid <= 40) {
            conn.label = ent.transcribed_text || "relacionado con";
            const cleanLabel = (ent.transcribed_text || "").trim().toLowerCase();
            if (cleanLabel === "+" || cleanLabel === "pos" || cleanLabel === "s" || cleanLabel === "+1") {
              conn.polarity = "POSITIVE";
            } else if (cleanLabel === "-" || cleanLabel === "neg" || cleanLabel === "o" || cleanLabel === "-1") {
              conn.polarity = "NEGATIVE";
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Synthesizes 1-hop semantic context window strings for each entity based on connected neighbors
   */
  public static generateContextWindows(
    entities: VisualASTEntity[],
    connectors: VisualASTConnector[]
  ): void {
    for (const ent of entities) {
      const incoming = connectors.filter((c) => c.target_entity_id === ent.id);
      const outgoing = connectors.filter((c) => c.source_entity_id === ent.id);

      const parts: string[] = [];
      if (ent.passive_context) {
        parts.push(`Contexto: ${ent.passive_context}`);
      }
      if (outgoing.length > 0) {
        const outList = outgoing.map((c) => {
          const target = entities.find((t) => t.id === c.target_entity_id);
          const tName = target?.transcribed_text || target?.id || "entidad";
          const sign =
            c.polarity === "POSITIVE"
              ? "(+)"
              : c.polarity === "NEGATIVE" || c.type === "INHIBITION"
              ? "(-)"
              : "";
          const rel = c.label ? `"${c.label}" ` : "";
          return `influye en ${tName} ${rel}${sign}`.trim();
        });
        parts.push(`Salidas: [${outList.join("; ")}]`);
      }
      if (incoming.length > 0) {
        const inList = incoming.map((c) => {
          const source = entities.find((s) => s.id === c.source_entity_id);
          const sName = source?.transcribed_text || source?.id || "entidad";
          const sign =
            c.polarity === "POSITIVE"
              ? "(+)"
              : c.polarity === "NEGATIVE" || c.type === "INHIBITION"
              ? "(-)"
              : "";
          const rel = c.label ? `"${c.label}" ` : "";
          return `recibe de ${sName} ${rel}${sign}`.trim();
        });
        parts.push(`Entradas: [${inList.join("; ")}]`);
      }

      ent.context_window = parts.length > 0 ? parts.join(" | ") : null;
    }
  }
}
