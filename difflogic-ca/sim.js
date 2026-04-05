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

    const drawCanvas = document.getElementById('drawCanvas');
    const runCanvas = document.getElementById('runCanvas');
    const drawCtx = drawCanvas.getContext('2d');
    const runCtx = runCanvas.getContext('2d');

    let GRID = 48;
    let CELL_DRAW, CELL_RUN;
    let target, grid, gridBuf;
    let mode = 'draw';
    let drawing = false;
    let drawMode = 'draw';
    let bestRule = null;
    let learning = false;
    let running = false;
    let generation = 0;
    let animFrame = null;

    const statusEl = document.getElementById('status');

    function fitCanvases() {
        const wrap = document.querySelector('.dual-canvas');
        if (!wrap) return;
        const ww = wrap.clientWidth - 48;
        const wh = wrap.clientHeight - 30;
        if (ww <= 0 || wh <= 0) return;
        const size = Math.floor(Math.min(ww / 2, wh));
        if (size <= 0) return;
        drawCanvas.style.width = size + 'px';
        drawCanvas.style.height = size + 'px';
        runCanvas.style.width = size + 'px';
        runCanvas.style.height = size + 'px';
    }
    window.addEventListener('resize', fitCanvases);
    setTimeout(fitCanvases, 30);
    requestAnimationFrame(fitCanvases);

    function resize() {
        CELL_DRAW = (drawCanvas.width / GRID) | 0;
        CELL_RUN = (runCanvas.width / GRID) | 0;
    }

    function initGrids() {
        target = new Uint8Array(GRID * GRID);
        grid = new Uint8Array(GRID * GRID);
        gridBuf = new Uint8Array(GRID * GRID);
        bestRule = null;
        generation = 0;
        learning = false;
        running = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        animFrame = null;
        renderDraw();
        clearRun();
        statusEl.textContent = 'draw a target pattern';
    }

    // ── Rule representation: outer-totalistic ──
    // 18 bits: state(0,1) × neighborCount(0..8) → nextState
    class Rule {
        constructor(bits) {
            this.bits = bits || new Uint8Array(18);
        }
        apply(state, neighbors) {
            return this.bits[state * 9 + neighbors];
        }
        clone() {
            return new Rule(new Uint8Array(this.bits));
        }
        mutate(rate) {
            const r = this.clone();
            for (let i = 0; i < 18; i++) {
                if (Math.random() < rate) r.bits[i] = 1 - r.bits[i];
            }
            return r;
        }
        crossover(other) {
            const child = new Rule();
            const point = (Math.random() * 18) | 0;
            for (let i = 0; i < 18; i++) {
                child.bits[i] = i < point ? this.bits[i] : other.bits[i];
            }
            return child;
        }
        static random() {
            const bits = new Uint8Array(18);
            for (let i = 0; i < 18; i++) bits[i] = Math.random() < 0.5 ? 1 : 0;
            return new Rule(bits);
        }
    }

    function runCA(initial, rule, steps) {
        let cur = new Uint8Array(initial);
        let nxt = new Uint8Array(GRID * GRID);
        for (let s = 0; s < steps; s++) {
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    let count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = (x + dx + GRID) % GRID;
                            const ny = (y + dy + GRID) % GRID;
                            count += cur[ny * GRID + nx];
                        }
                    }
                    nxt[y * GRID + x] = rule.apply(cur[y * GRID + x], count);
                }
            }
            const tmp = cur; cur = nxt; nxt = tmp;
        }
        return cur;
    }

    function fitness(rule) {
        let totalScore = 0;
        const trials = 3;
        for (let t = 0; t < trials; t++) {
            const init = new Uint8Array(GRID * GRID);
            for (let i = 0; i < init.length; i++) init[i] = Math.random() < 0.4 ? 1 : 0;
            const result = runCA(init, rule, 30 + t * 10);

            let match = 0;
            const targetAlive = target.reduce((a, b) => a + b, 0);
            const resultAlive = result.reduce((a, b) => a + b, 0);

            for (let i = 0; i < GRID * GRID; i++) {
                if (result[i] === target[i]) match++;
            }
            const cellMatch = match / (GRID * GRID);
            const densityMatch = 1 - Math.abs(targetAlive - resultAlive) / (GRID * GRID);

            let patternScore = 0;
            for (let y = 1; y < GRID - 1; y++) {
                for (let x = 1; x < GRID - 1; x++) {
                    const tLocal = target[(y-1)*GRID+x] + target[(y+1)*GRID+x] +
                                   target[y*GRID+x-1] + target[y*GRID+x+1];
                    const rLocal = result[(y-1)*GRID+x] + result[(y+1)*GRID+x] +
                                   result[y*GRID+x-1] + result[y*GRID+x+1];
                    if (Math.abs(tLocal - rLocal) <= 1) patternScore++;
                }
            }
            patternScore /= ((GRID - 2) * (GRID - 2));

            totalScore += cellMatch * 0.4 + densityMatch * 0.3 + patternScore * 0.3;
        }
        return totalScore / trials;
    }

    // Genetic algorithm state
    const POP_SIZE = 40;
    let population = [];
    let fitnesses = [];
    let bestFitness = 0;
    let genCount = 0;

    function initGA() {
        population = Array.from({ length: POP_SIZE }, () => Rule.random());
        fitnesses = new Float32Array(POP_SIZE);
        bestFitness = 0;
        bestRule = null;
        genCount = 0;
    }

    function evolveStep() {
        for (let i = 0; i < POP_SIZE; i++) {
            fitnesses[i] = fitness(population[i]);
            if (fitnesses[i] > bestFitness) {
                bestFitness = fitnesses[i];
                bestRule = population[i].clone();
            }
        }

        const newPop = [bestRule.clone()];

        while (newPop.length < POP_SIZE) {
            const a = (Math.random() * POP_SIZE) | 0;
            const b = (Math.random() * POP_SIZE) | 0;
            const parentA = fitnesses[a] > fitnesses[b] ? population[a] : population[b];
            const c = (Math.random() * POP_SIZE) | 0;
            const d = (Math.random() * POP_SIZE) | 0;
            const parentB = fitnesses[c] > fitnesses[d] ? population[c] : population[d];

            let child;
            if (Math.random() < 0.7) {
                child = parentA.crossover(parentB);
            } else {
                child = parentA.clone();
            }
            child = child.mutate(0.08);
            newPop.push(child);
        }
        population = newPop;
        genCount++;
    }

    async function learn() {
        if (target.reduce((a, b) => a + b, 0) === 0) {
            statusEl.textContent = 'draw something first';
            return;
        }
        learning = true;
        running = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        initGA();
        statusEl.textContent = 'learning...';

        for (let epoch = 0; epoch < 80; epoch++) {
            evolveStep();
            statusEl.textContent = `gen ${genCount} · fitness ${(bestFitness * 100).toFixed(1)}%`;
            if (bestRule) {
                const demo = runCA(randomInit(0.4), bestRule, 40);
                renderGrid(runCtx, demo, CELL_RUN);
            }
            await new Promise(r => setTimeout(r, 0));
            if (!learning) break;
        }

        learning = false;
        if (bestRule) {
            statusEl.textContent = `done · fitness ${(bestFitness * 100).toFixed(1)}% · click run`;
        } else {
            statusEl.textContent = 'no rules found';
        }
    }

    function randomInit(density) {
        const g = new Uint8Array(GRID * GRID);
        for (let i = 0; i < g.length; i++) g[i] = Math.random() < density ? 1 : 0;
        return g;
    }

    function startRun() {
        if (!bestRule) {
            statusEl.textContent = 'learn rules first';
            return;
        }
        learning = false;
        running = true;
        grid = randomInit(0.4);
        generation = 0;
        animate();
    }

    function animate() {
        if (!running) return;
        tickFps();
        grid = runCA(grid, bestRule, 1);
        generation++;
        renderGrid(runCtx, grid, CELL_RUN);
        statusEl.textContent = `running · gen ${generation}`;
        animFrame = requestAnimationFrame(animate);
    }

    // ── Rendering ──
    function renderDraw() {
        drawCtx.fillStyle = '#080808';
        drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                if (target[y * GRID + x]) {
                    drawCtx.fillStyle = '#e8e8e8';
                    drawCtx.fillRect(x * CELL_DRAW, y * CELL_DRAW, CELL_DRAW - 1, CELL_DRAW - 1);
                } else {
                    drawCtx.fillStyle = '#111';
                    drawCtx.fillRect(x * CELL_DRAW, y * CELL_DRAW, CELL_DRAW - 1, CELL_DRAW - 1);
                }
            }
        }
    }

    function renderGrid(ctx, g, cellSize) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                if (g[y * GRID + x]) {
                    ctx.fillStyle = '#8a9bb5';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
                } else {
                    ctx.fillStyle = '#0e0e0e';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }
    }

    function clearRun() {
        runCtx.fillStyle = '#080808';
        runCtx.fillRect(0, 0, runCanvas.width, runCanvas.height);
    }

    // ── Drawing interaction ──
    function drawCell(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * GRID) | 0;
        const y = ((e.clientY - rect.top) / rect.height * GRID) | 0;
        if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
            target[y * GRID + x] = drawMode === 'draw' ? 1 : 0;
            renderDraw();
        }
    }

    drawCanvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        drawing = true;
        drawCell(e);
    });
    drawCanvas.addEventListener('mousemove', (e) => {
        if (drawing) drawCell(e);
    });
    drawCanvas.addEventListener('mouseup', () => { drawing = false; });
    drawCanvas.addEventListener('mouseleave', () => { drawing = false; });

    // ── Buttons ──
    document.getElementById('drawBtn').addEventListener('click', () => {
        drawMode = 'draw';
        document.getElementById('drawBtn').classList.add('active');
        document.getElementById('eraseBtn').classList.remove('active');
    });
    document.getElementById('eraseBtn').addEventListener('click', () => {
        drawMode = 'erase';
        document.getElementById('eraseBtn').classList.add('active');
        document.getElementById('drawBtn').classList.remove('active');
    });
    document.getElementById('learnBtn').addEventListener('click', () => {
        learn();
    });
    document.getElementById('runBtn').addEventListener('click', () => {
        startRun();
    });
    document.getElementById('clearBtn').addEventListener('click', () => {
        running = false;
        learning = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        initGrids();
    });
    document.getElementById('gridSize').addEventListener('change', (e) => {
        GRID = +e.target.value;
        resize();
        initGrids();
    });

    function randomize() {
        running = false;
        learning = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        target = new Uint8Array(GRID * GRID);
        bestRule = null;

        const style = Math.random();
        if (style < 0.25) {
            // Scattered clusters
            const numClusters = 2 + (Math.random() * 5) | 0;
            for (let c = 0; c < numClusters; c++) {
                const cx = (Math.random() * GRID) | 0;
                const cy = (Math.random() * GRID) | 0;
                const cr = 2 + (Math.random() * (GRID / 5)) | 0;
                for (let dy = -cr; dy <= cr; dy++) {
                    for (let dx = -cr; dx <= cr; dx++) {
                        if (dx * dx + dy * dy > cr * cr) continue;
                        const x = (cx + dx + GRID) % GRID;
                        const y = (cy + dy + GRID) % GRID;
                        if (Math.random() < 0.65) target[y * GRID + x] = 1;
                    }
                }
            }
        } else if (style < 0.5) {
            // Stripes
            const period = 2 + (Math.random() * 5) | 0;
            const angle = Math.random() < 0.5;
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    const v = angle ? (x + y) : x;
                    target[y * GRID + x] = (v % period) < (period / 2) ? 1 : 0;
                }
            }
        } else if (style < 0.75) {
            // Diamond / geometric
            const cx = GRID / 2, cy = GRID / 2;
            const size = GRID * (0.2 + Math.random() * 0.25);
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    if (Math.abs(x - cx) + Math.abs(y - cy) < size) {
                        target[y * GRID + x] = Math.random() < 0.55 ? 1 : 0;
                    }
                }
            }
        } else {
            // Random noise
            const density = 0.2 + Math.random() * 0.35;
            for (let i = 0; i < GRID * GRID; i++) {
                target[i] = Math.random() < density ? 1 : 0;
            }
        }

        renderDraw();
        clearRun();
        statusEl.textContent = 'random pattern · click learn';
    }

    document.getElementById('randomBtn').addEventListener('click', randomize);

    resize();
    initGrids();
})();
