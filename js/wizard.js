// --- WIZARD DE TESTES: fluxo sequencial etapa a etapa ---
(function () {
    var TOTAL = 5;
    var current = 0;
    var names = ['', 'Teclado & Mouse', 'Touchpad', 'Microfone', 'WebCam', 'Áudio'];
    var steps = document.querySelectorAll('#tab-tester .test-step');

    function renderProgress() {
        var bar = document.getElementById('wiz-progress');
        var lbl = document.getElementById('wiz-label');
        if (!bar || !lbl) return;
        var html = '';
        for (var i = 1; i <= TOTAL; i++) {
            var cls = i < current ? 'done' : (i === current ? 'current' : '');
            html += '<span class="wiz-dot ' + cls + '"></span>';
            if (i < TOTAL) html += '<span class="wiz-line"></span>';
        }
        bar.innerHTML = html;
        lbl.textContent = 'Etapa ' + current + ' de ' + TOTAL + ' — ' + (names[current] || '');
    }

    function showStep(n) {
        steps.forEach(function (s) { s.classList.toggle('active', +s.dataset.step === n); });
        current = n;
        if (n >= 1 && n <= TOTAL) {
            renderProgress();
            // clona indicadores para a etapa ativa (cada step só tem os seus)
            var activeStep = document.querySelector('.test-step[data-step="' + n + '"]');
            if (activeStep) {
                var oldBar = activeStep.querySelector('.wiz-progress');
                var oldLbl = activeStep.querySelector('.wiz-label');
                if (!oldBar) {
                    var bar = document.getElementById('wiz-progress');
                    var lbl = document.getElementById('wiz-label');
                    if (bar && lbl) {
                        activeStep.insertBefore(lbl, activeStep.firstChild);
                        activeStep.insertBefore(bar, activeStep.firstChild);
                    }
                }
                renderProgress();
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        wizCheckAll();
    }

    window.wizGo = function (n) {
        if (n > TOTAL) {
            // touchpad OK na ficha
            wizSyncTpFicha();
            switchTab('ficha');
            return;
        }
        showStep(n);
    };

    // checa se o botão "Próximo" de cada etapa deve aparecer
    function wizCheckAll() {
        // Etapa 1: checkbox ok-keyboard
        var kb = document.getElementById('ok-keyboard');
        var btn1 = document.getElementById('wiz-next-1');
        if (btn1) btn1.classList.toggle('visible', !!(kb && kb.checked));

        // Etapa 2: checkbox no-touchpad OU demonstração concluída
        var noTp = document.getElementById('no-touchpad');
        var demoEl = document.getElementById('tp-demo-result');
        var demoDone = demoEl && demoEl.classList.contains('done');
        var btn2 = document.getElementById('wiz-next-2');
        if (btn2) btn2.classList.toggle('visible', !!(noTp && noTp.checked) || demoDone);

        // Etapa 3: checkbox ok-mic
        var mic = document.getElementById('ok-mic');
        var btn3 = document.getElementById('wiz-next-3');
        if (btn3) btn3.classList.toggle('visible', !!(mic && mic.checked));

        // Etapa 4: checkbox ok-webcam
        var cam = document.getElementById('ok-webcam');
        var btn4 = document.getElementById('wiz-next-4');
        if (btn4) btn4.classList.toggle('visible', !!(cam && cam.checked));

        // Etapa 5: todos os áudios done
        var audioDone = ['result-left', 'result-stereo', 'result-right'].every(function (id) {
            var el = document.getElementById(id); return el && el.classList.contains('done');
        });
        var btn5 = document.getElementById('wiz-next-5');
        if (btn5) btn5.classList.toggle('visible', audioDone);
    }

    // touchpad na ficha: preenche "OK" se todos os testes passaram
    window.wizSyncTpFicha = function () {
        var f = document.getElementById('fx-touchpad');
        if (!f) return;
        var noTp = document.getElementById('no-touchpad');
        if (noTp && noTp.checked) return;
        var demoEl = document.getElementById('tp-demo-result');
        if (demoEl && demoEl.classList.contains('done')) f.value = 'OK';
    };

    // numpad na ficha: adiciona "+ Numérico" ao campo de teclado quando detectado
    window.syncNumpadFicha = function () {
        var f = document.getElementById('fx-teclado');
        if (!f || !window._numpadTested) return;
        var v = f.value || '';
        if (v && !/Numérico/i.test(v)) f.value = v + ' + Numérico';
    };
    window.addEventListener('keydown', function (e) {
        if (/^Numpad|^NumLock$/.test(e.code) && !window._numpadSynced) {
            window._numpadSynced = true;
            setTimeout(function () { if (window.syncNumpadFicha) syncNumpadFicha(); }, 200);
        }
    });

    // escuta mudanças nos checkboxes e nos resultados de áudio/touchpad
    document.addEventListener('change', function () { setTimeout(wizCheckAll, 50); });

    // MutationObserver para detectar quando .done é adicionado nos resultados
    var obs = new MutationObserver(function () { wizCheckAll(); });
    ['result-left', 'result-stereo', 'result-right', 'tp-demo-result', 'tp-card-scroll', 'tp-card-pinch'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    });

    showStep(0);
})();
