// --- LUPA DE ZOOM: arrastar para cima/direita aumenta, para baixo/esquerda diminui ---
// (necessária porque o testador de teclado bloqueia Cmd/Ctrl + e -)
(function () {
    var DEFAULT = 1.0, MIN = 0.3, MAX = 1.5, PX_PER_STEP = 250; // DEFAULT = zoom inicial | 250px de arrasto = 100% de zoom
    var lens = document.getElementById('zoom-lens');
    var label = document.getElementById('zoom-label');
    var root = document.documentElement;
    var zoom = DEFAULT, sx = 0, sy = 0, sz = DEFAULT, dragging = false, hideTimer = null;

    function apply(z, save) {
        z = Math.min(MAX, Math.max(MIN, z));
        if (Math.abs(z - 1) < 0.03) z = 1; // "imã" no 100%
        else if (Math.abs(z - DEFAULT) < 0.03) z = DEFAULT; // e no zoom padrão
        zoom = Math.round(z * 100) / 100;
        root.style.setProperty('--ui-zoom', zoom);
        label.textContent = Math.round(zoom * 100) + '%';
        if (save) { try { localStorage.setItem('ui-zoom-v2', zoom); } catch (e) {} }
    }
    function showLabel(ms) {
        label.classList.add('show');
        clearTimeout(hideTimer);
        if (ms) hideTimer = setTimeout(function () { label.classList.remove('show'); }, ms);
    }

    apply(DEFAULT, false);
    try { var saved = parseFloat(localStorage.getItem('ui-zoom-v2')); if (saved) apply(saved, false); } catch (e) {}

    // não registrar os cliques da lupa no testador de mouse
    lens.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    lens.addEventListener('mouseup', function (e) { e.stopPropagation(); });

    lens.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        dragging = true; sx = e.clientX; sy = e.clientY; sz = zoom;
        lens.setPointerCapture(e.pointerId);
        lens.classList.add('dragging');
        showLabel(0);
    });
    lens.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var d = (e.clientX - sx) - (e.clientY - sy); // direita/cima = positivo
        apply(sz + d / PX_PER_STEP, false);
    });
    function end() {
        if (!dragging) return;
        dragging = false;
        lens.classList.remove('dragging');
        apply(zoom, true);
        showLabel(1200);
    }
    lens.addEventListener('pointerup', end);
    lens.addEventListener('pointercancel', end);
    lens.addEventListener('dblclick', function () { apply(DEFAULT, true); showLabel(1200); });
})();
