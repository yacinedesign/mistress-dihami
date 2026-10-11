/* Portada 3D: portal de neón con su foto, cadenas colgando y chispas (Three.js r128) */
(() => {
  const root = document.documentElement;
  const canvas = document.getElementById('hero-gl');
  const hero = document.querySelector('.hero');
  const done = () => { window.dihamiHeroLoaded = true; window.dispatchEvent(new Event('dihami:hero-loaded')); };
  const fail = () => { root.classList.add('no-webgl'); done(); };
  if (!canvas || !hero || !window.THREE) return fail();

  const T = window.THREE;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('sin WebGL');
  } catch (e) { return fail(); }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)').matches;
  const touch = matchMedia('(hover: none)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x050304, 1);

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x060304, 0.05);
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
  const DIST = 10;
  camera.position.set(0, 0, DIST);

  scene.add(new T.AmbientLight(0x3a1016, 1.3));
  const redLight = new T.PointLight(0xff2a45, 3.4, 16, 2);
  redLight.position.set(0, 0.4, 2.4);
  scene.add(redLight);
  const rim = new T.PointLight(0xffffff, 1.2, 22, 2);
  rim.position.set(-5, 6, 6);
  scene.add(rim);

  /* Texturas hechas a mano en un canvas (resplandor y humo) */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  })();
  const smokeTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    for (let i = 0; i < 46; i++) {
      const x = 80 + Math.random() * 352, y = 80 + Math.random() * 352, rad = 40 + Math.random() * 120;
      const r = g.createRadialGradient(x, y, 0, x, y, rad);
      r.addColorStop(0, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 512, 512);
    }
    return new T.CanvasTexture(c);
  })();

  /* Escenario (portal, foto, suelo y reflejo): se escala para encajar en cualquier pantalla */
  const stage = new T.Group();
  scene.add(stage);
  const W = 1.6, BASE = -2.4, TOPC = 0.8;

  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(new T.Vector3(-W, BASE + (TOPC - BASE) * i / 24, 0));
  for (let i = 1; i < 72; i++) { const a = Math.PI - Math.PI * i / 72; pts.push(new T.Vector3(Math.cos(a) * W, TOPC + Math.sin(a) * W, 0)); }
  for (let i = 0; i <= 24; i++) pts.push(new T.Vector3(W, TOPC - (TOPC - BASE) * i / 24, 0));
  const curve = new T.CatmullRomCurve3(pts, false, 'centripetal');

  const neonMats = [];
  const buildArch = (factor) => {
    const g = new T.Group();
    [[0.024, 0xffe6ea, 1], [0.055, 0xff2e4a, .6], [0.12, 0xff1f3d, .24], [0.26, 0xe3122d, .09]].forEach(([r, c, o]) => {
      const m = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      m.userData.base = o * factor;
      neonMats.push(m);
      g.add(new T.Mesh(new T.TubeGeometry(curve, 260, r, 10, false), m));
    });
    return g;
  };
  stage.add(buildArch(1));
  const reflection = buildArch(.22);
  reflection.scale.y = -1;
  reflection.position.y = BASE * 2;
  stage.add(reflection);

  // Suelo oscuro y brillo rojo a los pies del portal
  const fadeTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, '#fff'); r.addColorStop(.55, '#bbb'); r.addColorStop(1, '#000');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new T.CanvasTexture(c);
  })();
  const floor = new T.Mesh(new T.PlaneGeometry(22, 22), new T.MeshBasicMaterial({ color: 0x050304, transparent: true, opacity: .8, alphaMap: fadeTex, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = BASE - 0.01;
  stage.add(floor);
  const pool = new T.Mesh(new T.PlaneGeometry(9, 4.5), new T.MeshBasicMaterial({ map: glowTex, color: 0xff1f3d, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, BASE + 0.005, 0.3);
  stage.add(pool);
  const halo = new T.Mesh(new T.PlaneGeometry(12, 12), new T.MeshBasicMaterial({ map: glowTex, color: 0x8a0a1c, transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 0.2, -2.5);
  stage.add(halo);
  const smokes = [0, 1].map(i => {
    const m = new T.Mesh(new T.PlaneGeometry(16, 16), new T.MeshBasicMaterial({ map: smokeTex, color: 0xb0122a, transparent: true, opacity: .32, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.set(i ? 2 : -2, i ? -1 : 0.6, -1.6 - i);
    stage.add(m);
    return m;
  });

  // Su foto dentro del arco, con aparición, ondas y aberración de color
  const fallbackImg = document.querySelector('.hero-fallback img');
  const PW = 2 * W - 0.08, PH = 4.76;
  const uniforms = {
    uTex: { value: null }, uTime: { value: 0 }, uReveal: { value: 0 }, uFade: { value: 0 },
    uMouse: { value: new T.Vector2(.5, .55) }, uSize: { value: new T.Vector2(PW, PH) },
    uTopC: { value: TOPC }, uRw: { value: W - 0.05 }, uPA: { value: PW / PH }, uIA: { value: 1133 / 1700 }
  };
  const photo = new T.Mesh(new T.PlaneGeometry(PW, PH), new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      uniform sampler2D uTex; uniform float uTime, uReveal, uFade, uTopC, uRw, uPA, uIA; uniform vec2 uMouse, uSize;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
      void main(){
        vec2 p = (vUv - .5) * uSize;
        float d = p.y < uTopC ? abs(p.x) - uRw : length(p - vec2(0., uTopC)) - uRw;
        float mask = 1. - smoothstep(-.025, 0., d);
        if (mask <= 0.) discard;
        float md = distance(vUv, uMouse);
        vec2 uv = vUv + (vUv - uMouse) * .014 * sin(md * 30. - uTime * 2.4) * smoothstep(.42, 0., md);
        uv += vec2(sin(uTime * .4 + vUv.y * 3.), cos(uTime * .3 + vUv.x * 3.)) * .0018;
        float k = uPA / uIA;
        vec2 iuv = uv;
        if (k < 1.) iuv.x = (iuv.x - .5) * k + .5; else iuv.y = (iuv.y - .5) / k + .5;
        float ca = .002 + md * .004;
        vec3 col = vec3(texture2D(uTex, iuv + vec2(ca, 0.)).r, texture2D(uTex, iuv).g, texture2D(uTex, iuv - vec2(ca, 0.)).b);
        float edge = smoothstep(-.9, 0., d);
        col = mix(col, col * vec3(1.15, .5, .55), edge * .65);
        col *= 1. - edge * .5;
        col *= mix(.25, 1., smoothstep(-uSize.y * .5, -uSize.y * .5 + 1.1, p.y));
        float n = noise(vUv * 6.) * .6 + noise(vUv * 22.) * .4;
        float r = uReveal * 1.3 - .15;
        float show = 1. - smoothstep(r - .05, r, n);
        float glow = smoothstep(.07, 0., abs(n - r)) * step(uReveal, .99);
        col += vec3(1., .16, .26) * glow * 1.6;
        gl_FragColor = vec4(col, mask * max(show, glow) * (1. - uFade));
      }`
  }));
  photo.position.z = -0.02;
  stage.add(photo);
  const loader = new T.TextureLoader();
  loader.load(fallbackImg ? fallbackImg.src : 'img/portada.jpg', tex => {
    tex.minFilter = T.LinearFilter;
    uniforms.uTex.value = tex;
    done();
  }, undefined, () => done());

  /* Cadenas colgando del techo */
  const linkGeo = new T.TorusGeometry(0.1, 0.027, 8, 20);
  const chainMat = new T.MeshStandardMaterial({ color: 0xbdb5b8, metalness: .85, roughness: .3 });
  const chains = [];
  const makeChain = (n, phase) => {
    const g = new T.Group();
    for (let i = 0; i < n; i++) {
      const l = new T.Mesh(linkGeo, chainMat);
      l.scale.set(1, 1.55, 1);
      l.position.y = -i * 0.25;
      l.rotation.y = i % 2 ? Math.PI / 2 : 0;
      g.add(l);
    }
    g.userData.phase = phase;
    scene.add(g);
    chains.push(g);
    return g;
  };
  const chainSpec = small ? [[-1, .44, 0, 26], [1, .44, .6, 30]] : [[-1, .43, 0, 30], [-1, .33, -1.6, 24], [1, .43, .3, 34], [1, .34, -1.2, 26]];
  chainSpec.forEach((s, i) => { const g = makeChain(s[3], i * 1.7); g.userData.spec = s; });

  /* Chispas que flotan hacia arriba */
  const COUNT = small ? 220 : 520;
  const pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - .5) * 12;
    pos[i * 3 + 1] = (Math.random() - .5) * 8;
    pos[i * 3 + 2] = (Math.random() - .5) * 6;
    seed[i] = Math.random();
  }
  const pGeo = new T.BufferGeometry();
  pGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  pGeo.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
  const pUni = { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
  const embers = new T.Points(pGeo, new T.ShaderMaterial({
    uniforms: pUni, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uPR; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (.12 + aSeed * .22) + 4., 8.) - 4.;
        p.x += sin(uTime * .5 + aSeed * 30.) * .3;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2. + aSeed * 5.) * uPR * (7. / -mv.z);
        vA = (.3 + .7 * aSeed) * smoothstep(-4., -2.6, p.y) * (1. - smoothstep(2.4, 4., p.y));
      }`,
    fragmentShader: `
      varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d);
        gl_FragColor = vec4(1., .3 + .35 * (1. - d * 2.), .36, a * vA); }`
  }));
  scene.add(embers);

  /* Encaje en pantalla */
  const view = { vh: 1, vw: 1, s: 1 };
  const frame = () => {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vh = 2 * DIST * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
    const narrow = camera.aspect < .9;
    const hFrac = narrow ? .47 : .7, center = narrow ? .37 : .45;
    let s = (vh * hFrac) / 4.8;
    s = Math.min(s, (vw * (narrow ? .72 : .5)) / 3.2);
    stage.scale.setScalar(s);
    stage.position.y = vh * (.5 - center);
    chains.forEach(g => {
      const [side, fx, z] = g.userData.spec;
      g.scale.setScalar(Math.max(s, .55));
      g.position.set(side * vw * fx, vh / 2 + .3, z);
    });
    Object.assign(view, { vh, vw, s });
  };
  frame();
  addEventListener('resize', frame);

  /* Interacción: la cámara sigue al ratón y la foto ondula donde apuntas */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const target = { x: 0, y: 0 }, cam = { x: 0, y: 0 };
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    target.x = ndc.x; target.y = ndc.y;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(photo)[0];
    if (hit && hit.uv) uniforms.uMouse.value.copy(hit.uv);
  });

  /* Aparición: el neón se enciende parpadeando y la foto se materializa */
  let introT0 = -1;
  const flickerOn = t => {
    if (t < 0) return 0;
    const steps = [[0, 0], [.08, 1], [.14, .1], [.24, 1], [.3, .25], [.42, 1]];
    let v = 1;
    for (let i = steps.length - 1; i >= 0; i--) if (t >= steps[i][0]) { v = steps[i][1]; break; }
    return t > .42 ? 1 : v;
  };
  const startIntro = () => { if (introT0 < 0) introT0 = performance.now(); };
  addEventListener('dihami:ready', startIntro);
  if (root.classList.contains('is-ready')) startIntro();

  /* Bucle de dibujo (solo mientras la portada se ve) */
  let visible = true, raf = 0;
  const clock = new T.Clock();
  const ease = x => 1 - Math.pow(1 - x, 3);
  const render = () => {
    raf = 0;
    const t = clock.getElapsedTime();
    const intro = introT0 < 0 ? -1 : (performance.now() - introT0) / 1000;
    const on = reduce ? (intro < 0 ? 0 : 1) : flickerOn(intro);
    neonMats.forEach(m => { m.opacity = m.userData.base * on; });
    redLight.intensity = 3.4 * on + .4;
    uniforms.uReveal.value = intro < 0 ? 0 : reduce ? 1 : Math.min(1, ease(Math.max(0, intro - .5) / 2.4));
    uniforms.uTime.value = t;
    pUni.uTime.value = reduce ? 0 : t;

    if (touch) { target.x = Math.sin(t * .3) * .45; target.y = Math.cos(t * .23) * .25; }
    cam.x += (target.x - cam.x) * .05;
    cam.y += (target.y - cam.y) * .05;
    const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight || 1)));
    camera.position.set(cam.x * .7, cam.y * .4, DIST - p * 2.6);
    camera.lookAt(cam.x * .25, cam.y * .15, 0);
    uniforms.uFade.value = Math.max(0, (p - .35) / .65) * .7;

    if (!reduce) {
      chains.forEach(g => { g.rotation.z = Math.sin(t * .6 + g.userData.phase) * .035; g.rotation.x = Math.cos(t * .45 + g.userData.phase) * .02; });
      smokes.forEach((m, i) => { m.rotation.z = t * (i ? -.02 : .025); });
      halo.material.opacity = .5 + Math.sin(t * .8) * .06;
    }
    renderer.render(scene, camera);
    if (visible && !reduce) raf = requestAnimationFrame(render);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) kick(); });
  if (reduce) {
    addEventListener('dihami:ready', () => { kick(); setTimeout(kick, 60); });
    addEventListener('resize', kick);
  }
  kick();
})();
