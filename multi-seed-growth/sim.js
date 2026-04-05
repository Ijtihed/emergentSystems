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

    const seedColors = [
        [90, 160, 240], [230, 100, 80], [80, 210, 140],
        [220, 180, 60], [180, 110, 200], [100, 220, 220],
        [220, 140, 180], [160, 200, 100]
    ];

    const grid = new Uint8Array(W * H);
    const resistance = new Float32Array(W * H);
    // Deduplicated boundary: one entry per cell, owner = first seed to reach it
    const boundaryOwner = new Uint8Array(W * H);
    let boundaryList = []; // array of flat indices
    let seedCount = 0;
    let model = 'eden';
    let stepsPerFrame = 20;
    let totalFilled = 0;
    const statusEl = document.getElementById('status');

    function initResistance() {
        for (let i = 0; i < W * H; i++) resistance[i] = Math.random();
    }

    function init() {
        grid.fill(0);
        boundaryOwner.fill(0);
        boundaryList = [];
        seedCount = 0;
        totalFilled = 0;
        initResistance();
    }

    function addToBoundary(x, y, owner) {
        const idx = y * W + x;
        if (grid[idx] > 0) return;
        if (boundaryOwner[idx] > 0) return; // already in boundary
        boundaryOwner[idx] = owner;
        boundaryList.push(idx);
    }

    function placeSeed(x, y) {
        if (x < 0 || x >= W || y < 0 || y >= H) return;
        if (grid[y * W + x] > 0) return;
        seedCount++;
        const owner = seedCount;
        grid[y * W + x] = owner;
        totalFilled++;
        boundaryOwner[y * W + x] = 0; // no longer boundary
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                addToBoundary(nx, ny, owner);
            }
        }
    }

    function fillCell(listIdx) {
        const idx = boundaryList[listIdx];
        const owner = boundaryOwner[idx];
        if (grid[idx] > 0 || owner === 0) {
            // Stale, remove
            boundaryOwner[idx] = 0;
            boundaryList[listIdx] = boundaryList[boundaryList.length - 1];
            boundaryList.pop();
            return false;
        }
        grid[idx] = owner;
        totalFilled++;
        boundaryOwner[idx] = 0;
        boundaryList[listIdx] = boundaryList[boundaryList.length - 1];
        boundaryList.pop();
        // Add new boundary neighbors
        const x = idx % W, y = (idx / W) | 0;
        const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                addToBoundary(nx, ny, owner);
            }
        }
        return true;
    }

    // Eden: uniform random among all unique boundary cells
    function growEden() {
        let attempts = 0;
        while (boundaryList.length > 0 && attempts < 20) {
            const i = (Math.random() * boundaryList.length) | 0;
            if (fillCell(i)) return;
            attempts++;
        }
    }

    // Invasion percolation: pick the global minimum resistance boundary cell
    function growInvasion() {
        if (boundaryList.length === 0) return;
        let bestI = -1, bestRes = Infinity;
        for (let i = boundaryList.length - 1; i >= 0; i--) {
            const idx = boundaryList[i];
            if (grid[idx] > 0 || boundaryOwner[idx] === 0) {
                boundaryOwner[idx] = 0;
                boundaryList[i] = boundaryList[boundaryList.length - 1];
                boundaryList.pop();
                continue;
            }
            if (resistance[idx] < bestRes) {
                bestRes = resistance[idx];
                bestI = i;
            }
        }
        if (bestI >= 0) fillCell(bestI);
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const v = grid[i];
            const j = i << 2;
            if (v > 0) {
                const c = seedColors[(v - 1) % seedColors.length];
                px[j] = c[0]; px[j+1] = c[1]; px[j+2] = c[2];
            } else {
                px[j] = 8; px[j+1] = 8; px[j+2] = 8;
            }
            px[j+3] = 255;
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

    document.getElementById('model').addEventListener('change', (e) => { model = e.target.value; });
    document.getElementById('speed').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('scatterBtn').addEventListener('click', () => {
        const n = 4 + (Math.random() * 5) | 0;
        for (let i = 0; i < n; i++) {
            placeSeed((Math.random() * (W - 40) + 20) | 0, (Math.random() * (H - 40) + 20) | 0);
        }
    });
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() {
        tickFps();
        const growFn = model === 'invasion' ? growInvasion : growEden;
        for (let i = 0; i < stepsPerFrame; i++) growFn();
        render();
        statusEl.textContent = totalFilled + ' filled, ' + seedCount + ' seeds';
        requestAnimationFrame(loop);
    }

    init();
    loop();
})();
