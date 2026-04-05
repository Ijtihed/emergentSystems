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

    const grid = new Int32Array(W * H);
    const statusEl = document.getElementById('status');
    const dropVal = document.getElementById('dropVal');

    const colors = [
        [8, 8, 8],
        [40, 70, 120],
        [70, 130, 180],
        [140, 190, 220],
    ];

    let dropAmount = 1000;
    let toppling = false;

    document.getElementById('dropAmount').addEventListener('input', (e) => {
        const v = +e.target.value;
        dropAmount = Math.pow(10, v);
        dropVal.textContent = dropAmount >= 1000 ? (dropAmount / 1000) + 'k' : dropAmount;
    });

    function drop(x, y, amount) {
        if (x >= 0 && x < W && y >= 0 && y < H) {
            grid[y * W + x] += amount;
            toppling = true;
        }
    }

    function topplePass() {
        let didTopple = false;
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                const i = y * W + x;
                if (grid[i] >= 4) {
                    const give = (grid[i] / 4) | 0;
                    grid[i] -= give * 4;
                    grid[i - 1] += give;
                    grid[i + 1] += give;
                    grid[i - W] += give;
                    grid[i + W] += give;
                    didTopple = true;
                }
            }
        }
        // Drain edges
        for (let x = 0; x < W; x++) { grid[x] = Math.min(grid[x], 3); grid[(H - 1) * W + x] = Math.min(grid[(H - 1) * W + x], 3); }
        for (let y = 0; y < H; y++) { grid[y * W] = Math.min(grid[y * W], 3); grid[y * W + W - 1] = Math.min(grid[y * W + W - 1], 3); }
        return didTopple;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const v = Math.min(3, grid[i]);
            const c = colors[v];
            const j = i << 2;
            px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
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
        drop(p.x, p.y, dropAmount);
    });

    document.getElementById('centerBtn').addEventListener('click', () => {
        drop(W / 2 | 0, H / 2 | 0, dropAmount);
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
        const n = 10 + (Math.random() * 30) | 0;
        for (let i = 0; i < n; i++) {
            drop((Math.random() * W) | 0, (Math.random() * H) | 0, (dropAmount / n) | 0);
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        grid.fill(0);
        toppling = false;
    });

    function loop() {
        tickFps();
        if (toppling) {
            let passes = 0;
            const maxPasses = 200;
            while (passes < maxPasses && topplePass()) passes++;
            if (passes === 0) {
                toppling = false;
                statusEl.textContent = 'stable';
            } else {
                statusEl.textContent = 'toppling...';
            }
        }
        render();
        requestAnimationFrame(loop);
    }

    loop();
})();
