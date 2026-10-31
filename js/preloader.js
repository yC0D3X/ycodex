// --- PRÉ-LOADER: some sozinho em ~2,8s (não dá para pular) ---
(function () {
    var pl = document.getElementById('preloader');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var done = false;
    function finish() {
        if (done) return;
        done = true;
        document.body.classList.remove('pl-loading');
        pl.style.transition = 'opacity 0.3s ease';
        pl.style.opacity = '0';
        setTimeout(function () { pl.remove(); }, 350);
    }
    // piscar do olho: pálpebra desce (linha de cima), fecha (as duas linhas) e abre de novo
    var top = document.getElementById('pl-eye-top'), bot = document.getElementById('pl-eye-bot');
    var OPEN = '      ', SHUT = '######';
    function eye(t, b) { top.textContent = t; bot.textContent = b; }
    function blink(at) {
        setTimeout(function () { eye(SHUT, OPEN); }, at);        // meio fechado
        setTimeout(function () { eye(SHUT, SHUT); }, at + 50);   // fechado
        setTimeout(function () { eye(SHUT, OPEN); }, at + 140);  // abrindo
        setTimeout(function () { eye(OPEN, OPEN); }, at + 190);  // aberto
    }
    if (!reduce) { blink(650); blink(950); blink(2000); }        // piscada dupla + uma depois do logo
    setTimeout(finish, reduce ? 1000 : 2450);
    // cliques em cima do pré-loader não pulam e não chegam ao testador de mouse
    pl.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    pl.addEventListener('mouseup', function (e) { e.stopPropagation(); });
})();
