// --- Motor do fundo ASCII noise (roda num Worker, fora da thread principal) ---
var RAMP = ' .:-=+*#%@';   // caracteres, do mais apagado ao mais forte
var SIZE = 20;             // tamanho do caractere (px) no nível 0 — os níveis abaixo controlam o resto
var SCALE = 0.10;          // escala do ruído (menor = manchas maiores)
var SPEED = 0.8;           // velocidade da animação
var FPS = 16;              // quadros por segundo no nível 0 (era 24)
// Níveis de qualidade: se o PC não aguentar, o fundo desce de nível sozinho
// (caractere maior = menos células; menos quadros = menos trabalho). No último nível, se ainda
// estiver lento, avisa a página, que desliga o fundo.
var LEVELS = [
{ size: 20, fps: 16 },
{ size: 26, fps: 12 },
{ size: 34, fps: 8 }
];
var SLOW_MS = 12;          // tempo de desenho (ms por quadro) acima disso = lento
var level = 0, slowSent = false;
var GRAY_MIN = 45, GRAY_MAX = 200; // cinza mais escuro e mais claro (0-255)

var n = RAMP.length - 1;
var cv, ctx, W = 0, H = 0, dpr = 1, tw, th, cols, rows, atlas, grid;
var mx = -1, my = -1, paused = false, reduce = false, ema = 0, frames = 0, ready = false;

function makeCanvas(w, h) {
if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function hash(x, y, z) {
var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177);
h = Math.imul(h ^ (h >>> 13), 1274126177);
return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function sm(t) { return t * t * (3 - 2 * t); }

// Mesmo ruído de antes (3 oitavas de value noise), mas calculado de forma bem mais barata:
// - os valores aleatórios (hash) são calculados só nos pontos da "grade" do ruído, não em cada célula
// - a parte que depende só da coluna / só da linha é pré-calculada no resize
var OCT_F = [1, 2, 4], OCT_FZ = [1, 1.5, 2], OCT_W = [0.6, 0.28, 0.12];
var colI, colF, rowI, rowF, latW, latH, lat;

function buildLattice() {
colI = []; colF = []; rowI = []; rowF = []; latW = []; latH = []; lat = [];
for (var o = 0; o < 3; o++) {
    var ci = new Int32Array(cols), cf = new Float32Array(cols);
    var ri = new Int32Array(rows), rf = new Float32Array(rows);
    for (var i = 0; i < cols; i++) { var x = i * SCALE * OCT_F[o], xi = Math.floor(x); ci[i] = xi; cf[i] = sm(x - xi); }
    for (var j = 0; j < rows; j++) { var y = j * SCALE * 1.7 * OCT_F[o], yi = Math.floor(y); ri[j] = yi; rf[j] = sm(y - yi); }
    colI.push(ci); colF.push(cf); rowI.push(ri); rowF.push(rf);
    latW.push(ci[cols - 1] + 2); latH.push(ri[rows - 1] + 2);
    lat.push(new Float32Array(latW[o] * latH[o]));
}
}
// valor do ruído em cada ponto da grade, já interpolado no tempo (eixo z)
function fillLattice(z) {
for (var o = 0; o < 3; o++) {
    var zz = z * OCT_FZ[o], zi = Math.floor(zz), zf = sm(zz - zi);
    var L = lat[o], w = latW[o], h = latH[o], p = 0;
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++, p++) {
            var a = hash(x, y, zi);
            L[p] = a + (hash(x, y, zi + 1) - a) * zf;
        }
    }
}
}

