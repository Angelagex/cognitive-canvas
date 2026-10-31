/**
 * Hardware-accelerated 2D Force-Directed DAG HTML5 Canvas simulation
 * - Y-axis abstraction tier stratification (System / Mechanism / Primitive) with spring-back on drop (node.fx = null; node.fy = null;)
 * - X-axis thematic domain clustering with color-coded illuminated topic islands
 */
export const FORCE_GRAPH_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { box-sizing: border-box; }
    body, html {
      margin: 0; padding: 0; width: 100%; height: 100%;
      background: #090D16; overflow: hidden;
      touch-action: none; user-select: none; -webkit-user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    canvas { display: block; width: 100%; height: 100%; }
    .tier-label {
      position: fixed; left: 16px; pointer-events: none;
      font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
      color: rgba(148, 163, 184, 0.42); text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="tier-label" style="top: 14%">Tier 2 · Systems & Macro-Topologies</div>
  <div class="tier-label" style="top: 47%">Tier 1 · Causal Mechanisms & Protocols</div>
  <div class="tier-label" style="top: 80%">Tier 0 · Atomic Primitives & Definitions</div>
  <canvas id="stage"></canvas>
  <script>
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth || 900, height = window.innerHeight || 600, dpr = window.devicePixelRatio || 1;
    const DOMAIN_PALETTE = [
      { hex: '#38BDF8', glow: 'rgba(56, 189, 248, 0.16)', tint: 'rgba(12, 74, 110, 0.82)' },
      { hex: '#C084FC', glow: 'rgba(192, 132, 252, 0.16)', tint: 'rgba(59, 7, 100, 0.82)' },
      { hex: '#34D399', glow: 'rgba(52, 211, 153, 0.16)', tint: 'rgba(6, 78, 59, 0.82)' },
      { hex: '#FB7185', glow: 'rgba(251, 113, 133, 0.16)', tint: 'rgba(76, 5, 25, 0.82)' },
      { hex: '#FBBF24', glow: 'rgba(251, 191, 36, 0.16)', tint: 'rgba(69, 26, 3, 0.82)' },
      { hex: '#818CF8', glow: 'rgba(129, 140, 248, 0.16)', tint: 'rgba(30, 27, 75, 0.82)' }
    ];
    function resize() {
      width = window.innerWidth || 900; height = window.innerHeight || 600; dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr; canvas.height = height * dpr;
    }
    window.addEventListener('resize', resize); resize();

    let nodes = [], links = [], domainList = [], selectedId = null, draggedNode = null, alpha = 1;
    let cam = { x: 0, y: 0, k: 1, targetX: 0, targetY: 0, targetK: 1 };

    function tierTargetY(tier) {
      return tier === 'system' ? -height * 0.28 : tier === 'primitive' ? height * 0.28 : 0;
    }
    function domainIndex(dom) {
      const idx = domainList.indexOf(dom || 'General');
      return idx >= 0 ? idx : 0;
    }
    function domainTargetX(dom) {
      const total = Math.max(1, domainList.length);
      const spacing = Math.min(340, Math.max(240, (width * 0.78) / total));
      return (domainIndex(dom) - (total - 1) / 2) * spacing;
    }
    function domainStyle(dom) {
      return DOMAIN_PALETTE[domainIndex(dom) % DOMAIN_PALETTE.length];
    }

    window.updateCognitiveGraph = function(data, nextSelectedId) {
      selectedId = nextSelectedId || null;
      if (!data || !Array.isArray(data.nodes)) return;
      const prevMap = new Map(nodes.map(n => [n.id, n]));
      domainList = Array.from(new Set(data.nodes.map(n => n.domain || 'General')));
      nodes = data.nodes.map((n, i) => {
        const prev = prevMap.get(n.id), dom = n.domain || 'General';
        return {
          id: n.id, name: n.name || n.id, domain: dom,
          tier: n.tier || 'mechanism', state: n.state || 'unverified',
          x: prev ? prev.x : domainTargetX(dom) + ((i % 3) - 1) * 38,
          y: prev ? prev.y : tierTargetY(n.tier) + ((i % 2 === 0 ? 1 : -1) * 18),
          vx: prev ? prev.vx : 0, vy: prev ? prev.vy : 0, fx: null, fy: null, w: 136, h: 30
        };
      });
      const nodeById = new Map(nodes.map(n => [n.id, n]));
      links = (data.links || [])
        .map(l => ({ source: nodeById.get(l.source), target: nodeById.get(l.target), type: l.type || 'TRIGGERS' }))
        .filter(l => l.source && l.target && l.source !== l.target);
      alpha = 1;
      if (prevMap.size === 0 && nodes.length > 0) { cam.targetX = 0; cam.targetY = 0; cam.targetK = 1; }
    };

    function stepPhysics() {
      if (alpha > 0.01) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          if (a.fx != null && a.fy != null) { a.x = a.fx; a.y = a.fy; a.vx = 0; a.vy = 0; continue; }
          a.vy += (tierTargetY(a.tier) - a.y) * 0.12 * alpha;
          a.vx += (domainTargetX(a.domain) - a.x) * 0.075 * alpha;
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = b.x - a.x || 0.1, dy = b.y - a.y || 0.1;
            let dist2 = Math.max((a.w + b.w) * 0.62 * (a.w + b.w) * 0.62, dx * dx + dy * dy);
            const force = ((a.domain === b.domain ? 2600 : 4200) * alpha) / dist2;
            const fx = dx * force, fy = dy * force * 0.55;
            if (a.fx == null) { a.vx -= fx; a.vy -= fy; }
            if (b.fx == null) { b.vx += fx; b.vy += fy; }
          }
        }
        for (const l of links) {
          const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
          const dist = Math.hypot(dx, dy) || 1, delta = (dist - 150) * 0.03 * alpha;
          const fx = (dx / dist) * delta, fy = (dy / dist) * delta * 0.45;
          if (l.source.fx == null) { l.source.vx += fx; l.source.vy += fy; }
          if (l.target.fx == null) { l.target.vx -= fx; l.target.vy -= fy; }
        }
        for (const n of nodes) {
          if (n.fx != null && n.fy != null) { n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0; }
          else { n.vx *= 0.76; n.vy *= 0.76; n.x += n.vx; n.y += n.vy; }
        }
        alpha *= 0.975;
      }
      cam.x += (cam.targetX - cam.x) * 0.18;
      cam.y += (cam.targetY - cam.y) * 0.18;
      cam.k += (cam.targetK - cam.k) * 0.18;
    }

    function drawDomainIslands() {
      for (const dom of domainList) {
        const group = nodes.filter(n => n.domain === dom);
        if (!group.length) continue;
        const st = domainStyle(dom);
        let sumX = 0, sumY = 0;
        for (const n of group) { sumX += n.x; sumY += n.y; }
        const cx = sumX / group.length, cy = sumY / group.length;
        let maxR = 115;
        for (const n of group) maxR = Math.max(maxR, Math.hypot(n.x - cx, n.y - cy) + n.w * 0.6);
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        grad.addColorStop(0, st.glow); grad.addColorStop(1, 'rgba(9, 13, 22, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.fill();
        ctx.font = '700 11px sans-serif'; ctx.fillStyle = st.hex; ctx.textAlign = 'center';
        ctx.fillText('◆ ' + dom.toUpperCase(), domainTargetX(dom), -height * 0.38);
      }
    }

    function draw() {
      stepPhysics();
      ctx.save(); ctx.scale(dpr, dpr);
      ctx.fillStyle = '#090D16'; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)'; ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
      [0.33, 0.66].forEach(r => { ctx.beginPath(); ctx.moveTo(0, height * r); ctx.lineTo(width, height * r); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.translate(width / 2 + cam.x, height / 2 + cam.y); ctx.scale(cam.k, cam.k);
      drawDomainIslands();

      for (const l of links) {
        const s = l.source, t = l.target, dx = t.x - s.x, dy = t.y - s.y;
        const cx = (s.x + t.x) / 2 - dy * 0.14, cy = (s.y + t.y) / 2 + dx * 0.14;
        const color = l.type === 'INHIBITS' ? '#EF4444' : l.type === 'PREREQUISITE_OF' ? '#38BDF8' : '#475569';
        ctx.strokeStyle = color; ctx.lineWidth = 1.6 / Math.sqrt(cam.k);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cx, cy, t.x, t.y); ctx.stroke();
        const u = 0.82;
        const ax = (1 - u) * (1 - u) * s.x + 2 * (1 - u) * u * cx + u * u * t.x;
        const ay = (1 - u) * (1 - u) * s.y + 2 * (1 - u) * u * cy + u * u * t.y;
        const angle = Math.atan2(2 * (1 - u) * (cy - s.y) + 2 * u * (t.y - cy), 2 * (1 - u) * (cx - s.x) + 2 * u * (t.x - cx));
        const head = 7 / Math.sqrt(cam.k);
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(ax - head * Math.cos(angle - 0.45), ay - head * Math.sin(angle - 0.45));
        ctx.lineTo(ax - head * Math.cos(angle + 0.45), ay - head * Math.sin(angle + 0.45));
        ctx.closePath(); ctx.fill();
      }

      ctx.font = '600 12px sans-serif';
      for (const n of nodes) {
        const st = domainStyle(n.domain);
        n.w = ctx.measureText(n.name).width + 34; n.h = 30;
        const x = n.x - n.w / 2, y = n.y - n.h / 2, r = n.h / 2, isSel = n.id === selectedId;
        ctx.save();
        ctx.fillStyle = n.state === 'ghost' ? 'rgba(15, 23, 42, 0.78)' : st.tint;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, n.w, n.h, r); else ctx.rect(x, y, n.w, n.h);
        ctx.fill();
        ctx.lineWidth = isSel ? 2.6 : 1.7;
        if (n.state === 'verified') {
          ctx.strokeStyle = '#10B981'; ctx.shadowColor = st.hex; ctx.shadowBlur = isSel ? 15 : 8;
        } else if (n.state === 'ghost') {
          ctx.strokeStyle = '#64748B'; ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = '#F59E0B'; ctx.shadowColor = st.hex; ctx.shadowBlur = isSel ? 12 : 6; ctx.setLineDash([5, 3]);
        }
        ctx.stroke(); ctx.restore();
        ctx.fillStyle = st.hex; ctx.beginPath(); ctx.arc(x + 12, n.y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = n.state === 'ghost' ? '#94A3B8' : '#F8FAFC';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.name, n.x + 4, n.y);
      }
      ctx.restore();
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    let pointers = new Map(), startPan = null, startPinchDist = null, startK = 1;
    function screenToWorld(sx, sy) {
      return { x: (sx - width / 2 - cam.x) / cam.k, y: (sy - height / 2 - cam.y) / cam.k };
    }

    canvas.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        const wpt = screenToWorld(e.clientX, e.clientY);
        const hit = nodes.find(n => Math.abs(wpt.x - n.x) <= n.w / 2 + 8 && Math.abs(wpt.y - n.y) <= n.h / 2 + 8);
        if (hit) { draggedNode = hit; draggedNode.fx = hit.x; draggedNode.fy = hit.y; }
        startPan = { x: e.clientX, y: e.clientY, camX: cam.targetX, camY: cam.targetY, moved: false };
      } else if (pointers.size === 2) {
        if (draggedNode) { draggedNode.fx = null; draggedNode.fy = null; draggedNode = null; }
        const pts = Array.from(pointers.values());
        startPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        startK = cam.targetK;
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1 && startPan) {
        const dx = e.clientX - startPan.x, dy = e.clientY - startPan.y;
        if (Math.hypot(dx, dy) > 6) startPan.moved = true;
        if (draggedNode) {
          const wpt = screenToWorld(e.clientX, e.clientY);
          draggedNode.fx = wpt.x; draggedNode.fy = wpt.y; draggedNode.x = wpt.x; draggedNode.y = wpt.y;
          alpha = Math.max(alpha, 0.5);
        } else {
          cam.targetX = startPan.camX + dx; cam.targetY = startPan.camY + dy;
        }
      } else if (pointers.size === 2 && startPinchDist) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        cam.targetK = Math.min(2.6, Math.max(0.45, startK * (dist / startPinchDist)));
      }
    });

    function onPointerUp(e) {
      if (draggedNode) {
        const tappedNode = draggedNode;
        // Release pinned coordinates so node springs back to its designated vertical tier level
        draggedNode.fx = null;
        draggedNode.fy = null;
        alpha = 0.9;
        draggedNode = null;
        if (startPan && !startPan.moved) {
          selectedId = tappedNode.id;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NODE_SELECTED', nodeId: tappedNode.id }));
          }
        }
      }
      pointers.delete(e.pointerId);
      if (pointers.size === 0) { startPan = null; startPinchDist = null; }
    }
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
  </script>
</body>
</html>`;
