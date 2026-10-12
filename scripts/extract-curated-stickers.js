#!/usr/bin/env node

/**
 * Script de extracción y filtrado de stickers vectoriales cognitivos
 * Fuente: @sketchyicons/react-native (dist/esm/icons)
 * Destino: assets/vector_stickers.json y apps/expo/assets/vector_stickers.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { svgPathProperties } from 'svg-path-properties';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'node_modules/@sketchyicons/react-native/dist/esm/icons');

if (!fs.existsSync(ICONS_DIR)) {
  console.error('Error: No se encontró el directorio de iconos en:', ICONS_DIR);
  process.exit(1);
}

// 1. Definición de Categorías Cognitivas y Palabras Clave Oficiales
const CATEGORY_DEFINITIONS = [
  {
    id: 'FLOW_CONNECTORS',
    name: 'Flujo y Conectores',
    officialKeywords: ['arrow', 'fork', 'loop', 'branch', 'merge', 'shuffle', 'git'],
    preferredIcons: [
      'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
      'arrow-up-right', 'arrow-down-right', 'arrow-up-left', 'arrow-down-left',
      'arrow-big-right', 'arrow-big-left', 'arrow-big-up', 'arrow-big-down',
      'corner-down-right', 'corner-up-right', 'move-right', 'move-diagonal',
      'git-branch', 'git-merge', 'git-fork', 'git-pull-request', 'git-commit-horizontal',
      'shuffle', 'repeat', 'refresh-cw', 'refresh-ccw', 'workflow'
    ]
  },
  {
    id: 'CAUSAL_MECHANISMS',
    name: 'Mecanismos y Causalidad',
    officialKeywords: ['gear', 'cog', 'tool', 'wrench', 'bolt', 'switch', 'slider', 'pulse'],
    preferredIcons: [
      'cog', 'brain-cog', 'settings', 'settings-2',
      'wrench', 'wrench-off', 'toolbox', 'pen-tool',
      'bolt', 'zap', 'plug', 'plug-zap', 'power',
      'sliders', 'sliders-horizontal', 'sliders-vertical',
      'heart-pulse', 'activity', 'cpu', 'toggle-right', 'toggle-left',
      'gauge', 'flame', 'magnet', 'orbit'
    ]
  },
  {
    id: 'COGNITION_IDEAS',
    name: 'Cognición e Ideas',
    officialKeywords: ['lightbulb', 'brain', 'eye', 'search', 'sparkle', 'puzzle', 'compass', 'target'],
    preferredIcons: [
      'lightbulb', 'lightbulb-off',
      'brain', 'brain-circuit',
      'eye', 'eye-off', 'eye-closed', 'scan-eye',
      'search', 'search-check',
      'sparkle', 'sparkles', 'wand-sparkles',
      'puzzle', 'compass', 'drafting-compass', 'target',
      'glasses', 'atom', 'microscope', 'telescope', 'binoculars', 'focus'
    ]
  },
  {
    id: 'RESTRICTIONS_FILTERS',
    name: 'Restricciones y Filtros',
    officialKeywords: ['lock', 'funnel', 'filter', 'shield', 'alert', 'stop', 'pause', 'barrier'],
    preferredIcons: [
      'lock', 'lock-keyhole', 'lock-open', 'unlock',
      'funnel', 'funnel-x', 'filter', 'filter-x', 'list-filter',
      'shield', 'shield-alert', 'shield-check', 'shield-ban', 'shield-close',
      'alert-triangle', 'alert-circle', 'alert-octagon', 'circle-alert',
      'stop-circle', 'circle-stop',
      'pause', 'pause-circle',
      'ban', 'circle-slash', 'circle-slash-2', 'circle-x', 'x-circle'
    ]
  },
  {
    id: 'EVIDENCE_DATA',
    name: 'Evidencia y Datos',
    officialKeywords: ['chart', 'bar', 'trend', 'table', 'scale', 'database', 'file-text', 'check'],
    preferredIcons: [
      'bar-chart-2', 'bar-chart-3', 'bar-chart-big', 'bar-chart-horizontal',
      'line-chart', 'pie-chart', 'chart-pie', 'area-chart', 'scatter-chart',
      'trending-up', 'trending-down', 'trending-up-down',
      'table', 'table-2', 'table-of-contents',
      'scale', 'scale-3d',
      'database', 'database-backup', 'database-check',
      'file-text', 'file-check', 'check', 'check-circle-2', 'check-square',
      'binary', 'hash', 'percent', 'sigma'
    ]
  },
  {
    id: 'STRUCTURE_HIERARCHY',
    name: 'Estructura y Jerarquía',
    officialKeywords: ['layers', 'grid', 'box', 'folder', 'tree', 'layout', 'columns'],
    preferredIcons: [
      'layers', 'layers-2', 'layers-3',
      'grid-2x2', 'layout-grid',
      'box', 'boxes', 'box-select',
      'folder', 'folder-tree', 'folder-git', 'folder-check',
      'list-tree', 'network', 'component',
      'layout', 'layout-dashboard', 'layout-list', 'layout-panel-left',
      'columns-2', 'columns-3', 'columns-4'
    ]
  },
  {
    id: 'TIME_PROCESS',
    name: 'Tiempo y Proceso',
    officialKeywords: ['clock', 'calendar', 'timer', 'history', 'fast-forward', 'steps'],
    preferredIcons: [
      'clock', 'alarm-clock', 'calendar-clock',
      'calendar', 'calendar-check', 'calendar-days', 'calendar-plus', 'calendar-x',
      'timer', 'timer-reset', 'timer-off',
      'history', 'fast-forward', 'rewind',
      'hourglass', 'milestone', 'footprints', 'play', 'iteration-cw'
    ]
  },
  {
    id: 'RELATIONS_ANCHORS',
    name: 'Relaciones y Anclajes',
    officialKeywords: ['link', 'unlink', 'anchor', 'pin', 'bookmark', 'tag', 'flag'],
    preferredIcons: [
      'link', 'link-2', 'unlink', 'unlink-2',
      'anchor', 'pin', 'map-pin',
      'bookmark', 'bookmark-check', 'tag', 'tags',
      'flag', 'flag-triangle-right', 'share-2', 'paperclip', 'external-link'
    ]
  }
];

// Mapeos canónicos de IDs y nombres en español
const CANONICAL_STICKER_METADATA = {
  'cog': { id: 'icon_gear', name: 'Engranaje' },
  'settings': { id: 'icon_settings', name: 'Configuración de Sistema' },
  'settings-2': { id: 'icon_settings_2', name: 'Ajuste de Parámetros' },
  'brain-cog': { id: 'icon_brain_cog', name: 'Mecanismo Mental' },

  'arrow-right': { id: 'icon_arrow_right', name: 'Flecha Derecha' },
  'arrow-left': { id: 'icon_arrow_left', name: 'Flecha Izquierda' },
  'arrow-up': { id: 'icon_arrow_up', name: 'Flecha Arriba' },
  'arrow-down': { id: 'icon_arrow_down', name: 'Flecha Abajo' },
  'arrow-up-right': { id: 'icon_arrow_up_right', name: 'Flecha Diagonal Ascendente' },
  'arrow-down-right': { id: 'icon_arrow_down_right', name: 'Flecha Diagonal Descendente' },
  'arrow-up-left': { id: 'icon_arrow_up_left', name: 'Flecha Retorno Superior' },
  'arrow-down-left': { id: 'icon_arrow_down_left', name: 'Flecha Retorno Inferior' },
  'arrow-big-right': { id: 'icon_arrow_big_right', name: 'Bloque Flecha Derecha' },
  'arrow-big-left': { id: 'icon_arrow_big_left', name: 'Bloque Flecha Izquierda' },
  'arrow-big-up': { id: 'icon_arrow_big_up', name: 'Bloque Flecha Arriba' },
  'arrow-big-down': { id: 'icon_arrow_big_down', name: 'Bloque Flecha Abajo' },
  'corner-down-right': { id: 'icon_corner_down_right', name: 'Desvío en Ángulo' },
  'corner-up-right': { id: 'icon_corner_up_right', name: 'Salida en Ángulo' },
  'move-right': { id: 'icon_move_right', name: 'Avance Directo' },
  'move-diagonal': { id: 'icon_move_diagonal', name: 'Vector Diagonal' },
  'git-branch': { id: 'icon_git_branch', name: 'Bifurcación Conceptual' },
  'git-merge': { id: 'icon_git_merge', name: 'Fusión / Síntesis' },
  'git-fork': { id: 'icon_git_fork', name: 'Ramas Paralelas' },
  'git-pull-request': { id: 'icon_git_pull_request', name: 'Integración' },
  'git-commit-horizontal': { id: 'icon_git_commit_horizontal', name: 'Punto de Control' },
  'shuffle': { id: 'icon_shuffle', name: 'Aleatoriedad / Permutación' },
  'repeat': { id: 'icon_repeat', name: 'Bucle / Ciclo Repetitivo' },
  'refresh-cw': { id: 'icon_refresh_cw', name: 'Retroalimentación Cíclica' },
  'refresh-ccw': { id: 'icon_refresh_ccw', name: 'Ciclo Inverso' },
  'workflow': { id: 'icon_workflow', name: 'Flujo de Proceso' },

  'wrench': { id: 'icon_wrench', name: 'Ajuste Instrumental' },
  'wrench-off': { id: 'icon_wrench_off', name: 'Herramienta Inactiva' },
  'toolbox': { id: 'icon_toolbox', name: 'Caja de Herramientas' },
  'pen-tool': { id: 'icon_pen_tool', name: 'Trazador Vectorial' },
  'bolt': { id: 'icon_bolt', name: 'Rayo de Energía' },
  'zap': { id: 'icon_zap', name: 'Impulso Eléctrico' },
  'plug': { id: 'icon_plug', name: 'Conexión Causal' },
  'plug-zap': { id: 'icon_plug_zap', name: 'Conexión Energizada' },
  'power': { id: 'icon_power', name: 'Fuente de Poder' },
  'sliders': { id: 'icon_sliders', name: 'Controles Variables' },
  'sliders-horizontal': { id: 'icon_sliders_horizontal', name: 'Parámetros Horizontales' },
  'sliders-vertical': { id: 'icon_sliders_vertical', name: 'Niveles Dinámicos' },
  'heart-pulse': { id: 'icon_heart_pulse', name: 'Pulso Vital / Ritmo' },
  'activity': { id: 'icon_activity', name: 'Actividad Dinámica' },
  'cpu': { id: 'icon_cpu', name: 'Unidad de Procesamiento' },
  'toggle-right': { id: 'icon_toggle_right', name: 'Activación (On)' },
  'toggle-left': { id: 'icon_toggle_left', name: 'Inactivación (Off)' },
  'gauge': { id: 'icon_gauge', name: 'Manómetro / Indicador' },
  'flame': { id: 'icon_flame', name: 'Combustión / Catalizador' },
  'magnet': { id: 'icon_magnet', name: 'Fuerza Atractiva' },
  'orbit': { id: 'icon_orbit', name: 'Trayectoria Orbital' },

  'lightbulb': { id: 'icon_lightbulb', name: 'Bombilla (Idea)' },
  'lightbulb-off': { id: 'icon_lightbulb_off', name: 'Hipótesis Inactiva' },
  'brain': { id: 'icon_brain', name: 'Cerebro / Cognición' },
  'brain-circuit': { id: 'icon_brain_circuit', name: 'Red Neuronal / Circuito' },
  'eye': { id: 'icon_eye', name: 'Observación Consciente' },
  'eye-off': { id: 'icon_eye_off', name: 'Punto Ciego' },
  'eye-closed': { id: 'icon_eye_closed', name: 'Ocultación' },
  'scan-eye': { id: 'icon_scan_eye', name: 'Escaneo Visual' },
  'search': { id: 'icon_search', name: 'Indagación / Búsqueda' },
  'search-check': { id: 'icon_search_check', name: 'Búsqueda Validada' },
  'sparkle': { id: 'icon_sparkle', name: 'Chispa Creativa' },
  'sparkles': { id: 'icon_sparkles', name: 'Síntesis Inspiradora' },
  'wand-sparkles': { id: 'icon_wand_sparkles', name: 'Transformación Conceptual' },
  'puzzle': { id: 'icon_puzzle', name: 'Pieza de Rompecabezas' },
  'compass': { id: 'icon_compass', name: 'Orientación Teórica' },
  'drafting-compass': { id: 'icon_drafting_compass', name: 'Compás de Precisión' },
  'target': { id: 'icon_target', name: 'Objetivo Central' },
  'glasses': { id: 'icon_glasses', name: 'Perspectiva Crítica' },
  'atom': { id: 'icon_atom', name: 'Principio Fundamental' },
  'microscope': { id: 'icon_microscope', name: 'Análisis Microscópico' },
  'telescope': { id: 'icon_telescope', name: 'Visión Macro' },
  'binoculars': { id: 'icon_binoculars', name: 'Exploración de Entorno' },
  'focus': { id: 'icon_focus', name: 'Foco de Atención' },

  'lock': { id: 'icon_lock', name: 'Restricción Cerrada' },
  'lock-keyhole': { id: 'icon_lock_keyhole', name: 'Candado de Seguridad' },
  'lock-open': { id: 'icon_lock_open', name: 'Candado Abierto' },
  'unlock': { id: 'icon_unlock', name: 'Acceso Desbloqueado' },
  'funnel': { id: 'icon_funnel', name: 'Embudo de Selección' },
  'funnel-x': { id: 'icon_funnel_x', name: 'Filtro Descartado' },
  'filter': { id: 'icon_filter', name: 'Filtro Cognitivo' },
  'filter-x': { id: 'icon_filter_x', name: 'Filtro Rechazado' },
  'list-filter': { id: 'icon_list_filter', name: 'Filtro Estructurado' },
  'shield': { id: 'icon_shield', name: 'Escudo Protector' },
  'shield-alert': { id: 'icon_shield_alert', name: 'Alerta de Vulnerabilidad' },
  'shield-check': { id: 'icon_shield_check', name: 'Criterio Validado' },
  'shield-ban': { id: 'icon_shield_ban', name: 'Barrera Infranqueable' },
  'shield-close': { id: 'icon_shield_close', name: 'Escudo de Clausura' },
  'alert-triangle': { id: 'icon_alert_triangle', name: 'Advertencia de Conflicto' },
  'alert-circle': { id: 'icon_alert_circle', name: 'Punto de Alerta' },
  'alert-octagon': { id: 'icon_alert_octagon', name: 'Peligro Crítico' },
  'circle-alert': { id: 'icon_circle_alert', name: 'Aviso Circular' },
  'stop-circle': { id: 'icon_stop_circle', name: 'Detención de Flujo' },
  'circle-stop': { id: 'icon_circle_stop', name: 'Límite de Parada' },
  'pause': { id: 'icon_pause', name: 'Pausa / Suspensión' },
  'pause-circle': { id: 'icon_pause_circle', name: 'Estado de Espera' },
  'ban': { id: 'icon_ban', name: 'Prohibición Expresa' },
  'circle-slash': { id: 'icon_circle_slash', name: 'Exclusión' },
  'circle-slash-2': { id: 'icon_circle_slash_2', name: 'Barrera Diagonal' },
  'circle-x': { id: 'icon_circle_x', name: 'Cancelación Circular' },
  'x-circle': { id: 'icon_x_circle', name: 'Descarte Total' },

  'bar-chart-2': { id: 'icon_bar_chart_2', name: 'Gráfico de Columnas' },
  'bar-chart-3': { id: 'icon_bar_chart_3', name: 'Distribución por Barras' },
  'bar-chart-big': { id: 'icon_bar_chart_big', name: 'Histograma Comparativo' },
  'bar-chart-horizontal': { id: 'icon_bar_chart_horizontal', name: 'Barras Horizontales' },
  'line-chart': { id: 'icon_line_chart', name: 'Progresión Continua' },
  'pie-chart': { id: 'icon_pie_chart', name: 'Proporción Relativa' },
  'chart-pie': { id: 'icon_chart_pie', name: 'Segmento Circular' },
  'area-chart': { id: 'icon_area_chart', name: 'Área Acumulada' },
  'scatter-chart': { id: 'icon_scatter_chart', name: 'Dispersión de Datos' },
  'trending-up': { id: 'icon_trending_up', name: 'Tendencia Ascendente' },
  'trending-down': { id: 'icon_trending_down', name: 'Tendencia Descendente' },
  'trending-up-down': { id: 'icon_trending_up_down', name: 'Oscilación / Volatilidad' },
  'table': { id: 'icon_table', name: 'Tabla Relacional' },
  'table-2': { id: 'icon_table_2', name: 'Matriz de Datos' },
  'table-of-contents': { id: 'icon_table_of_contents', name: 'Índice Estructurado' },
  'scale': { id: 'icon_scale', name: 'Balanza de Evidencias' },
  'scale-3d': { id: 'icon_scale_3d', name: 'Ponderación Multidimensional' },
  'database': { id: 'icon_database', name: 'Base de Conocimiento' },
  'database-backup': { id: 'icon_database_backup', name: 'Respaldo de Datos' },
  'database-check': { id: 'icon_database_check', name: 'Datos Verificados' },
  'file-text': { id: 'icon_file_text', name: 'Documento Fuente' },
  'file-check': { id: 'icon_file_check', name: 'Archivo Verificado' },
  'check': { id: 'icon_check', name: 'Verificación Positiva' },
  'check-circle-2': { id: 'icon_check_circle_2', name: 'Hipótesis Comprobada' },
  'check-square': { id: 'icon_check_square', name: 'Criterio Cumplido' },
  'binary': { id: 'icon_binary', name: 'Código Binario' },
  'hash': { id: 'icon_hash', name: 'Índice de Conteo' },
  'percent': { id: 'icon_percent', name: 'Porcentaje / Tasa' },
  'sigma': { id: 'icon_sigma', name: 'Sumatoria Integral' },

  'layers': { id: 'icon_layers', name: 'Capas Superpuestas' },
  'layers-2': { id: 'icon_layers_2', name: 'Doble Estrato' },
  'layers-3': { id: 'icon_layers_3', name: 'Jerarquía de Tres Niveles' },
  'grid-2x2': { id: 'icon_grid_2x2', name: 'Cuadrícula 2x2' },
  'layout-grid': { id: 'icon_layout_grid', name: 'Matriz Estructurada' },
  'box': { id: 'icon_box', name: 'Contenedor Atómico' },
  'boxes': { id: 'icon_boxes', name: 'Módulos Agrupados' },
  'box-select': { id: 'icon_box_select', name: 'Delimitación Modular' },
  'folder': { id: 'icon_folder', name: 'Directorio Conceptual' },
  'folder-tree': { id: 'icon_folder_tree', name: 'Árbol de Carpetas' },
  'folder-git': { id: 'icon_folder_git', name: 'Repositorio de Versiones' },
  'folder-check': { id: 'icon_folder_check', name: 'Categoría Consolidada' },
  'list-tree': { id: 'icon_list_tree', name: 'Estructura Ramificada' },
  'network': { id: 'icon_network', name: 'Topología de Red' },
  'component': { id: 'icon_component', name: 'Componente Modular' },
  'layout': { id: 'icon_layout', name: 'Disposición Espacial' },
  'layout-dashboard': { id: 'icon_layout_dashboard', name: 'Panel Holístico' },
  'layout-list': { id: 'icon_layout_list', name: 'Esquema Jerárquico' },
  'layout-panel-left': { id: 'icon_layout_panel_left', name: 'Estructura Lateral' },
  'columns-2': { id: 'icon_columns_2', name: 'Bifurcación en 2 Columnas' },
  'columns-3': { id: 'icon_columns_3', name: 'Tríada de Columnas' },
  'columns-4': { id: 'icon_columns_4', name: 'Matriz de 4 Columnas' },

  'clock': { id: 'icon_clock', name: 'Tiempo Transcurrido' },
  'alarm-clock': { id: 'icon_alarm_clock', name: 'Plazo Límite' },
  'calendar-clock': { id: 'icon_calendar_clock', name: 'Cita Programada' },
  'calendar': { id: 'icon_calendar', name: 'Calendario Cronológico' },
  'calendar-check': { id: 'icon_calendar_check', name: 'Hito Temporal Cumplido' },
  'calendar-days': { id: 'icon_calendar_days', name: 'Secuencia de Días' },
  'calendar-plus': { id: 'icon_calendar_plus', name: 'Extensión de Plazo' },
  'calendar-x': { id: 'icon_calendar_x', name: 'Fecha Caducada' },
  'timer': { id: 'icon_timer', name: 'Temporizador de Intervalo' },
  'timer-reset': { id: 'icon_timer_reset', name: 'Reinicio de Ciclo' },
  'timer-off': { id: 'icon_timer_off', name: 'Temporizador Desactivado' },
  'history': { id: 'icon_history', name: 'Traza Histórica' },
  'fast-forward': { id: 'icon_fast_forward', name: 'Avance Acelerado' },
  'rewind': { id: 'icon_rewind', name: 'Retorno Temporal' },
  'hourglass': { id: 'icon_hourglass', name: 'Tiempo Restante' },
  'milestone': { id: 'icon_milestone', name: 'Hito de Aprendizaje' },
  'footprints': { id: 'icon_footprints', name: 'Secuencia de Pasos' },
  'play': { id: 'icon_play', name: 'Inicio de Ejecución' },
  'iteration-cw': { id: 'icon_iteration_cw', name: 'Iteración Continua' },

  'link': { id: 'icon_link', name: 'Enlace Directo' },
  'link-2': { id: 'icon_link_2', name: 'Vínculo Relacional' },
  'unlink': { id: 'icon_unlink', name: 'Desconexión' },
  'unlink-2': { id: 'icon_unlink_2', name: 'Ruptura de Enlace' },
  'anchor': { id: 'icon_anchor', name: 'Ancla Semántica' },
  'pin': { id: 'icon_pin', name: 'Marcador Fijo' },
  'map-pin': { id: 'icon_map_pin', name: 'Localización Conceptual' },
  'bookmark': { id: 'icon_bookmark', name: 'Marcador de Referencia' },
  'bookmark-check': { id: 'icon_bookmark_check', name: 'Marcador Validador' },
  'tag': { id: 'icon_tag', name: 'Etiqueta Conceptual' },
  'tags': { id: 'icon_tags', name: 'Clasificación Múltiple' },
  'flag': { id: 'icon_flag', name: 'Bandera de Meta' },
  'flag-triangle-right': { id: 'icon_flag_triangle_right', name: 'Señalizador' },
  'share-2': { id: 'icon_share_2', name: 'Distribución Relacional' },
  'paperclip': { id: 'icon_paperclip', name: 'Adjunto de Evidencia' },
  'external-link': { id: 'icon_external_link', name: 'Referencia Externa' }
};

// Función para extraer los path strings 'd' de un archivo de icono
function extractPathsFromIcon(iconFileName) {
  const filePath = path.join(ICONS_DIR, `${iconFileName}.js`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const dMatches = Array.from(content.matchAll(/d:\s*'([^']+)'/g));
  if (!dMatches || dMatches.length === 0) {
    return null;
  }
  return dMatches.map(m => m[1]);
}

// Muestrea puntos normalizados en cuadrícula canónica de 100x100
function sampleStrokePoints(dString) {
  // Dividir por subpaths en caso de contener múltiples comandos M absolutos
  const subPaths = dString.split(/(?=M)/).filter(p => p.trim().length > 0);
  const strokeSegments = [];

  for (const subD of subPaths) {
    try {
      const properties = new svgPathProperties(subD);
      const totalLength = properties.getTotalLength();
      if (totalLength < 0.1) continue;

      // 30 a 40 puntos por trazo continuo (o 12 para puntos muy pequeños)
      const numPoints = totalLength < 4 ? 12 : 36;
      const points = [];

      for (let i = 0; i < numPoints; i++) {
        const lengthAlong = (i / (numPoints - 1)) * totalLength;
        const pt = properties.getPointAtLength(lengthAlong);

        // Normalización canónica de 0..24 a 0.0..100.0 con 1 decimal
        const rx = Math.max(0, Math.min(100, Math.round(((pt.x / 24) * 100) * 10) / 10));
        const ry = Math.max(0, Math.min(100, Math.round(((pt.y / 24) * 100) * 10) / 10));

        // Presión ergonómica estándar
        const p = 0.8;

        points.push({ rx, ry, p });
      }

      if (points.length >= 2) {
        strokeSegments.push({
          relative_width: 2.2,
          points
        });
      }
    } catch (err) {
      // Ignorar subpaths inválidos
    }
  }

  return strokeSegments;
}

// Procesamiento principal
function main() {
  console.log('🚀 Iniciando extracción curada de stickers cognitivos...');

  const allAvailableFiles = fs.readdirSync(ICONS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace('.js', ''));

  const catalog = {
    version: '1.0.0',
    categories: []
  };

  const missingOfficialKeywords = [];
  const categoryStats = [];
  const processedIconIds = new Set();
  let totalStickers = 0;

  for (const catDef of CATEGORY_DEFINITIONS) {
    const catStickers = [];

    // Validar cuáles keywords oficiales existen
    for (const kw of catDef.officialKeywords) {
      const hasMatch = allAvailableFiles.some(f => f.split('-').includes(kw) || f === kw);
      if (!hasMatch) {
        missingOfficialKeywords.push({
          category: catDef.name,
          keyword: kw,
          explanation: getKeywordExplanation(kw)
        });
      }
    }

    // Seleccionar iconos para la categoría
    for (const iconName of catDef.preferredIcons) {
      if (processedIconIds.has(iconName)) continue;

      const pathStrings = extractPathsFromIcon(iconName);
      if (!pathStrings) continue;

      const allStrokes = [];
      for (const d of pathStrings) {
        const strokes = sampleStrokePoints(d);
        allStrokes.push(...strokes);
      }

      if (allStrokes.length === 0) continue;

      const meta = CANONICAL_STICKER_METADATA[iconName] || {
        id: `icon_${iconName.replace(/-/g, '_')}`,
        name: formatFallbackName(iconName)
      };

      catStickers.push({
        id: meta.id,
        name: meta.name,
        default_width: 64.0,
        default_height: 64.0,
        strokes: allStrokes
      });

      processedIconIds.add(iconName);
    }

    catalog.categories.push({
      id: catDef.id,
      name: catDef.name,
      stickers: catStickers
    });

    totalStickers += catStickers.length;
    categoryStats.push({
      id: catDef.id,
      name: catDef.name,
      count: catStickers.length
    });
  }

  // 3. Escribir archivo canonical JSON
  const outputJson = JSON.stringify(catalog, null, 2);

  // Escribir en raíz assets/
  const rootAssetsDir = path.join(ROOT_DIR, 'assets');
  if (!fs.existsSync(rootAssetsDir)) {
    fs.mkdirSync(rootAssetsDir, { recursive: true });
  }
  const rootOutputFile = path.join(rootAssetsDir, 'vector_stickers.json');
  fs.writeFileSync(rootOutputFile, outputJson, 'utf8');

  // Escribir en apps/expo/assets/
  const expoAssetsDir = path.join(ROOT_DIR, 'apps/expo/assets');
  if (!fs.existsSync(expoAssetsDir)) {
    fs.mkdirSync(expoAssetsDir, { recursive: true });
  }
  const expoOutputFile = path.join(expoAssetsDir, 'vector_stickers.json');
  fs.writeFileSync(expoOutputFile, outputJson, 'utf8');

  console.log(`✅ Catálogo generado exitosamente con ${totalStickers} stickers en ${catalog.categories.length} categorías.`);
  console.log(`📁 Guardado en: ${rootOutputFile}`);
  console.log(`📁 Guardado en: ${expoOutputFile}`);

  // 4. Generar Reporte Markdown
  generateReportMarkdown(categoryStats, totalStickers, missingOfficialKeywords);
}

function getKeywordExplanation(keyword) {
  switch (keyword) {
    case 'loop':
      return 'En Lucide/SketchyIcons se utiliza "repeat", "refresh-cw" o "workflow" para representar bucles e iteraciones.';
    case 'gear':
      return 'En Lucide/SketchyIcons se utiliza "cog", "settings" o "settings-2" para engranajes y mecanismos (mapeado a "icon_gear").';
    case 'slider':
      return 'En Lucide/SketchyIcons se utiliza en plural: "sliders", "sliders-horizontal", "sliders-vertical".';
    case 'barrier':
      return 'En Lucide/SketchyIcons se utiliza "ban", "circle-slash" o "shield-ban" para barreras y restricciones.';
    case 'trend':
      return 'En Lucide/SketchyIcons se utiliza en forma verbal: "trending-up", "trending-down", "trending-up-down".';
    case 'steps':
      return 'En Lucide/SketchyIcons se utiliza "footprints", "milestone" o "workflow" para pasos y etapas progresivas.';
    default:
      return 'No existe un archivo con este nombre exacto en el paquete de iconos.';
  }
}

function formatFallbackName(iconName) {
  return iconName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function generateReportMarkdown(stats, totalCount, missingKeywords) {
  const reportPath = path.join(ROOT_DIR, 'docs', 'STICKERS_CURATION_REPORT.md');
  const docsDir = path.dirname(reportPath);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  let md = `# Reporte de Curaduría de Stickers Cognitivos Vectoriales\n\n`;
  md += `Fecha de Generación: ${new Date().toISOString()}\n`;
  md += `Total de Iconos Curados: **${totalCount}** (Rango objetivo: 150-200)\n\n`;

  md += `## 1. Recuento de Iconos por Categoría Cognitiva\n\n`;
  md += `| ID de Categoría | Nombre de Categoría | Cantidad de Stickers |\n`;
  md += `| :--- | :--- | :---: |\n`;
  for (const s of stats) {
    md += `| \`${s.id}\` | ${s.name} | **${s.count}** |\n`;
  }
  md += `| **TOTAL** | **Todas las categorías** | **${totalCount}** |\n\n`;

  md += `## 2. Palabras Clave Oficiales No Encontradas Directamente y sus Equivalentes\n\n`;
  md += `A continuación se listan las palabras clave solicitadas que no poseen un componente con su nombre literal en \`@sketchyicons/react-native\`, junto con la solución semántica aplicada:\n\n`;
  md += `| Categoría | Palabra Clave | Estado en @sketchyicons | Equivalente Curado Utilizado |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const m of missingKeywords) {
    const equiv = m.keyword === 'loop' ? '`repeat`, `refresh-cw`, `refresh-ccw`' :
                  m.keyword === 'gear' ? '`cog` (mapeado a `icon_gear`), `settings`, `settings-2`, `brain-cog`' :
                  m.keyword === 'slider' ? '`sliders`, `sliders-horizontal`, `sliders-vertical`' :
                  m.keyword === 'barrier' ? '`ban`, `circle-slash`, `shield-ban`' :
                  m.keyword === 'trend' ? '`trending-up`, `trending-down`, `trending-up-down`' :
                  m.keyword === 'steps' ? '`footprints`, `milestone`, `workflow`' : 'N/A';
    md += `| ${m.category} | \`${m.keyword}\` | ❌ No existe archivo literal | ${equiv} (${m.explanation}) |\n`;
  }
  md += `\n---\n\n`;
  md += `*Generado automáticamente por \`scripts/extract-curated-stickers.js\`*\n`;

  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`📝 Reporte generado en: ${reportPath}`);
}

main();
