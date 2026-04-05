(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 800, H = 600;
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

    // Extended Particle Life with richer interaction functions per ASAL (Sakana AI 2024)
    // Each type pair has: attraction peak, repulsion zone, interaction range, force shape
    const typeColors = [[90,160,240],[230,90,80],[80,210,140],[220,180,60],[180,100,220],[100,220,220]];
    let numTypes = 4;
    const NUM_PER_TYPE = 150;
    let particles = [];
    let forceMatrix = []; // [i][j] = { attract, repulse, range, peak }
    let friction = 0.5;

    // ASAL-inspired presets: richer interaction functions than basic Particle Life
    const presetConfigs = {
        caterpillar: () => {
            numTypes = 4;
            const m = [];
            for (let i = 0; i < 4; i++) { m[i] = []; for (let j = 0; j < 4; j++) m[i][j] = { attract: 0, repulse: 0.3, range: 80, peak: 0.4 }; }
            m[0][1] = { attract: 0.8, repulse: 0.2, range: 100, peak: 0.5 };
            m[1][2] = { attract: 0.8, repulse: 0.2, range: 100, peak: 0.5 };
            m[2][3] = { attract: 0.8, repulse: 0.2, range: 100, peak: 0.5 };
            m[3][0] = { attract: 0.6, repulse: 0.3, range: 80, peak: 0.4 };
            m[0][0] = { attract: -0.2, repulse: 0.5, range: 60, peak: 0.3 };
            return m;
        },
        chaser: () => {
            numTypes = 3;
            const m = [];
            for (let i = 0; i < 3; i++) { m[i] = []; for (let j = 0; j < 3; j++) m[i][j] = { attract: 0, repulse: 0.2, range: 70, peak: 0.3 }; }
            m[0][1] = { attract: 1.0, repulse: 0.1, range: 120, peak: 0.6 };
            m[1][2] = { attract: 1.0, repulse: 0.1, range: 120, peak: 0.6 };
            m[2][0] = { attract: 1.0, repulse: 0.1, range: 120, peak: 0.6 };
            m[0][0] = { attract: 0.3, repulse: 0.4, range: 50, peak: 0.35 };
            m[1][1] = { attract: 0.3, repulse: 0.4, range: 50, peak: 0.35 };
            m[2][2] = { attract: 0.3, repulse: 0.4, range: 50, peak: 0.35 };
            return m;
        },
        pulsating: () => {
            numTypes = 4;
            const m = [];
            for (let i = 0; i < 4; i++) { m[i] = []; for (let j = 0; j < 4; j++) {
                const same = i === j;
                m[i][j] = { attract: same ? 0.5 : -0.3, repulse: same ? 0.6 : 0.1, range: same ? 40 : 100, peak: 0.4 };
            }}
            return m;
        },
        ecosystem: () => {
            numTypes = 5;
            const m = [];
            for (let i = 0; i < 5; i++) { m[i] = []; for (let j = 0; j < 5; j++) {
                m[i][j] = { attract: (Math.random() - 0.3) * 1.5, repulse: 0.1 + Math.random() * 0.5, range: 40 + Math.random() * 80, peak: 0.2 + Math.random() * 0.5 };
            }}
            return m;
        }
    };

    function randomMatrix() {
        forceMatrix = [];
        for (let i = 0; i < numTypes; i++) {
            forceMatrix[i] = [];
            for (let j = 0; j < numTypes; j++) {
                forceMatrix[i][j] = {
                    attract: (Math.random() - 0.3) * 1.5,
                    repulse: 0.1 + Math.random() * 0.5,
                    range: 40 + Math.random() * 80,
                    peak: 0.2 + Math.random() * 0.5
                };
            }
        }
    }

    function initParticles() {
        particles = [];
        for (let t = 0; t < numTypes; t++) {
            for (let i = 0; i < NUM_PER_TYPE; i++) {
                particles.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, type: t });
            }
        }
    }

    function init(preset) {
        if (preset && presetConfigs[preset]) {
            forceMatrix = presetConfigs[preset]();
        } else {
            randomMatrix();
        }
        initParticles();
    }

    function step() {
        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];
            let fx = 0, fy = 0;
            for (let j = 0; j < particles.length; j++) {
                if (i === j) continue;
                const b = particles[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
                if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
                const d2 = dx * dx + dy * dy;
                const params = forceMatrix[a.type][b.type];
                if (!params || d2 > params.range * params.range || d2 < 1) continue;
                const d = Math.sqrt(d2);
                const t = d / params.range;
                // Extended force: repulsion below peak, attraction above
                let force;
                if (t < params.peak) {
                    force = -params.repulse * (1 - t / params.peak);
                } else {
                    force = params.attract * (t - params.peak) / (1 - params.peak);
                }
                fx += (dx / d) * force;
                fy += (dy / d) * force;
            }
            a.vx = (a.vx + fx * 0.3) * (1 - friction);
            a.vy = (a.vy + fy * 0.3) * (1 - friction);
            a.x = ((a.x + a.vx) % W + W) % W;
            a.y = ((a.y + a.vy) % H + H) % H;
        }
    }

    function render() {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, W, H);
        for (const p of particles) {
            const c = typeColors[p.type % typeColors.length];
            ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
            ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }
    }

    document.getElementById('preset').addEventListener('change', (e) => { init(e.target.value); });
    document.getElementById('numTypes').addEventListener('change', (e) => { numTypes = +e.target.value; randomMatrix(); initParticles(); });
    document.getElementById('randomBtn').addEventListener('click', () => { randomMatrix(); initParticles(); });
    document.getElementById('resetBtn').addEventListener('click', () => { init(document.getElementById('preset').value); });

    function loop() { tickFps(); step(); render(); requestAnimationFrame(loop); }
    init('caterpillar');
    loop();
})();
