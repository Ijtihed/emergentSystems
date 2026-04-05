(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 600, H = 600;
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

    // Triangular lattice: 6 directions
    // On a triangular grid, nodes alternate between "up-pointing" and "down-pointing"
    // We use axial coordinates (q, r) for hex grid
    // Directions: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
    const DQ = [1, 1, 0, -1, -1, 0];
    const DR = [0, -1, -1, 0, 1, 1];

    const GRID_R = 150; // grid radius
    const gridSize = GRID_R * 2 + 1;

    // Edge tracking: for each node (q,r), 6 edges (one per direction)
    // edgeMap[key] = true if that edge has been eaten
    const edgeMap = new Map();

    function edgeKey(q, r, dir) {
        // Canonical form: always store from smaller direction
        const nq = q + DQ[dir], nr = r + DR[dir];
        const opp = (dir + 3) % 6;
        if (q < nq || (q === nq && r < nr)) return `${q},${r},${dir}`;
        return `${nq},${nr},${opp}`;
    }

    function isEaten(q, r, dir) {
        return edgeMap.has(edgeKey(q, r, dir));
    }

    function eatEdge(q, r, dir) {
        edgeMap.set(edgeKey(q, r, dir), true);
    }

    // Worm state
    let wormQ, wormR, wormDir; // incoming direction (the direction worm came FROM)
    let alive = true;
    let totalSteps = 0;
    let stepsPerFrame = 5;

    // Rule table: maps configuration signature to chosen relative direction
    // Configuration: which of the 6 edges at current node are eaten (bitmask)
    // Plus the incoming direction
    // Rule: for each new config encountered, the preset defines which relative turn to take
    // Relative: 0=straight (continue opposite of incoming), 1=slight right, etc.
    let ruleChoices = [];
    let configMap = new Map(); // maps config signature to absolute direction to take
    let nextRuleIdx = 0;

    // Presets: rule sequences per Gardner/Pegg notation
    // Each number is the relative direction chosen for the nth new config
    const presets = {
        'space-filler': [1, 0, 4, 2, 0, 1, 5],
        'spiral': [1, 0, 3],
        'unknown-fate': [1, 1, 0, 4],
        'snowflake': [1, 0, 5, 2, 0, 1, 4]
    };

    function configSignature(q, r, incomingDir) {
        let bits = 0;
        for (let d = 0; d < 6; d++) {
            if (isEaten(q, r, d)) bits |= (1 << d);
        }
        return `${bits},${incomingDir}`;
    }

    function init(presetName) {
        edgeMap.clear();
        configMap.clear();
        nextRuleIdx = 0;
        ruleChoices = presets[presetName] || presets['spiral'];
        wormQ = 0; wormR = 0;
        wormDir = 0; // start heading east
        alive = true;
        totalSteps = 0;
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, W, H);
    }

    function stepWorm() {
        if (!alive) return;

        // Get available (uneaten) edges at current node
        const available = [];
        for (let d = 0; d < 6; d++) {
            if (!isEaten(wormQ, wormR, d)) available.push(d);
        }

        if (available.length === 0) {
            alive = false;
            return;
        }

        // Get config signature
        const sig = configSignature(wormQ, wormR, wormDir);

        let chosenDir;
        if (configMap.has(sig)) {
            chosenDir = configMap.get(sig);
        } else {
            // New config, use next rule choice
            if (nextRuleIdx < ruleChoices.length) {
                // Relative direction: 0=straight ahead (opposite of incoming), rotating clockwise
                const straight = (wormDir + 3) % 6; // opposite of incoming
                const relChoice = ruleChoices[nextRuleIdx];
                chosenDir = (straight + relChoice) % 6;
                nextRuleIdx++;
            } else {
                // No more rules, pick first available
                chosenDir = available[0];
            }
            // If chosen direction is already eaten, pick first available uneaten
            if (isEaten(wormQ, wormR, chosenDir)) {
                chosenDir = available[0];
            }
            configMap.set(sig, chosenDir);
        }

        // If chosen is eaten (can happen with repeated configs), pick any available
        if (isEaten(wormQ, wormR, chosenDir)) {
            const uneaten = available.filter(d => d !== chosenDir);
            if (uneaten.length > 0) chosenDir = uneaten[0];
            else { alive = false; return; }
        }

        // Eat the edge and move
        eatEdge(wormQ, wormR, chosenDir);
        wormQ += DQ[chosenDir];
        wormR += DR[chosenDir];
        wormDir = chosenDir; // direction we came FROM is this direction
        totalSteps++;
    }

    // Hex to pixel conversion (pointy-top hex)
    function hexToPixel(q, r) {
        const size = 2.5;
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + W / 2;
        const y = size * (3 / 2 * r) + H / 2;
        return { x, y };
    }

    function renderEdge(q, r, dir) {
        const p1 = hexToPixel(q, r);
        const p2 = hexToPixel(q + DQ[dir], r + DR[dir]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    function renderStep() {
        // Draw the just-eaten edge
        ctx.strokeStyle = 'rgba(140, 190, 220, 0.8)';
        ctx.lineWidth = 1.5;
        if (totalSteps > 0) {
            const prevQ = wormQ - DQ[wormDir];
            const prevR = wormR - DR[wormDir];
            renderEdge(prevQ, prevR, wormDir);
        }
        // Draw worm head
        const head = hexToPixel(wormQ, wormR);
        ctx.fillStyle = '#e8e8e8';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    const statusEl = document.getElementById('status');

    document.getElementById('preset').addEventListener('change', (e) => {
        init(e.target.value);
    });
    document.getElementById('speed').addEventListener('input', (e) => {
        stepsPerFrame = +e.target.value;
    });
    document.getElementById('randomBtn').addEventListener('click', () => {
        const len = 3 + (Math.random() * 6) | 0;
        const custom = [];
        for (let i = 0; i < len; i++) custom.push((Math.random() * 6) | 0);
        ruleChoices = custom;
        edgeMap.clear(); configMap.clear(); nextRuleIdx = 0;
        wormQ = 0; wormR = 0; wormDir = 0; alive = true; totalSteps = 0;
        ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, W, H);
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        init(document.getElementById('preset').value);
    });

    function loop() {
        tickFps();
        for (let i = 0; i < stepsPerFrame && alive; i++) {
            stepWorm();
            renderStep();
        }
        statusEl.textContent = alive ? 'step ' + totalSteps.toLocaleString() : 'dead at step ' + totalSteps.toLocaleString();
        requestAnimationFrame(loop);
    }

    init('spiral');
    loop();
})();
