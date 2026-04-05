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

    // Sayama 2009: each species has Boids parameters
    // separation, alignment, cohesion, maxSpeed, perceptionRadius
    const typeColors = [
        [90, 160, 240], [230, 90, 80], [80, 210, 140],
        [220, 180, 60], [180, 100, 220]
    ];

    let numTypes = 3;
    let species = [];
    let particles = [];
    let friction = 0.05;
    let mouseDown = false, mouseX = 0, mouseY = 0;
    const NUM_PER_TYPE = 150;

    function randomSpecies() {
        return {
            separation: 5 + Math.random() * 30,
            alignment: Math.random() * 0.3,
            cohesion: Math.random() * 0.02,
            maxSpeed: 1 + Math.random() * 4,
            perceptionRadius: 30 + Math.random() * 80
        };
    }

    function initSpecies() {
        species = [];
        for (let i = 0; i < numTypes; i++) species.push(randomSpecies());
    }

    function initParticles() {
        particles = [];
        for (let t = 0; t < numTypes; t++) {
            const cx = W * 0.2 + Math.random() * W * 0.6;
            const cy = H * 0.2 + Math.random() * H * 0.6;
            for (let i = 0; i < NUM_PER_TYPE; i++) {
                particles.push({
                    x: cx + (Math.random() - 0.5) * 80,
                    y: cy + (Math.random() - 0.5) * 80,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    type: t
                });
            }
        }
    }

    function init() {
        initSpecies();
        initParticles();
    }

    // Sayama Boids: particles respond to ALL nearby particles regardless of type
    // but use their OWN species parameters
    function step() {
        const N = particles.length;
        for (let i = 0; i < N; i++) {
            const a = particles[i];
            const sp = species[a.type];
            const pr = sp.perceptionRadius;
            const pr2 = pr * pr;

            let sepX = 0, sepY = 0;
            let aliX = 0, aliY = 0;
            let cohX = 0, cohY = 0;
            let count = 0;

            for (let j = 0; j < N; j++) {
                if (i === j) continue;
                const b = particles[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                if (d2 > pr2 || d2 < 0.01) continue;
                const d = Math.sqrt(d2);
                count++;

                // Separation
                if (d < sp.separation) {
                    sepX -= dx / d;
                    sepY -= dy / d;
                }
                // Alignment
                aliX += b.vx;
                aliY += b.vy;
                // Cohesion
                cohX += b.x;
                cohY += b.y;
            }

            if (count > 0) {
                aliX /= count; aliY /= count;
                cohX = cohX / count - a.x;
                cohY = cohY / count - a.y;

                a.vx += sepX * 0.5 + (aliX - a.vx) * sp.alignment + cohX * sp.cohesion;
                a.vy += sepY * 0.5 + (aliY - a.vy) * sp.alignment + cohY * sp.cohesion;
            } else {
                // Straying: random walk
                a.vx += (Math.random() - 0.5) * 0.5;
                a.vy += (Math.random() - 0.5) * 0.5;
            }

            if (mouseDown) {
                const dx = mouseX - a.x, dy = mouseY - a.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 1 && d < 200) {
                    a.vx += (dx / d) * 0.3;
                    a.vy += (dy / d) * 0.3;
                }
            }

            // Speed limit
            const spd = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
            if (spd > sp.maxSpeed) {
                a.vx = (a.vx / spd) * sp.maxSpeed;
                a.vy = (a.vy / spd) * sp.maxSpeed;
            }

            // Friction
            a.vx *= (1 - friction);
            a.vy *= (1 - friction);

            a.x += a.vx;
            a.y += a.vy;

            // Wrap
            a.x = ((a.x % W) + W) % W;
            a.y = ((a.y % H) + H) % H;
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
    document.getElementById('friction').addEventListener('input', (e) => { friction = +e.target.value / 100; });

    document.getElementById('breedBtn').addEventListener('click', () => {
        if (species.length < 2) return;
        const a = (Math.random() * species.length) | 0;
        let b = a;
        while (b === a) b = (Math.random() * species.length) | 0;
        const child = {};
        for (const key of Object.keys(species[a])) {
            child[key] = Math.random() < 0.5 ? species[a][key] : species[b][key];
            child[key] *= 0.8 + Math.random() * 0.4; // mutation
        }
        const idx = (Math.random() * species.length) | 0;
        species[idx] = child;
    });

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
