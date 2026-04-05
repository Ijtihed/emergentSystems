(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 300, H = 300;
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

    let numColors = 14;
    let threshold = 1;
    let useMoore = true;
    let ghMode = false;
    let grid = new Uint8Array(W * H);
    let buf = new Uint8Array(W * H);

    // Precompute a nice HSL palette
    let palette = [];
    function buildPalette() {
        palette = [];
        for (let i = 0; i < numColors; i++) {
            const h = (i / numColors) * 360;
            const r = Math.round(128 + 127 * Math.cos((h) * Math.PI / 180));
            const g = Math.round(128 + 127 * Math.cos((h - 120) * Math.PI / 180));
            const b = Math.round(128 + 127 * Math.cos((h - 240) * Math.PI / 180));
            palette.push([r, g, b]);
        }
    }

    function randomFill() {
        for (let i = 0; i < W * H; i++) grid[i] = (Math.random() * numColors) | 0;
    }

    function init() {
        buildPalette();
        randomFill();
    }

    function step() {
        const N = numColors;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = y * W + x;
                const cur = grid[idx];

                if (ghMode && cur > 0) {
                    // Greenberg-Hastings: non-zero states auto-advance
                    buf[idx] = (cur + 1) % N;
                    continue;
                }

                // Count neighbors with successor color
                const succ = (cur + 1) % N;
                let count = 0;

                if (useMoore) {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = (x + dx + W) % W;
                            const ny = (y + dy + H) % H;
                            if (grid[ny * W + nx] === succ) count++;
                        }
                    }
                } else {
                    // Von Neumann (4 neighbors)
                    if (grid[((y - 1 + H) % H) * W + x] === succ) count++;
                    if (grid[((y + 1) % H) * W + x] === succ) count++;
                    if (grid[y * W + ((x - 1 + W) % W)] === succ) count++;
                    if (grid[y * W + ((x + 1) % W)] === succ) count++;
                }

                buf[idx] = count >= threshold ? succ : cur;
            }
        }
        const tmp = grid; grid = buf; buf = tmp;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const c = palette[grid[i] % palette.length];
            const j = i << 2;
            px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    const numColorsVal = document.getElementById('numColorsVal');
    document.getElementById('numColors').addEventListener('input', (e) => {
        numColors = +e.target.value;
        numColorsVal.textContent = numColors;
        buildPalette();
        randomFill();
    });
    document.getElementById('threshold').addEventListener('input', (e) => { threshold = +e.target.value; });
    document.getElementById('neighborhood').addEventListener('change', (e) => {
        useMoore = e.target.value === 'moore';
        randomFill();
    });
    document.getElementById('ghBtn').addEventListener('click', () => {
        ghMode = !ghMode;
        document.getElementById('ghBtn').classList.toggle('active', ghMode);
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
