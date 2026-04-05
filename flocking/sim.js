(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 200, H = 200;
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

    // Chatterjee et al. 2025: discrete flocking with non-reciprocal interactions
    // Two species on a lattice, each particle has a spin/heading (+1 or -1)
    // Species A aligns with B, species B anti-aligns with A (non-reciprocal)

    // Grid: 0 = empty, 1 = species A heading right, 2 = species A heading left
    //        3 = species B heading right, 4 = species B heading left
    const EMPTY = 0, AR = 1, AL = 2, BR = 3, BL = 4;

    let grid = new Uint8Array(W * H);
    let buf = new Uint8Array(W * H);
    let coupling = -0.6; // negative = anti-alignment for B toward A
    let noise = 0.2;
    let densityPct = 40;

    function isA(v) { return v === AR || v === AL; }
    function isB(v) { return v === BR || v === BL; }
    function spinOf(v) { return (v === AR || v === BR) ? 1 : -1; }

    function init() {
        grid.fill(EMPTY);
        const totalCells = W * H;
        const numParticles = (totalCells * densityPct / 100) | 0;
        const half = numParticles / 2 | 0;
        const indices = [];
        for (let i = 0; i < totalCells; i++) indices.push(i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        for (let i = 0; i < half; i++) {
            grid[indices[i]] = Math.random() < 0.5 ? AR : AL;
        }
        for (let i = half; i < numParticles; i++) {
            grid[indices[i]] = Math.random() < 0.5 ? BR : BL;
        }
    }

    function step() {
        buf.set(grid);

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = y * W + x;
                const cur = grid[idx];
                if (cur === EMPTY) continue;

                // Count local spins for each species in Moore neighborhood
                let sumA = 0, sumB = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = (x + dx + W) % W;
                        const ny = (y + dy + H) % H;
                        const nv = grid[ny * W + nx];
                        if (isA(nv)) sumA += spinOf(nv);
                        if (isB(nv)) sumB += spinOf(nv);
                    }
                }

                // Compute alignment field for this particle
                let field;
                if (isA(cur)) {
                    // A aligns with both A and B (reciprocal with A, coupled with B)
                    field = sumA + sumB;
                } else {
                    // B aligns with B but anti-aligns with A (non-reciprocal)
                    field = sumB + coupling * sumA;
                }

                // Update spin: align with field + noise
                const curSpin = spinOf(cur);
                let newSpin;
                if (Math.random() < noise) {
                    newSpin = Math.random() < 0.5 ? 1 : -1;
                } else {
                    newSpin = field >= 0 ? 1 : -1;
                }

                // Biased diffusion: move in spin direction
                const moveDir = newSpin > 0 ? 1 : -1;
                const newX = (x + moveDir + W) % W;
                const newIdx = y * W + newX;

                const newState = isA(cur) ? (newSpin > 0 ? AR : AL) : (newSpin > 0 ? BR : BL);

                if (buf[newIdx] === EMPTY) {
                    buf[newIdx] = newState;
                    buf[idx] = EMPTY;
                } else {
                    buf[idx] = newState;
                }
            }
        }
        const tmp = grid; grid = buf; buf = tmp;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const v = grid[i];
            const j = i << 2;
            if (v === AR) { px[j] = 90; px[j+1] = 160; px[j+2] = 240; }
            else if (v === AL) { px[j] = 50; px[j+1] = 100; px[j+2] = 180; }
            else if (v === BR) { px[j] = 230; px[j+1] = 100; px[j+2] = 80; }
            else if (v === BL) { px[j] = 170; px[j+1] = 60; px[j+2] = 50; }
            else { px[j] = 8; px[j+1] = 8; px[j+2] = 8; }
            px[j+3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    document.getElementById('coupling').addEventListener('input', (e) => { coupling = +e.target.value / 100; });
    document.getElementById('noise').addEventListener('input', (e) => { noise = +e.target.value / 100; });
    document.getElementById('density').addEventListener('input', (e) => { densityPct = +e.target.value; init(); });
    document.getElementById('randomBtn').addEventListener('click', init);
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
