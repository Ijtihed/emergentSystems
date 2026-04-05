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
        const p = canvas.parentElement, pw = p.clientWidth - 16, ph = p.clientHeight - 16;
        if (pw <= 0 || ph <= 0) return;
        const s = Math.min(pw / W, ph / H);
        canvas.style.width = Math.floor(W * s) + 'px';
        canvas.style.height = Math.floor(H * s) + 'px';
    }
    window.addEventListener('resize', fitCanvas);
    setTimeout(fitCanvas, 30);
    requestAnimationFrame(fitCanvas);

    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];

    // Species: each has a name, number of colors, states, and transition table
    // table[state][color] = [newState, newColor, turn]
    // turn: 0=none, 1=right, 2=u-turn, 3=left
    const speciesLib = {
        langton:  { colors: 2, states: 1, table: [[[0,1,1],[0,0,3]]] },
        highway:  { colors: 2, states: 2, table: [[[1,1,1],[1,1,3]],[[0,0,1],[0,0,3]]] },
        spiral:   { colors: 2, states: 2, table: [[[1,1,1],[0,0,0]],[[1,0,3],[0,1,1]]] },
        chaotic:  { colors: 3, states: 2, table: [[[1,1,1],[0,2,3],[1,0,0]],[[0,2,1],[1,0,3],[0,1,1]]] },
        square:   { colors: 2, states: 2, table: [[[1,1,3],[0,1,1]],[[1,0,1],[0,0,0]]] },
        fibonacci:{ colors: 4, states: 1, table: [[[0,1,1],[0,2,1],[0,3,1],[0,0,3]]] }
    };

    // Grid uses max colors across all active species
    let grid;
    let ants = [];
    let stepsPerFrame = 80;
    let totalSteps = 0;
    let placeSpecies = 'A';
    let speciesA = 'langton', speciesB = 'highway', speciesC = 'spiral';

    // Color palette: background + species colors blended
    const speciesColors = [
        [[160,180,210],[50,70,100]],   // Species A: blue tones
        [[210,140,100],[100,50,30]],   // Species B: warm tones
        [[100,200,150],[30,80,50]]     // Species C: green tones
    ];

    const palette = [
        [8, 8, 8],       // 0: empty
        [200, 210, 230],  // 1
        [100, 160, 210],  // 2
        [70, 200, 140],   // 3
        [210, 130, 90],   // 4
        [180, 100, 200]   // 5
    ];

    function init() {
        grid = new Uint8Array(W * H);
        ants = [];
        totalSteps = 0;
        // Place initial colonies
        placeColony(W * 0.3, H * 0.5, speciesA, 0);
        placeColony(W * 0.7, H * 0.5, speciesB, 1);
        placeColony(W * 0.5, H * 0.3, speciesC, 2);
    }

    function placeColony(cx, cy, speciesName, groupId) {
        const sp = speciesLib[speciesName];
        if (!sp) return;
        const count = 3 + ((Math.random() * 3) | 0);
        for (let i = 0; i < count; i++) {
            const x = (((cx + (Math.random() - 0.5) * 30) | 0) + W) % W;
            const y = (((cy + (Math.random() - 0.5) * 30) | 0) + H) % H;
            ants.push({
                x, y,
                dir: (Math.random() * 4) | 0,
                state: 0,
                species: speciesName,
                group: groupId
            });
        }
    }

    function stepAnts(n) {
        for (let s = 0; s < n; s++) {
            for (const ant of ants) {
                const sp = speciesLib[ant.species];
                if (!sp) continue;
                const idx = ant.y * W + ant.x;
                const color = grid[idx] % sp.colors;
                const transition = sp.table[ant.state][color];
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
        // Draw ant positions
        for (const ant of ants) {
            const j = (ant.y * W + ant.x) << 2;
            const gc = speciesColors[ant.group % speciesColors.length][0];
            px[j] = gc[0]; px[j + 1] = gc[1]; px[j + 2] = gc[2]; px[j + 3] = 255;
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
        const groupMap = { A: 0, B: 1, C: 2 };
        const speciesMap = { A: speciesA, B: speciesB, C: speciesC };
        const g = groupMap[placeSpecies] || 0;
        const sp = speciesMap[placeSpecies] || speciesA;
        placeColony(p.x, p.y, sp, g);
    });

    document.getElementById('speciesA').addEventListener('change', (e) => { speciesA = e.target.value; });
    document.getElementById('speciesB').addEventListener('change', (e) => { speciesB = e.target.value; });
    document.getElementById('speciesC').addEventListener('change', (e) => { speciesC = e.target.value; });
    document.getElementById('placeMode').addEventListener('change', (e) => { placeSpecies = e.target.value; });
    document.getElementById('speed').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('resetBtn').addEventListener('click', init);

    const statusEl = document.getElementById('status');

    function loop() {
        tickFps();
        stepAnts(stepsPerFrame);
        render();
        statusEl.textContent = 'step ' + totalSteps.toLocaleString() + ', ' + ants.length + ' ants';
        requestAnimationFrame(loop);
    }

    init();
    loop();
})();
