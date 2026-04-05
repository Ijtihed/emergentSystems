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
        const p = canvas.parentElement, pw = p.clientWidth - 16, ph = p.clientHeight - 16;
        if (pw <= 0 || ph <= 0) return;
        const s = Math.min(pw / W, ph / H);
        canvas.style.width = Math.floor(W * s) + 'px';
        canvas.style.height = Math.floor(H * s) + 'px';
    }
    window.addEventListener('resize', fitCanvas);
    setTimeout(fitCanvas, 30);
    requestAnimationFrame(fitCanvas);

    // Niemeyer-Pietronero-Wiesmann 1984: Dielectric Breakdown Model
    // conductor[i] = 0 (dielectric) or generation number (conductor)
    const conductor = new Uint16Array(W * H);
    const potential = new Float32Array(W * H);
    let eta = 1.5;
    let stepsPerFrame = 3;
    let totalGrown = 0;
    let generation = 0;
    const statusEl = document.getElementById('status');

    function placeSeed(x, y) {
        if (x >= 0 && x < W && y >= 0 && y < H && conductor[y * W + x] === 0) {
            generation++;
            conductor[y * W + x] = generation;
            totalGrown++;
        }
    }

    function init() {
        conductor.fill(0);
        potential.fill(0);
        generation = 0;
        totalGrown = 0;
        placeSeed(W / 2 | 0, H / 2 | 0);
        // Set boundary potential to 1
        for (let x = 0; x < W; x++) { potential[x] = 1; potential[(H - 1) * W + x] = 1; }
        for (let y = 0; y < H; y++) { potential[y * W] = 1; potential[y * W + W - 1] = 1; }
    }

    // Laplace relaxation: iterate potential field
    function relaxPotential(iters) {
        for (let iter = 0; iter < iters; iter++) {
            for (let y = 1; y < H - 1; y++) {
                for (let x = 1; x < W - 1; x++) {
                    const idx = y * W + x;
                    if (conductor[idx] > 0) { potential[idx] = 0; continue; }
                    potential[idx] = (potential[idx - 1] + potential[idx + 1] +
                                      potential[idx - W] + potential[idx + W]) * 0.25;
                }
            }
        }
    }

    // Find boundary candidates (empty cells adjacent to conductor)
    function getBoundary() {
        const boundary = [];
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const idx = y * W + x;
                if (conductor[idx] > 0) continue;
                // Check if adjacent to conductor
                if (conductor[idx - 1] > 0 || conductor[idx + 1] > 0 ||
                    conductor[idx - W] > 0 || conductor[idx + W] > 0) {
                    // Electric field ~ gradient of potential at this point
                    const grad = Math.abs(potential[idx]); // potential at conductor = 0, so field ~ potential here
                    if (grad > 0) boundary.push({ x, y, prob: Math.pow(grad, eta) });
                }
            }
        }
        return boundary;
    }

    function growStep() {
        relaxPotential(15);
        const boundary = getBoundary();
        if (boundary.length === 0) return;

        // Weighted random selection
        let totalProb = 0;
        for (const b of boundary) totalProb += b.prob;
        if (totalProb <= 0) return;

        let r = Math.random() * totalProb;
        for (const b of boundary) {
            r -= b.prob;
            if (r <= 0) {
                placeSeed(b.x, b.y);
                return;
            }
        }
        // Fallback
        const last = boundary[boundary.length - 1];
        placeSeed(last.x, last.y);
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        const maxGen = Math.max(1, generation);
        for (let i = 0; i < W * H; i++) {
            const j = i << 2;
            if (conductor[i] > 0) {
                const t = conductor[i] / maxGen;
                px[j] = (80 + t * 120) | 0;
                px[j + 1] = (140 + t * 80) | 0;
                px[j + 2] = (200 + t * 30) | 0;
            } else {
                px[j] = 8; px[j + 1] = 8; px[j + 2] = 8;
            }
            px[j + 3] = 255;
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
        placeSeed(p.x, p.y);
    });

    document.getElementById('eta').addEventListener('input', (e) => {
        eta = +e.target.value / 10;
        document.getElementById('etaVal').textContent = eta.toFixed(1);
    });
    document.getElementById('steps').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() {
        tickFps();
        for (let i = 0; i < stepsPerFrame; i++) growStep();
        render();
        statusEl.textContent = totalGrown + ' cells';
        requestAnimationFrame(loop);
    }

    init();
    loop();
})();
