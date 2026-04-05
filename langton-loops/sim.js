(() => {
    const fpsEl = document.createElement('div');
    fpsEl.className = 'fps';
    document.body.appendChild(fpsEl);
    let _ft = performance.now(), _fc = 0;
    function tickFps() { _fc++; const n = performance.now(); if (n - _ft >= 500) { fpsEl.textContent = ((_fc / (n - _ft)) * 1000).toFixed(0) + ' fps'; _fc = 0; _ft = n; } }

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const W = 200, H = 200;
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

    // Langton 1984: 8-state self-reproducing loop
    // States: 0=empty, 1=core, 2=sheath, 3-7=signals
    const palette = [
        [8, 8, 8],       // 0: empty (black)
        [40, 80, 160],    // 1: core (blue)
        [200, 60, 60],    // 2: sheath (red)
        [60, 180, 60],    // 3: signal (green)
        [200, 200, 60],   // 4: signal (yellow)
        [200, 60, 200],   // 5: signal (magenta)
        [60, 200, 200],   // 6: signal (cyan)
        [200, 200, 200]   // 7: signal (white)
    ];

    let grid = new Uint8Array(W * H);
    let buf = new Uint8Array(W * H);
    let stepsPerFrame = 5;
    let totalSteps = 0;

    // Langton's transition rules: encoded as a lookup table
    // Key: center,north,east,south,west (sorted rotationally) -> new center
    // We store all 219 rules from Langton's original specification
    const rules = new Map();

    // Langton's 29 transition rules (with rotational symmetry -> expanded to all rotations)
    // Format: CNESW -> C' (center, north, east, south, west -> new center)
    // These are the core rules, expanded by rotation
    const ruleStrings = [
        '00000:0','00001:2','00002:0','00003:0','00005:0','00006:3','00007:1',
        '00011:2','00012:2','00013:2','00021:2','00022:2','00023:2','00026:2','00027:2',
        '00032:0','00052:5','00062:2','00072:2','00102:2','00112:0','00122:0',
        '00202:0','00203:0','00205:0','00212:5','00222:0','00232:2','00262:2',
        '00272:2','00302:0','00320:0','00522:2','00622:2','00722:2',
        '01232:1','01242:1','01252:5','01262:1','01272:1',
        '01275:1','01422:1','01432:1','01442:1','01472:1','01625:1','01722:1',
        '01752:1','01762:1','01772:1',
        '02527:1','10007:7','10011:1','10012:1','10021:1','10024:4','10027:7',
        '10051:1','10101:1','10111:1','10121:1','10202:6','10212:1','10221:1',
        '10224:4','10226:3','10227:7','10232:7','10242:4','10262:6','10264:4',
        '10267:7','10271:7','10272:7','10542:7',
        '11112:1','11122:1','11222:1','11232:1','11242:4','11262:1','11272:1',
        '12224:4','12## 7:7','12243:4','12254:7','12324:4','12327:7','12425:5',
        '12527:5','12622:2',
        '20002:2','20007:1','20012:2','20015:2','20021:2','20022:2','20023:2',
        '20024:2','20025:0','20026:2','20027:2','20032:6','20042:3','20051:7',
        '20052:2','20057:5','20072:2','20102:2','20112:2','20122:2','20142:2',
        '20202:2','20203:2','20205:2','20207:3','20212:2','20215:6','20222:2',
        '20225:2','20227:2','20232:2','20242:2','20245:2','20252:0','20255:2',
        '20262:2','20272:2','20312:2','20321:6','20322:6','20325:2','20342:2',
        '20422:2','20512:2','20522:2','20525:2','20527:2','20532:2','20542:2',
        '20622:2','20672:2','20722:2','20772:2',
        '21122:2','21126:1','21222:2','21224:2','21226:2','21227:2',
        '21422:2','21522:2','21622:2','21722:2',
        '22222:0','22227:2','22272:2','22522:2',
        '25765:2',
        '40112:0','40122:0','40125:0','40212:0','40222:1','40232:6','40252:0',
        '40272:0','40322:1','40525:0',
        '50002:2','50012:2','50022:0','50023:2','50024:2','50025:2','50026:2',
        '50027:2','50052:0','50202:2','50212:2','50222:0','50224:2','50225:2',
        '50232:2','50252:0','50255:2','50262:2','50272:2','50522:2',
        '51222:2','51242:2','51272:2',
        '52222:0','52225:0','52227:2','52522:2','52525:0','52527:2','52622:2',
        '52722:2','52727:2',
        '60002:2','60012:2','60022:0','60122:2','60202:2','60212:2','60222:2',
        '60232:2','60252:2','60262:2','60272:2','60522:2',
        '61222:2','61225:2',
        '62222:0',
        '70002:2','70007:2','70012:2','70022:0','70112:0','70122:5','70125:0',
        '70202:2','70212:6','70222:2','70225:1','70227:2','70232:2','70252:5',
        '70272:2','70522:2','70722:2',
        '71222:2','71722:2','72222:0','72227:2','72272:2','72522:2','72722:2'
    ];

    function buildRules() {
        rules.clear();
        for (const rs of ruleStrings) {
            if (rs.includes('##')) continue; // skip malformed
            const [key, val] = rs.split(':');
            if (key.length !== 5) continue;
            const c = +key[0], n = +key[1], e = +key[2], s = +key[3], w = +key[4];
            const v = +val;
            // Add all 4 rotations
            rules.set(`${c}${n}${e}${s}${w}`, v);
            rules.set(`${c}${w}${n}${e}${s}`, v);
            rules.set(`${c}${s}${w}${n}${e}`, v);
            rules.set(`${c}${e}${s}${w}${n}`, v);
        }
    }

    // Langton's initial loop pattern (placed at center of grid)
    const loopPattern = [
        '022222220',
        '217014140',
        '202222220',
        '272000020',
        '212000020',
        '202000020',
        '272000020',
        '212222220',
        '022222220'
    ];

    function placeLoop(ox, oy) {
        for (let r = 0; r < loopPattern.length; r++) {
            const row = loopPattern[r];
            for (let c = 0; c < row.length; c++) {
                const x = ox + c, y = oy + r;
                if (x >= 0 && x < W && y >= 0 && y < H) {
                    grid[y * W + x] = +row[c];
                }
            }
        }
    }

    function init() {
        grid.fill(0);
        totalSteps = 0;
        const ox = (W / 2 - 4) | 0, oy = (H / 2 - 4) | 0;
        placeLoop(ox, oy);
    }

    function step() {
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const idx = y * W + x;
                const c = grid[idx];
                const n = y > 0 ? grid[(y - 1) * W + x] : 0;
                const e = x < W - 1 ? grid[y * W + x + 1] : 0;
                const s = y < H - 1 ? grid[(y + 1) * W + x] : 0;
                const w = x > 0 ? grid[y * W + x - 1] : 0;
                const key = `${c}${n}${e}${s}${w}`;
                buf[idx] = rules.has(key) ? rules.get(key) : c;
            }
        }
        const tmp = grid; grid = buf; buf = tmp;
        totalSteps++;
    }

    function render() {
        const img = ctx.createImageData(W, H);
        const px = img.data;
        for (let i = 0; i < W * H; i++) {
            const c = palette[grid[i] % palette.length];
            const j = i << 2;
            px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
    }

    const statusEl = document.getElementById('status');
    document.getElementById('speed').addEventListener('input', (e) => { stepsPerFrame = +e.target.value; });
    document.getElementById('resetBtn').addEventListener('click', init);

    function loop() {
        tickFps();
        for (let i = 0; i < stepsPerFrame; i++) step();
        render();
        statusEl.textContent = 'step ' + totalSteps;
        requestAnimationFrame(loop);
    }

    buildRules();
    init();
    loop();
})();
