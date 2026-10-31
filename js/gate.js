// --- TRAVA DA FICHA: só imprime depois que todos os testes foram feitos ---
(function () {
    // áudio e touchpad se marcam sozinhos (classe .done); os outros dependem do checkbox
    var TESTS = [
        { nome: 'Teclado e mouse', ok: function () { return byChk('ok-keyboard'); } },
        { nome: 'WebCam', ok: function () { return byChk('ok-webcam'); } },
        { nome: 'Microfone', ok: function () { return byChk('ok-mic'); } },
        { nome: 'Áudio (esquerdo, estéreo e direito)', ok: function () { return allDone(['result-left', 'result-stereo', 'result-right']); } },
        { nome: 'Touchpad', ok: function () { return byChk('no-touchpad') || allDone(['tp-demo-result']); } },
        // não é teste: o nome do técnico é obrigatório para imprimir
        { nome: 'Nome do técnico', campo: 'fx-tecnico', sim: 'Preenchido', nao: 'Não preenchido',
          ok: function () { var el = document.getElementById('fx-tecnico'); return !!(el && el.value.trim()); } }
    ];
    function byChk(id) { var el = document.getElementById(id); return !!(el && el.checked); }
    function allDone(ids) {
        return ids.every(function (id) { var el = document.getElementById(id); return el && el.classList.contains('done'); });
    }

    var free = false;
    try { free = sessionStorage.getItem('fx-free') === '1'; } catch (e) {}

    var gate = document.getElementById('fx-gate');
    var list = document.getElementById('fx-gate-list');
    var printBtn = document.querySelector('.fx-print:not(.fx-hook)');
    var sendBtn = document.getElementById('fx-send-go');

    var TESTES_ONLY = TESTS.filter(function (t) { return !t.campo; });
    function pending() { return free ? [] : TESTS.filter(function (t) { return !t.ok(); }); }
    function testesOk() { return free || TESTES_ONLY.every(function (t) { return t.ok(); }); }

    function lockFicha(locked) {
        var campos = document.querySelectorAll('#fx-sheet input[type="text"], #fx-sheet input[type="date"]');
        campos.forEach(function (el) {
            if (el.dataset.k === 'tecnico') return;
            el.readOnly = locked;
        });
        var cbs = document.querySelectorAll('#fx-sheet input[type="checkbox"]');
        cbs.forEach(function (el) { el.disabled = locked; });
        var sheet = document.getElementById('fx-sheet');
        if (sheet) sheet.classList.toggle('fx-locked', locked);
    }

    function update() {
        var falta = pending();
        var ok = testesOk();
        lockFicha(!ok);
        printBtn.classList.toggle('locked', falta.length > 0);
        printBtn.title = falta.length ? 'Conclua todos os testes e preencha o técnico para imprimir' : 'Imprimir ficha';
        sendBtn.classList.toggle('locked', falta.length > 0);
        sendBtn.title = falta.length ? 'Conclua todos os testes e preencha o técnico para enviar' : 'Enviar ficha';
        gate.hidden = falta.length === 0;
        var soCampo = falta.length > 0 && falta.every(function (t) { return t.campo; });
        gateTitle.textContent = soCampo ? 'Preencha o nome do técnico para imprimir ou enviar a ficha:' : 'Conclua todos os testes e preencha o técnico para imprimir ou enviar a ficha:';
        gateBtn.textContent = soCampo ? 'Preencher técnico' : 'Ir para os testes';
        list.innerHTML = TESTS.map(function (t) {
            var ok = t.ok();
            return '<div class="audio-result' + (ok ? ' done' : '') + '"><span class="dot-status">' + (ok ? '✓' : '○') + '</span> ' + t.nome + ' — ' + (ok ? (t.sim || 'Testado') : (t.nao || 'Não testado')) + '</div>';
        }).join('');
        if (typeof updateHighlights === 'function') updateHighlights();
    }
    function irParaTecnico() {
        var el = document.getElementById('fx-tecnico');
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
    }
    var gateTitle = gate.querySelector('.fx-gate-title');
    var gateBtn = gate.querySelector('.standard-btn');
    gateBtn.onclick = function () {
        var falta = pending();
        if (falta.length && falta.every(function (t) { return t.campo; })) irParaTecnico();
        else switchTab('tester');
    };

    // imprimir e enviar passam pela mesma trava
    function travado(fn) {
        return function () {
            update();
            var falta = pending();
            if (falta.length) {
                if (falta.every(function (t) { return t.campo; })) irParaTecnico();
                else gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            return fn.apply(this, arguments);
        };
    }
    window.fxPrint = travado(window.fxPrint);
    window.fxSend = travado(window.fxSend);

    // atualiza quando um checkbox muda ou quando áudio/touchpad marcam um resultado
    // "Não possui touchpad" conta como teste feito e desativa o botão do teste
    var noTp = document.getElementById('no-touchpad');
    noTp.addEventListener('change', function () {
        noTp.closest('.card').classList.toggle('tp-none', noTp.checked);
        syncTpField();
    });

    // campo "Touchpad" da ficha: marcado = sempre "Não possui" (a palavra do técnico vale mais que a
    // detecção automática); ao desmarcar, tira só esse texto
    var TP_OK = 'OK';
    function syncTpField() {
        var f = document.getElementById('fx-touchpad');
        if (!f) return;
        var v = f.value.trim();
        if (noTp.checked && v !== TP_OK) f.value = TP_OK;
        else if (!noTp.checked && v === TP_OK) f.value = '';
        else if (!noTp.checked) {
            var demoEl = document.getElementById('tp-demo-result');
            var demoDone = demoEl && demoEl.classList.contains('done');
            if (demoDone && v !== 'OK') f.value = 'OK';
            else return;
        }
        else return;
        f.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // quando a ficha é redesenhada (comando do terminal / nova ficha), aplica de novo
    var fxSt = document.getElementById('fx-status');
    if (fxSt && window.MutationObserver) new MutationObserver(syncTpField).observe(fxSt, { childList: true });

    ['ok-keyboard', 'ok-webcam', 'ok-mic', 'no-touchpad'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', update);
    });
    var tec = document.getElementById('fx-tecnico');
    if (tec) tec.addEventListener('input', update);
    if (window.MutationObserver) {
        var mo = new MutationObserver(function () { update(); syncTpField(); });
        ['result-left', 'result-stereo', 'result-right', 'tp-demo-result', 'tp-card-scroll', 'tp-card-pinch'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    }
    update();
    window.updateFichaGate = update;

    // atalho de técnico: digitar o nome no console (F12) e dar Enter libera a ficha nesta aba
    // --- DESTAQUE: campos vazios mostram "Obrigatório" como placeholder ---
    var TODOS_HIGHLIGHT = ['tecnico', 'marca', 'modelo', 'serial', 'so', 'proc', 'memoria', 'hd', 'teclado', 'tela', 'audio', 'touchpad', 'estetica', 'fonte', 'usb', 'typec', 'leitor'];

    window.updateHighlights = function () {
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';
        var color = isLight ? '#b8960a' : '#d4a800';
        TODOS_HIGHLIGHT.forEach(function (k) {
            var el = document.getElementById('fx-' + k);
            if (!el) return;
            var label = el.parentElement && el.parentElement.querySelector('label[for="fx-' + k + '"]');
            var vazio = !el.value.trim();
            if (vazio) {
                el.placeholder = 'Obrigatório';
                if (label) label.style.color = color;
            } else {
                el.placeholder = '';
                if (label) label.style.color = '';
            }
        });
    };
    TODOS_HIGHLIGHT.forEach(function (k) {
        var el = document.getElementById('fx-' + k);
        if (el) el.addEventListener('input', window.updateHighlights);
    });
    setTimeout(function () { update(); window.updateHighlights(); }, 100);

    Object.defineProperty(window, atob('R2VuZ2Fy'), {
        configurable: true,
        enumerable: false,
        get: function () {
            free = true;
            try { sessionStorage.setItem('fx-free', '1'); } catch (e) {}
            update();
            return '✓ Ficha liberada';
        }
    });
})();
