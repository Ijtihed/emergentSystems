(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 256, H = 256;
    canvas.width = W; canvas.height = H;

    function fitCanvas() {
        const p = canvas.parentElement;
        const pw = p.clientWidth - 16, ph = p.clientHeight - 16;
        if (pw <= 0 || ph <= 0) return;
        const s = Math.min(pw / W, ph / H);
        canvas.style.width = Math.floor(W * s) + 'px';
        canvas.style.height = Math.floor(H * s) + 'px';
    }
    window.addEventListener('resize', fitCanvas);
    setTimeout(fitCanvas, 30);
    requestAnimationFrame(fitCanvas);

    let grid = new Uint8Array(W * H);
    let buf = new Uint8Array(W * H);

    function makeRing(innerR, outerR) {
        const offsets = [];
        const or2 = outerR * outerR, ir2 = innerR * innerR;
        for (let dy = -outerR; dy <= outerR; dy++) {
            for (let dx = -outerR; dx <= outerR; dx++) {
                const d2 = dx * dx + dy * dy;
                if (d2 >= ir2 && d2 <= or2) offsets.push(dy * W + dx);
            }
        }
        return offsets;
    }

    const presets = [
        { // 0: mitosis blobs
            rings: [makeRing(0, 3), makeRing(6, 10)],
            rules: [
                { n: 0, lo: 0.210, hi: 0.220, v: 1 },
                { n: 0, lo: 0.350, hi: 0.500, v: 0 },
                { n: 0, lo: 0.750, hi: 0.850, v: 0 },
                { n: 1, lo: 0.100, hi: 0.280, v: 0 },
                { n: 1, lo: 0.430, hi: 0.550, v: 1 },
                { n: 0, lo: 0.120, hi: 0.150, v: 0 }
            ]
        },
        { // 1: worms
            rings: [makeRing(0, 3), makeRing(6, 10)],
            rules: [
                { n: 0, lo: 0.185, hi: 0.200, v: 1 },
                { n: 0, lo: 0.343, hi: 0.580, v: 0 },
                { n: 0, lo: 0.750, hi: 0.850, v: 0 },
                { n: 1, lo: 0.150, hi: 0.280, v: 0 },
                { n: 1, lo: 0.445, hi: 0.680, v: 1 },
                { n: 0, lo: 0.150, hi: 0.180, v: 0 }
            ]
        },
        { // 2: solitons
            rings: [makeRing(0, 4), makeRing(7, 12)],
            rules: [
                { n: 0, lo: 0.200, hi: 0.260, v: 1 },
                { n: 0, lo: 0.400, hi: 0.700, v: 0 },
                { n: 1, lo: 0.100, hi: 0.200, v: 0 },
                { n: 1, lo: 0.340, hi: 0.380, v: 1 },
                { n: 1, lo: 0.480, hi: 0.670, v: 1 },
                { n: 0, lo: 0.100, hi: 0.170, v: 0 }
            ]
        },
        { // 3: cell colonies
            rings: [makeRing(0, 2), makeRing(5, 9), makeRing(12, 16)],
            rules: [
                { n: 0, lo: 0.260, hi: 0.460, v: 0 },
                { n: 0, lo: 0.530, hi: 0.600, v: 0 },
                { n: 1, lo: 0.340, hi: 0.380, v: 1 },
                { n: 1, lo: 0.480, hi: 0.670, v: 1 },
                { n: 1, lo: 0.060, hi: 0.110, v: 0 },
                { n: 2, lo: 0.340, hi: 0.380, v: 1 },
                { n: 2, lo: 0.195, hi: 0.220, v: 0 },
                { n: 2, lo: 0.670, hi: 0.750, v: 0 },
                { n: 0, lo: 0.120, hi: 0.150, v: 0 }
            ]
        }
    ];

    let currentPreset = 0;
    let rings, rules;

    function loadPreset(idx) {
        currentPreset = idx;
        rings = presets[idx].rings;
        rules = presets[idx].rules;
    }

    function randomFill() {
        for (let i = 0; i < W * H; i++) grid[i] = Math.random() < 0.45 ? 1 : 0;
    }

    function init() {
        loadPreset(currentPreset);
        randomFill();
    }

    function step() {
        const avgArrays = rings.map(() => new Float32Array(W * H));
        for (let ri = 0; ri < rings.length; ri++) {
            const ring = rings[ri];
            const avg = avgArrays[ri];
            const len = ring.length;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let sum = 0;
                    for (let k = 0; k < len; k++) {
                        const off = ring[k];
                        const dy = Math.floor(off / W);
                        const dx = off - dy * W;
                        const oy = ((y + dy + H) % H);
                        const ox = ((x + dx + W) % W);
                        sum += grid[oy * W + ox];
                    }
                    avg[y * W + x] = sum / len;
                }
            }
        }

        for (let i = 0; i < W * H; i++) {
            let out = grid[i];
            for (let r = 0; r < rules.length; r++) {
                const rule = rules[r];
                const a = avgArrays[rule.n][i];
                if (a >= rule.lo && a <= rule.hi) out = rule.v;
            }
            buf[i] = out;
        }
        const tmp = grid; grid = buf; buf = tmp;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const v = grid[i] * 220;
            const j = i << 2;
            px[j] = v * 0.75; px[j + 1] = v * 0.85; px[j + 2] = v; px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    function canvasCoords(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * W | 0, y: (e.clientY - r.top) / r.height * H | 0 };
    }

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const p = canvasCoords(e);
        const rad = 8;
        for (let dy = -rad; dy <= rad; dy++) {
            for (let dx = -rad; dx <= rad; dx++) {
                if (dx * dx + dy * dy > rad * rad) continue;
                const x = (p.x + dx + W) % W, y = (p.y + dy + H) % H;
                grid[y * W + x] = Math.random() < 0.5 ? 1 : 0;
            }
        }
    });

    document.getElementById('preset').addEventListener('change', (e) => {
        loadPreset(+e.target.value);
        randomFill();
    });
    document.getElementById('randomBtn').addEventListener('click', randomFill);
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() {
        tickFps();
        step();
        render();
        requestAnimationFrame(loop);
    }

    init();
    loop();
})();
