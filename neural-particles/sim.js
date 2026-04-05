(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 800, H = 600;
    canvas.width = W; canvas.height = H;

    function fitCanvas() {
        const p = canvas.parentElement, pw = p.clientWidth - 16, ph = p.clientHeight - 16;
        if (pw <= 0 || ph <= 0) return;
        const s = Math.min(pw / W, ph / H);
        canvas.style.width = Math.floor(W * s) + 'px';
        canvas.style.height = Math.floor(H * s) + 'px';
    }
    window.addEventListener('resize', fitCanvas);
    setTimeout(fitCanvas, 30);
    requestAnimationFrame(fitCanvas);

    // Simplified NPA: particles with position, velocity, and internal state
    // Shared rule: perceive neighbors, compute field, update position + state
    // Inspired by Zhu et al. 2026 but with hand-tuned interaction rules
    const NUM = 600;
    let px = new Float32Array(NUM);
    let py = new Float32Array(NUM);
    let vx = new Float32Array(NUM);
    let vy = new Float32Array(NUM);
    let state = new Float32Array(NUM); // internal state [0,1]
    let perceptionR = 60;
    let updateRate = 0.5;

    // Presets define how the perception field maps to position/state updates
    const presets = {
        ring: { attract: -0.01, repel: 0.5, align: 0.1, stateDecay: 0.02, stateFeed: 0.05 },
        chase: { attract: 0.03, repel: 0.3, align: 0.2, stateDecay: 0.01, stateFeed: 0.08 },
        cell: { attract: -0.02, repel: 0.8, align: 0.05, stateDecay: 0.03, stateFeed: 0.03 },
        cluster: { attract: 0.05, repel: 0.2, align: 0.15, stateDecay: 0.005, stateFeed: 0.1 }
    };
    let rule = presets.ring;

    function init() {
        const cx = W / 2, cy = H / 2;
        for (let i = 0; i < NUM; i++) {
            px[i] = cx + (Math.random() - 0.5) * 300;
            py[i] = cy + (Math.random() - 0.5) * 300;
            vx[i] = (Math.random() - 0.5) * 2;
            vy[i] = (Math.random() - 0.5) * 2;
            state[i] = Math.random();
        }
    }

    function step() {
        const r2 = perceptionR * perceptionR;
        for (let i = 0; i < NUM; i++) {
            if (Math.random() > updateRate) continue; // async update per NPA

            let fx = 0, fy = 0, avgState = 0, count = 0;
            for (let j = 0; j < NUM; j++) {
                if (i === j) continue;
                const dx = px[j] - px[i], dy = py[j] - py[i];
                const d2 = dx * dx + dy * dy;
                if (d2 > r2 || d2 < 1) continue;
                const d = Math.sqrt(d2);
                count++;
                avgState += state[j];

                // Repulsion at close range, attraction at medium range
                const t = d / perceptionR;
                const force = t < 0.3 ? -rule.repel * (1 - t / 0.3) : rule.attract * (t - 0.3);
                fx += (dx / d) * force;
                fy += (dy / d) * force;

                // Alignment with neighbor velocity weighted by state similarity
                const sim = 1 - Math.abs(state[i] - state[j]);
                fx += (vx[j] - vx[i]) * rule.align * sim * 0.01;
                fy += (vy[j] - vy[i]) * rule.align * sim * 0.01;
            }

            vx[i] = (vx[i] + fx) * 0.95;
            vy[i] = (vy[i] + fy) * 0.95;
            const spd = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
            if (spd > 3) { vx[i] = (vx[i] / spd) * 3; vy[i] = (vy[i] / spd) * 3; }

            px[i] += vx[i];
            py[i] += vy[i];
            px[i] = ((px[i] % W) + W) % W;
            py[i] = ((py[i] % H) + H) % H;

            // State update: decay + feed from neighbors
            if (count > 0) {
                avgState /= count;
                state[i] += (avgState - state[i]) * rule.stateFeed;
            }
            state[i] -= rule.stateDecay;
            state[i] = Math.max(0, Math.min(1, state[i]));
        }
    }

    function render() {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < NUM; i++) {
            const s = state[i];
            const r = 60 + s * 140;
            const g = 140 + s * 80;
            const b = 200 + s * 40;
            ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
            ctx.beginPath();
            ctx.arc(px[i], py[i], 2 + s * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    document.getElementById('preset').addEventListener('change', (e) => { rule = presets[e.target.value]; });
    document.getElementById('perceptionRadius').addEventListener('input', (e) => { perceptionR = +e.target.value; });
    document.getElementById('updateRate').addEventListener('input', (e) => { updateRate = +e.target.value / 100; });
    document.getElementById('randomBtn').addEventListener('click', init);
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() { tickFps(); step(); render(); requestAnimationFrame(loop); }
    init();
    loop();
})();
