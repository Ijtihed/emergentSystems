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

    // McCabe multi-scale Turing pattern algorithm
    // Each scale has: activator radius (small), inhibitor radius (large), step amount
    const defaultScales = [
        { act: 2,  inh: 6,   step: 0.05 },
        { act: 4,  inh: 12,  step: 0.04 },
        { act: 8,  inh: 24,  step: 0.03 },
        { act: 12, inh: 36,  step: 0.025 },
        { act: 20, inh: 60,  step: 0.02 }
    ];

    let numScales = 5;
    let stepMul = 1.0;
    let paused = false;
    let grid = new Float32Array(W * H);
    let tmp1 = new Float32Array(W * H);
    let tmp2 = new Float32Array(W * H);

    function randomize() {
        for (let i = 0; i < W * H; i++) grid[i] = Math.random() * 2 - 1;
    }

    // 3-pass box blur approximation of Gaussian
    function boxBlur(src, dst, radius) {
        if (radius < 1) { dst.set(src); return; }
        const r = Math.min(radius, Math.min(W, H) / 2 - 1) | 0;
        const d = 2 * r + 1;
        const inv = 1 / d;

        // Horizontal pass: src -> tmp1
        for (let y = 0; y < H; y++) {
            let sum = 0;
            for (let x = -r; x <= r; x++) sum += src[y * W + ((x + W) % W)];
            for (let x = 0; x < W; x++) {
                tmp1[y * W + x] = sum * inv;
                sum += src[y * W + ((x + r + 1) % W)] - src[y * W + ((x - r + W) % W)];
            }
        }

        // Vertical pass: tmp1 -> dst
        for (let x = 0; x < W; x++) {
            let sum = 0;
            for (let y = -r; y <= r; y++) sum += tmp1[((y + H) % H) * W + x];
            for (let y = 0; y < H; y++) {
                dst[y * W + x] = sum * inv;
                sum += tmp1[((y + r + 1) % H) * W + x] - tmp1[((y - r + H) % H) * W + x];
            }
        }
    }

    function multiBoxBlur(src, dst, radius) {
        boxBlur(src, tmp2, radius);
        boxBlur(tmp2, dst, radius);
        boxBlur(dst, tmp2, radius);
        dst.set(tmp2);
    }

    function step() {
        const scales = defaultScales.slice(0, numScales);
        const actBlurs = scales.map(() => new Float32Array(W * H));
        const inhBlurs = scales.map(() => new Float32Array(W * H));

        for (let s = 0; s < scales.length; s++) {
            multiBoxBlur(grid, actBlurs[s], scales[s].act);
            multiBoxBlur(grid, inhBlurs[s], scales[s].inh);
        }

        for (let i = 0; i < W * H; i++) {
            let bestScale = 0;
            let bestVar = Infinity;

            for (let s = 0; s < scales.length; s++) {
                const diff = Math.abs(actBlurs[s][i] - inhBlurs[s][i]);
                if (diff < bestVar) {
                    bestVar = diff;
                    bestScale = s;
                }
            }

            const act = actBlurs[bestScale][i];
            const inh = inhBlurs[bestScale][i];
            const stepAmt = scales[bestScale].step * stepMul;
            grid[i] += act > inh ? stepAmt : -stepAmt;

            if (grid[i] > 1) grid[i] = 1;
            if (grid[i] < -1) grid[i] = -1;
        }
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const v = (grid[i] + 1) * 0.5;
            const j = i << 2;
            px[j]     = (v * v * 200) | 0;
            px[j + 1] = (v * 210) | 0;
            px[j + 2] = (v * 230) | 0;
            px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    const statusEl = document.getElementById('status');

    document.getElementById('numScales').addEventListener('input', (e) => { numScales = +e.target.value; });
    document.getElementById('speed').addEventListener('input', (e) => { stepMul = +e.target.value / 5; });
    document.getElementById('randomBtn').addEventListener('click', randomize);
    document.getElementById('pauseBtn').addEventListener('click', () => {
        paused = !paused;
        document.getElementById('pauseBtn').textContent = paused ? 'play' : 'pause';
        document.getElementById('pauseBtn').classList.toggle('active', paused);
    });

    function loop() {
        tickFps();
        if (!paused) step();
        render();
        statusEl.textContent = paused ? 'paused' : numScales + ' scales';
        requestAnimationFrame(loop);
    }

    randomize();
    loop();
})();
