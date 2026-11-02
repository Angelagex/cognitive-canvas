import { useState, useCallback } from "react";
import { NativeSyntheticEvent, Dimensions } from "react-native";
import { TransformEvent } from "../../types/canvas";

export interface FocusWorldBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const useCanvasViewport = () => {
  const [displayZoom, setDisplayZoom] = useState<number>(100);
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasTranslateX, setCanvasTranslateX] = useState<number>(0.0);
  const [canvasTranslateY, setCanvasTranslateY] = useState<number>(0.0);

  // Native Triggers (one-way command pulses)
  const [zoomInTrigger, setZoomInTrigger] = useState<number>(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState<number>(0);
  const [resetZoomTrigger, setResetZoomTrigger] = useState<number>(0);

  const handleZoomIn = useCallback(() => {
    setZoomInTrigger((prev) => prev + 1);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomOutTrigger((prev) => prev + 1);
  }, []);

  const handleResetZoom = useCallback(() => {
    setResetZoomTrigger((prev) => prev + 1);
    setDisplayZoom(100);
    setCanvasScale(1.0);
    setCanvasTranslateX(0.0);
    setCanvasTranslateY(0.0);
  }, []);

  const handleTransform = useCallback((event: NativeSyntheticEvent<TransformEvent>) => {
    const { scale, translateX, translateY } = event.nativeEvent;
    setCanvasScale(scale);
    setCanvasTranslateX(translateX);
    setCanvasTranslateY(translateY);
    setDisplayZoom(Math.round(scale * 100));
  }, []);

  const focusOnBoundingBox = useCallback((box: FocusWorldBox) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
    const boxWidth = box.maxX - box.minX;
    const boxHeight = box.maxY - box.minY;
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;

    // Compute scale so the box fits with breathing room
    const targetScale = Math.min(
      Math.max(0.4, ((screenWidth || 1280) * 0.6) / Math.max(boxWidth, boxHeight, 200)),
      1.2
    );

    const nextTranslateX = (screenWidth || 1280) / 2 - centerX * targetScale;
    const nextTranslateY = (screenHeight || 800) / 2 - centerY * targetScale;

    setCanvasScale(targetScale);
    setCanvasTranslateX(nextTranslateX);
    setCanvasTranslateY(nextTranslateY);
    setDisplayZoom(Math.round(targetScale * 100));
  }, []);

  return {
    displayZoom,
    setDisplayZoom,
    canvasScale,
    setCanvasScale,
    canvasTranslateX,
    setCanvasTranslateX,
    canvasTranslateY,
    setCanvasTranslateY,
    zoomInTrigger,
    zoomOutTrigger,
    resetZoomTrigger,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleTransform,
    focusOnBoundingBox,
    focusOnWorldBox: focusOnBoundingBox,
  };
};
