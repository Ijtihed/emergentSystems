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

    // Schmickl et al. 2016: delta_phi = alpha + beta * N * sign(R - L)
    let alpha = Math.PI;        // 180 degrees
    let beta = 17 * Math.PI / 180; // 17 degrees
    let speed = 0.67;
    let radius = 5.0;
    const particleSize = 3;
    const NUM = 1500;
    let px = new Float32Array(NUM);
    let py = new Float32Array(NUM);
    let ph = new Float32Array(NUM); // heading
    let pn = new Int32Array(NUM);   // neighbor count for coloring

    function init() {
        for (let i = 0; i < NUM; i++) {
            px[i] = Math.random() * W;
            py[i] = Math.random() * H;
            ph[i] = Math.random() * Math.PI * 2;
        }
    }

    function scope(a) {
        while (a > Math.PI * 2) a -= Math.PI * 2;
        while (a < 0) a += Math.PI * 2;
        return a;
    }

    function step() {
        const r2 = (radius * particleSize * 2);
        const r2sq = r2 * r2;

        for (let i = 0; i < NUM; i++) {
            let nLeft = 0, nRight = 0, nTotal = 0;

            for (let j = 0; j < NUM; j++) {
                if (i === j) continue;
                const dx = px[j] - px[i];
                const dy = py[j] - py[i];
                const d2 = dx * dx + dy * dy;
                if (d2 < r2sq) {
                    nTotal++;
                    const sA = scope(Math.atan2(dy, dx));
                    if (scope(sA - ph[i]) < Math.PI) nRight++;
                    else nLeft++;
                }
            }

            pn[i] = nTotal;

            // PPS equation: delta_phi = alpha + beta * N * sign(R - L)
            const deltaPhi = alpha + beta * nTotal * Math.sign(nRight - nLeft);
            ph[i] = scope(ph[i] + deltaPhi);

            // Move forward
            px[i] += speed * particleSize * 2 * Math.cos(ph[i]);
            py[i] += speed * particleSize * 2 * Math.sin(ph[i]);

            // Wrap
            if (px[i] < -particleSize) px[i] = W + particleSize;
            else if (px[i] > W + particleSize) px[i] = -particleSize;
            if (py[i] < -particleSize) py[i] = H + particleSize;
            else if (py[i] > H + particleSize) py[i] = -particleSize;
        }
    }

    function render() {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < NUM; i++) {
            const n = pn[i];
            let c;
            if (n > 35) c = '#f8e302';
            else if (n > 16) c = '#4090e0';
            else if (n > 15) c = '#e060a0';
            else if (n > 12) c = '#a4714b';
            else c = '#30a030';
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(px[i], py[i], particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    document.getElementById('alpha').addEventListener('input', (e) => {
        alpha = (+e.target.value) * Math.PI / 180;
    });
    document.getElementById('beta').addEventListener('input', (e) => {
        beta = (+e.target.value) * Math.PI / 180;
    });
    document.getElementById('speed').addEventListener('input', (e) => {
        speed = +e.target.value / 100;
    });
    document.getElementById('radius').addEventListener('input', (e) => {
        radius = +e.target.value;
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
