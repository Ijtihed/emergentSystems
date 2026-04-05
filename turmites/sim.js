(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 512, H = 512;
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

    // Directions: 0=up, 1=right, 2=down, 3=left
    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];

    // Turmite: transition[state][color] = {newState, newColor, turn}
    // turn: 0=none, 1=right, 2=u-turn, 3=left (relative)
    const presets = [
        { // 0: Langton's Ant (RL)
            name: "langton", colors: 2, states: 1,
            table: [[[0, 1, 1], [0, 0, 3]]]
        },
        { // 1: Highway builder
            name: "highway", colors: 2, states: 2,
            table: [[[1, 1, 1], [1, 1, 3]], [[0, 0, 1], [0, 0, 3]]]
        },
        { // 2: Spiral
            name: "spiral", colors: 2, states: 2,
            table: [[[1, 1, 1], [0, 0, 0]], [[1, 0, 3], [0, 1, 1]]]
        },
        { // 3: Fibonacci
            name: "fibonacci", colors: 4, states: 1,
            table: [[[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 0, 3]]]
        },
        { // 4: Chaotic growth
            name: "chaotic", colors: 3, states: 2,
            table: [[[1, 1, 1], [0, 2, 3], [1, 0, 0]], [[0, 2, 1], [1, 0, 3], [0, 1, 1]]]
        },
        { // 5: Square builder
            name: "square", colors: 2, states: 2,
            table: [[[1, 1, 3], [0, 1, 1]], [[1, 0, 1], [0, 0, 0]]]
        }
    ];

    const palette = [
        [8, 8, 8],
        [200, 210, 230],
        [100, 160, 210],
        [70, 200, 140],
        [210, 130, 90],
        [180, 100, 200]
    ];

    let grid, numColors, numStates, table;
    let ants = [];
    let stepsPerFrame = 50;
    let totalSteps = 0;

    function init() {
        grid = new Uint8Array(W * H);
        ants = [{ x: W / 2 | 0, y: H / 2 | 0, dir: 0, state: 0 }];
        totalSteps = 0;
    }

    function loadPreset(idx) {
        const p = presets[idx];
        numColors = p.colors;
        numStates = p.states;
        table = p.table;
        init();
    }

    function randomRule() {
        numColors = 2 + (Math.random() * 3) | 0;
        numStates = 1 + (Math.random() * 2) | 0;
        table = [];
        for (let s = 0; s < numStates; s++) {
            table[s] = [];
            for (let c = 0; c < numColors; c++) {
                table[s][c] = [
                    (Math.random() * numStates) | 0,
                    (Math.random() * numColors) | 0,
                    (Math.random() * 4) | 0
                ];
            }
        }
        init();
    }

    function stepAnts(n) {
        for (let i = 0; i < n; i++) {
            for (const ant of ants) {
                const idx = ant.y * W + ant.x;
                const color = grid[idx];
                const transition = table[ant.state][color];
                ant.state = transition[0];
                grid[idx] = transition[1];
                ant.dir = (ant.dir + transition[2]) % 4;
                ant.x = (ant.x + DX[ant.dir] + W) % W;
                ant.y = (ant.y + DY[ant.dir] + H) % H;
            }
            totalSteps++;
        }
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const c = palette[grid[i] % palette.length];
            const j = i << 2;
            px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
        }
        for (const ant of ants) {
            const j = (ant.y * W + ant.x) << 2;
            px[j] = 255; px[j + 1] = 80; px[j + 2] = 80; px[j + 3] = 255;
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
        ants.push({ x: p.x, y: p.y, dir: (Math.random() * 4) | 0, state: 0 });
    });

    document.getElementById('preset').addEventListener('change', (e) => { loadPreset(+e.target.value); });
    document.getElementById('speed').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('randomBtn').addEventListener('click', randomRule);
    document.getElementById('resetBtn').addEventListener('click', () => { loadPreset(document.getElementById('preset').value | 0); });

    const statusEl = document.getElementById('status');

    function loop() {
        tickFps();
        stepAnts(stepsPerFrame);
        render();
        statusEl.textContent = 'step ' + totalSteps.toLocaleString() + ', ' + ants.length + ' ant' + (ants.length > 1 ? 's' : '');
        requestAnimationFrame(loop);
    }

    loadPreset(0);
    loop();
})();
