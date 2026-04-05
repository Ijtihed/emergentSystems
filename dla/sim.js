(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 400, H = 400;
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

    // Witten-Sander 1981: DLA
    // grid[i] = 0 (empty) or seed color (1-based index)
    const grid = new Uint8Array(W * H);
    let seedCount = 0;
    let walkersPerFrame = 5;
    let stickiness = 1.0;
    let biasX = 0, biasY = 0;
    let totalStuck = 0;

    const seedColors = [
        [140, 190, 220],
        [220, 130, 90],
        [90, 200, 140],
        [200, 180, 80],
        [180, 110, 200]
    ];

    function placeSeed(x, y) {
        if (x >= 0 && x < W && y >= 0 && y < H && grid[y * W + x] === 0) {
            seedCount++;
            grid[y * W + x] = seedCount;
            totalStuck++;
        }
    }

    function hasNeighbor(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < W && ny >= 0 && ny < H && grid[ny * W + nx] > 0) {
                    return grid[ny * W + nx];
                }
            }
        }
        return 0;
    }

    function spawnWalker() {
        // Spawn on a random edge
        const side = (Math.random() * 4) | 0;
        let x, y;
        if (side === 0) { x = (Math.random() * W) | 0; y = 0; }
        else if (side === 1) { x = (Math.random() * W) | 0; y = H - 1; }
        else if (side === 2) { x = 0; y = (Math.random() * H) | 0; }
        else { x = W - 1; y = (Math.random() * H) | 0; }
        return { x, y };
    }

    function walkAndStick() {
        const w = spawnWalker();
        const maxSteps = W * H;
        for (let s = 0; s < maxSteps; s++) {
            // Random walk with optional bias
            const dx = ((Math.random() * 3) | 0) - 1 + biasX;
            const dy = ((Math.random() * 3) | 0) - 1 + biasY;
            w.x = Math.max(0, Math.min(W - 1, w.x + (dx > 0 ? 1 : dx < 0 ? -1 : 0)));
            w.y = Math.max(0, Math.min(H - 1, w.y + (dy > 0 ? 1 : dy < 0 ? -1 : 0)));

            const neighbor = hasNeighbor(w.x, w.y);
            if (neighbor > 0 && grid[w.y * W + w.x] === 0) {
                if (Math.random() < stickiness) {
                    grid[w.y * W + w.x] = neighbor;
                    totalStuck++;
                    return;
                }
            }

            // Kill walker if it reaches edge again
            if (w.x <= 0 || w.x >= W - 1 || w.y <= 0 || w.y >= H - 1) {
                if (s > 100) return;
            }
        }
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const v = grid[i];
            const j = i << 2;
            if (v > 0) {
                const c = seedColors[(v - 1) % seedColors.length];
                px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2];
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

    document.getElementById('walkers').addEventListener('input', (e) => {
        walkersPerFrame = +e.target.value;
    });
    document.getElementById('stickiness').addEventListener('input', (e) => {
        stickiness = +e.target.value / 100;
    });
    document.getElementById('bias').addEventListener('change', (e) => {
        biasX = 0; biasY = 0;
        if (e.target.value === 'up') biasY = -0.3;
        else if (e.target.value === 'down') biasY = 0.3;
        else if (e.target.value === 'left') biasX = -0.3;
        else if (e.target.value === 'right') biasX = 0.3;
    });
    document.getElementById('multiSeedBtn').addEventListener('click', () => {
        const n = 3 + (Math.random() * 4) | 0;
        for (let i = 0; i < n; i++) {
            placeSeed((Math.random() * (W - 40) + 20) | 0, (Math.random() * (H - 40) + 20) | 0);
        }
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        grid.fill(0); seedCount = 0; totalStuck = 0;
        placeSeed(W / 2 | 0, H / 2 | 0);
    });

    const statusEl = document.getElementById('status');

    function loop() {
        tickFps();
        for (let i = 0; i < walkersPerFrame; i++) walkAndStick();
        render();
        statusEl.textContent = totalStuck + ' particles';
        requestAnimationFrame(loop);
    }

    placeSeed(W / 2 | 0, H / 2 | 0);
    loop();
})();
