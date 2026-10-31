    // --- ÍCONES SVG DAS TECLAS ESPECIAIS ---
    const KEY_ICONS = {
        win: `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="0" y="0" width="9" height="9"/><rect x="11" y="0" width="9" height="9"/><rect x="0" y="11" width="9" height="9"/><rect x="11" y="11" width="9" height="9"/></svg>`,
        cmd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>`,
        option: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h6l10 12h4"/></svg>`
    };

    // --- DETECÇÃO DE SISTEMA OPERACIONAL ---
    function detectarSO() {
        const ua = navigator.userAgent;
        if (/Mac|iPhone|iPad|iPod/.test(ua)) return 'MAC';
        if (/Win/.test(ua)) return 'WINDOWS';
        if (/Linux/.test(ua)) return 'LINUX';
        return 'DESCONHECIDO';
    }

    function ajustarLayoutTeclado() {
        const so = detectarSO();
        const metaLeft = document.getElementById('MetaLeft');
        const altLeft = document.getElementById('AltLeft');
        const ctrlLeft = document.getElementById('ControlLeft');
        const altRight = document.getElementById('AltRight');
        const metaRight = document.getElementById('MetaRight');
        const ctrlRight = document.getElementById('ControlRight');

        if (so === 'MAC') {
            // Lado esquerdo: Control, Option, Command (ícones)
            if (ctrlLeft) ctrlLeft.textContent = 'Control';
            if (altLeft) altLeft.innerHTML = KEY_ICONS.option;
            if (metaLeft) metaLeft.innerHTML = KEY_ICONS.cmd;
            if (metaLeft && altLeft && metaLeft.parentElement) {
                metaLeft.parentElement.insertBefore(altLeft, metaLeft);
            }

            // Lado direito no Mac: só existem Command R e Option R (sem Control R)
            if (metaRight) metaRight.innerHTML = KEY_ICONS.cmd;
            if (altRight) altRight.innerHTML = KEY_ICONS.option;
            if (metaRight && altRight && metaRight.parentElement) {
                metaRight.parentElement.insertBefore(metaRight, altRight);
            }
            if (ctrlRight) ctrlRight.style.display = 'none';
        } else {
            // Windows (padrão): troca "Win" pelo logo vetorial nas duas teclas Win
            if (metaLeft) metaLeft.innerHTML = KEY_ICONS.win;
            if (metaRight) metaRight.innerHTML = KEY_ICONS.win;
        }
    }

    document.addEventListener('DOMContentLoaded', ajustarLayoutTeclado);

    // --- TABS ---
    function toggleDock(force) {
        const dock = document.getElementById('dock');
        const toggle = document.getElementById('dock-toggle');
        const open = typeof force === 'boolean' ? force : !dock.classList.contains('open');
        dock.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open);
        toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }

    function switchTab(name) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
        toggleDock(false);
        if (name === 'preview' && window.syncPreview) {
            syncPreview();
            if (!window._pvTimer) {
                window._pvTimer = setInterval(function () {
                    var pv = document.getElementById('tab-preview');
                    if (!pv || !pv.classList.contains('active')) { clearInterval(window._pvTimer); window._pvTimer = null; return; }
                    var micBar = document.getElementById('mic-bar');
                    var pvMicBar = document.getElementById('pv-mic-bar');
                    if (micBar && pvMicBar) pvMicBar.style.width = micBar.style.width;
                    var micSt = document.getElementById('mic-status');
                    var pvMic = document.getElementById('pv-mic-status');
                    if (micSt && pvMic) { pvMic.textContent = micSt.textContent; pvMic.style.color = micSt.style.color; }
                }, 100);
            }
        }
    }

    document.addEventListener('click', (e) => {
        const dock = document.getElementById('dock');
        if (dock && !dock.contains(e.target)) toggleDock(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggleDock(false);
    });

    // --- COPY TO CLIPBOARD (mac / windows / fallback) ---
    async function copyText(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (e) { /* fallback below */ }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) { return false; }
    }

    async function copyCmd(btn) {
        const row = btn.closest('.cmd-row');
        const code = row.querySelector('.cmd-code').innerText.trim();
        const ok = await copyText(code);
        const original = btn.innerText;
        btn.innerText = ok ? 'Copied' : 'Erro';
        btn.classList.add('copied');
        setTimeout(() => { btn.innerText = original; btn.classList.remove('copied'); }, 1400);
    }

    // --- LÓGICA DO TECLADO ---
    const logBox = document.getElementById('key-log');
    const extraKeysBox = document.getElementById('extra-keys-box');
    let logs = [];

    function updateLog(keyName, keyCode) {
        const time = new Date().toLocaleTimeString();
        logs.unshift(`<div class="log-line">[${time}] Action: <span class="highlight">${keyName}</span> | <span class="code-highlight">id="${keyCode}"</span></div>`);
        if(logs.length > 2) logs.pop();
        logBox.innerHTML = logs.join('');
    }

    function handleDynamicKey(e) {
        let keyElement = document.getElementById(e.code);
        if (!keyElement && e.code) {
            if (extraKeysBox.querySelector('span')) extraKeysBox.innerHTML = '';
            keyElement = document.createElement('div');
            keyElement.className = 'key';
            keyElement.id = e.code;
            keyElement.innerText = e.key.toUpperCase() === " " ? "Espaço" : e.key;
            keyElement.style.padding = '2px 10px';
            keyElement.style.flexGrow = '0';
            keyElement.style.minWidth = '50px';
            keyElement.style.height = '35px';
            extraKeysBox.appendChild(keyElement);
        }
        return keyElement;
    }

    window.addEventListener('keydown', function(e) {
        if (e.target.closest && e.target.closest('.dock, input, textarea, select, [contenteditable]')) return;
        e.preventDefault();
        if (/^Numpad|^NumLock$/.test(e.code)) window._numpadTested = true;
        updateLog(e.key, e.code);
        const keyElement = handleDynamicKey(e);
        if (keyElement) {
            keyElement.classList.remove('tested');
            keyElement.classList.add('pressing');
        }
    });

    window.addEventListener('keyup', function(e) {
        if (e.target.closest && e.target.closest('.dock, input, textarea, select, [contenteditable]')) return;
        e.preventDefault();
        const keyElement = document.getElementById(e.code);
        if (keyElement) {
            keyElement.classList.remove('pressing');
            keyElement.classList.add('tested');
        }
    });

    window.addEventListener('mousedown', function(e) {
        let id = e.button === 0 ? "DemoMouseLeft" : e.button === 2 ? "DemoMouseRight" : null;
        let label = e.button === 0 ? "M. Esquerdo" : e.button === 2 ? "M. Direito" : null;
        if (id) {
            updateLog(label, id);
            const btn = document.getElementById(id);
            if (btn) { btn.classList.remove('tested'); btn.classList.add('pressing'); }
        }
    });

    window.addEventListener('mouseup', function(e) {
        let id = e.button === 0 ? "DemoMouseLeft" : e.button === 2 ? "DemoMouseRight" : null;
        if (id) {
            const btn = document.getElementById(id);
            if (btn) { btn.classList.remove('pressing'); btn.classList.add('tested'); }
        }
    });

    window.addEventListener('contextmenu', e => { if (!(e.target.closest && e.target.closest('input, textarea'))) e.preventDefault(); });

    // --- LÓGICA PERIFÉRICOS ---
    let webcamStream = null;
    async function toggleWebcam() {
        const video = document.getElementById('video');
        const btn = document.getElementById('btn-webcam');
        if (webcamStream) {
            webcamStream.getTracks().forEach(t => t.stop());
            webcamStream = null; video.srcObject = null;
            btn.innerText = "Ligar Câmera"; btn.classList.remove('stop');
        } else {
            try {
                webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = webcamStream;
                btn.innerText = "Desligar Câmera"; btn.classList.add('stop');
            } catch { alert("Erro na WebCam."); }
        }
    }

    let micStream = null, audioContextMic = null, analyser = null, javascriptNode = null;
    async function toggleMicrophone() {
        const btn = document.getElementById('btn-mic');
        const micBar = document.getElementById('mic-bar');
        const micStatus = document.getElementById('mic-status');
        if (micStream) {
            if(javascriptNode) javascriptNode.disconnect();
            if(analyser) analyser.disconnect();
            micStream.getTracks().forEach(t => t.stop());
            micStream = null; micBar.style.width = "0%";
            micStatus.innerText = "Desativado"; btn.innerText = "Ligar Microfone"; btn.classList.remove('stop');
        } else {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                btn.innerText = "Desligar Microfone"; btn.classList.add('stop');
                micStatus.innerText = "Capturando...";
                audioContextMic = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContextMic.createMediaStreamSource(micStream);
                analyser = audioContextMic.createAnalyser(); analyser.fftSize = 256;
                javascriptNode = audioContextMic.createScriptProcessor(256, 1, 1);
                source.connect(analyser); analyser.connect(javascriptNode); javascriptNode.connect(audioContextMic.destination);
                javascriptNode.onaudioprocess = function() {
                    const array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    let values = 0;
                    for (let i = 0; i < array.length; i++) values += array[i];
                    micBar.style.width = Math.min(100, Math.round(((values / array.length) / 120) * 100)) + "%";
                };
            } catch { alert("Erro no Microfone."); }
        }
    }

    // --- TESTE DE ÁUDIO (varrimento de frequência 20Hz-20kHz, em loop) ---
    let audioTested = { left: false, stereo: false, right: false };
    let audioCtx = null, audioOsc = null, audioGain = null, audioPanner = null;
    let audioLoopTimer = null, audioActiveChannel = null;
    const SWEEP_DURATION = 3; // segundos por ciclo do varrimento

    function getVolumeAtual() {
        const el = document.getElementById('audio-volume');
        return el ? el.value / 100 : 0.5;
    }

    function playChannelTest(channel) {
        // Clicou de novo no mesmo canal que já está tocando -> para
        if (audioActiveChannel === channel) {
            stopAudioTest();
            return;
        }
        // Troca de canal: para o anterior e começa o novo
        stopAudioTest();

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioOsc = audioCtx.createOscillator();
        audioGain = audioCtx.createGain();
        audioPanner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

        let panValue = 0;
        if (channel === 'left') panValue = -1;
        if (channel === 'right') panValue = 1;

        if (audioPanner) {
            audioPanner.pan.setValueAtTime(panValue, audioCtx.currentTime);
            audioOsc.connect(audioGain).connect(audioPanner).connect(audioCtx.destination);
        } else {
            audioOsc.connect(audioGain).connect(audioCtx.destination);
        }

        const pico = Math.max(getVolumeAtual() * 0.5, 0.0001);
        audioGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        audioGain.gain.exponentialRampToValueAtTime(pico, audioCtx.currentTime + 0.08);

        audioOsc.start();
        audioActiveChannel = channel;
        markAudioTested(channel);
        setPlayingButtonUI(channel);
        runSweepCycle();
    }

    function runSweepCycle() {
        if (!audioCtx || !audioOsc) return;
        const now = audioCtx.currentTime;
        audioOsc.frequency.cancelScheduledValues(now);
        audioOsc.frequency.setValueAtTime(20, now);
        audioOsc.frequency.exponentialRampToValueAtTime(20000, now + SWEEP_DURATION);
        audioLoopTimer = setTimeout(runSweepCycle, SWEEP_DURATION * 1000);
    }

    function stopAudioTest() {
        if (audioLoopTimer) { clearTimeout(audioLoopTimer); audioLoopTimer = null; }
        if (audioGain && audioCtx) {
            try {
                audioGain.gain.cancelScheduledValues(audioCtx.currentTime);
                audioGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
            } catch (e) {}
        }
        const ctxToClose = audioCtx, oscToStop = audioOsc;
        setTimeout(() => {
            try { if (oscToStop) oscToStop.stop(); } catch (e) {}
            if (ctxToClose) ctxToClose.close().catch(() => {});
        }, 70);
        audioCtx = null; audioOsc = null; audioGain = null; audioPanner = null;
        audioActiveChannel = null;
        setPlayingButtonUI(null);
    }

    function setPlayingButtonUI(channel) {
        document.querySelectorAll('.audio-btn').forEach(b => b.classList.remove('playing'));
        if (!channel) return;
        const map = { left: '.btn-left', stereo: '.btn-stereo', right: '.btn-right' };
        const btn = document.querySelector(map[channel]);
        if (btn) btn.classList.add('playing');
    }

    function markAudioTested(channel) {
        audioTested[channel] = true;
        updateAudioResultsUI();
    }

    function updateAudioResultsUI() {
        const labels = { left: 'Esquerdo', stereo: 'Estéreo', right: 'Direito' };
        Object.keys(labels).forEach(ch => {
            const el = document.getElementById('result-' + ch);
            if (!el) return;
            if (audioTested[ch]) {
                el.innerHTML = `<span class="dot-status">✓</span> ${labels[ch]} — Testado`;
                el.classList.add('done');
            } else {
                el.innerHTML = `<span class="dot-status">○</span> ${labels[ch]} — Não testado`;
                el.classList.remove('done');
            }
        });
    }

    function resetAudioResults() {
        audioTested = { left: false, stereo: false, right: false };
        updateAudioResultsUI();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const volSlider = document.getElementById('audio-volume');
        const volLabel = document.getElementById('volume-value');
        if (volSlider && volLabel) {
            volSlider.addEventListener('input', () => {
                volLabel.textContent = volSlider.value + '%';
            });
        }
    });
