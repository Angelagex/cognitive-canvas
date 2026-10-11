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
} from "../../types/canvas";
import { VisualASTEntity, VisualASTLayer, RawInkStroke } from "@cognitive-canvas/core";

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
      const { worldX, worldY, screenX, screenY, entityBounds } = event.nativeEvent;
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
      }
    },
    []
  );

  const handleFingerTap = useCallback(
    (event: NativeSyntheticEvent<FingerTapEvent>) => {
      const { worldX, worldY, screenX, screenY } = event.nativeEvent;

      const tappedAttr = placedAttributes.find((attr) => {
        if (attr.entityBounds) {
          const pinLeft = attr.entityBounds.xmax * canvasScale + canvasTranslateX - 4;
          const pinTop = attr.entityBounds.ymin * canvasScale + canvasTranslateY - 12;
          const isPinHit =
            screenX >= pinLeft - 12 &&
            screenX <= pinLeft + 30 &&
            screenY >= pinTop - 12 &&
            screenY <= pinTop + 30;
          if (isPinHit) return true;
        }
        const attrScreenX = attr.worldX * canvasScale + canvasTranslateX;
        const attrScreenY = attr.worldY * canvasScale + canvasTranslateY;
        const baseWidth = Math.max(120, attr.title.length * 8 + 36);
        const baseHeight = 34;
        return (
          screenX >= attrScreenX &&
          screenX <= attrScreenX + baseWidth &&
          screenY >= attrScreenY &&
          screenY <= attrScreenY + baseHeight
        );
      });

      if (tappedAttr) {
        setHoveredAttribute(tappedAttr);
        return;
      }

      const hitTolerance = 30;
      let matchedEntity: VisualASTEntity | null = null;
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
            matchedEntity = ent;
          }
        }
      }

      if (matchedEntity) {
        setActiveAnchorEntity(null);
        setActiveEntityBounds({
          xmin: matchedEntity.bbox.xmin,
          ymin: matchedEntity.bbox.ymin,
          xmax: matchedEntity.bbox.xmax,
          ymax: matchedEntity.bbox.ymax,
        });
        setIsAnchorModalOpen(false);
        setAnchorTooltip({
          visible: true,
          screenX,
          screenY,
          worldX,
          worldY,
        });
      } else {
        if (!isAnchorModalOpen) {
          setAnchorTooltip(null);
          setActiveAnchorEntity(null);
          setActiveEntityBounds(null);
        }
      }
    },
    [placedAttributes, canvasScale, canvasTranslateX, canvasTranslateY, visualAST, isAnchorModalOpen]
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
  }, []);

  const handleSaveAnchorTooltip = useCallback(
    (type: PassiveAttributeType, title: string, note: string, worldX: number, worldY: number) => {
      const newAttr: PlacedAttribute = {
        id: `attr-${Date.now()}`,
        type,
        title,
        note,
        worldX,
        worldY,
        entityBounds: activeEntityBounds || undefined,
      };
      setPlacedAttributes((prev) => [...prev, newAttr]);
      markDirty();
      setAnchorTooltip(null);
      setActiveAnchorEntity(null);
      setActiveEntityBounds(null);
      setIsAnchorModalOpen(false);
    },
    [activeEntityBounds, setPlacedAttributes, markDirty]
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
  };
};
