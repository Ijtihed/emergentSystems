(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 200, H = 150;
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

    // States: 0=empty, 1=wire, 2=head, 3=tail
    const EMPTY = 0, WIRE = 1, HEAD = 2, TAIL = 3;
    const colors = [[8, 8, 8], [50, 55, 65], [90, 170, 230], [230, 130, 60]];

    let grid = new Uint8Array(W * H);
    let buf = new Uint8Array(W * H);
    let playing = false;
    let drawing = false;
    let tool = 'wire';
    const statusEl = document.getElementById('status');

    function step() {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                const s = grid[i];
                if (s === EMPTY) { buf[i] = EMPTY; continue; }
                if (s === HEAD) { buf[i] = TAIL; continue; }
                if (s === TAIL) { buf[i] = WIRE; continue; }
                // Wire: count head neighbors
                let heads = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                            if (grid[ny * W + nx] === HEAD) heads++;
                        }
                    }
                }
                buf[i] = (heads === 1 || heads === 2) ? HEAD : WIRE;
            }
        }
        const tmp = grid; grid = buf; buf = tmp;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const c = colors[grid[i]];
            const j = i << 2;
            px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    // Presets
    function drawLine(x0, y0, x1, y1, state) {
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        while (true) {
            if (x0 >= 0 && x0 < W && y0 >= 0 && y0 < H) grid[y0 * W + x0] = state;
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    const presetBuilders = {
        empty() { grid.fill(EMPTY); },
        clock() {
            grid.fill(EMPTY);
            const cx = 30, cy = H / 2 | 0;
            for (let x = cx; x < cx + 50; x++) grid[cy * W + x] = WIRE;
            grid[cy * W + cx] = HEAD;
            grid[cy * W + cx + 1] = TAIL;
            // Loop back
            for (let y = cy - 3; y <= cy + 3; y++) { grid[y * W + cx] = WIRE; grid[y * W + cx + 49] = WIRE; }
            for (let x = cx; x <= cx + 49; x++) { grid[(cy - 3) * W + x] = WIRE; grid[(cy + 3) * W + x] = WIRE; }
        },
        diode() {
            grid.fill(EMPTY);
            const cy = H / 2 | 0;
            for (let x = 20; x < 90; x++) grid[cy * W + x] = WIRE;
            // Diode: one-way gate
            grid[cy * W + 50] = EMPTY;
            grid[(cy - 1) * W + 50] = WIRE;
            grid[(cy + 1) * W + 50] = WIRE;
            grid[(cy - 1) * W + 51] = WIRE;
            grid[(cy + 1) * W + 51] = WIRE;
            grid[cy * W + 51] = WIRE;
            grid[cy * W + 20] = HEAD;
            grid[cy * W + 21] = TAIL;
        },
        and() {
            grid.fill(EMPTY);
            const cy = H / 2 | 0;
            // Two input wires
            for (let x = 20; x < 60; x++) { grid[(cy - 8) * W + x] = WIRE; grid[(cy + 8) * W + x] = WIRE; }
            // Junction
            for (let y = cy - 8; y <= cy + 8; y++) grid[y * W + 60] = WIRE;
            // Output wire
            for (let x = 60; x < 100; x++) grid[cy * W + x] = WIRE;
            // Place electrons
            grid[(cy - 8) * W + 22] = HEAD; grid[(cy - 8) * W + 23] = TAIL;
            grid[(cy + 8) * W + 22] = HEAD; grid[(cy + 8) * W + 23] = TAIL;
        },
        or() {
            grid.fill(EMPTY);
            const cy = H / 2 | 0;
            for (let x = 20; x < 55; x++) { grid[(cy - 6) * W + x] = WIRE; grid[(cy + 6) * W + x] = WIRE; }
            grid[(cy - 5) * W + 55] = WIRE; grid[(cy - 4) * W + 55] = WIRE;
            grid[(cy + 5) * W + 55] = WIRE; grid[(cy + 4) * W + 55] = WIRE;
            grid[(cy - 3) * W + 56] = WIRE; grid[(cy + 3) * W + 56] = WIRE;
            for (let y = cy - 2; y <= cy + 2; y++) grid[y * W + 57] = WIRE;
            for (let x = 57; x < 100; x++) grid[cy * W + x] = WIRE;
            grid[(cy - 6) * W + 22] = HEAD; grid[(cy - 6) * W + 23] = TAIL;
        }
    };

    function canvasCoords(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * W | 0, y: (e.clientY - r.top) / r.height * H | 0 };
    }

    function paint(e) {
        const p = canvasCoords(e);
        if (p.x < 0 || p.x >= W || p.y < 0 || p.y >= H) return;
        const t = e.shiftKey ? 'head' : (e.button === 2 ? 'erase' : tool);
        const val = t === 'wire' ? WIRE : t === 'head' ? HEAD : EMPTY;
        grid[p.y * W + p.x] = val;
    }

    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); drawing = true; paint(e); });
    canvas.addEventListener('mousemove', (e) => { if (drawing) paint(e); });
    canvas.addEventListener('mouseup', () => { drawing = false; });
    canvas.addEventListener('mouseleave', () => { drawing = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    });

    function togglePlay() {
        playing = !playing;
        document.getElementById('playBtn').textContent = playing ? 'pause' : 'play';
        document.getElementById('playBtn').classList.toggle('active', playing);
        statusEl.textContent = playing ? 'running' : 'paused, draw circuits';
    }

    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('stepBtn').addEventListener('click', () => { if (!playing) { step(); render(); } });
    document.getElementById('tool').addEventListener('change', (e) => { tool = e.target.value; });
    document.getElementById('preset').addEventListener('change', (e) => { presetBuilders[e.target.value](); });
    document.getElementById('resetBtn').addEventListener('click', () => { grid.fill(EMPTY); playing = false; document.getElementById('playBtn').textContent = 'play'; statusEl.textContent = 'paused, draw circuits'; });

    function loop() {
        tickFps();
        if (playing) step();
        render();
        requestAnimationFrame(loop);
    }

    loop();
})();
