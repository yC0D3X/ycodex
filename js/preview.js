// --- PREVIEW: relatório de teste estilo profissional ---
(function () {
    var page = document.getElementById('pv-page');
    if (!page) return;

    // auto-scale removido: o .container pai já limita a largura

    // --- Helpers ---
    function isDone(id) { var el = document.getElementById(id); return el && el.classList.contains('done'); }
    function isChk(id) { var el = document.getElementById(id); return el && el.checked; }
    function ts() {
        var d = new Date();
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
    }
    function badgeOk(el) {
        el.className = 'pv-badge ok';
        el.innerHTML = '<span class="dot-status">✓</span> OK';
    }
    function badgePend(el) {
        el.className = 'pv-badge';
        el.innerHTML = '<span class="dot-status">○</span> Não testado';
    }

    // --- Log entries ---
    var logEntries = [];
    var logSet = {};
    function addLog(key, text, ok) {
        if (logSet[key]) return;
        logSet[key] = true;
        logEntries.push({ t: new Date(), text: text, ok: ok });
    }

    function renderLog() {
        var el = document.getElementById('pv-log');
        if (!el) return;
        if (!logEntries.length) { el.textContent = 'Nenhum teste concluído ainda.'; return; }
        el.innerHTML = logEntries.map(function (e) {
            var h = e.t.toLocaleTimeString('pt-BR');
            var cls = e.ok ? 'log-ok' : 'log-pend';
            return '<div class="log-entry"><span class="log-ts">' + h + '</span><span class="' + cls + '">' + e.text + '</span></div>';
        }).join('');
    }

    // --- Main sync ---
    window.syncPreview = function () {
        // Date
        document.getElementById('pv-date').textContent = ts();

        // 1. Keyboard clone
        var srcKb = document.querySelector('#tab-tester .keyboard-wrapper');
        var pvKb = document.getElementById('pv-keyboard');
        if (srcKb && pvKb) pvKb.innerHTML = srcKb.innerHTML;

        // Keyboard badge
        var kbOk = isChk('ok-keyboard');
        var kbBadge = document.getElementById('pv-kb-badge');
        if (kbBadge) { if (kbOk) { badgeOk(kbBadge); addLog('kb', 'Teclado testado e funcionando', true); } else badgePend(kbBadge); }

        // 2. Webcam
        var vid = document.getElementById('video');
        var pvVid = document.getElementById('pv-video');
        var pvWc = document.getElementById('pv-webcam-placeholder');
        var wcOk = isChk('ok-webcam');
        if (vid && pvVid && pvWc) {
            var ligada = vid.srcObject && vid.srcObject.active;
            if (ligada) { pvVid.srcObject = vid.srcObject; pvVid.style.display = 'block'; pvWc.style.display = 'none'; }
            else { pvVid.srcObject = null; pvVid.style.display = 'none'; pvWc.style.display = 'flex'; }
        }
        var wcBadge = document.getElementById('pv-wc-badge');
        if (wcBadge) { if (wcOk) { badgeOk(wcBadge); addLog('wc', 'Webcam testada e funcionando', true); } else badgePend(wcBadge); }

        // 3. Mic
        var micBar = document.getElementById('mic-bar');
        var pvMicBar = document.getElementById('pv-mic-bar');
        if (micBar && pvMicBar) pvMicBar.style.width = micBar.style.width;
        var micSt = document.getElementById('mic-status');
        var pvMic = document.getElementById('pv-mic-status');
        if (micSt && pvMic) { pvMic.textContent = micSt.textContent; pvMic.style.color = micSt.style.color; }
        var micOk = isChk('ok-mic');
        var micBadge = document.getElementById('pv-mic-badge');
        if (micBadge) { if (micOk) { badgeOk(micBadge); addLog('mic', 'Microfone testado e funcionando', true); } else badgePend(micBadge); }

        // 4. Audio
        var aL = isDone('result-left'), aS = isDone('result-stereo'), aR = isDone('result-right');
        [['result-left','pv-result-left'],['result-stereo','pv-result-stereo'],['result-right','pv-result-right']].forEach(function (p) {
            var src = document.getElementById(p[0]), pv = document.getElementById(p[1]);
            if (src && pv) { pv.className = src.className; pv.innerHTML = src.innerHTML; }
        });
        var audioOk = aL && aS && aR;
        var audioBadge = document.getElementById('pv-audio-badge');
        if (audioBadge) { if (audioOk) { badgeOk(audioBadge); addLog('audio', 'Áudio estéreo (E+S+D) testado', true); } else badgePend(audioBadge); }

        // 5. Touchpad
        var tpDemo = isDone('tp-demo-result');
        var noTp = isChk('no-touchpad');
        [['tp-demo-result','pv-tp-demo'],['tp-card-scroll','pv-tp-scroll'],['tp-card-pinch','pv-tp-pinch']].forEach(function (p) {
            var src = document.getElementById(p[0]), pv = document.getElementById(p[1]);
            if (src && pv) { pv.className = src.className; pv.innerHTML = src.innerHTML; }
        });
        var tpOk = noTp || tpDemo;
        var tpBadge = document.getElementById('pv-tp-badge');
        if (tpBadge) {
            if (tpOk) { badgeOk(tpBadge); addLog('tp', noTp ? 'Touchpad marcado como funcionando' : 'Touchpad demonstração concluída', true); }
            else badgePend(tpBadge);
        }

        // 6. Log
        renderLog();

        // 7. Final result
        var allOk = kbOk && wcOk && micOk && audioOk && tpOk;
        var stamp = document.getElementById('pv-stamp');
        var finalT = document.getElementById('pv-final-text');
        if (stamp) {
            stamp.textContent = allOk ? 'APROVADO' : 'PENDENTE';
            stamp.className = 'pv-stamp ' + (allOk ? 'approved' : 'pending');
        }
        if (finalT) finalT.textContent = allOk ? 'Todos os testes foram concluídos com sucesso.' : 'Testes em andamento...';

    };
})();
