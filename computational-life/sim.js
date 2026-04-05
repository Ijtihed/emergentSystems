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

    // Computational Life (Aguera y Arcas et al., Google, 2024)
    // Minimal instruction set on a grid. Programs execute, read/write neighbors, copy.
    // Self-replicating programs spontaneously emerge from random soup.

    // Each cell: program of PROG_LEN instructions, instruction pointer, register
    const PROG_LEN = 16;
    const NUM_OPS = 8;
    // Ops: 0=NOP, 1=INC reg, 2=DEC reg, 3=READ neighbor[reg%4] -> reg
    //       4=WRITE reg -> neighbor[reg%4], 5=COPY self to neighbor[reg%4]
    //       6=JMP (reg steps), 7=SKIP if reg==0

    const N = W * H;
    let programs = new Uint8Array(N * PROG_LEN);
    let ip = new Uint8Array(N);   // instruction pointer per cell
    let reg = new Int8Array(N);    // register per cell
    let mutationRate = 0.001;
    let stepsPerFrame = 3;
    let totalSteps = 0;

    const DX = [1, 0, -1, 0]; // E, S, W, N
    const DY = [0, 1, 0, -1];

    function init() {
        for (let i = 0; i < N * PROG_LEN; i++) {
            programs[i] = (Math.random() * NUM_OPS) | 0;
        }
        ip.fill(0);
        reg.fill(0);
        totalSteps = 0;
    }

    function neighborIdx(x, y, dir) {
        const nx = (x + DX[dir] + W) % W;
        const ny = (y + DY[dir] + H) % H;
        return ny * W + nx;
    }

    function executeCell(x, y) {
        const idx = y * W + x;
        const base = idx * PROG_LEN;
        const op = programs[base + ip[idx]];

        switch (op) {
            case 0: break; // NOP
            case 1: reg[idx] = (reg[idx] + 1) & 0x7F; break; // INC
            case 2: reg[idx] = (reg[idx] - 1) & 0x7F; break; // DEC
            case 3: { // READ neighbor -> reg
                const dir = ((reg[idx] % 4) + 4) % 4;
                const ni = neighborIdx(x, y, dir);
                reg[idx] = programs[ni * PROG_LEN + (ip[ni] % PROG_LEN)];
                break;
            }
            case 4: { // WRITE reg -> neighbor
                const dir = ((reg[idx] % 4) + 4) % 4;
                const ni = neighborIdx(x, y, dir);
                programs[ni * PROG_LEN + (ip[ni] % PROG_LEN)] = reg[idx] % NUM_OPS;
                break;
            }
            case 5: { // COPY self to neighbor
                const dir = ((reg[idx] % 4) + 4) % 4;
                const ni = neighborIdx(x, y, dir);
                for (let k = 0; k < PROG_LEN; k++) {
                    programs[ni * PROG_LEN + k] = programs[base + k];
                }
                ip[ni] = 0;
                reg[ni] = 0;
                break;
            }
            case 6: { // JMP
                ip[idx] = (ip[idx] + reg[idx]) % PROG_LEN;
                if (ip[idx] < 0) ip[idx] += PROG_LEN;
                return; // skip normal IP advance
            }
            case 7: { // SKIP if reg == 0
                if (reg[idx] === 0) ip[idx] = (ip[idx] + 1) % PROG_LEN;
                break;
            }
        }

        ip[idx] = (ip[idx] + 1) % PROG_LEN;

        // Mutation
        if (Math.random() < mutationRate) {
            const pos = (Math.random() * PROG_LEN) | 0;
            programs[base + pos] = (Math.random() * NUM_OPS) | 0;
        }
    }

    const order = new Int32Array(N);
    for (let i = 0; i < N; i++) order[i] = i;

    function step() {
        for (let i = N - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            const t = order[i]; order[i] = order[j]; order[j] = t;
        }
        for (let i = 0; i < N; i++) {
            const idx = order[i];
            executeCell(idx % W, (idx / W) | 0);
        }
        totalSteps++;
    }

    // Color by program hash to visualize replicator spread
    function progHash(idx) {
        let h = 0;
        const base = idx * PROG_LEN;
        for (let k = 0; k < PROG_LEN; k++) {
            h = ((h << 3) | (h >>> 29)) ^ (programs[base + k] * 2654435761);
        }
        return h >>> 0;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < N; i++) {
            const h = progHash(i);
            const j = i << 2;
            px[j] = ((h & 0xFF) * 0.5 + 40) | 0;
            px[j + 1] = (((h >> 8) & 0xFF) * 0.5 + 40) | 0;
            px[j + 2] = (((h >> 16) & 0xFF) * 0.5 + 60) | 0;
            px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    const statusEl = document.getElementById('status');
    document.getElementById('mutationRate').addEventListener('input', (e) => { mutationRate = Math.pow(10, -4 + +e.target.value / 25); });
    document.getElementById('stepsPerFrame').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('randomBtn').addEventListener('click', init);
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() {
        tickFps();
        for (let i = 0; i < stepsPerFrame; i++) step();
        render();
        statusEl.textContent = 'step ' + totalSteps;
        requestAnimationFrame(loop);
    }

    init();
    loop();
})();
