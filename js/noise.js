// --- FUNDO PARTÍCULAS 3D: Three.js com shader de onda Perlin ---
(function () {
    var container = document.getElementById('ascii-bg');
    if (!container || typeof THREE === 'undefined') return;

    var btn = document.getElementById('bg-toggle');
    var bgOff = false;
    try { bgOff = localStorage.getItem('bg-off') === '1'; } catch (e) {}

    var renderer, camera, scene, particles, time = 0;
    var rafId = 0, started = false;

    function init() {
        if (started) return;
        started = true;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
        camera.position.z = 300;
        camera.position.y = 140;
        camera.lookAt(new THREE.Vector3(0, 20, 0));

        scene = new THREE.Scene();

        var sparkCv = document.createElement('canvas');
        sparkCv.width = 64; sparkCv.height = 64;
        var sCtx = sparkCv.getContext('2d');
        var grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 64, 64);
        var tex = new THREE.CanvasTexture(sparkCv);

        var material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uTex: { value: tex }
            },
            vertexShader: document.getElementById('vertex-shader').textContent,
            fragmentShader: document.getElementById('fragment-shader').textContent,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });

        var PlaneGeo = THREE.PlaneBufferGeometry || THREE.PlaneGeometry;
        var plane = new PlaneGeo(1200, 500, 400, 200);
        particles = new THREE.Points(plane, material);
        particles.rotation.x = -Math.PI / 2;
        scene.add(particles);

        container.style.opacity = '1';
    }

    function render() {
        if (bgOff || document.hidden) { rafId = 0; return; }
        rafId = requestAnimationFrame(render);
        time += 0.01;
        particles.material.uniforms.time.value = time;
        renderer.render(scene, camera);
    }

    function start() {
        init();
        if (!rafId && !bgOff) rafId = requestAnimationFrame(render);
    }

    function stop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    function applyBg() {
        btn.classList.toggle('off', bgOff);
        btn.setAttribute('aria-pressed', String(!bgOff));
        btn.title = bgOff ? 'Ligar fundo animado' : 'Desligar fundo animado';
        btn.setAttribute('aria-label', btn.title);
        if (bgOff) { container.style.opacity = '0'; stop(); }
        else { start(); container.style.opacity = '1'; }
    }

    btn.addEventListener('click', function () {
        bgOff = !bgOff;
        try { localStorage.setItem('bg-off', bgOff ? '1' : '0'); } catch (e) {}
        applyBg();
    });

    window.addEventListener('resize', function () {
        if (!renderer) return;
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    document.addEventListener('visibilitychange', function () {
        if (!bgOff && !document.hidden && !rafId) rafId = requestAnimationFrame(render);
    });

    applyBg();
})();
