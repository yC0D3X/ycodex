    // --- TESTE DE TELA ---
    const stColors = [
        { nome: 'Branco', cor: '#ffffff' },
        { nome: 'Preto', cor: '#000000' },
        { nome: 'Cinza 50%', cor: '#808080' },
        { nome: 'Vermelho', cor: '#ff0000' },
        { nome: 'Verde', cor: '#00ff00' },
        { nome: 'Azul', cor: '#0000ff' },
        { nome: 'Amarelo', cor: '#ffff00' },
        { nome: 'Ciano', cor: '#00ffff' },
        { nome: 'Magenta', cor: '#ff00ff' },
    ];
    let stAutoTimer = null;
    let stIndex = 0;

    function stRenderGrid() {
        const grid = document.getElementById('st-grid');
        grid.innerHTML = stColors.map(c => `
            <div class="st-swatch" style="background:${c.cor}" onclick="stOpen('${c.cor}')">
                <span>${c.nome}</span>
            </div>
        `).join('');
    }

    function stOpen(cor) {
        const overlay = document.getElementById('screen-test-overlay');
        const idx = stColors.findIndex(c => c.cor === cor);
        stIndex = idx >= 0 ? idx : 0;
        overlay.style.background = cor;
        overlay.style.display = 'flex';
        if (overlay.requestFullscreen) {
            overlay.requestFullscreen().catch(() => {});
        }
    }

    function stGoTo(delta) {
        const overlay = document.getElementById('screen-test-overlay');
        if (overlay.style.display !== 'flex') return;
        stStopAuto();
        stIndex = (stIndex + delta + stColors.length) % stColors.length;
        overlay.style.background = stColors[stIndex].cor;
    }

    function stClose() {
        stStopAuto();
        const overlay = document.getElementById('screen-test-overlay');
        overlay.style.display = 'none';
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }

    function stStartAuto() {
        stIndex = 0;
        stOpen(stColors[0].cor);
        stAutoTimer = setInterval(() => {
            stIndex = (stIndex + 1) % stColors.length;
            document.getElementById('screen-test-overlay').style.background = stColors[stIndex].cor;
        }, 1500);
    }

    function stStopAuto() {
        if (stAutoTimer) {
            clearInterval(stAutoTimer);
            stAutoTimer = null;
        }
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) stClose();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') stClose();
        if (e.key === 'ArrowRight') stGoTo(1);
        if (e.key === 'ArrowLeft') stGoTo(-1);
    });

    stRenderGrid();
