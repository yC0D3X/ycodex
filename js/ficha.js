// --- FICHA TÉCNICA ---
// O comando roda no terminal da máquina, coleta as informações e abre este site com os dados
// no próprio link (#ficha=...). Nada passa por servidor. Aqui os dados viram a ficha.
(function () {
    const STORE = 'ficha-v1', STORE_TEC = 'ficha-tecnico';

    // Layout da ficha (igual à folha em papel). Para mudar um campo, mexa só aqui.
    //   ['id', 'Rótulo', 'short' | 'date'] -> campo de texto (short = mais estreito)
    //   {cb: [['id', 'Rótulo', 'código'], ...]} -> grupo de checkboxes
    const LAYOUT = [
        'Identificação',
        [['tecnico', 'Técnico'], ['data', 'Data', 'date']],
        [['estetica', 'Estética']],
        [['marca', 'Marca'], ['modelo', 'Modelo']],
        [['serial', 'Serial'], ['asset', 'Asset tag']],
        [['so', 'Sistema']],
        'Especificação Técnica',
        [['proc', 'Proc'], ['ghz', 'Ghz', 'short'], ['geracao', 'G°', 'short']],
        [['memoria', 'Memória']],
        [['hd', 'HD'], { cb: [['msata', 'Msata'], ['ssd', 'SSD'], ['hdd', 'HD'], ['m2', 'M2']] }],
        [['teclado', 'Teclado']],
        [['video', 'Placa de Vídeo']],
        [['tela', 'Tela']],
        [['usb', 'USB'], ['typec', 'Type C'], ['webcam', 'Webcam']],
        [{ cb: [['biometria', 'Biometria']] }],
        [['leitor', 'Leitor']],
        [['rede', 'Rede/Wi-Fi']],
        [['audio', 'Áudio / Microfone']],
        [['bateria', 'Bateria'], ['fonte', 'Fonte']],
        [['touchpad', 'Touchpad'], { cb: [['trackpoint', 'Trackpoint']] }],
        [{ cb: [['bluetooth', 'Bluetooth']] }],
        [{ cb: [['vga', 'VGA'], ['hdmi', 'HDMI'], ['dp', 'DP'], ['nfc', 'NFC']] }],
        [['quebrado', 'Quebrado']],
        'Destino',
        [{ cb: [['triagem', 'Triagem Armazém', '10'], ['reparo', 'Reparo Armazém', '05'], ['desmonte', 'Desmonte Armazém', '15'], ['estoque', 'Estoque Armazém', '01']] }],
    ];
    const DEFAULTS = { quebrado: 'N/A' };
    const AUTO_X = ['usb', 'typec'];
    const NA_EXCLUDE = ['tecnico', 'data', 'asset'];

    const sheet = document.getElementById('fx-sheet');
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ---------- monta o formulário ----------
    let html = '';
    for (const row of LAYOUT) {
        if (typeof row === 'string') { html += `<div class="fx-section">${esc(row)}</div>`; continue; }
        html += '<div class="fx-row">';
        for (const f of row) {
            if (f.cb) {
                html += '<div class="fx-checks">' + f.cb.map(([id, label, code]) =>
                    `<label class="fx-cb"><input type="checkbox" id="fx-${id}" data-k="${id}"><span class="box"></span><span class="lbl">${esc(label)}</span>${code ? `<span class="code">(${code})</span>` : ''}</label>`
                ).join('') + '</div>';
            } else {
                const [id, label, kind] = f;
                html += `<div class="fx-field${kind === 'short' ? ' short' : ''}"><label for="fx-${id}">${esc(label)}:</label>` +
                        `<input id="fx-${id}" data-k="${id}" type="${kind === 'date' ? 'date' : 'text'}" spellcheck="false"></div>`;
            }
        }
        html += '</div>';
    }
    sheet.innerHTML = html;
    const inputs = Array.from(sheet.querySelectorAll('[data-k]'));
    const byId = (k) => document.getElementById('fx-' + k);

    AUTO_X.forEach((k) => {
        const el = byId(k);
        if (!el) return;
        el.addEventListener('blur', () => {
            const v = el.value.trim();
            if (/^\d+$/.test(v)) { el.value = v + 'x'; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
    });

    // Fonte: auto-append " W" ao sair do campo com valor numérico
    (function () {
        const el = byId('fonte');
        if (!el) return;
        el.addEventListener('blur', () => {
            const v = el.value.trim();
            if (/^\d+$/.test(v)) { el.value = v + ' W'; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
    })();

    // ---------- comando conforme o sistema ----------
    function detectOS() {
        const p = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '').toLowerCase();
        return /win/.test(p) ? 'win' : 'unix';
    }
    // Comando curto: o arquivo f.html do site (ycodex.xyz/f) serve para os dois terminais,
    // baixa o script certo do GitHub e abre a ficha em https://ycodex.xyz/
    const CMDS = { win: 'irm ycodex.xyz/f | iex', unix: 'curl -sL ycodex.xyz/f | sh' };
    window.fxSetOS = function (os) {
        document.getElementById('fx-cmd').textContent = CMDS[os];
        document.getElementById('fx-cmd-tag').textContent = os === 'win' ? 'WINDOWS' : 'MAC / LINUX';
        document.getElementById('fx-cmd-meta').innerHTML = '<span class="dot">●</span>' + (os === 'win' ? 'PowerShell' : 'Terminal');
        document.querySelectorAll('.fx-os button').forEach((b) => b.classList.toggle('on', b.dataset.os === os));
    };
    fxSetOS(detectOS());

    // ---------- dados da máquina -> textos da ficha ----------
    // O Windows PowerShell 5.1 às vezes manda listas como {} (vazia) ou {"value":[...],"Count":n}
    // em vez de [...]: normaliza tudo para array, senão {} vira "Sim" / "[object Object]" na ficha
    const arr = (x) => {
        if (x == null || x === '') return [];
        if (Array.isArray(x)) return x;
        if (typeof x === 'object') return 'value' in x ? arr(x.value) : Object.keys(x).length ? [x] : [];
        return [x];
    };
    const uniq = (a) => a.filter((v, i) => v && a.indexOf(v) === i);
    const BRANDS = [[/lenovo/i, 'Lenovo'], [/hewlett|^hp\b/i, 'HP'], [/dell/i, 'Dell'], [/apple/i, 'Apple'], [/asus/i, 'ASUS'],
                    [/acer/i, 'Acer'], [/samsung/i, 'Samsung'], [/microsoft/i, 'Microsoft'], [/positivo/i, 'Positivo'],
                    [/toshiba|dynabook/i, 'Toshiba'], [/fujitsu/i, 'Fujitsu'], [/micro-star|^msi\b/i, 'MSI'], [/^lg/i, 'LG'], [/vaio|sony/i, 'VAIO']];
    const brandName = (b) => { for (const [rx, n] of BRANDS) if (rx.test(b || '')) return n; return b || ''; };
    // valores "vazios" que os fabricantes gravam no lugar do serial / asset tag
    const PLACEHOLDER = /^(\s*|0+|none|n\/?a|default string|system serial number|to be filled.*|not (specified|available|applicable)|no asset.*|asset-?\d*|chassis serial number|\.+)$/i;
    const real = (v) => (v && !PLACEHOLDER.test(String(v).trim()) ? String(v).trim() : '');

    function cpuClean(n) {
        return (n || '').replace(/\((R|TM|C)\)/gi, '').replace(/\bCPU\b/gi, '').replace(/@.*$/, '').replace(/\b\d+(st|nd|rd|th) Gen\b/i, '')
            .replace(/\s+with\s+.*(Graphics|Gfx).*$/i, '').replace(/\s+\d+-Core Processor$/i, '').replace(/\s+/g, ' ').trim();
    }
    // geração do processador a partir do nome
    function cpuGen(n) {
        n = n || '';
        let m;
        if ((m = n.match(/Ultra\s*[579]\s*(\d)\d{2}/i))) return 'Ultra S' + m[1];          // Core Ultra 7 155H -> Série 1
        if ((m = n.match(/\bi[3579]-(\d{3,5})([A-Z]*)/i))) {
            const d = m[1], suf = m[2] || '';
            if (d.length === 5) return d.slice(0, 2) + 'ª';                                // i7-10510U, i5-12450H
            if (d.length === 3) return '1ª';                                               // i5-520M
            if (d[0] === '1' && (/^[GN]/i.test(suf) || /^1[0-4]/.test(d))) return d.slice(0, 2) + 'ª';  // i5-1135G7, i5-1235U
            return d[0] + 'ª';                                                             // i5-8350U
        }
        if (/\bi[3579]\s+(?:CPU\s+)?[MUQ]?\s*\d{3}\b/i.test(n)) return '1ª';              // i5 CPU M 520 (formato antigo)
        if ((m = n.match(/Ryzen\s+(?:AI\s+)?[3579]\s+(?:PRO\s+)?(\d)\d{3}/i))) return 'Série ' + m[1] + '000';
        if ((m = n.match(/Apple\s+(M\d+)/i))) return m[1];
        return '';
    }
    function ghzOf(cpu) {
        const m = (cpu.name || '').match(/@\s*([\d.]+)\s*GHz/i);
        if (m) return m[1];
        return cpu.mhz ? String(+(cpu.mhz / 1000).toFixed(2)) : '';
    }
    // 1024 GB -> "1 TB", 512 -> "512 GB"
    const gbLabel = (gb) => (!gb ? '' : gb >= 900 ? String(+(gb / 1000).toFixed(gb % 1000 < 60 || gb % 1024 < 60 ? 0 : 1)) + ' TB' : Math.round(gb) + ' GB');
    // tamanho medido (EDID) -> tamanho comercial mais próximo
    const SIZES = [10.1, 11.6, 12, 12.3, 12.5, 13, 13.3, 13.4, 13.5, 13.6, 14, 14.2, 14.5, 15, 15.3, 15.4, 15.6, 16, 16.2, 17, 17.3, 18];
    // Banco de Macs (identificador -> polegadas e nome comercial), lido do arquivo separado macs.json.
    // pol null = vendido em dois tamanhos (vale a medida do script); 0 = sem tela embutida.
    // Se não carregar (sem internet, arquivo aberto direto do disco), a ficha usa o que o script mediu.
    let MACS = {};
    const macsReady = Promise.race([
        fetch('macs.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {}))
            .then((db) => { for (const k in db) if (k[0] !== '_') MACS[k] = [db[k].pol, db[k].nome]; })
            .catch(() => {}),
        new Promise((r) => setTimeout(r, 2500))
    ]);
    // Estado da bateria no estilo Dell, pela % da capacidade original que ainda resta.
    // Ajuste os limites aqui se quiser: [% mínima, nome]
    const BATT_STATES = [[80, 'Excellent'], [60, 'Good'], [40, 'Fair'], [0, 'Poor']];
    const batState = (h) => (BATT_STATES.find(([min]) => h >= min) || [0, 'Poor'])[1];
    // Condição da bateria da Apple (o macOS pode responder em inglês ou em português)
    const COND = [[/^normal$/i, 'Normal'], [/service recommended|manuten..o recomendada/i, 'Manutenção recomendada'],
                  [/replace soon|substituir em breve/i, 'Substituir em breve'], [/replace now|substituir agora/i, 'Substituir agora'],
                  [/service battery|fazer manuten..o/i, 'Manutenção da bateria'], [/check battery|verificar bateria/i, 'Verificar bateria']];
    const batCondition = (c) => { if (!c) return ''; for (const [rx, t] of COND) if (rx.test(c)) return t; return c; };
    function inchLabel(x) {
        if (!x) return '';
        let best = x, d = 0.31;
        for (const s of SIZES) if (Math.abs(s - x) < d) { d = Math.abs(s - x); best = s; }
        return String(+best.toFixed(1)).replace('.', ',') + '"';
    }
    const KBD = {
        '00000416': 'ABNT (PT-BR)', '00010416': 'ABNT2 (PT-BR)', '00000409': 'US', '00020409': 'US Internacional', '00010409': 'US Dvorak',
        '00000816': 'PT (Portugal)', '0000080a': 'Latino-americano', '0000040a': 'Espanhol', '00000809': 'UK',
        'br': 'ABNT2 (PT-BR)', 'br abnt2': 'ABNT2 (PT-BR)', 'us': 'US', 'us intl': 'US Internacional', 'us altgr-intl': 'US Internacional',
        'pt': 'PT (Portugal)', 'latam': 'Latino-americano',
        'brazilian': 'ABNT2 (PT-BR)', 'brazilian - pro': 'ABNT2 (PT-BR)', 'brazilian abnt2': 'ABNT2 (PT-BR)', 'u.s.': 'US', 'abc': 'US (ABC)',
        'u.s. international - pc': 'US Internacional', 'abc - extended': 'US Internacional'
    };
    const kbdName = (k) => (k ? KBD[String(k).toLowerCase().trim()] || k : '');

    function toSheet(d) {
        const v = {}, c = {};
        const cpu = d.cpu || {}, ram = d.ram || {}, mods = arr(ram.modules), disks = arr(d.disks), gpus = arr(d.gpus);
        const scr = d.screen || {}, bat = d.battery || {};
        v.data = (d.ts || '').slice(0, 10);
        v.marca = brandName(d.brand);
        let fam = real(d.family);
        const mod = real(d.model);
        if (d.platform === 'mac' && !/\s/.test(fam)) fam = '';   // Mac Intel: ali vinha só o identificador (MacBookPro16,1)
        const mac = d.platform === 'mac' && Object.hasOwn(MACS, d.sku || '') ? MACS[d.sku] : null;
        if (d.platform === 'mac') v.modelo = ((mac && mac[1]) || fam || mod) + (d.sku ? ` (${d.sku})` : '');
        else if (fam && /lenovo/i.test(d.brand || '') && fam.toLowerCase() !== mod.toLowerCase()) v.modelo = `${fam} (${mod})`;
        else v.modelo = mod || fam;
        v.serial = real(d.serial);
        v.asset = real(d.asset);
        v.so = d.os || '';
        v.proc = cpuClean(cpu.name);
        v.ghz = ghzOf(cpu);
        v.geracao = cpuGen(cpu.name);
        // memória: soma os pentes (o total do sistema vem sem a parte reservada para vídeo)
        const sumMods = mods.reduce((a, m) => a + (+m.gb || 0), 0);
        const total = sumMods || Math.round(+ram.totalGB || 0);
        const mtype = (mods[0] && mods[0].type) || ram.type || '';
        const mspeed = (mods[0] && mods[0].speed) || ram.speed || '';
        let mem = total ? total + ' GB' : '';
        if (mtype) mem += ' ' + mtype;
        if (mspeed) mem += ' ' + mspeed + ' MHz';
        if (mods.length > 1) mem += ' (' + mods.map((m) => Math.round(m.gb) + ' GB').join(' + ') + ')';
        if (ram.slots) mem += ` · ${ram.slots} ${ram.slots > 1 ? 'slots' : 'slot'}`;
        v.memoria = mem;
        v.hd = disks.map((x) => [gbLabel(x.gb), x.type === 'Unspecified' ? '' : x.type, x.bus, x.model ? '– ' + x.model : ''].filter(Boolean).join(' ')).join('  +  ');
        c.m2 = d.platform !== 'mac' && disks.some((x) => /nvme/i.test(x.bus || ''));
        c.ssd = disks.some((x) => x.type === 'SSD' && !/nvme/i.test(x.bus || ''));
        c.hdd = disks.some((x) => x.type === 'HDD');
        v.teclado = kbdName(d.keyboard);
        if (v.teclado && window._numpadTested) v.teclado += ' + Numérico';
        v.video = gpus.map((g) => g.name + (g.vram ? ` (${g.vram < 1 ? Math.round(g.vram * 1024) + ' MB' : g.vram + ' GB'})` : '')).join('  +  ');
        // Mac conhecido: o tamanho do banco prevalece sobre o medido; desktop (0) usa o monitor medido
        v.tela = [inchLabel((mac && mac[0]) || +scr.inches), scr.res, scr.touch ? 'Touch' : ''].filter(Boolean).join(' · ');
        const cams = arr(d.webcam);
        const camName = cams.length ? (cams.filter((n) => !/\bIR\b/i.test(n)).join(' + ') || 'Sim') : 'Não detectada';
        v.webcam = cams.length && camName !== 'Não detectada' ? camName + ' · 720P 16:9 30FPS' : camName;
        c.biometria = arr(d.bio).length > 0;
        v.leitor = uniq(arr(d.reader)).join(' + ');
        const nets = arr(d.net);
        const wifi = uniq(nets.filter((n) => n.kind === 'wifi').map((n) => n.name));
        const eth = uniq(nets.filter((n) => n.kind !== 'wifi').map((n) => n.name.replace(/\s*#\d+$/, '')));
        v.rede = [wifi.length ? 'Wi-Fi: ' + wifi.join(' + ') : 'Wi-Fi: não detectado', eth.length ? 'Ethernet: ' + eth.join(' + ') : ''].filter(Boolean).join(' · ');
        const aud = arr(d.audio);
        const main = aud.find((n) => /realtek|conexant|idt|cirrus|sound ?blaster|apple|speaker|alto-falante/i.test(n)) || aud[0] || '';
        v.audio = [main, 'Mic: ' + (arr(d.mic).length ? 'Sim' : 'não detectado')].filter(Boolean).join(' · ');
        if (!bat.present) v.bateria = 'Não detectada';
        else if (d.platform === 'mac') {
            // Apple: condição informada pelo macOS + ciclos (% só quando o próprio macOS mostra)
            v.bateria = [batCondition(bat.condition), bat.cycles ? `${bat.cycles} ciclos` : '', bat.health != null ? `${bat.health}%` : ''].filter(Boolean).join(' · ');
        } else {
            // Windows / Linux: estado no estilo Dell (Excellent / Good / Fair / Poor) pela % de saúde
            v.bateria = [bat.health != null ? `${batState(bat.health)} (${bat.health}%)` : 'Presente', bat.cycles ? `${bat.cycles} ciclos` : ''].filter(Boolean).join(' · ');
        }
        v.touchpad = arr(d.touchpad).length ? 'Sim' : '';
        c.trackpoint = !!d.trackpoint;
        c.bluetooth = !!d.bt;
        c.nfc = !!d.nfc;
        return { v, c };
    }

    // ---------- estado (salvo no navegador para não perder ao recarregar) ----------
    const empty = () => ({ values: {}, checks: {}, auto: [], ts: '', label: '' });
    let state = empty();
    const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; } };
    const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} };

    function render() {
        for (const el of inputs) {
            const k = el.dataset.k;
            if (k === 'tecnico') continue;
            if (el.type === 'checkbox') el.checked = !!state.checks[k];
            else el.value = state.values[k] != null ? state.values[k] : (DEFAULTS[k] || '');
            el.classList.toggle('auto', state.auto.includes(k));
        }
        try { byId('tecnico').value = localStorage.getItem(STORE_TEC) || ''; } catch (e) {}
        const st = document.getElementById('fx-status');
        if (state.ts) {
            const dt = new Date(state.ts);
            const when = isNaN(dt) ? state.ts : dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            st.innerHTML = `<span class="fx-dot"></span>Dados coletados em ${esc(when)}${state.label ? ' — ' + esc(state.label) : ''}`;
            st.classList.add('ok');
        } else {
            st.innerHTML = '<span class="fx-dot"></span>Aguardando o comando…';
            st.classList.remove('ok');
        }
        if (window.updateFichaGate) window.updateFichaGate();
        if (window.updateHighlights) window.updateHighlights();
        if (window.syncNumpadFicha) window.syncNumpadFicha();
    }

    function applyData(d) {
        const { v, c } = toSheet(d);
        state = empty();
        state.checks = c;
        state.ts = d.ts || '';
        state.label = [v.marca, v.modelo].filter(Boolean).join(' ');
        for (const k in v) if (v[k]) { state.values[k] = v[k]; if (k !== 'data') state.auto.push(k); }
        for (const k in c) if (c[k]) state.auto.push(k);
        save();
        render();
    }

    function decode(code) {
        code = String(code).trim().replace(/^.*#ficha=/, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        while (code.length % 4) code += '=';
        const bin = atob(code);
        const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    }

    // edições manuais (campos de texto e checkboxes)
    function onEdit(e) {
        const el = e.target, k = el.dataset && el.dataset.k;
        if (!k) return;
        if (k === 'tecnico') { try { localStorage.setItem(STORE_TEC, el.value); } catch (er) {} return; }
        if (el.type === 'checkbox') state.checks[k] = el.checked; else state.values[k] = el.value;
        state.auto = state.auto.filter((x) => x !== k);
        el.classList.remove('auto');
        save();
    }
    sheet.addEventListener('input', onEdit);
    sheet.addEventListener('change', (e) => { if (e.target.type === 'checkbox') onEdit(e); });

    window.fxClear = function () {
        if (!confirm('Começar uma ficha nova? Os dados atuais serão apagados (o nome do técnico continua).')) return;
        state = empty();
        save();
        render();
    };
    window.fxImportManual = function () {
        const ta = document.getElementById('fx-import-code');
        let d;
        try { d = decode(ta.value); } catch (e) { alert('Código inválido. Copie o código inteiro que o script mostrou no terminal.'); return; }
        macsReady.then(() => { applyData(d); ta.value = ''; ta.closest('details').open = false; });
    };

    // ---------- impressão: abre a ficha numa página limpa, pronta para Ctrl+P ----------
    window.fxPrint = function () {
        const val = (k) => { const el = byId(k); if (!el) return ''; const v = el.value.trim(); return !v && !NA_EXCLUDE.includes(k) ? 'N/A' : el.value; };
        const chk = (k) => { const el = byId(k); return !!(el && el.checked); };
        // cada seção (título + linhas) vira um bloco; em paisagem a maior vai para a coluna da direita
        const secs = [];
        for (const row of LAYOUT) {
            if (typeof row === 'string') { secs.push({ html: `<h2>${esc(row)}</h2>`, rows: 0 }); continue; }
            const sec = secs[secs.length - 1];
            let h = '<div class="row">';
            for (const f of row) {
                if (f.cb) {
                    h += '<div class="checks">' + f.cb.map(([id, label, code]) =>
                        `<span class="cb"><span class="box">${chk(id) ? '✓' : ''}</span>${esc(label)}${code ? ` <small>(${code})</small>` : ''}</span>`
                    ).join('') + '</div>';
                } else {
                    const [id, label, kind] = f;
                    let v = val(id);
                    if (kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(v)) v = v.split('-').reverse().join('/');
                    h += `<div class="f${kind === 'short' ? ' short' : ''}"><b>${esc(label)}:</b><span class="v">${esc(v)}</span></div>`;
                }
            }
            sec.html += h + '</div>';
            sec.rows++;
        }
        const wrap = (x) => `<section>${x.html}</section>`;
        const big = secs.reduce((a, b) => (b.rows > a.rows ? b : a), secs[0]);
        const portrait = secs.map(wrap).join('');
        const landscape = `<div class="cols"><div>${secs.filter((x) => x !== big).map(wrap).join('')}</div><div>${wrap(big)}</div></div>`;
        const title = 'Ficha Técnica' + (state.label ? ' — ' + state.label : '');
        const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style id="pg">@page { size: A4 portrait; margin: 12mm; }</style><style>
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: #6b6b6b; color: #000; font: 11pt/1.25 Arial, Helvetica, sans-serif; padding: 64px 16px 32px; }
.bar { position: fixed; top: 0; left: 0; right: 0; display: flex; gap: 8px; align-items: center; justify-content: center; padding: 10px; background: #111; color: #fff; font: 13px Arial, sans-serif; z-index: 2; }
.bar button { font: inherit; background: none; color: #fff; border: 1px solid #555; border-radius: 6px; padding: 6px 14px; cursor: pointer; }
.bar button.on { background: #fff; color: #000; border-color: #fff; font-weight: bold; }
.bar .tip { margin-left: 12px; opacity: .75; }
.bar .warn { color: #ffb347; font-weight: bold; margin-left: 12px; }
.bar #net { margin-left: 12px; background: #2f81f7; border-color: #2f81f7; font-weight: bold; }
.sheet { background: #fff; margin: 0 auto; padding: 12mm; width: 210mm; height: 297mm; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.45); }
body.land .sheet { width: 297mm; height: 210mm; }
header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 1mm; }
header h1 { font-size: 16pt; margin: 0; letter-spacing: .5px; }
header span { font-size: 9pt; color: #444; }
h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; background: #e6e6e6; border: 1px solid #000; padding: 1mm 2mm; margin: 4mm 0 1mm; }
.row { display: flex; gap: 5mm; align-items: flex-end; min-height: 8.5mm; padding-top: 1.5mm; }
body.land .row { min-height: 8mm; padding-top: 1.2mm; }
.cols { display: grid; grid-template-columns: 1fr 1.55fr; gap: 9mm; align-items: start; }
.cols > div:first-child .row, body.land .cols > div:first-child .row { flex-wrap: wrap; row-gap: 3mm; min-height: 0; padding-top: 3mm; }
.cols > div:first-child .f { flex-basis: 100%; }
.f { flex: 1; display: flex; align-items: flex-end; gap: 1.5mm; min-width: 0; }
.f.short { flex: 0 0 34mm; }
.f.short .v { white-space: nowrap; }
.f b { white-space: nowrap; }
.v { flex: 1; min-width: 0; border-bottom: 1px solid #000; min-height: 5mm; padding: 0 1mm; font-size: 10pt; overflow-wrap: anywhere; }
.checks { flex: 1; display: flex; flex-wrap: wrap; gap: 2mm 6mm; align-items: center; }
.cb { display: inline-flex; align-items: center; gap: 1.5mm; white-space: nowrap; }
.box { width: 4.2mm; height: 4.2mm; border: 1.3px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; line-height: 1; }
small { color: #444; }
@media print {
  body { background: #fff; padding: 0; }
  .bar { display: none; }
  .sheet, body.land .sheet { width: auto; height: auto; padding: 0; box-shadow: none; overflow: visible; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style></head><body>
<div class="bar"><span>Folha:</span><button data-o="portrait">Retrato</button><button data-o="landscape">Paisagem</button><span class="warn" id="warn" hidden>Não cabe numa folha só</span><span class="tip">Ctrl+P para imprimir</span><button id="net" hidden title="Imprime direto na impressora da rede, sem instalar nada (a janela do comando precisa estar aberta)">Imprimir na rede</button></div>
<div class="sheet"><header><h1>Ficha Técnica</h1><span>yCODEX</span></header><div id="content"></div></div>
<script>
var L = ${JSON.stringify({ portrait, landscape }).replace(/</g, '\u003c')};
function setO(o) {
  document.getElementById('content').innerHTML = L[o];
  document.body.classList.toggle('land', o === 'landscape');
  document.getElementById('pg').textContent = '@page { size: A4 ' + o + '; margin: 12mm; }';
  document.querySelectorAll('.bar button[data-o]').forEach(function (b) { b.classList.toggle('on', b.dataset.o === o); });
  var sh = document.querySelector('.sheet');
  document.getElementById('warn').hidden = sh.scrollHeight <= sh.clientHeight + 1;
  try { localStorage.setItem('ficha-print-orient', o); } catch (e) {}
}
document.querySelectorAll('.bar button[data-o]').forEach(function (b) { b.onclick = function () { setO(b.dataset.o); }; });
// Windows sem impressora instalada: o comando da ficha (janela do PowerShell aberta) entrega a folha
// direto na impressora da rede. A folha vai no link (depois do #) para http://127.0.0.1, só esta máquina.
var net = document.getElementById('net');
net.hidden = !/Windows/.test(navigator.userAgent);
net.onclick = function () {
  var c = document.documentElement.cloneNode(true);
  c.querySelectorAll('script, .bar').forEach(function (e) { e.remove(); });
  var bin = unescape(encodeURIComponent('<!doctype html>' + c.outerHTML));
  var b64 = btoa(bin).split('+').join('-').split('/').join('_').replace(/=+$/, '');
  var land = document.body.classList.contains('land') ? 'L' : 'P';
  window.open('http://127.0.0.1:8631/imprimir#' + land + b64, '_blank');
};
var saved = 'portrait'; try { saved = localStorage.getItem('ficha-print-orient') || 'portrait'; } catch (e) {}
setO(saved === 'landscape' ? 'landscape' : 'portrait');
<\/script>
</body></html>`;
        const w = window.open('', '_blank');
        if (!w) { alert('O navegador bloqueou a nova página. Permita pop-ups para este site e tente de novo.'); return; }
        w.document.open();
        w.document.write(doc);
        w.document.close();
        w.focus();
    };

    // ---------- envio para o sistema do cliente (webhook) ----------
    // O cliente cola o endereço do sistema dele; o navegador manda a ficha inteira em JSON (POST)
    // e do lado dele ele usa os campos que quiser. O endereço fica só neste navegador.
    try { localStorage.removeItem('ficha-envio'); } catch (e) {}
    // [campo, rótulo] na ordem da ficha; o Destino vira também um campo só
    const FIELDS = [], DESTINO = [];
    {
        let sec = '';
        for (const row of LAYOUT) {
            if (typeof row === 'string') { sec = row; continue; }
            for (const f of row) for (const [id, label] of (f.cb || [f])) {
                FIELDS.push([id, label]);
                if (sec === 'Destino') DESTINO.push([id, label]);
            }
        }
        FIELDS.push(['destino', 'Destino marcado']);
    }
    function sendData() {
        const out = {};
        for (const [id] of FIELDS) {
            const el = byId(id);
            out[id] = !el ? '' : el.type === 'checkbox' ? (el.checked ? 'Sim' : 'Não') : (el.value.trim() || (NA_EXCLUDE.includes(id) ? '' : 'N/A'));
        }
        out.destino = DESTINO.filter(([id]) => byId(id).checked).map(([, label]) => label).join(', ');
        return out;
    }

    const panel = document.getElementById('fx-send');
    const urlEl = document.getElementById('fx-send-url');
    const msgEl = document.getElementById('fx-send-msg');
    const goBtn = document.getElementById('fx-send-go');
    const sendMsg = (t, kind) => { msgEl.textContent = t; msgEl.className = 'fx-send-msg' + (kind ? ' ' + kind : ''); };

    // --- toggle mostrar/ocultar chave ---
    window.fxToggleKey = function () {
        const isPassword = urlEl.type === 'password';
        urlEl.type = isPassword ? 'text' : 'password';
        const btn = document.getElementById('fx-eye-btn');
        btn.classList.toggle('active', isPassword);
        btn.title = isPassword ? 'Ocultar' : 'Mostrar';
    };

    // --- QR code da chave ---
    let qrInstance = null;
    window.fxToggleQR = function () {
        const area = document.getElementById('fx-qr-area');
        const btn = document.getElementById('fx-qr-btn');
        if (!area.hidden) { area.hidden = true; btn.classList.remove('active'); return; }
        const raw = urlEl.value.trim();
        if (!raw) { sendMsg('Digite a chave primeiro para gerar o QR Code.', 'err'); return; }
        const container = document.getElementById('fx-qr-code');
        container.innerHTML = '';
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        qrInstance = new QRCode(container, { text: raw, width: 220, height: 220, colorDark: isLight ? '#000000' : '#ffffff', colorLight: isLight ? '#f5f5f5' : '#181818', correctLevel: QRCode.CorrectLevel.M });
        area.hidden = false;
        btn.classList.add('active');
        area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // endereço colado -> URL pronta (ou erro explicando o que está errado)
    function sendUrl() {
        const raw = urlEl.value.trim();
        if (!raw) throw new Error('Cole o endereço do seu sistema no campo acima.');
        let u;
        try { u = new URL(raw); } catch (e) { throw new Error('Endereço inválido: ' + raw + '\nCole o endereço completo, começando com https://'); }
        const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname);
        if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) throw new Error('O endereço precisa começar com https://');
        return u.href;
    }

    function renderDocs() {
        const v = sendData();
        document.getElementById('fx-send-sample').textContent = JSON.stringify(v, null, 2);
        document.getElementById('fx-vars').innerHTML = FIELDS.map(([id, label]) =>
            `<tr><td><code>${esc(id)}</code></td><td>${esc(label)}</td><td>${esc(v[id])}</td></tr>`
        ).join('');
    }

    window.fxSendToggle = function () {
        panel.hidden = !panel.hidden;
        document.getElementById('fx-send-toggle').setAttribute('aria-expanded', String(!panel.hidden));
        if (panel.hidden) return;
        renderDocs();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        urlEl.focus();
    };
    // a documentação mostra o valor de agora
    panel.querySelector('.fx-doc').addEventListener('toggle', (e) => { if (e.target.open) renderDocs(); });
    window.fxSendPreview = function () {
        let url;
        try { url = sendUrl(); } catch (e) { sendMsg(e.message, 'err'); return; }
        sendMsg(`Pré-visualização (nada foi enviado):\n\nPOST ${url}\nContent-Type: application/json\n\n${JSON.stringify(sendData(), null, 2)}`);
    };
    window.fxSend = async function () {
        let url;
        try { url = sendUrl(); } catch (e) { sendMsg(e.message, 'err'); return; }
        goBtn.disabled = true;
        sendMsg('Enviando…');
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 20000);
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sendData()), signal: ctl.signal });
            const txt = (await res.text().catch(() => '')).trim().slice(0, 500);
            if (res.ok) sendMsg(`✓ Ficha enviada (HTTP ${res.status})` + (txt ? `\nResposta: ${txt}` : ''), 'ok');
            else sendMsg(`O seu servidor recusou o envio (HTTP ${res.status}).` + (txt ? `\nResposta: ${txt}` : ''), 'err');
        } catch (e) {
            sendMsg(e.name === 'AbortError'
                ? 'O servidor não respondeu em 20 segundos.'
                : 'Não foi possível enviar. O mais provável é que o servidor não tenha liberado o ycodex.xyz (CORS) ou que o endereço esteja errado. Veja "Liberar o site no seu servidor" na documentação abaixo.', 'err');
        } finally {
            clearTimeout(timer);
            goBtn.disabled = false;
        }
    };

    // outra aba do site recebeu dados novos -> atualiza esta também
    window.addEventListener('storage', (e) => { if (e.key === STORE || e.key === STORE_TEC) { state = load() || empty(); render(); } });

    // Aba única: quando o comando abre uma aba nova com #ficha=..., ela avisa as abas do site que já
    // estavam abertas; se alguma responder, os dados já foram para ela (localStorage) e a aba nova se fecha.
    const chan = 'BroadcastChannel' in window ? new BroadcastChannel('ycodex-ficha') : null;
    if (chan) chan.onmessage = (e) => {
        if (!e.data || e.data.t !== 'nova') return;
        state = load() || empty();
        render();
        switchTab('ficha');
        chan.postMessage({ t: 'ok', id: e.data.id });
        try { window.focus(); } catch (er) {}
    };

    // chegou pelo comando? (#ficha=...)
    state = load() || empty();
    // espera o banco de Macs (no máximo 2,5 s) para a ficha já sair com o modelo e a tela certos
    if (location.hash.indexOf('#ficha=') === 0) macsReady.then(() => {
        let ok = false;
        try {
            applyData(decode(location.hash));
            switchTab('ficha');
            ok = true;
        } catch (e) { console.warn('Ficha: dados inválidos no link', e); }
        history.replaceState(null, '', location.pathname + location.search);
        if (ok && chan) {
            const id = Math.random().toString(36).slice(2);
            chan.addEventListener('message', (e) => { if (e.data && e.data.t === 'ok' && e.data.id === id) window.close(); });
            chan.postMessage({ t: 'nova', id });
        }
    });
    render();
})();
