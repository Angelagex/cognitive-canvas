import { useState, useCallback } from "react";
import { NativeSyntheticEvent } from "react-native";
import { TransformEvent } from "../../types/canvas";

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
  }, []);

  const handleTransform = useCallback((event: NativeSyntheticEvent<TransformEvent>) => {
    const { scale, translateX, translateY } = event.nativeEvent;
    setCanvasScale(scale);
    setCanvasTranslateX(translateX);
    setCanvasTranslateY(translateY);
    setDisplayZoom(Math.round(scale * 100));
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
  };
};
