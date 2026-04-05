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

    const typeColors = [
        [90, 160, 240],
        [230, 90, 80],
        [80, 210, 140],
        [220, 180, 60],
        [180, 100, 220],
        [100, 220, 220]
    ];

    let numTypes = 4;
    let numParticles = 800;
    let forceMatrix = [];
    let forceRange = 80;
    let friction = 0.5;
    let particles = [];
    let mouseDown = false, mouseX = 0, mouseY = 0;

    function randomMatrix() {
        forceMatrix = [];
        for (let i = 0; i < numTypes; i++) {
            forceMatrix[i] = [];
            for (let j = 0; j < numTypes; j++) {
                forceMatrix[i][j] = (Math.random() * 2 - 1);
            }
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: 0, vy: 0,
                type: (Math.random() * numTypes) | 0
            });
        }
    }

    function init() {
        randomMatrix();
        initParticles();
    }

    function step() {
        const fr = forceRange;
        const fr2 = fr * fr;

        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];
            let fx = 0, fy = 0;

            for (let j = 0; j < particles.length; j++) {
                if (i === j) continue;
                const b = particles[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                // Wrap
                if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
                if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
                const d2 = dx * dx + dy * dy;
                if (d2 > fr2 || d2 < 1) continue;
                const d = Math.sqrt(d2);
                const f = forceMatrix[a.type][b.type];
                const strength = f * (1 - d / fr);
                fx += (dx / d) * strength;
                fy += (dy / d) * strength;
            }

            if (mouseDown) {
                let dx = mouseX - a.x, dy = mouseY - a.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 1 && d < 200) {
                    fx += (dx / d) * 0.5;
                    fy += (dy / d) * 0.5;
                }
            }

            a.vx = (a.vx + fx * 0.5) * (1 - friction);
            a.vy = (a.vy + fy * 0.5) * (1 - friction);
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

    function canvasCoords(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    }

    canvas.addEventListener('mousedown', (e) => { e.preventDefault(); mouseDown = true; const p = canvasCoords(e); mouseX = p.x; mouseY = p.y; });
    canvas.addEventListener('mousemove', (e) => { if (mouseDown) { const p = canvasCoords(e); mouseX = p.x; mouseY = p.y; } });
    canvas.addEventListener('mouseup', () => { mouseDown = false; });
    canvas.addEventListener('mouseleave', () => { mouseDown = false; });

    document.getElementById('numTypes').addEventListener('change', (e) => { numTypes = +e.target.value; init(); });
    document.getElementById('friction').addEventListener('input', (e) => { friction = +e.target.value / 20; });
    document.getElementById('forceRange').addEventListener('input', (e) => { forceRange = +e.target.value; });
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
