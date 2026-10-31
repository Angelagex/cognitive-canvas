/**
 * Self-contained hardware-accelerated 2D Force-Directed DAG HTML5 Canvas simulation
 * (LearnHarness visual & physics parity: Y-axis tier stratification, repulsion, curved Bezier links,
 * glowing verification capsules, and 120Hz touch pan / pinch-to-zoom / tap-to-focus).
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
    let width = window.innerWidth || 900;
    let height = window.innerHeight || 600;
    let dpr = window.devicePixelRatio || 1;

    function resize() {
      width = window.innerWidth || 900;
      height = window.innerHeight || 600;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    window.addEventListener('resize', resize);
    resize();

    let nodes = [];
    let links = [];
    let selectedId = null;
    let cam = { x: 0, y: 0, k: 1, targetX: 0, targetY: 0, targetK: 1 };
    let alpha = 1;

    function tierTargetY(tier) {
      if (tier === 'system') return -height * 0.28;
      if (tier === 'primitive') return height * 0.28;
      return 0;
    }

    window.updateCognitiveGraph = function(data, nextSelectedId) {
      selectedId = nextSelectedId || null;
      if (!data || !Array.isArray(data.nodes)) return;
      const prevMap = new Map(nodes.map(n => [n.id, n]));
      const count = data.nodes.length || 1;
      nodes = data.nodes.map((n, i) => {
        const prev = prevMap.get(n.id);
        const spreadX = ((i - (count - 1) / 2) * 145) + ((i % 2 === 0 ? 1 : -1) * 20);
        const ty = tierTargetY(n.tier);
        return {
          id: n.id,
          name: n.name || n.id,
          tier: n.tier || 'mechanism',
          state: n.state || 'unverified',
          x: prev ? prev.x : spreadX,
          y: prev ? prev.y : ty + ((i % 3) - 1) * 24,
          vx: prev ? prev.vx : 0,
          vy: prev ? prev.vy : 0,
          w: 130,
          h: 30
        };
      });
      const nodeById = new Map(nodes.map(n => [n.id, n]));
      links = (data.links || [])
        .map(l => ({
          source: nodeById.get(l.source),
          target: nodeById.get(l.target),
          type: l.type || 'TRIGGERS'
        }))
        .filter(l => l.source && l.target && l.source !== l.target);

      alpha = 1;
      if (prevMap.size === 0 && nodes.length > 0) {
        cam.targetX = 0; cam.targetY = 0; cam.targetK = 1;
      }
    };

    function stepPhysics() {
      if (alpha > 0.01) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          const ty = tierTargetY(a.tier);
          a.vy += (ty - a.y) * 0.08 * alpha;
          a.vx += (0 - a.x) * 0.008 * alpha;
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = b.x - a.x || 0.1;
            let dy = b.y - a.y || 0.1;
            let dist2 = dx * dx + dy * dy;
            let minDist = (a.w + b.w) * 0.6;
            if (dist2 < minDist * minDist) dist2 = minDist * minDist;
            const force = (3400 * alpha) / dist2;
            const fx = dx * force;
            const fy = dy * force * 0.6;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        for (const l of links) {
          const dx = l.target.x - l.source.x;
          const dy = l.target.y - l.source.y;
          const dist = Math.hypot(dx, dy) || 1;
          const delta = (dist - 155) * 0.035 * alpha;
          const fx = (dx / dist) * delta;
          const fy = (dy / dist) * delta;
          l.source.vx += fx; l.source.vy += fy;
          l.target.vx -= fx; l.target.vy -= fy;
        }
        for (const n of nodes) {
          n.vx *= 0.78; n.vy *= 0.78;
          n.x += n.vx; n.y += n.vy;
        }
        alpha *= 0.97;
      }
      cam.x += (cam.targetX - cam.x) * 0.18;
      cam.y += (cam.targetY - cam.y) * 0.18;
      cam.k += (cam.targetK - cam.k) * 0.18;
    }

    function draw() {
      stepPhysics();
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      [0.33, 0.66].forEach(ratio => {
        ctx.beginPath();
        ctx.moveTo(0, height * ratio);
        ctx.lineTo(width, height * ratio);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.translate(width / 2 + cam.x, height / 2 + cam.y);
      ctx.scale(cam.k, cam.k);

      for (const l of links) {
        const s = l.source, t = l.target;
        const dx = t.x - s.x, dy = t.y - s.y;
        const cx = (s.x + t.x) / 2 - dy * 0.15;
        const cy = (s.y + t.y) / 2 + dx * 0.15;
        const color = l.type === 'INHIBITS' ? '#EF4444' : l.type === 'PREREQUISITE_OF' ? '#38BDF8' : '#475569';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6 / Math.sqrt(cam.k);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(cx, cy, t.x, t.y);
        ctx.stroke();

        const u = 0.82;
        const ax = (1 - u) * (1 - u) * s.x + 2 * (1 - u) * u * cx + u * u * t.x;
        const ay = (1 - u) * (1 - u) * s.y + 2 * (1 - u) * u * cy + u * u * t.y;
        const tx = 2 * (1 - u) * (cx - s.x) + 2 * u * (t.x - cx);
        const ty = 2 * (1 - u) * (cy - s.y) + 2 * u * (t.y - cy);
        const angle = Math.atan2(ty, tx);
        const head = 7 / Math.sqrt(cam.k);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - head * Math.cos(angle - 0.45), ay - head * Math.sin(angle - 0.45));
        ctx.lineTo(ax - head * Math.cos(angle + 0.45), ay - head * Math.sin(angle + 0.45));
        ctx.closePath();
        ctx.fill();
      }

      ctx.font = '600 12px sans-serif';
      for (const n of nodes) {
        const textW = ctx.measureText(n.name).width;
        n.w = textW + 26;
        n.h = 30;
        const x = n.x - n.w / 2;
        const y = n.y - n.h / 2;
        const r = n.h / 2;
        const isSel = n.id === selectedId;

        ctx.save();
        ctx.fillStyle = n.state === 'ghost' ? 'rgba(15, 23, 42, 0.78)' : '#0F172A';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, n.w, n.h, r);
        else ctx.rect(x, y, n.w, n.h);
        ctx.fill();

        ctx.lineWidth = isSel ? 2.6 : 1.6;
        if (n.state === 'verified') {
          ctx.strokeStyle = '#10B981';
          ctx.shadowColor = '#10B981';
          ctx.shadowBlur = isSel ? 14 : 7;
        } else if (n.state === 'ghost') {
          ctx.strokeStyle = '#64748B';
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = '#F59E0B';
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = isSel ? 12 : 5;
          ctx.setLineDash([5, 3]);
        }
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = n.state === 'ghost' ? '#94A3B8' : '#F8FAFC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.name, n.x, n.y);
      }

      ctx.restore();
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    let pointers = new Map();
    let startPan = null;
    let startPinchDist = null;
    let startK = 1;

    canvas.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        startPan = { x: e.clientX, y: e.clientY, camX: cam.targetX, camY: cam.targetY, moved: false };
      } else if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        startPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        startK = cam.targetK;
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1 && startPan) {
        const dx = e.clientX - startPan.x;
        const dy = e.clientY - startPan.y;
        if (Math.hypot(dx, dy) > 6) startPan.moved = true;
        cam.targetX = startPan.camX + dx;
        cam.targetY = startPan.camY + dy;
      } else if (pointers.size === 2 && startPinchDist) {
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        cam.targetK = Math.min(2.6, Math.max(0.45, startK * (dist / startPinchDist)));
      }
    });

    function onPointerUp(e) {
      if (pointers.size === 1 && startPan && !startPan.moved) {
        const wx = (e.clientX - width / 2 - cam.x) / cam.k;
        const wy = (e.clientY - height / 2 - cam.y) / cam.k;
        const hit = nodes.find(n => Math.abs(wx - n.x) <= n.w / 2 + 8 && Math.abs(wy - n.y) <= n.h / 2 + 8);
        if (hit) {
          selectedId = hit.id;
          cam.targetK = 1.45;
          cam.targetX = -hit.x * cam.targetK;
          cam.targetY = -hit.y * cam.targetK;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NODE_SELECTED', nodeId: hit.id }));
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

