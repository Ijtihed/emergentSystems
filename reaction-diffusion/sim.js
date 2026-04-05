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
    const SIZE = 512;
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
    let u = new Float32Array(N);
    let v = new Float32Array(N);
    let uN = new Float32Array(N);
    let vN = new Float32Array(N);
    let deform = new Float32Array(N);

    const presets = {
        coral:    { f: 0.0545, k: 0.062 },
        mitosis:  { f: 0.0367, k: 0.0649 },
        spirals:  { f: 0.018,  k: 0.051 },
        solitons: { f: 0.03,   k: 0.06 },
        worms:    { f: 0.078,  k: 0.061 }
    };

    let Du = 0.21, Dv = 0.105;
    let feed = presets.coral.f;
    let kill = presets.coral.k;
    let feedMap = new Float32Array(N);
    let killMap = new Float32Array(N);
    let brushSize = 12;
    let mouseDown = false;
    let mouseRight = false;

    function init() {
        u.fill(1.0);
        v.fill(0.0);
        deform.fill(0.0);
        feedMap.fill(feed);
        killMap.fill(kill);
        const cx = SIZE / 2, cy = SIZE / 2;
        seedAt(cx, cy, 20);
        seedAt(cx - 50, cy + 30, 12);
        seedAt(cx + 40, cy - 40, 15);
    }

    function seedAt(cx, cy, r) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy > r * r) continue;
                const x = ((cx + dx) | 0 + SIZE) % SIZE;
                const y = ((cy + dy) | 0 + SIZE) % SIZE;
                const idx = y * SIZE + x;
                v[idx] = 1.0;
                u[idx] = 0.5;
            }
        }
    }

    function simulate(steps) {
        for (let s = 0; s < steps; s++) {
            for (let y = 0; y < SIZE; y++) {
                const ym = ((y - 1) + SIZE) % SIZE;
                const yp = (y + 1) % SIZE;
                for (let x = 0; x < SIZE; x++) {
                    const xm = ((x - 1) + SIZE) % SIZE;
                    const xp = (x + 1) % SIZE;
                    const idx = y * SIZE + x;

                    const lapU = u[ym * SIZE + x] + u[yp * SIZE + x] +
                                 u[y * SIZE + xm] + u[y * SIZE + xp] - 4 * u[idx];
                    const lapV = v[ym * SIZE + x] + v[yp * SIZE + x] +
                                 v[y * SIZE + xm] + v[y * SIZE + xp] - 4 * v[idx];

                    const d = 1.0 + deform[idx] * 3.0;
                    const uvv = u[idx] * v[idx] * v[idx];
                    const lf = feedMap[idx], lk = killMap[idx];

                    uN[idx] = u[idx] + (Du * d * lapU - uvv + lf * (1.0 - u[idx]));
                    vN[idx] = v[idx] + (Dv * d * lapV + uvv - (lf + lk) * v[idx]);

                    if (uN[idx] < 0) uN[idx] = 0;
                    if (uN[idx] > 1) uN[idx] = 1;
                    if (vN[idx] < 0) vN[idx] = 0;
                    if (vN[idx] > 1) vN[idx] = 1;
                }
            }
            let tmp = u; u = uN; uN = tmp;
            tmp = v; v = vN; vN = tmp;
        }
    }

    function decayDeform() {
        for (let i = 0; i < N; i++) {
            deform[i] *= 0.998;
        }
    }

    function render() {
        const img = ctx.createImageData(SIZE, SIZE);
        const px = img.data;
        for (let i = 0; i < N; i++) {
            const val = v[i];
            const def = Math.abs(deform[i]);
            const t = Math.min(1, val);
            const j = i << 2;
            px[j]     = (t * 160 + def * 40) | 0;
            px[j + 1] = (t * 175 + def * 20) | 0;
            px[j + 2] = (t * 220 + def * 60) | 0;
            px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width * SIZE) | 0,
            y: ((e.clientY - rect.top) / rect.height * SIZE) | 0
        };
    }

    function applyBrush(cx, cy, type) {
        const r = brushSize;
        const r2 = r * r;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy > r2) continue;
                const x = ((cx + dx) + SIZE) % SIZE;
                const y = ((cy + dy) + SIZE) % SIZE;
                const idx = y * SIZE + x;
                const falloff = 1 - (dx * dx + dy * dy) / r2;
                if (type === 'seed') {
                    v[idx] = Math.min(1, v[idx] + 0.5 * falloff);
                    u[idx] = Math.max(0, u[idx] - 0.25 * falloff);
                } else if (type === 'deform') {
                    deform[idx] = Math.min(2, deform[idx] + 0.15 * falloff);
                } else if (type === 'inhibit') {
                    v[idx] = Math.max(0, v[idx] - 0.3 * falloff);
                    u[idx] = Math.min(1, u[idx] + 0.15 * falloff);
                } else if (type === 'paintfk') {
                    feedMap[idx] += (feed - feedMap[idx]) * 0.3 * falloff;
                    killMap[idx] += (kill - killMap[idx]) * 0.3 * falloff;
                }
            }
        }
    }

    function getBrushType(e) {
        if (e.button === 2) return 'inhibit';
        if (e.shiftKey) return 'seed';
        if (e.ctrlKey) return 'paintfk';
        return 'deform';
    }

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const p = canvasCoords(e);
        const type = getBrushType(e);
        if (type === 'inhibit') mouseRight = true;
        else mouseDown = true;
        applyBrush(p.x, p.y, type);
    });

    canvas.addEventListener('mousemove', (e) => {
        const p = canvasCoords(e);
        if (mouseDown) applyBrush(p.x, p.y, getBrushType(e));
        if (mouseRight) applyBrush(p.x, p.y, 'inhibit');
    });

    canvas.addEventListener('mouseup', () => { mouseDown = false; mouseRight = false; });
    canvas.addEventListener('mouseleave', () => { mouseDown = false; mouseRight = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Controls
    const feedSlider = document.getElementById('feed');
    const killSlider = document.getElementById('kill');
    const feedVal = document.getElementById('feedVal');
    const killVal = document.getElementById('killVal');

    function updateFeedKillDisplay() {
        feedVal.textContent = feed.toFixed(4);
        killVal.textContent = kill.toFixed(4);
    }

    function setFeedKill(f, k) {
        feed = f;
        kill = k;
        feedMap.fill(f);
        killMap.fill(k);
        feedSlider.value = ((f - 0.01) / 0.08 * 100) | 0;
        killSlider.value = ((k - 0.03) / 0.04 * 100) | 0;
        updateFeedKillDisplay();
    }

    feedSlider.addEventListener('input', (e) => {
        feed = 0.01 + (+e.target.value / 100) * 0.08;
        updateFeedKillDisplay();
    });

    killSlider.addEventListener('input', (e) => {
        kill = 0.03 + (+e.target.value / 100) * 0.04;
        updateFeedKillDisplay();
    });

    document.getElementById('brushSize').addEventListener('input', (e) => {
        brushSize = +e.target.value;
    });

    document.getElementById('preset').addEventListener('change', (e) => {
        const p = presets[e.target.value];
        if (p) {
            setFeedKill(p.f, p.k);
            init();
        }
    });

    document.getElementById('resetBtn').addEventListener('click', init);

    function randomize() {
        const names = Object.keys(presets);
        const pick = presets[names[(Math.random() * names.length) | 0]];
        setFeedKill(pick.f, pick.k);
        u.fill(1.0);
        v.fill(0.0);
        deform.fill(0.0);
        const numSeeds = 3 + (Math.random() * 7) | 0;
        for (let i = 0; i < numSeeds; i++) {
            seedAt(
                40 + Math.random() * (SIZE - 80),
                40 + Math.random() * (SIZE - 80),
                6 + (Math.random() * 20) | 0
            );
        }
        const numDeforms = (Math.random() * 6) | 0;
        for (let i = 0; i < numDeforms; i++) {
            const cx = (Math.random() * SIZE) | 0;
            const cy = (Math.random() * SIZE) | 0;
            const r = 15 + (Math.random() * 30) | 0;
            const oldBrush = brushSize;
            brushSize = r;
            applyBrush(cx, cy, 'deform');
            brushSize = oldBrush;
        }
        document.getElementById('preset').selectedIndex = -1;
    }

    document.getElementById('randomBtn').addEventListener('click', randomize);

    setFeedKill(presets.coral.f, presets.coral.k);

    function loop() {
        tickFps();
        simulate(6);
        decayDeform();
        render();
        requestAnimationFrame(loop);
    }

    init();
    loop();
})();