function buildAtlas() {
atlas = makeCanvas(tw * (n + 1), th);
var a = atlas.getContext('2d');
// fundo preto opaco: cada caractere já "apaga" a célula antiga ao ser desenhado
a.fillStyle = '#000';
a.fillRect(0, 0, tw * (n + 1), th);
a.font = Math.round(th * 0.95) + 'px ui-monospace, Menlo, Consolas, monospace';
a.textBaseline = 'top';
for (var k = 1; k <= n; k++) {
    var g = Math.round(GRAY_MIN + (GRAY_MAX - GRAY_MIN) * (k / n));
    a.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
    a.fillText(RAMP.charAt(k), k * tw, 0);
}
}
function resize() {
cv.width = Math.round(W * dpr);
cv.height = Math.round(H * dpr);
th = Math.round(SIZE * dpr);
tw = Math.round(SIZE * 0.6 * dpr);
cols = Math.ceil(cv.width / tw);
rows = Math.ceil(cv.height / th);
grid = new Uint8Array(cols * rows).fill(255); // 255 = "nada desenhado ainda" -> força redesenho completo
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, cv.width, cv.height);
buildLattice();
buildAtlas();
// mudar width/height apaga o canvas: redesenha na hora para não piscar
draw(reduce ? 0 : performance.now());
if (!ready) { ready = true; self.postMessage({ type: 'ready' }); }
}
function draw(t) {
var z = t * 0.001 * SPEED, cssW = tw / dpr, cssH = th / dpr, R = 140, R2 = R * R;
var i, j, v, k, dx, dy, d2, idx = 0;
var L0 = lat[0], L1 = lat[1], L2 = lat[2], w0 = latW[0], w1 = latW[1], w2 = latW[2];
var ci0 = colI[0], ci1 = colI[1], ci2 = colI[2], cf0 = colF[0], cf1 = colF[1], cf2 = colF[2];
fillLattice(z);
for (j = 0; j < rows; j++) {
    // parte que só depende da linha: calculada uma vez por linha
    var r0 = rowI[0][j] * w0, r1 = rowI[1][j] * w1, r2 = rowI[2][j] * w2;
    var yf0 = rowF[0][j], yf1 = rowF[1][j], yf2 = rowF[2][j];
    var rowNear = mx >= 0 && j * cssH - my < R && j * cssH - my > -R;
    for (i = 0; i < cols; i++, idx++) {
        var p, a, b, c, d, xf, top, n0, n1, n2;
        p = r0 + ci0[i]; xf = cf0[i]; a = L0[p]; b = L0[p + 1]; c = L0[p + w0]; d = L0[p + w0 + 1];
        top = a + (b - a) * xf; n0 = top + (c + (d - c) * xf - top) * yf0;
        p = r1 + ci1[i]; xf = cf1[i]; a = L1[p]; b = L1[p + 1]; c = L1[p + w1]; d = L1[p + w1 + 1];
        top = a + (b - a) * xf; n1 = top + (c + (d - c) * xf - top) * yf1;
        p = r2 + ci2[i]; xf = cf2[i]; a = L2[p]; b = L2[p + 1]; c = L2[p + w2]; d = L2[p + w2 + 1];
        top = a + (b - a) * xf; n2 = top + (c + (d - c) * xf - top) * yf2;
        v = n0 * 0.6 + n1 * 0.28 + n2 * 0.12;
        if (rowNear) {
            dx = i * cssW - mx; dy = j * cssH - my;
            if (dx < R && dx > -R) {
                d2 = dx * dx + dy * dy;
                if (d2 < R2) v = Math.min(1, v + (1 - Math.sqrt(d2) / R) * 0.35);
            }
        }
        v = (v - 0.2) * 1.6;
        k = v <= 0 ? 0 : v >= 1 ? n : Math.round(v * n);
        // só redesenha as células cujo caractere mudou desde o último quadro
        if (k !== grid[idx]) {
            grid[idx] = k;
            ctx.drawImage(atlas, k * tw, 0, tw, th, i * tw, j * th, tw, th);
        }
    }
}
}
function setLevel(l) {
level = Math.max(0, Math.min(LEVELS.length - 1, l));
SIZE = LEVELS[level].size; FPS = LEVELS[level].fps;
ema = 0; frames = 0;
if (cv) resize();
}
// desce um nível; se já estiver no último, avisa a página que a máquina não aguenta
function degrade() {
if (level < LEVELS.length - 1) setLevel(level + 1);
else if (!slowSent) { slowSent = true; self.postMessage({ type: 'slow' }); }
}
function tick() {
setTimeout(tick, 1000 / FPS);
if (paused || reduce) return;
var s = performance.now();
draw(s);
ema = ema * 0.9 + (performance.now() - s) * 0.1;
// mede o próprio desempenho: se o desenho estiver demorando, simplifica
if (++frames > 20 && ema > SLOW_MS) degrade();
}
self.onmessage = function (e) {
var m = e.data;
if (m.type === 'init') {
    cv = m.canvas; ctx = cv.getContext('2d', { alpha: false });
    W = m.w; H = m.h; dpr = m.dpr; reduce = m.reduce;
    setLevel(m.level || 0);
    if (!reduce) tick();
} else if (m.type === 'resize') {
    if (m.w === W && m.h === H && m.dpr === dpr) return;
    W = m.w; H = m.h; dpr = m.dpr; resize();
} else if (m.type === 'm') {
    mx = m.x; my = m.y;
} else if (m.type === 'pause') {
    paused = m.v;
} else if (m.type === 'degrade') {
    degrade();
}
};
