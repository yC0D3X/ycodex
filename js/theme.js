// --- TEMA: escuro (padrão) ou claro. O sol aparece no escuro (vai para o claro); a lua, no claro ---
(function () {
    var root = document.documentElement, btn = document.getElementById('theme-toggle');
    function sync() {
        var light = root.getAttribute('data-theme') === 'light';
        var t = light ? 'Ativar modo escuro' : 'Ativar modo claro';
        btn.title = t;
        btn.setAttribute('aria-label', t);
    }
    btn.addEventListener('click', function () {
        var light = root.getAttribute('data-theme') !== 'light';
        if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
        try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (e) {}
        sync();
    });
    // não registrar o clique no testador de mouse
    btn.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    btn.addEventListener('mouseup', function (e) { e.stopPropagation(); });
    sync();
})();
