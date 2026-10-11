import { useState, useCallback } from "react";
import { NativeSyntheticEvent } from "react-native";
import {
  HoverEvent,
  HoverTimeoutEvent,
  FingerTapEvent,
  BarrelButtonEvent,
  PlacedAttribute,
  EntityBoundingBox,
  PassiveAttributeType,
  SelectionBounds,
} from "../../types/canvas";
import { VisualASTEntity, VisualASTLayer, RawInkStroke } from "@cognitive-canvas/core";
import { getCanvasStrokes, unpackStrokePoints } from "../../components/JetpackInkCanvas";

interface UseCanvasHoverProps {
  placedAttributes: PlacedAttribute[];
  setPlacedAttributes: React.Dispatch<React.SetStateAction<PlacedAttribute[]>>;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  visualAST: VisualASTLayer;
  strokesRef: React.MutableRefObject<RawInkStroke[]>;
  strokeBBoxesRef: React.MutableRefObject<Map<string, EntityBoundingBox>>;
  markDirty: () => void;
}

export const useCanvasHover = ({
  placedAttributes,
  setPlacedAttributes,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  visualAST,
  strokesRef,
  strokeBBoxesRef,
  markDirty,
}: UseCanvasHoverProps) => {
  const [hoveredAttribute, setHoveredAttribute] = useState<PlacedAttribute | null>(null);
  const [hoveredEntityBounds, setHoveredEntityBounds] = useState<EntityBoundingBox | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<VisualASTEntity | null>(null);
  const [unclusteredStrokesInEntity, setUnclusteredStrokesInEntity] = useState<Array<{ id: string; bbox: EntityBoundingBox }> | null>(null);
  const [activeEntityBounds, setActiveEntityBounds] = useState<EntityBoundingBox | null>(null);
  const [isAnchorModalOpen, setIsAnchorModalOpen] = useState<boolean>(false);
  const [hoverScreenX, setHoverScreenX] = useState<number>(0);
  const [hoverScreenY, setHoverScreenY] = useState<number>(0);

  // Semantic Anchor Tooltip (Air View Hover Dwell 800ms)
  const [activeAnchorEntity, setActiveAnchorEntity] = useState<PlacedAttribute | null>(null);
  const [anchorTooltip, setAnchorTooltip] = useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
    initialStage?: "icon" | "modal";
    strokeIds?: string[];
  } | null>(null);

  const handleHover = useCallback((event: NativeSyntheticEvent<HoverEvent>) => {
    const { worldX, worldY, screenX, screenY, isHovering, entityBounds } = event.nativeEvent;

    if (!isHovering) {
      setHoveredAttribute(null);
      setHoveredEntityBounds(null);
      setHoveredEntity(null);
      setUnclusteredStrokesInEntity(null);
      if (!isAnchorModalOpen) {
        setAnchorTooltip(null);
        setActiveAnchorEntity(null);
        setActiveEntityBounds(null);
      }
      return;
    }

    setHoverScreenX(screenX);
    setHoverScreenY(screenY);

    let resolvedEntityBounds: EntityBoundingBox | null = null;
    const zoomFactor = 1.0 / (canvasScale || 1.0);
    const hitTolerance = 25 * zoomFactor;
    let bestEntity: VisualASTEntity | null = null;
    let minDistance = Infinity;

    for (const ent of visualAST.entities) {
      const isInside =
        worldX >= ent.bbox.xmin - hitTolerance &&
        worldX <= ent.bbox.xmax + hitTolerance &&
        worldY >= ent.bbox.ymin - hitTolerance &&
        worldY <= ent.bbox.ymax + hitTolerance;

      if (isInside) {
        const cx = (ent.bbox.xmin + ent.bbox.xmax) / 2;
        const cy = (ent.bbox.ymin + ent.bbox.ymax) / 2;
        const dist = Math.hypot(worldX - cx, worldY - cy);
        if (dist < minDistance) {
          minDistance = dist;
          bestEntity = ent;
        }
      }
    }

    if (bestEntity) {
      resolvedEntityBounds = {
        xmin: bestEntity.bbox.xmin,
        ymin: bestEntity.bbox.ymin,
        xmax: bestEntity.bbox.xmax,
        ymax: bestEntity.bbox.ymax,
      };
      setHoveredEntity((prev) => (prev?.id === bestEntity?.id ? prev : bestEntity));

      const margin = 14 * zoomFactor;
      const bMinX = bestEntity.bbox.xmin - margin;
      const bMaxX = bestEntity.bbox.xmax + margin;
      const bMinY = bestEntity.bbox.ymin - margin;
      const bMaxY = bestEntity.bbox.ymax + margin;

      const unclustered: Array<{ id: string; bbox: EntityBoundingBox }> = [];
      const bboxes = strokeBBoxesRef.current;

      for (const strk of strokesRef.current) {
        if (bestEntity.stroke_ids.includes(strk.id)) continue;
        const bbox = bboxes.get(strk.id);
        if (!bbox) continue;

        const centerX = (bbox.xmin + bbox.xmax) / 2;
        const centerY = (bbox.ymin + bbox.ymax) / 2;
        const isInside = centerX >= bMinX && centerX <= bMaxX && centerY >= bMinY && centerY <= bMaxY;

        if (isInside) {
          unclustered.push({ id: strk.id, bbox });
        }
      }

      setUnclusteredStrokesInEntity((prev) => {
        const nextVal = unclustered.length > 0 ? unclustered : null;
        if (!prev && !nextVal) return prev;
        if (prev && nextVal && prev.length === nextVal.length && prev.every((p, i) => p.id === nextVal[i].id)) {
          return prev;
        }
        return nextVal;
      });
    } else {
      setHoveredEntity((prev) => (prev === null ? prev : null));
      setUnclusteredStrokesInEntity((prev) => (prev === null ? prev : null));
      if (entityBounds) {
        resolvedEntityBounds = entityBounds;
      }
    }

    setHoveredEntityBounds((prev) => {
      if (!prev && !resolvedEntityBounds) return prev;
      if (
        prev &&
        resolvedEntityBounds &&
        prev.xmin === resolvedEntityBounds.xmin &&
        prev.ymin === resolvedEntityBounds.ymin &&
        prev.xmax === resolvedEntityBounds.xmax &&
        prev.ymax === resolvedEntityBounds.ymax
      ) {
        return prev;
      }
      return resolvedEntityBounds;
    });

    const match = placedAttributes.find((attr) => {
      const attrScreenX = attr.worldX * canvasScale + canvasTranslateX;
      const attrScreenY = attr.worldY * canvasScale + canvasTranslateY;
      const badgeScale = Math.min(1.2, Math.max(0.7, canvasScale));

      const baseWidth = Math.max(120, attr.title.length * 8 + 36);
      const baseHeight = 34;

      const centerX = attrScreenX + baseWidth / 2;
      const centerY = attrScreenY + baseHeight / 2;
      const scaledWidth = baseWidth * badgeScale;
      const scaledHeight = baseHeight * badgeScale;

      const boxLeft = centerX - scaledWidth / 2;
      const boxRight = centerX + scaledWidth / 2;
      const boxTop = centerY - scaledHeight / 2;
      const boxBottom = centerY + scaledHeight / 2;

      const dx = Math.max(0, boxLeft - screenX, screenX - boxRight);
      const dy = Math.max(0, boxTop - screenY, screenY - boxBottom);
      const distToEdge = Math.sqrt(dx * dx + dy * dy);

      const HALO_MARGIN = 14;
      return distToEdge <= HALO_MARGIN;
    });

    if (match) {
      setHoveredAttribute((prev) => (prev?.id === match.id ? prev : match));
      setHoverScreenX(screenX);
      setHoverScreenY(screenY);
    } else {
      setHoveredAttribute((prev) => (prev === null ? prev : null));
      if (!resolvedEntityBounds && !isAnchorModalOpen) {
        setAnchorTooltip(null);
        setActiveAnchorEntity(null);
        setActiveEntityBounds(null);
      }
    }
  }, [placedAttributes, canvasScale, canvasTranslateX, canvasTranslateY, isAnchorModalOpen, visualAST, strokesRef, strokeBBoxesRef]);

  const handleBadgeHover = useCallback((attr: PlacedAttribute | null, screenX?: number, screenY?: number) => {
    setHoveredAttribute(attr);
    if (attr && screenX !== undefined && screenY !== undefined) {
      setHoverScreenX(screenX + 80);
      setHoverScreenY(screenY);
    }
  }, []);

  const handleHoverTimeout = useCallback(
    (event: NativeSyntheticEvent<HoverTimeoutEvent>) => {
      // Hover dwell is strictly for non-intrusive Air View inspection/halo preview.
      // Creation of attributes is strictly triggered via single-finger tap (handleFingerTap).
      const { entityBounds } = event.nativeEvent;
      if (entityBounds) {
        setActiveEntityBounds(entityBounds);
      }
    },
    []
  );

  const handleFingerTap = useCallback(
    async (event: NativeSyntheticEvent<FingerTapEvent>) => {
      const { worldX, worldY, screenX, screenY, entityBounds } = event.nativeEvent;

      // 1. Check if user tapped directly on an existing placed attribute badge or pin
      const tappedAttr = placedAttributes.find((attr) => {
        if (attr.entityBounds) {
          const pinLeft = attr.entityBounds.xmax * canvasScale + canvasTranslateX - 4;
          const pinTop = attr.entityBounds.ymin * canvasScale + canvasTranslateY - 12;
          const isPinHit =
            screenX >= pinLeft - 14 &&
            screenX <= pinLeft + 32 &&
            screenY >= pinTop - 14 &&
            screenY <= pinTop + 32;
          if (isPinHit) return true;
        }
        const attrScreenX = attr.worldX * canvasScale + canvasTranslateX;
        const attrScreenY = attr.worldY * canvasScale + canvasTranslateY;
        const baseWidth = Math.max(120, attr.title.length * 8 + 36);
        const baseHeight = 34;
        return (
          screenX >= attrScreenX - 8 &&
          screenX <= attrScreenX + baseWidth + 8 &&
          screenY >= attrScreenY - 8 &&
          screenY <= attrScreenY + baseHeight + 8
        );
      });

      if (tappedAttr) {
        setHoveredAttribute(tappedAttr);
        return;
      }

      // 2. Direct hit from native spatial hash grid (when native passes entityBounds)
      if (entityBounds) {
        setActiveAnchorEntity(null);
        setActiveEntityBounds(entityBounds);
        setIsAnchorModalOpen(false);
        setAnchorTooltip({
          visible: true,
          screenX,
          screenY,
          worldX,
          worldY,
        });
        return;
      }

      let matchedBounds: EntityBoundingBox | null = null;
      let matchedStrokeIds: string[] = [];
      const zoomFactor = 1.0 / (canvasScale || 1.0);
      const hitTolerance = Math.max(40, 40 * zoomFactor);

      // 3. Check visualAST entities if already computed
      if (visualAST.entities && visualAST.entities.length > 0) {
        let bestEntity: VisualASTEntity | null = null;
        let minDistance = Infinity;

        for (const ent of visualAST.entities) {
          const isInside =
            worldX >= ent.bbox.xmin - hitTolerance &&
            worldX <= ent.bbox.xmax + hitTolerance &&
            worldY >= ent.bbox.ymin - hitTolerance &&
            worldY <= ent.bbox.ymax + hitTolerance;

          if (isInside) {
            const cx = (ent.bbox.xmin + ent.bbox.xmax) / 2;
            const cy = (ent.bbox.ymin + ent.bbox.ymax) / 2;
            const dist = Math.hypot(worldX - cx, worldY - cy);
            if (dist < minDistance) {
              minDistance = dist;
              bestEntity = ent;
            }
          }
        }

        if (bestEntity) {
          matchedBounds = {
            xmin: bestEntity.bbox.xmin,
            ymin: bestEntity.bbox.ymin,
            xmax: bestEntity.bbox.xmax,
            ymax: bestEntity.bbox.ymax,
          };
          if (bestEntity.stroke_ids) {
            matchedStrokeIds = [...bestEntity.stroke_ids];
          }
        }
      }

      // 4. Check hoveredEntityBounds if recent S-Pen hover identified a cluster
      if (!matchedBounds && hoveredEntityBounds) {
        const isNearHover =
          worldX >= hoveredEntityBounds.xmin - hitTolerance &&
          worldX <= hoveredEntityBounds.xmax + hitTolerance &&
          worldY >= hoveredEntityBounds.ymin - hitTolerance &&
          worldY <= hoveredEntityBounds.ymax + hitTolerance;
        if (isNearHover) {
          matchedBounds = hoveredEntityBounds;
        }
      }

      // 5. Check cached stroke bounding boxes
      if (!matchedBounds && strokeBBoxesRef.current && strokeBBoxesRef.current.size > 0) {
        for (const [sId, bbox] of strokeBBoxesRef.current.entries()) {
          const isInside =
            worldX >= bbox.xmin - hitTolerance &&
            worldX <= bbox.xmax + hitTolerance &&
            worldY >= bbox.ymin - hitTolerance &&
            worldY <= bbox.ymax + hitTolerance;
          if (isInside) {
            matchedBounds = bbox;
            matchedStrokeIds = [sId];
            break;
          }
        }
      }

      // 6. Pull strokes on-demand directly from native memory
      if (!matchedBounds) {
        try {
          let currentStrokes = strokesRef.current;
          if (!currentStrokes || currentStrokes.length === 0) {
            currentStrokes = await getCanvasStrokes();
            if (currentStrokes && currentStrokes.length > 0) {
              strokesRef.current = currentStrokes;
            }
          }

          if (currentStrokes && currentStrokes.length > 0) {
            const hitStrokes: any[] = [];
            const strokeBoxes: Map<any, { xmin: number; ymin: number; xmax: number; ymax: number }> = new Map();

            for (const s of currentStrokes) {
              const pts = unpackStrokePoints(s);
              if (!pts || pts.length === 0) continue;

              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const pt of pts) {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
              }
              const b = { xmin: minX, ymin: minY, xmax: maxX, ymax: maxY };
              strokeBoxes.set(s, b);

              if (
                worldX >= minX - hitTolerance &&
                worldX <= maxX + hitTolerance &&
                worldY >= minY - hitTolerance &&
                worldY <= maxY + hitTolerance
              ) {
                let isHit = false;
                for (const pt of pts) {
                  if (Math.hypot(pt.x - worldX, pt.y - worldY) <= hitTolerance) {
                    isHit = true;
                    break;
                  }
                }
                if (isHit) {
                  hitStrokes.push(s);
                }
              }
            }

            if (hitStrokes.length > 0) {
              const cluster = new Set<any>(hitStrokes);
              const queue = [...hitStrokes];
              const proximity = Math.max(45, 45 * zoomFactor);

              while (queue.length > 0) {
                const cur = queue.shift()!;
                const curBox = strokeBoxes.get(cur);
                if (!curBox) continue;

                for (const other of currentStrokes) {
                  if (cluster.has(other)) continue;
                  const otherBox = strokeBoxes.get(other);
                  if (!otherBox) continue;

                  const dx = Math.max(0, curBox.xmin - otherBox.xmax, otherBox.xmin - curBox.xmax);
                  const dy = Math.max(0, curBox.ymin - otherBox.ymax, otherBox.ymin - curBox.ymax);
                  if (dx <= proximity && dy <= proximity) {
                    cluster.add(other);
                    queue.push(other);
                  }
                }
              }

              let cMinX = Infinity, cMinY = Infinity, cMaxX = -Infinity, cMaxY = -Infinity;
              for (const s of cluster) {
                const b = strokeBoxes.get(s);
                if (b) {
                  if (b.xmin < cMinX) cMinX = b.xmin;
                  if (b.xmax > cMaxX) cMaxX = b.xmax;
                  if (b.ymin < cMinY) cMinY = b.ymin;
                  if (b.ymax > cMaxY) cMaxY = b.ymax;
                }
              }

              const pad = 10;
              matchedBounds = {
                xmin: cMinX - pad,
                ymin: cMinY - pad,
                xmax: cMaxX + pad,
                ymax: cMaxY + pad,
              };
              matchedStrokeIds = Array.from(cluster)
                .map((s: any) => s.id || s.strokeId)
                .filter(Boolean);
            }
          }
        } catch (_) {}
      }

      // 7. Reveal the minimalist Atributo floating pill on single-finger tap!
      setActiveAnchorEntity(null);
      setActiveEntityBounds(matchedBounds || null);
      setIsAnchorModalOpen(false);
      setAnchorTooltip({
        visible: true,
        screenX,
        screenY,
        worldX,
        worldY,
        strokeIds: matchedStrokeIds.length > 0 ? matchedStrokeIds : undefined,
      });
    },
    [placedAttributes, canvasScale, canvasTranslateX, canvasTranslateY, visualAST, hoveredEntityBounds, isAnchorModalOpen, strokeBBoxesRef, strokesRef]
  );

  const handleBarrelButton = useCallback(
    (event: NativeSyntheticEvent<BarrelButtonEvent>) => {
      const { x, y, worldX, worldY } = event.nativeEvent;
      console.log("[SemanticAnchor] S-Pen Barrel button pressed:", { x, y, worldX, worldY });
    },
    []
  );

  const handleCloseAnchorTooltip = useCallback(() => {
    setAnchorTooltip(null);
    setActiveAnchorEntity(null);
    setActiveEntityBounds(null);
    setIsAnchorModalOpen(false);
  }, []);

  const handleAnchorModalOpen = useCallback(() => {
    setIsAnchorModalOpen(true);
    setActiveAnchorEntity(null);
  }, []);

  const openAnchorModalForBounds = useCallback(
    (bounds: SelectionBounds) => {
      const screenX = bounds.centerX * canvasScale + canvasTranslateX;
      const screenY = bounds.centerY * canvasScale + canvasTranslateY;
      setActiveEntityBounds({
        xmin: bounds.minX,
        ymin: bounds.minY,
        xmax: bounds.maxX,
        ymax: bounds.maxY,
      });
      setAnchorTooltip({
        visible: true,
        screenX,
        screenY,
        worldX: bounds.centerX,
        worldY: bounds.centerY,
        initialStage: "modal",
      });
      setIsAnchorModalOpen(true);
    },
    [canvasScale, canvasTranslateX, canvasTranslateY]
  );

  const handleSaveAnchorTooltip = useCallback(
    (
      type: PassiveAttributeType,
      title: string,
      note: string,
      worldX: number,
      worldY: number,
      strokeIds?: string[]
    ) => {
      const newAttr: PlacedAttribute = {
        id: `attr-${Date.now()}`,
        type,
        title,
        note,
        worldX,
        worldY,
        entityBounds: activeEntityBounds || undefined,
        strokeIds: strokeIds || anchorTooltip?.strokeIds || undefined,
      };
      setPlacedAttributes((prev) => [...prev, newAttr]);
      markDirty();
      setAnchorTooltip(null);
      setActiveAnchorEntity(null);
      setActiveEntityBounds(null);
      setIsAnchorModalOpen(false);
    },
    [activeEntityBounds, anchorTooltip, setPlacedAttributes, markDirty]
  );

  return {
    hoveredAttribute,
    hoveredEntityBounds,
    hoveredEntity,
    unclusteredStrokesInEntity,
    activeEntityBounds,
    isAnchorModalOpen,
    hoverScreenX,
    hoverScreenY,
    activeAnchorEntity,
    anchorTooltip,
    handleHover,
    handleBadgeHover,
    handleHoverTimeout,
    handleFingerTap,
    handleBarrelButton,
    handleCloseAnchorTooltip,
    handleAnchorModalOpen,
    handleSaveAnchorTooltip,
    openAnchorModalForBounds,
  };
};
