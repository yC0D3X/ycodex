    // --- TESTE DE TOUCHPAD ---
    // O navegador só informa o MOVIMENTO do dedo (relativo), não a posição absoluta no touchpad.
    // Por isso o cursor fica travado (Pointer Lock) e um cursor virtual "pinta" uma grade:
    // falhas no touchpad aparecem como rastro que para, engasga ou pula.
    const TP_COLS = 32, TP_ROWS = 20;   // tamanho da grade a preencher
    const TP_RATIO = 1.6;               // proporção da área (largura / altura), parecida com um touchpad
    const TP_W = 480;                   // largura FIXA da área (px), igual em qualquer tela: o dedo percorre sempre a mesma distância
    const TP_GLITCH = 400;              // movimentos maiores que isso num único evento são ignorados (bug conhecido de alguns navegadores)
    const tpOverlay = document.getElementById('tp-overlay');
    const tpCanvas = document.getElementById('tp-canvas');
    const tpCtx = tpCanvas.getContext('2d');
    let tpTrail = document.createElement('canvas'), tpTrailCtx = tpTrail.getContext('2d');
    let tpCells = new Uint8Array(TP_COLS * TP_ROWS), tpVisited = 0;
    let tpSegs = [];                    // rastro em coordenadas normalizadas (0..1), para redesenhar no resize
    let tpU = 0.5, tpV = 0.5, tpSens = 1, tpOpenFlag = false, tpLocked = false, tpRaf = 0, tpUnlockAt = 0;
    let tpArea = { x: 0, y: 0, w: 1, h: 1 }, tpDpr = 1;
    let tpGest = { up: false, down: false, left: false, right: false, in: false, out: false };

    function tpLayout() {
        tpDpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = window.innerWidth, H = window.innerHeight;
        tpCanvas.width = tpTrail.width = Math.round(W * tpDpr);
        tpCanvas.height = tpTrail.height = Math.round(H * tpDpr);
        // tamanho fixo; só encolhe se a janela for menor que a área
        let w = Math.min(TP_W, W - 48, (H - 140) * TP_RATIO);
        let h = w / TP_RATIO;
        tpArea = { x: (W - w) / 2, y: (H - h) / 2 + 24, w: w, h: h };
        tpRedrawTrail();
    }
    function tpToPx(u, v) { return [(tpArea.x + u * tpArea.w) * tpDpr, (tpArea.y + v * tpArea.h) * tpDpr]; }
    function tpDrawSeg(u0, v0, u1, v1) {
        const a = tpToPx(u0, v0), b = tpToPx(u1, v1);
        tpTrailCtx.beginPath();
        tpTrailCtx.moveTo(a[0], a[1]);
        tpTrailCtx.lineTo(b[0], b[1]);
        tpTrailCtx.stroke();
    }
    function tpRedrawTrail() {
        tpTrailCtx.clearRect(0, 0, tpTrail.width, tpTrail.height);
        tpTrailCtx.strokeStyle = 'rgba(255,255,255,0.85)';
        tpTrailCtx.lineWidth = 2 * tpDpr;
        tpTrailCtx.lineCap = 'round';
        tpTrailCtx.lineJoin = 'round';
        for (let i = 0; i < tpSegs.length; i += 4) tpDrawSeg(tpSegs[i], tpSegs[i + 1], tpSegs[i + 2], tpSegs[i + 3]);
    }
    function tpMark(u, v) {
        // limita nas duas pontas: na borda, o arredondamento pode dar -0,00000001 -> célula -1, que não
        // existe na grade e era contada de novo a cada movimento (cobertura passava de 100%)
        const c = Math.max(0, Math.min(TP_COLS - 1, Math.floor(u * TP_COLS)));
        const r = Math.max(0, Math.min(TP_ROWS - 1, Math.floor(v * TP_ROWS)));
        if (!(c >= 0 && r >= 0)) return; // NaN
        const i = r * TP_COLS + c;
        if (!tpCells[i]) { tpCells[i] = 1; tpVisited++; }
    }
    function tpCoverage() { return Math.min(100, Math.round(tpVisited / tpCells.length * 100)); }

    function tpRender() {
        tpRaf = requestAnimationFrame(tpRender);
        const ctx = tpCtx, d = tpDpr, A = tpArea;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, tpCanvas.width, tpCanvas.height);
        // células: preenchidas = já passou o dedo
        const cw = A.w / TP_COLS * d, ch = A.h / TP_ROWS * d, x0 = A.x * d, y0 = A.y * d;
        ctx.fillStyle = '#0c0c0c';
        ctx.fillRect(x0, y0, A.w * d, A.h * d);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        for (let r = 0; r < TP_ROWS; r++)
            for (let c = 0; c < TP_COLS; c++)
                if (tpCells[r * TP_COLS + c]) ctx.fillRect(x0 + c * cw, y0 + r * ch, cw, ch);
        // linhas da grade
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 1; c < TP_COLS; c++) { const x = Math.round(x0 + c * cw) + 0.5; ctx.moveTo(x, y0); ctx.lineTo(x, y0 + A.h * d); }
        for (let r = 1; r < TP_ROWS; r++) { const y = Math.round(y0 + r * ch) + 0.5; ctx.moveTo(x0, y); ctx.lineTo(x0 + A.w * d, y); }
        ctx.stroke();
        // rastro
        ctx.drawImage(tpTrail, 0, 0);
        // borda da área
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5 * d;
        ctx.strokeRect(x0, y0, A.w * d, A.h * d);
        // cursor virtual
        const p = tpToPx(tpU, tpV);
        ctx.beginPath();
        ctx.arc(p[0], p[1], 7 * d, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p[0], p[1], 14 * d, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2 * d;
        ctx.stroke();
    }

    function tpUpdateHud() {
        document.getElementById('tp-cov').textContent = tpCoverage() + '%';
        document.getElementById('tp-sens').textContent = tpSens.toFixed(1) + 'x';
        for (const k in tpGest) document.getElementById('tp-g-' + k).classList.toggle('on', tpGest[k]);
    }
    // resultado no card, no mesmo padrão do teste de áudio
    function tpSetResult(id, label, ok, notDone) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<span class="dot-status">${ok ? '✓' : '○'}</span> ${label} — ${ok ? 'Testado' : (notDone || 'Não testado')}`;
        el.classList.toggle('done', ok);
    }
    function tpUpdateCard() {
        const g = tpGest;
        tpSetResult('tp-card-cov', 'Cobertura', tpCoverage() === 100);
        tpSetResult('tp-card-scroll', 'Rolagem (2 dedos)', g.up && g.down && g.left && g.right, '<span class="optional-badge">Opcional</span>');
        tpSetResult('tp-card-pinch', 'Pinça (zoom)', g.in && g.out, '<span class="optional-badge">Opcional</span>');
    }
    function tpPanel(title, text, btn) {
        document.getElementById('tp-panel-title').textContent = title;
        document.getElementById('tp-panel-text').textContent = text;
        document.getElementById('tp-btn-go').textContent = btn;
    }

    function tpOpen() {
        tpOpenFlag = true;
        tpOverlay.style.display = 'block';
        tpLayout();
        tpReset();
        tpPanel('Teste de Touchpad', 'O cursor ficará travado. Passe o dedo por toda a superfície do touchpad, em todas as direções, até preencher a grade. Use rolagem com 2 dedos e pinça para testar os gestos.', 'Começar');
        cancelAnimationFrame(tpRaf);
        tpRender();
    }
    function tpClose() {
        tpOpenFlag = false;
        if (document.pointerLockElement === tpCanvas) document.exitPointerLock();
        cancelAnimationFrame(tpRaf);
        tpOverlay.style.display = 'none';
        tpOverlay.classList.remove('locked');
        tpUpdateCard();
    }
    function tpReset() {
        tpCells.fill(0); tpVisited = 0; tpSegs = [];
        tpU = 0.5; tpV = 0.5;
        for (const k in tpGest) tpGest[k] = false;
        tpRedrawTrail();
        tpUpdateHud();
    }
    function tpLock() {
        try {
            const p = tpCanvas.requestPointerLock();
            if (p && p.catch) p.catch(() => tpPanel('Não foi possível travar o cursor', 'O navegador recusou a trava do cursor. Clique de novo em Começar (em alguns navegadores é preciso esperar 1 segundo depois de apertar ESC).', 'Tentar de novo'));
        } catch (e) {}
    }

    document.addEventListener('pointerlockchange', () => {
        const was = tpLocked;
        tpLocked = document.pointerLockElement === tpCanvas;
        if (was && !tpLocked) tpUnlockAt = performance.now();
        tpOverlay.classList.toggle('locked', tpLocked);
        if (!tpLocked && tpOpenFlag) {
            const cov = tpCoverage();
            tpPanel('Pausado — cobertura ' + cov + '%',
                cov === 100 ? 'Grade completa! Se o rastro ficou contínuo em toda a área, o rastreamento do touchpad está ok.'
                            : 'Áreas da grade que continuam vazias, ou trechos em que o rastro parou com o dedo em movimento, indicam possível falha.',
                'Continuar');
        }
    });
    document.addEventListener('pointerlockerror', () => {
        if (tpOpenFlag) tpPanel('Não foi possível travar o cursor', 'O navegador recusou a trava do cursor. Clique de novo em Começar.', 'Tentar de novo');
    });

    document.addEventListener('mousemove', (e) => {
        if (!tpLocked) return;
        let dx = e.movementX || 0, dy = e.movementY || 0;
        if (Math.abs(dx) > TP_GLITCH || Math.abs(dy) > TP_GLITCH || (!dx && !dy)) return;
        const u0 = tpU, v0 = tpV;
        tpU = Math.min(1, Math.max(0, tpU + dx * tpSens / tpArea.w));
        tpV = Math.min(1, Math.max(0, tpV + dy * tpSens / tpArea.h));
        // marca todas as células no caminho (movimentos rápidos pulam várias de uma vez)
        const steps = Math.ceil(Math.max(Math.abs(tpU - u0) * TP_COLS, Math.abs(tpV - v0) * TP_ROWS) * 2) + 1;
        for (let s = 1; s <= steps; s++) tpMark(u0 + (tpU - u0) * s / steps, v0 + (tpV - v0) * s / steps);
        tpSegs.push(u0, v0, tpU, tpV);
        tpDrawSeg(u0, v0, tpU, tpV);
        tpUpdateHud();
    });

    // gestos: rolagem com 2 dedos (wheel) e pinça (wheel + ctrl no Chrome/Edge/Firefox, gesture* no Safari)
    tpOverlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.ctrlKey) { if (e.deltaY < 0) tpGest.out = true; else if (e.deltaY > 0) tpGest.in = true; }
        else if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) { if (e.deltaY < 0) tpGest.up = true; else if (e.deltaY > 0) tpGest.down = true; }
        else { if (e.deltaX < 0) tpGest.left = true; else if (e.deltaX > 0) tpGest.right = true; }
        tpUpdateHud();
    }, { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => tpOverlay.addEventListener(t, (e) => {
        e.preventDefault();
        if (t === 'gesturechange' && e.scale) { if (e.scale > 1.05) tpGest.out = true; if (e.scale < 0.95) tpGest.in = true; tpUpdateHud(); }
    }));

    // enquanto o teste está aberto, teclas e cliques não vão para o testador de teclado/mouse
    window.addEventListener('keydown', (e) => {
        if (!tpOpenFlag) return;
        e.stopImmediatePropagation();
        if (e.key === 'ArrowUp') { tpSens = Math.min(6, tpSens + 0.25); tpUpdateHud(); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { tpSens = Math.max(0.25, tpSens - 0.25); tpUpdateHud(); e.preventDefault(); }
        else if (e.code === 'KeyR') { tpReset(); e.preventDefault(); }
        else if (e.key === 'Escape' && !tpLocked && performance.now() - tpUnlockAt > 400) { tpClose(); e.preventDefault(); }
    }, true);
    window.addEventListener('keyup', (e) => { if (tpOpenFlag) e.stopImmediatePropagation(); }, true);
    ['mousedown', 'mouseup', 'contextmenu'].forEach(t => tpOverlay.addEventListener(t, (e) => {
        e.stopPropagation();
        if (t === 'contextmenu') e.preventDefault();
    }));

    window.addEventListener('resize', () => { if (tpOpenFlag) tpLayout(); });

    // --- DEMO: desenhar X, clicar botões e testar gestos ---
    (function () {
        var dCv = document.getElementById('tp-demo-canvas');
        var dWrap = document.getElementById('tp-demo-wrap');
        if (!dCv || !dWrap) return;
        var dCtx = dCv.getContext('2d');
        var dDrawn = false, dLeft = false, dRight = false, dLocked = false;
        var dPts = 0, dU = 0.5, dV = 0.5, dW = 0, dH = 0;
        var gest = { up: false, down: false, left: false, right: false, 'in': false, out: false };

        function dResize() {
            var rect = dCv.getBoundingClientRect();
            var pr = Math.min(window.devicePixelRatio || 1, 2);
            dW = rect.width; dH = rect.height;
            dCv.width = Math.round(dW * pr);
            dCv.height = Math.round(dH * pr);
            dCtx.setTransform(pr, 0, 0, pr, 0, 0);
            dGuide();
        }
        function dGuide() {
            var isLight = document.documentElement.getAttribute('data-theme') === 'light';
            dCtx.fillStyle = isLight ? '#e8e8e8' : '#0c0c0c';
            dCtx.fillRect(0, 0, dW, dH);
            dCtx.strokeStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)';
            dCtx.lineWidth = 24; dCtx.lineCap = 'round';
            var p = 28;
            dCtx.beginPath();
            dCtx.moveTo(p, p); dCtx.lineTo(dW - p, dH - p);
            dCtx.moveTo(dW - p, p); dCtx.lineTo(p, dH - p);
            dCtx.stroke();
        }
        function dCheck() {
            var ok = dDrawn && dLeft && dRight;
            var el = document.getElementById('tp-demo-result');
            if (el) {
                el.innerHTML = '<span class="dot-status">' + (ok ? '✓' : '○') + '</span> Demonstração — ' + (ok ? 'Concluída' : 'Não concluída');
                el.classList.toggle('done', ok);
            }
        }
        function gestUpdate() {
            for (var k in gest) {
                var el = document.getElementById('tp-d-' + k);
                if (el) el.classList.toggle('on', gest[k]);
            }
            var g = gest;
            var scrollOk = g.up && g.down && g.left && g.right;
            var pinchOk = g['in'] && g.out;
            tpSetResult('tp-card-scroll', 'Rolagem (2 dedos)', scrollOk, '<span class="optional-badge">Opcional</span>');
            tpSetResult('tp-card-pinch', 'Pinça (zoom)', pinchOk, '<span class="optional-badge">Opcional</span>');
        }

        function dToXY(u, v) { return [u * dW, v * dH]; }

        dCv.addEventListener('click', function () {
            if (dLocked) { document.exitPointerLock(); }
            else {
                dResize();
                try { var p = dCv.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
            }
        });
        document.addEventListener('pointerlockchange', function () {
            dLocked = document.pointerLockElement === dCv;
            dCv.style.cursor = dLocked ? 'none' : 'pointer';
        });

        document.addEventListener('mousemove', function (e) {
            if (!dLocked) return;
            var dx = e.movementX || 0, dy = e.movementY || 0;
            if (Math.abs(dx) > 300 || Math.abs(dy) > 300 || (!dx && !dy)) return;
            var u0 = dU, v0 = dV;
            dU = Math.min(1, Math.max(0, dU + dx / dW));
            dV = Math.min(1, Math.max(0, dV + dy / dH));
            var a = dToXY(u0, v0), b = dToXY(dU, dV);
            var isLight = document.documentElement.getAttribute('data-theme') === 'light';
            dCtx.strokeStyle = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
            dCtx.lineWidth = 2; dCtx.lineCap = 'round';
            dCtx.beginPath(); dCtx.moveTo(a[0], a[1]); dCtx.lineTo(b[0], b[1]); dCtx.stroke();
            dPts++;
            if (dPts > 30 && !dDrawn) { dDrawn = true; dCheck(); }
        });

        window.addEventListener('mousedown', function (e) {
            if (e.button === 0 && !dLeft) { dLeft = true; dCheck(); }
            if (e.button === 2 && !dRight) { dRight = true; dCheck(); }
        });
        dCv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        // gestos: rolagem (wheel) e pinça (ctrl+wheel / gesture*)
        dWrap.addEventListener('wheel', function (e) {
            e.preventDefault();
            if (e.ctrlKey) {
                if (e.deltaY < 0) gest.out = true;
                else if (e.deltaY > 0) gest['in'] = true;
            } else if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
                if (e.deltaY < 0) gest.up = true;
                else if (e.deltaY > 0) gest.down = true;
            } else {
                if (e.deltaX < 0) gest.left = true;
                else if (e.deltaX > 0) gest.right = true;
            }
            gestUpdate();
        }, { passive: false });
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
            dWrap.addEventListener(t, function (e) {
                e.preventDefault();
                if (t === 'gesturechange' && e.scale) {
                    if (e.scale > 1.05) gest.out = true;
                    if (e.scale < 0.95) gest['in'] = true;
                    gestUpdate();
                }
            });
        });

        if (dCv.getBoundingClientRect().width > 0) dResize();
        window.addEventListener('resize', function () { if (dCv.getBoundingClientRect().width > 0) dResize(); });
        if (window.IntersectionObserver) {
            var io = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting && !dW) { dResize(); }
            });
            io.observe(dCv);
        }
    })();
