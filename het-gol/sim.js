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

    // Heterogeneous Evolving GoL (Plantec et al. 2024, arXiv:2406.13383)
    // Each cell: alive (0/1), birth rule (bitmask 0-8), survival rule (bitmask 0-8), energy
    // Per-cell rule that mutates on reproduction
    const N = W * H;
    let alive = new Uint8Array(N);
    let aliveBuf = new Uint8Array(N);
    let birthRule = new Uint16Array(N);   // bitmask: bit i set = birth with i neighbors
    let survivalRule = new Uint16Array(N); // bitmask: bit i set = survive with i neighbors
    let energy = new Float32Array(N);
    let birthBuf = new Uint16Array(N);
    let survivalBuf = new Uint16Array(N);
    let energyBuf = new Float32Array(N);
    let ruleColor = new Uint32Array(N); // hash of rule for coloring

    let mutationRate = 0.05;
    let energyGain = 0.1;
    let stepsPerFrame = 1;

    function ruleHash(b, s) {
        return ((b * 2654435761) ^ (s * 340573321)) >>> 0;
    }

    function hashToColor(h) {
        return [(h & 0xFF), ((h >> 8) & 0xFF), ((h >> 16) & 0xFF)];
    }

    function randomRule() {
        let b = 0, s = 0;
        for (let i = 0; i <= 8; i++) {
            if (Math.random() < 0.3) b |= (1 << i);
            if (Math.random() < 0.3) s |= (1 << i);
        }
        return { b, s };
    }

    function mutateRule(b, s) {
        let nb = b, ns = s;
        for (let i = 0; i <= 8; i++) {
            if (Math.random() < mutationRate) nb ^= (1 << i);
            if (Math.random() < mutationRate) ns ^= (1 << i);
        }
        return { b: nb, s: ns };
    }

    function init() {
        for (let i = 0; i < N; i++) {
            alive[i] = Math.random() < 0.3 ? 1 : 0;
            const r = randomRule();
            birthRule[i] = r.b;
            survivalRule[i] = r.s;
            energy[i] = alive[i] ? 0.5 : 0;
            ruleColor[i] = ruleHash(r.b, r.s);
        }
    }

    function step() {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = y * W + x;
                let count = 0;
                // Find the most energetic alive neighbor for inheritance
                let bestNeighborIdx = -1, bestEnergy = -1;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = (x + dx + W) % W;
                        const ny = (y + dy + H) % H;
                        const ni = ny * W + nx;
                        if (alive[ni]) {
                            count++;
                            if (energy[ni] > bestEnergy) {
                                bestEnergy = energy[ni];
                                bestNeighborIdx = ni;
                            }
                        }
                    }
                }

                if (alive[idx]) {
                    // Survival check using this cell's own rule
                    if (survivalRule[idx] & (1 << count)) {
                        aliveBuf[idx] = 1;
                        energyBuf[idx] = energy[idx] + energyGain;
                        birthBuf[idx] = birthRule[idx];
                        survivalBuf[idx] = survivalRule[idx];
                    } else {
                        aliveBuf[idx] = 0;
                        energyBuf[idx] = 0;
                        birthBuf[idx] = birthRule[idx];
                        survivalBuf[idx] = survivalRule[idx];
                    }
                } else {
                    // Birth check: use the most energetic neighbor's rule
                    if (bestNeighborIdx >= 0 && (birthRule[bestNeighborIdx] & (1 << count))) {
                        aliveBuf[idx] = 1;
                        // Inherit rule with mutation
                        const m = mutateRule(birthRule[bestNeighborIdx], survivalRule[bestNeighborIdx]);
                        birthBuf[idx] = m.b;
                        survivalBuf[idx] = m.s;
                        energyBuf[idx] = 0.5;
                    } else {
                        aliveBuf[idx] = 0;
                        energyBuf[idx] = 0;
                        birthBuf[idx] = birthRule[idx];
                        survivalBuf[idx] = survivalRule[idx];
                    }
                }
                ruleColor[idx] = ruleHash(birthBuf[idx], survivalBuf[idx]);
            }
        }
        let tmp;
        tmp = alive; alive = aliveBuf; aliveBuf = tmp;
        tmp = birthRule; birthRule = birthBuf; birthBuf = tmp;
        tmp = survivalRule; survivalRule = survivalBuf; survivalBuf = tmp;
        tmp = energy; energy = energyBuf; energyBuf = tmp;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < N; i++) {
            const j = i << 2;
            if (alive[i]) {
                const c = hashToColor(ruleColor[i]);
                px[j] = Math.min(255, c[0] * 0.5 + 80);
                px[j + 1] = Math.min(255, c[1] * 0.5 + 60);
                px[j + 2] = Math.min(255, c[2] * 0.5 + 80);
            } else {
                px[j] = 8; px[j + 1] = 8; px[j + 2] = 8;
            }
            px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    document.getElementById('mutationRate').addEventListener('input', (e) => { mutationRate = +e.target.value / 100; });
    document.getElementById('energyGain').addEventListener('input', (e) => { energyGain = +e.target.value / 100; });
    document.getElementById('speed').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('randomBtn').addEventListener('click', init);
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() {
        tickFps();
        for (let i = 0; i < stepsPerFrame; i++) step();
        render();
        requestAnimationFrame(loop);
    }
    init();
    loop();
})();
