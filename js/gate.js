// --- TRAVA DA FICHA: só imprime depois que todos os testes foram feitos ---
(function () {
    // áudio e touchpad se marcam sozinhos (classe .done); os outros dependem do checkbox
    var TESTS = [
        { nome: 'Teclado e mouse', ok: function () { return byChk('ok-keyboard'); } },
        { nome: 'WebCam', ok: function () { return byChk('ok-webcam'); } },
        { nome: 'Microfone', ok: function () { return byChk('ok-mic'); } },
        { nome: 'Áudio (esquerdo, estéreo e direito)', ok: function () { return allDone(['result-left', 'result-stereo', 'result-right']); } },
        { nome: 'Touchpad', ok: function () { return allDone(['tp-demo-result']); } },
        // não é teste: o nome do técnico é obrigatório para imprimir
        { nome: 'Nome do técnico', campo: 'fx-tecnico', sim: 'Preenchido', nao: 'Não preenchido',
          ok: function () { var el = document.getElementById('fx-tecnico'); return !!(el && el.value.trim()); } },
        // não é teste: a janela do comando (Windows) está verificando se a bateria sobe carga
        { nome: 'Carga da bateria', espera: true, sim: 'Verificada', nao: 'Verificando',
          ok: function () { return !window.fxBattery.pending(); } }
    ];
    function byChk(id) { var el = document.getElementById(id); return !!(el && el.checked); }
    function allDone(ids) {
        return ids.every(function (id) { var el = document.getElementById(id); return el && el.classList.contains('done'); });
    }

    var free = false;

    var gate = document.getElementById('fx-gate');
    var list = document.getElementById('fx-gate-list');
    var printBtn = document.querySelector('.fx-print:not(.fx-hook)');
    var sendBtn = document.getElementById('fx-send-go');

    var TESTES_ONLY = TESTS.filter(function (t) { return !t.campo && !t.espera; });
    function pending() { return free ? [] : TESTS.filter(function (t) { return !t.ok(); }); }
    function testesOk() { return free || TESTES_ONLY.every(function (t) { return t.ok(); }); }

    // modo AirPrint (opção 2 do comando): a ficha salva fica toda travada e só o Imprimir libera
    function soImpressao() { return !free && !!(window.fxPrintOnly && window.fxPrintOnly()); }

    function lockFicha(locked, tudo) {
        var campos = document.querySelectorAll('#fx-sheet input[type="text"], #fx-sheet input[type="date"]');
        campos.forEach(function (el) {
            if (el.dataset.k === 'tecnico' && !tudo) { el.readOnly = false; return; }
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
        var air = soImpressao();
        lockFicha(air || !ok, air);
        printBtn.classList.toggle('locked', !air && falta.length > 0);
        var soBat = falta.length > 0 && falta.every(function (t) { return t.espera; });
        printBtn.title = air ? 'Imprimir ficha (modo AirPrint)' : soBat ? 'Aguarde a verificação de carga da bateria' : falta.length ? 'Conclua todos os testes e preencha o técnico para imprimir' : 'Imprimir ficha';
        sendBtn.classList.toggle('locked', falta.length > 0);
        sendBtn.title = soBat ? 'Aguarde a verificação de carga da bateria' : falta.length ? 'Conclua todos os testes e preencha o técnico para enviar' : 'Enviar ficha';
        if (air) {
            gate.hidden = false;
            gateTitle.textContent = 'Modo AirPrint: esta ficha já foi feita e está travada. Só a impressão está liberada (use “Imprimir na rede”).';
            gateBtn.hidden = true;
            list.innerHTML = '';
            if (typeof updateHighlights === 'function') updateHighlights();
            return;
        }
        gateBtn.hidden = false;
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
    function travado(fn, imprimir) {
        return function () {
            // modo AirPrint: a ficha já foi testada antes; imprimir passa direto (enviar continua travado)
            if (imprimir && soImpressao()) return fn.apply(this, arguments);
            update();
            var falta = pending();
            if (falta.length) {
                if (falta.every(function (t) { return t.campo; })) irParaTecnico();
                else if (falta.every(function (t) { return t.espera; })) document.getElementById('fx-bat').scrollIntoView({ behavior: 'smooth', block: 'center' });
                else gate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            // bateria não subiu carga: o técnico confirma uma vez e o problema fica registrado na ficha
            if (!free && window.fxBattery.needsConfirm()) {
                if (!confirm('A bateria não subiu carga na verificação. Isso ficará registrado na ficha.\n\nContinuar mesmo assim?')) return;
                window.fxBattery.confirm();
            }
            return fn.apply(this, arguments);
        };
    }
    window.fxPrint = travado(window.fxPrint, true);
    window.fxSend = travado(window.fxSend);

    // atualiza quando um checkbox muda ou quando áudio/touchpad marcam um resultado
    // campo "Touchpad" da ficha: vira "OK" quando os clicks do mouse da etapa do touchpad foram feitos
    function syncTpField() {
        var f = document.getElementById('fx-touchpad');
        if (!f) return;
        var demoEl = document.getElementById('tp-demo-result');
        if (!(demoEl && demoEl.classList.contains('done')) || f.value.trim() === 'OK') return;
        f.value = 'OK';
        f.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // quando a ficha é redesenhada (comando do terminal / nova ficha), aplica de novo
    var fxSt = document.getElementById('fx-status');
    if (fxSt && window.MutationObserver) new MutationObserver(syncTpField).observe(fxSt, { childList: true });

    ['ok-keyboard', 'ok-webcam', 'ok-mic'].forEach(function (id) {
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

    // --- LIBERAÇÃO COM SENHA (Alt+Shift+G ou o comando no console) ---
    // A senha não fica no código: só o sal e a conferência do PBKDF2. A aba guarda o valor derivado,
    // que é conferido de novo ao recarregar; marcar a aba à mão não libera nada.
    var PASS = { salt: '6075cd3a343a298203ec0e0bb30bb0b5', iter: 300000, check: '734acb25bc8d96f596833cbcda2a1a65879394fe53a392c032f22ebd3f6f1353' };
    function hexDe(buf) { return Array.from(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
    function bytesDe(h) { return Uint8Array.from(h.match(/../g), function (x) { return parseInt(x, 16); }); }
    function derivar(senha) {
        return crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']).then(function (k) {
            return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytesDe(PASS.salt), iterations: PASS.iter }, k, 256);
        }).then(hexDe);
    }
    function valido(tok) {
        if (!/^[0-9a-f]{64}$/.test(tok || '')) return Promise.resolve(false);
        return crypto.subtle.digest('SHA-256', bytesDe(tok)).then(function (d) { return hexDe(d) === PASS.check; });
    }
    function liberar(tok) {
        free = true;
        try { sessionStorage.setItem('fx-free', tok); } catch (e) {}
        update();
    }
    try {
        var salvo = sessionStorage.getItem('fx-free');
        if (salvo) valido(salvo).then(function (ok) {
            if (ok) { free = true; update(); } else sessionStorage.removeItem('fx-free');
        }).catch(function () {});
    } catch (e) {}

    var toastTimer, gPreso = false, passDlg = null;
    function avisar(msg) {
        var t = document.getElementById('fx-free-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'fx-free-toast';
            t.className = 'bg-toast';
            t.setAttribute('role', 'status');
            document.body.appendChild(t);
        }
        t.textContent = msg;
        void t.offsetWidth;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2500);
    }
    function criarDialogo() {
        var d = document.createElement('dialog');
        d.className = 'fx-pass';
        d.innerHTML = '<form><label for="fx-pass-in">Senha para liberar a ficha</label>' +
            '<input type="password" id="fx-pass-in" autocomplete="off" spellcheck="false">' +
            '<div class="fx-pass-msg" id="fx-pass-msg" role="alert"></div>' +
            '<div class="fx-pass-btns"><button type="button" class="fx-btn ghost" id="fx-pass-no">Cancelar</button>' +
            '<button type="submit" class="fx-btn" id="fx-pass-go">Liberar</button></div></form>';
        document.body.appendChild(d);
        // o que é digitado aqui não pode contar nos testes de teclado e touchpad
        ['keydown', 'keyup'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.stopPropagation(); }); });
        var input = d.querySelector('input'), msg = d.querySelector('.fx-pass-msg'), go = d.querySelector('#fx-pass-go');
        d.querySelector('#fx-pass-no').onclick = function () { d.close(); };
        d.addEventListener('close', function () { input.value = ''; msg.textContent = ''; });
        d.querySelector('form').addEventListener('submit', function (e) {
            e.preventDefault();
            if (go.disabled) return;
            go.disabled = true;
            msg.textContent = '';
            derivar(input.value).then(function (tok) {
                return valido(tok).then(function (ok) {
                    if (ok) { liberar(tok); d.close(); avisar('✓ Ficha liberada'); }
                    else { msg.textContent = 'Senha incorreta.'; input.value = ''; input.focus(); }
                });
            }).catch(function () {
                msg.textContent = 'Não foi possível conferir a senha neste navegador.';
            }).then(function () { go.disabled = false; });
        });
        return d;
    }
    function pedirSenha() {
        if (free) { avisar('✓ Ficha já liberada'); return; }
        if (!passDlg) passDlg = criarDialogo();
        if (!passDlg.open) passDlg.showModal();
        passDlg.querySelector('input').focus();
    }
    Object.defineProperty(window, atob('R2VuZ2Fy'), {
        configurable: true,
        enumerable: false,
        get: function () {
            pedirSenha();
            return 'Digite a senha na página.';
        }
    });

    // Captura antes do teste de teclado, que escuta todas as teclas, para o G não ficar marcado
    // como testado (o e.code vale para qualquer layout de teclado).
    window.addEventListener('keydown', function (e) {
        if (e.code !== 'KeyG' || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        gPreso = true;
        if (!e.repeat) pedirSenha();
    }, true);
    window.addEventListener('keyup', function (e) {
        if (e.code !== 'KeyG' || !gPreso) return;
        gPreso = false;
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);
})();
