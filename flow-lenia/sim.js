(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() {
        _fc++;
        const now = performance.now();
        if (now - _ft >= 500) {
            fpsEl.textContent = ((_fc / (now - _ft)) * 1000).toFixed(0) + ' fps';
            _fc = 0; _ft = now;
        }
    }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const SIZE = 256;
    canvas.width = SIZE;
    canvas.height = SIZE;

    function fitCanvas() {
        const parent = canvas.parentElement;
        const pw = parent.clientWidth - 16;
        const ph = parent.clientHeight - 16;
        if (pw <= 0 || ph <= 0) return;
        const scale = Math.min(pw / SIZE, ph / SIZE);
        canvas.style.width = Math.floor(SIZE * scale) + 'px';
        canvas.style.height = Math.floor(SIZE * scale) + 'px';
    }
    window.addEventListener('resize', fitCanvas);
    setTimeout(fitCanvas, 30);
    requestAnimationFrame(fitCanvas);

    const N = SIZE * SIZE;
    const NUM_SPECIES = 3;

    const species = [
        { mu: 0.15, sigmaG: 0.017, kernelR: 10, kernelMu: 0.5, kernelSigma: 0.15,
          color: [90, 160, 240] },
        { mu: 0.21, sigmaG: 0.025, kernelR: 8,  kernelMu: 0.45, kernelSigma: 0.14,
          color: [230, 100, 90] },
        { mu: 0.13, sigmaG: 0.015, kernelR: 12, kernelMu: 0.55, kernelSigma: 0.18,
          color: [80, 220, 140] }
    ];

    const grids = species.map(() => new Float32Array(N));
    const gridsBuf = species.map(() => new Float32Array(N));
    const kernels = [];

    let dt = 0.1;
    let paused = false;
    let mouseDown = false;
    let brushSize = 10;
    let activeSpecies = 0;

    function buildKernel(sp) {
        const r = sp.kernelR;
        const d = 2 * r + 1;
        const data = new Float32Array(d * d);
        let sum = 0;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy) / r;
                if (dist <= 1.0) {
                    const val = Math.exp(-0.5 * Math.pow((dist - sp.kernelMu) / sp.kernelSigma, 2));
                    data[(dy + r) * d + (dx + r)] = val;
                    sum += val;
                }
            }
        }
        if (sum > 0) for (let i = 0; i < data.length; i++) data[i] /= sum;
        return { data, size: d, radius: r };
    }

    function initKernels() {
        kernels.length = 0;
        for (const sp of species) kernels.push(buildKernel(sp));
    }

    function growth(u, mu, sigma) {
        return 2.0 * Math.exp(-0.5 * Math.pow((u - mu) / sigma, 2)) - 1.0;
    }

    function convolve(grid, kernel) {
        const result = new Float32Array(N);
        const r = kernel.radius;
        const kd = kernel.size;
        const kdata = kernel.data;
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                let sum = 0;
                for (let ky = -r; ky <= r; ky++) {
                    const ny = (y + ky + SIZE) % SIZE;
                    const krow = (ky + r) * kd;
                    for (let kx = -r; kx <= r; kx++) {
                        const kv = kdata[krow + kx + r];
                        if (kv === 0) continue;
                        const nx = (x + kx + SIZE) % SIZE;
                        sum += grid[ny * SIZE + nx] * kv;
                    }
                }
                result[y * SIZE + x] = sum;
            }
        }
        return result;
    }

    function step() {
        // Flow-Lenia: gradient-based mass-conservative update (Plantec et al. 2023/2025)
        // For each species:
        //   1. Compute potential U = K * A (kernel convolution)
        //   2. Compute growth field G(U)
        //   3. Compute flow from gradient of (G * A), mass flows toward high growth
        //   4. Advect mass along flow vectors, conserving total mass

        for (let s = 0; s < NUM_SPECIES; s++) {
            const sp = species[s];
            const A = grids[s];
            const potential = convolve(A, kernels[s]);

            // Growth field
            const G = new Float32Array(N);
            for (let i = 0; i < N; i++) {
                G[i] = growth(potential[i], sp.mu, sp.sigmaG);
            }

            // Compute flow source field: G * A (growth weighted by mass)
            const GA = new Float32Array(N);
            for (let i = 0; i < N; i++) GA[i] = G[i] * A[i];

            // Compute gradient of GA to get flow vectors (fx, fy)
            const fx = new Float32Array(N);
            const fy = new Float32Array(N);
            for (let y = 0; y < SIZE; y++) {
                for (let x = 0; x < SIZE; x++) {
                    const xp = (x + 1) % SIZE;
                    const xm = (x - 1 + SIZE) % SIZE;
                    const yp = (y + 1) % SIZE;
                    const ym = (y - 1 + SIZE) % SIZE;
                    const idx = y * SIZE + x;
                    fx[idx] = (GA[y * SIZE + xp] - GA[y * SIZE + xm]) * 0.5;
                    fy[idx] = (GA[yp * SIZE + x] - GA[ym * SIZE + x]) * 0.5;
                }
            }

            // Semi-Lagrangian advection: trace backward along flow to find source
            const out = gridsBuf[s];
            for (let y = 0; y < SIZE; y++) {
                for (let x = 0; x < SIZE; x++) {
                    const idx = y * SIZE + x;
                    const srcX = x - dt * fx[idx];
                    const srcY = y - dt * fy[idx];

                    // Bilinear interpolation from source position
                    const sx = ((srcX % SIZE) + SIZE) % SIZE;
                    const sy = ((srcY % SIZE) + SIZE) % SIZE;
                    const x0 = Math.floor(sx);
                    const y0 = Math.floor(sy);
                    const x1 = (x0 + 1) % SIZE;
                    const y1 = (y0 + 1) % SIZE;
                    const dx = sx - x0;
                    const dy = sy - y0;

                    out[idx] =
                        A[y0 * SIZE + x0] * (1 - dx) * (1 - dy) +
                        A[y0 * SIZE + x1] * dx * (1 - dy) +
                        A[y1 * SIZE + x0] * (1 - dx) * dy +
                        A[y1 * SIZE + x1] * dx * dy;

                    // Also apply a small amount of direct growth for dynamics
                    out[idx] += dt * 0.1 * G[idx] * out[idx];
                    if (out[idx] < 0) out[idx] = 0;
                    if (out[idx] > 1) out[idx] = 1;
                }
            }

            const tmp = grids[s];
            grids[s] = gridsBuf[s];
            gridsBuf[s] = tmp;
        }
    }

    function render() {
        const img = ctx.createImageData(SIZE, SIZE);
        const px = img.data;
        for (let i = 0; i < N; i++) {
            let r = 0, g = 0, b = 0;
            for (let s = 0; s < NUM_SPECIES; s++) {
                const v = grids[s][i];
                const c = species[s].color;
                r += v * c[0];
                g += v * c[1];
                b += v * c[2];
            }
            const j = i << 2;
            px[j]     = Math.min(255, r) | 0;
            px[j + 1] = Math.min(255, g) | 0;
            px[j + 2] = Math.min(255, b) | 0;
            px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    function seedOrganism(cx, cy, s, radius) {
        const r2 = radius * radius;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const d2 = dx * dx + dy * dy;
                if (d2 > r2) continue;
                const x = ((cx + dx) + SIZE) % SIZE;
                const y = ((cy + dy) + SIZE) % SIZE;
                const falloff = Math.exp(-d2 / (r2 * 0.3));
                const idx = y * SIZE + x;
                grids[s][idx] = Math.min(1, grids[s][idx] + 0.8 * falloff);
            }
        }
    }

    function init() {
        for (let s = 0; s < NUM_SPECIES; s++) grids[s].fill(0);

        seedOrganism(SIZE * 0.3, SIZE * 0.3, 0, 15);
        seedOrganism(SIZE * 0.35, SIZE * 0.28, 0, 10);
        seedOrganism(SIZE * 0.7, SIZE * 0.4, 1, 12);
        seedOrganism(SIZE * 0.65, SIZE * 0.45, 1, 8);
        seedOrganism(SIZE * 0.5, SIZE * 0.7, 2, 14);
        seedOrganism(SIZE * 0.45, SIZE * 0.65, 2, 9);

        for (let s = 0; s < NUM_SPECIES; s++) {
            for (let i = 0; i < 5; i++) {
                const x = (Math.random() * SIZE) | 0;
                const y = (Math.random() * SIZE) | 0;
                seedOrganism(x, y, s, 5 + Math.random() * 8);
            }
        }
    }

    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width * SIZE) | 0,
            y: ((e.clientY - rect.top) / rect.height * SIZE) | 0
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        mouseDown = true;
        const p = canvasCoords(e);
        seedOrganism(p.x, p.y, activeSpecies, brushSize);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;
        const p = canvasCoords(e);
        seedOrganism(p.x, p.y, activeSpecies, brushSize * 0.6);
    });

    canvas.addEventListener('mouseup', () => { mouseDown = false; });
    canvas.addEventListener('mouseleave', () => { mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        brushSize = Math.max(3, Math.min(25, brushSize + (e.deltaY > 0 ? -1 : 1)));
        document.getElementById('brushSize').value = brushSize;
    });

    // Controls
    document.getElementById('species').addEventListener('change', (e) => {
        activeSpecies = +e.target.value;
    });

    document.getElementById('dt').addEventListener('input', (e) => {
        dt = +e.target.value / 100;
    });

    document.getElementById('brushSize').addEventListener('input', (e) => {
        brushSize = +e.target.value;
    });

    const statusEl = document.getElementById('status');
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.addEventListener('click', () => {
        paused = !paused;
        pauseBtn.textContent = paused ? 'play' : 'pause';
        pauseBtn.classList.toggle('active', paused);
        statusEl.textContent = paused ? 'paused' : 'running';
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        init();
    });

    function randomize() {
        for (let s = 0; s < NUM_SPECIES; s++) grids[s].fill(0);
        for (let s = 0; s < NUM_SPECIES; s++) {
            const count = 2 + (Math.random() * 6) | 0;
            for (let i = 0; i < count; i++) {
                seedOrganism(
                    (Math.random() * SIZE) | 0,
                    (Math.random() * SIZE) | 0,
                    s,
                    5 + (Math.random() * 15) | 0
                );
            }
        }
    }

    document.getElementById('randomBtn').addEventListener('click', randomize);

    let frameCount = 0;
    function loop() {
        tickFps();
        if (!paused) {
            step();
            frameCount++;
            if (frameCount % 30 === 0) {
                let masses = species.map((_, s) => {
                    let m = 0;
                    for (let i = 0; i < N; i++) m += grids[s][i];
                    return m.toFixed(0);
                });
                statusEl.textContent = `a:${masses[0]} b:${masses[1]} c:${masses[2]}`;
            }
        }
        render();
        requestAnimationFrame(loop);
    }

    initKernels();
    init();
    loop();
})();
