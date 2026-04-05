(() => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const W = 800;
    const H = 600;
    canvas.width = W;
    canvas.height = H;

    function fitCanvas() {
        const parent = canvas.parentElement;
        const pw = parent.clientWidth - 16;
        const ph = parent.clientHeight - 16;
        if (pw <= 0 || ph <= 0) return;
        const scale = Math.min(pw / W, ph / H);
        canvas.style.width = Math.floor(W * scale) + 'px';
        canvas.style.height = Math.floor(H * scale) + 'px';
    }
    window.addEventListener('resize', fitCanvas);
    setTimeout(fitCanvas, 30);
    requestAnimationFrame(fitCanvas);

    const NUM_AGENTS = 12000;

    let trail = new Float32Array(W * H);
    let trailBuf = new Float32Array(W * H);
    const agents = [];
    const foods = [];
    let mouseDown = false;
    let mouseRight = false;
    let mouseX = 0, mouseY = 0;

    const params = {
        sensorAngle: Math.PI / 4,
        sensorDist: 12,
        turnSpeed: Math.PI / 4,
        moveSpeed: 1.2,
        depositAmount: 0.08,
        decayFactor: 0.96
    };

    function initAgents() {
        agents.length = 0;
        const cx = W / 2, cy = H / 2;
        for (let i = 0; i < NUM_AGENTS; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 150;
            agents.push({
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r,
                angle: a + Math.PI + (Math.random() - 0.5) * 0.5
            });
        }
    }

    function sense(agent) {
        const sa = params.sensorAngle;
        const sd = params.sensorDist;
        const sample = (offset) => {
            const a = agent.angle + offset;
            const sx = Math.round(agent.x + Math.cos(a) * sd);
            const sy = Math.round(agent.y + Math.sin(a) * sd);
            if (sx >= 0 && sx < W && sy >= 0 && sy < H) return trail[sy * W + sx];
            return 0;
        };
        const fL = sample(-sa);
        const fC = sample(0);
        const fR = sample(sa);

        if (fC > fL && fC > fR) return;
        if (fC < fL && fC < fR) {
            agent.angle += (Math.random() < 0.5 ? -1 : 1) * params.turnSpeed;
        } else if (fL > fR) {
            agent.angle -= params.turnSpeed;
        } else {
            agent.angle += params.turnSpeed;
        }
    }

    function step() {
        for (let i = 0; i < agents.length; i++) {
            const ag = agents[i];
            sense(ag);

            ag.x += Math.cos(ag.angle) * params.moveSpeed;
            ag.y += Math.sin(ag.angle) * params.moveSpeed;

            if (ag.x < 0) { ag.x = 0; ag.angle = Math.random() * Math.PI * 2; }
            else if (ag.x >= W) { ag.x = W - 1; ag.angle = Math.random() * Math.PI * 2; }
            if (ag.y < 0) { ag.y = 0; ag.angle = Math.random() * Math.PI * 2; }
            else if (ag.y >= H) { ag.y = H - 1; ag.angle = Math.random() * Math.PI * 2; }

            const ix = ag.x | 0;
            const iy = ag.y | 0;
            if (ix >= 0 && ix < W && iy >= 0 && iy < H) {
                trail[iy * W + ix] = Math.min(1.0, trail[iy * W + ix] + params.depositAmount);
            }
        }

        for (const f of foods) {
            const r = f.radius;
            const r2 = r * r;
            const fx = f.x | 0, fy = f.y | 0;
            for (let dy = -r; dy <= r; dy++) {
                const ny = fy + dy;
                if (ny < 0 || ny >= H) continue;
                for (let dx = -r; dx <= r; dx++) {
                    const nx = fx + dx;
                    if (nx < 0 || nx >= W) continue;
                    if (dx * dx + dy * dy <= r2) {
                        trail[ny * W + nx] = Math.min(1.0, trail[ny * W + nx] + 0.05);
                    }
                }
            }
        }

        diffuseAndDecay();
    }

    function diffuseAndDecay() {
        const decay = params.decayFactor;
        for (let y = 1; y < H - 1; y++) {
            const row = y * W;
            const rowUp = (y - 1) * W;
            const rowDn = (y + 1) * W;
            for (let x = 1; x < W - 1; x++) {
                const sum =
                    trail[rowUp + x - 1] + trail[rowUp + x] + trail[rowUp + x + 1] +
                    trail[row + x - 1]   + trail[row + x]   + trail[row + x + 1] +
                    trail[rowDn + x - 1] + trail[rowDn + x] + trail[rowDn + x + 1];
                trailBuf[row + x] = (sum / 9) * decay;
            }
        }
        const tmp = trail;
        trail = trailBuf;
        trailBuf = tmp;
    }

    function render() {
        const imgData = ctx.createImageData(W, H);
        const px = imgData.data;
        for (let i = 0; i < W * H; i++) {
            const v = trail[i];
            const t = Math.min(1, v);
            const t2 = t * t;
            const j = i << 2;
            px[j]     = (t2 * 180 + t * 20) | 0;
            px[j + 1] = (t2 * 195 + t * 25) | 0;
            px[j + 2] = (t2 * 140 + t * 115) | 0;
            px[j + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function loop() {
        step();
        render();
        requestAnimationFrame(loop);
    }

    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (W / rect.width),
            y: (e.clientY - rect.top) * (H / rect.height)
        };
    }

    function addFood(cx, cy, radius) {
        foods.push({ x: cx, y: cy, radius });
    }

    function clearArea(cx, cy, radius) {
        const r2 = radius * radius;
        const fx = cx | 0, fy = cy | 0;
        for (let dy = -radius; dy <= radius; dy++) {
            const ny = fy + dy;
            if (ny < 0 || ny >= H) continue;
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = fx + dx;
                if (nx < 0 || nx >= W) continue;
                if (dx * dx + dy * dy <= r2) trail[ny * W + nx] = 0;
            }
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const p = canvasCoords(e);
        mouseX = p.x; mouseY = p.y;
        if (e.button === 2) {
            mouseRight = true;
            clearArea(p.x, p.y, 20);
        } else {
            mouseDown = true;
            addFood(p.x, p.y, 12);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const p = canvasCoords(e);
        mouseX = p.x; mouseY = p.y;
        if (mouseDown) addFood(p.x, p.y, 8);
        if (mouseRight) clearArea(p.x, p.y, 20);
    });

    canvas.addEventListener('mouseup', () => { mouseDown = false; mouseRight = false; });
    canvas.addEventListener('mouseleave', () => { mouseDown = false; mouseRight = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Controls
    document.getElementById('sensorAngle').addEventListener('input', (e) => {
        params.sensorAngle = (+e.target.value) * Math.PI / 180;
    });
    document.getElementById('sensorDist').addEventListener('input', (e) => {
        params.sensorDist = +e.target.value;
    });
    document.getElementById('turnSpeed').addEventListener('input', (e) => {
        params.turnSpeed = (+e.target.value) * Math.PI / 180;
    });
    document.getElementById('decay').addEventListener('input', (e) => {
        params.decayFactor = (+e.target.value) / 100;
    });
    document.getElementById('clearBtn').addEventListener('click', () => {
        trail.fill(0);
        trailBuf.fill(0);
        foods.length = 0;
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        trail.fill(0);
        trailBuf.fill(0);
        foods.length = 0;
        initAgents();
    });

    function randomize() {
        trail.fill(0);
        trailBuf.fill(0);
        foods.length = 0;
        const count = 3 + (Math.random() * 8) | 0;
        for (let i = 0; i < count; i++) {
            foods.push({
                x: 60 + Math.random() * (W - 120),
                y: 60 + Math.random() * (H - 120),
                radius: 8 + (Math.random() * 18) | 0
            });
        }
        agents.length = 0;
        for (let i = 0; i < NUM_AGENTS; i++) {
            const f = foods[(Math.random() * foods.length) | 0];
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 120;
            agents.push({
                x: Math.max(0, Math.min(W - 1, f.x + Math.cos(a) * r)),
                y: Math.max(0, Math.min(H - 1, f.y + Math.sin(a) * r)),
                angle: Math.random() * Math.PI * 2
            });
        }
        params.sensorAngle = (15 + Math.random() * 70) * Math.PI / 180;
        params.sensorDist = 5 + Math.random() * 25;
        params.turnSpeed = (10 + Math.random() * 70) * Math.PI / 180;
        params.decayFactor = 0.88 + Math.random() * 0.1;
        document.getElementById('sensorAngle').value = (params.sensorAngle * 180 / Math.PI) | 0;
        document.getElementById('sensorDist').value = params.sensorDist | 0;
        document.getElementById('turnSpeed').value = (params.turnSpeed * 180 / Math.PI) | 0;
        document.getElementById('decay').value = (params.decayFactor * 100) | 0;
    }

    document.getElementById('randomBtn').addEventListener('click', randomize);

    initAgents();
    loop();
})();
