import React, { useRef, useEffect, useMemo, useCallback } from "react";
import { StyleSheet, View, Text, TurboModuleRegistry } from "react-native";
import type { WebView as WebViewType, WebViewMessageEvent } from "react-native-webview";
import { KnowledgeNode, KnowledgeEdge } from "@cognitive-canvas/core";
import { FORCE_GRAPH_HTML_TEMPLATE } from "./forceGraphHtml";
import { inferConceptDomain } from "../../../services/CompiledGraphStorage";
import { getDomainColor } from "../utils/domainColors";

export const DOMAIN_THEMES = new Proxy({} as Record<string, { stroke: string; glow: string; text: string }>, {
  get: (_target, prop: string) => getDomainColor(typeof prop === "string" ? prop : undefined),
});

export interface MatrixGraphViewProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string | null) => void;
  width?: number;
  height?: number;
}

function getNativeWebView(): typeof WebViewType | null {
  try {
    if (!TurboModuleRegistry.get("RNCWebViewModule")) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-webview").WebView as typeof WebViewType;
  } catch {
    return null;
  }
}

export const MatrixGraphView: React.FC<MatrixGraphViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  width,
  height,
}) => {
  const webViewRef = useRef<WebViewType>(null);
  const NativeWebView = useMemo(() => getNativeWebView(), []);

  const serializedGraphData = useMemo(
    () =>
      JSON.stringify({
        nodes: nodes.map((n) => ({
          id: n.id,
          name: n.label,
          domain: inferConceptDomain(n.label, n.provenance?.[0]?.canvasTitle || "General", n.domain),
          tier: n.tier,
          state: n.verificationState,
        })),
        links: edges.map((e) => ({
          source: e.fromNodeId,
          target: e.toNodeId,
          type: e.type,
          reasoning: e.reasoning,
        })),
      }),
    [nodes, edges]
  );

  const pushGraphDataToWebView = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.updateCognitiveGraph) {
          window.updateCognitiveGraph(${serializedGraphData}, ${JSON.stringify(selectedNodeId ?? null)});
        }
        true;
      `);
    }
  }, [serializedGraphData, selectedNodeId]);

  useEffect(() => {
    pushGraphDataToWebView();
    const timer = setTimeout(pushGraphDataToWebView, 180);
    return () => clearTimeout(timer);
  }, [pushGraphDataToWebView]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "NODE_SELECTED") {
        onSelectNode(typeof data.nodeId === "string" ? data.nodeId : null);
      }
    } catch (e) {
      console.error("[MatrixGraphView] Failed to parse bridge message", e);
    }
  };

  const containerStyle = useMemo(
    () => [
      styles.container,
      width != null && width > 0 ? { width } : null,
      height != null && height > 0 ? { height } : null,
    ],
    [width, height]
  );

  if (!NativeWebView) {
    return (
      <View style={[styles.container, styles.fallbackBox]}>
        <Text style={styles.fallbackTitle}>Native WebView Module Not Linked</Text>
        <Text style={styles.fallbackSub}>Rebuild Android client to link RNCWebViewModule.</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <NativeWebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: FORCE_GRAPH_HTML_TEMPLATE }}
        style={styles.webview}
        scrollEnabled={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScript={`if (window.updateCognitiveGraph) { window.updateCognitiveGraph(${serializedGraphData}, ${JSON.stringify(selectedNodeId ?? null)}); } true;`}
        onLoadEnd={pushGraphDataToWebView}
        onMessage={handleMessage}
      />
    </View>
  );
};

export const DagGraphRenderer = MatrixGraphView;

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%", backgroundColor: "#090D16" },
  webview: { flex: 1, width: "100%", height: "100%", backgroundColor: "transparent" },
  fallbackBox: { alignItems: "center", justifyContent: "center", padding: 24 },
  fallbackTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  fallbackSub: { color: "#94A3B8", fontSize: 12, textAlign: "center" },
});
