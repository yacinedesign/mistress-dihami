/* Mistress Dihami v2: todo lo interactivo menos la escena 3D */
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const PHONE = '34664291886';
  const wa = msg => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
  $$('[data-wa]').forEach(a => { a.href = wa(a.dataset.wa); });

  const toast = (() => {
    const el = $('#toast');
    let t = 0;
    return msg => { el.textContent = msg; el.classList.add('show'); clearTimeout(t); t = setTimeout(() => el.classList.remove('show'), 3200); };
  })();

  /* ---------- Sonido (todo sintetizado, apagado por defecto) ---------- */
  const sound = (() => {
    let ctx = null, on = store.get('dihami-sonido') === '1';
    const btn = $('.snd');
    const ensure = () => {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const env = (g, t0, a, peak, dcy) => { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(.0001, t0 + a + dcy); };
    const noise = dur => {
      const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = b; return s;
    };
    const tone = (freq, dur, vol, type = 'sine', lp = 0) => {
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq; env(g, t, .005, vol, dur);
      let n = o;
      if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
      n.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .05);
    };
    const fx = {
      crack() {
        const t = ctx.currentTime, s = noise(.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'highpass'; f.frequency.value = 1800; env(g, t, .003, .9, .16);
        s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + .3);
        const o = ctx.createOscillator(), g2 = ctx.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(300, t + .05); env(g2, t, .001, .22, .05);
        o.connect(g2).connect(ctx.destination); o.start(t); o.stop(t + .08);
      },
      door() {
        const t = ctx.currentTime, s = noise(2.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'lowpass'; f.frequency.setValueAtTime(110, t); f.frequency.linearRampToValueAtTime(420, t + 1.9); env(g, t, .3, .7, 1.9);
        s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + 2.3);
        const o = ctx.createOscillator(), lf = ctx.createBiquadFilter(), g2 = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(46, t + 2); lf.type = 'lowpass'; lf.frequency.value = 300; env(g2, t, .3, .16, 1.8);
        o.connect(lf).connect(g2).connect(ctx.destination); o.start(t); o.stop(t + 2.3);
      },
      tick() { tone(880, .05, .06); },
      good() { tone(660, .08, .1, 'triangle'); setTimeout(() => tone(990, .1, .1, 'triangle'), 70); },
      bad() { tone(140, .3, .2, 'sawtooth', 600); },
      win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .18, .09, 'triangle'), i * 110)); }
    };
    const sync = () => { btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'Desactivar sonido' : 'Activar sonido'); };
    const play = name => { if (!on || !ensure()) return; try { fx[name](); } catch (e) {} };
    const set = v => { on = v; store.set('dihami-sonido', v ? '1' : '0'); sync(); if (v) ensure(); };
    btn.addEventListener('click', () => { set(!on); play('crack'); });
    sync();
    return { play, set, get on() { return on; } };
  })();

  /* ---------- Carga y puertas (aviso +18) ---------- */
  const gate = $('#gate'), loader = $('.loader', gate);
  const nav = $('#nav'), lb = $('#lb'), legal = $('#legal');
  const syncLock = () => d.body.classList.toggle('locked', !gate.classList.contains('done') || nav.classList.contains('open') || lb.classList.contains('open') || (legal && legal.classList.contains('open')));
  const heelPath = $('.heel-draw path');
  if (heelPath) heelPath.style.setProperty('--len', Math.ceil(heelPath.getTotalLength()));
  const gateSound = $('#gate-sound');
  gateSound.checked = sound.on;
  const verified = store.get('dihami-mayor-edad') === '1';

  let shown = 0;
  const setP = v => { shown = Math.max(shown, v); $('#pct').textContent = Math.round(shown * 100); $('#bar').style.setProperty('--p', shown); };
  const fake = setInterval(() => setP(Math.min(.92, shown + .03 + Math.random() * .05)), 90);
  const heroLoaded = new Promise(r => { if (window.dihamiHeroLoaded) r(); else addEventListener('dihami:hero-loaded', r, { once: true }); });
  Promise.race([
    Promise.all([heroLoaded, d.fonts ? d.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, reduce ? 300 : 1900))]),
    new Promise(r => setTimeout(r, 7000))
  ]).then(() => { clearInterval(fake); setP(1); setTimeout(afterLoad, 380); });

  const ready = () => { root.classList.add('is-ready'); d.body.classList.add('ready'); dispatchEvent(new Event('dihami:ready')); };
  const finishGate = () => { gate.classList.add('done'); gate.setAttribute('aria-hidden', 'true'); syncLock(); onScroll(); };
  function afterLoad() {
    loader.classList.add('hide');
    if (verified) { gate.classList.add('skip'); ready(); setTimeout(finishGate, 850); return; }
    gate.classList.add('ask');
    $('#gate-yes').focus({ preventScroll: true });
  }
  $('#gate-yes').addEventListener('click', () => {
    store.set('dihami-mayor-edad', '1');
    sound.set(gateSound.checked);
    if (gateSound.checked) { sound.play('crack'); setTimeout(() => sound.play('door'), 260); }
    gate.classList.remove('ask');
    gate.classList.add('opening');
    setTimeout(ready, reduce ? 0 : 500);
    setTimeout(finishGate, reduce ? 60 : 2150);
  });

  /* ---------- Cabecera, barra de progreso y botón flotante ---------- */
  const hdr = $('.hdr'), fab = $('.fab'), bar = $('.progress');
  let ticking = false;
  function onScroll() {
    const y = scrollY, max = root.scrollHeight - innerHeight;
    hdr.classList.toggle('solid', y > 30);
    fab.classList.toggle('show', y > innerHeight * .8);
    bar.style.setProperty('--p', max > 0 ? y / max : 0);
    words();
    palace();
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });

  /* ---------- Menú móvil ---------- */
  const burger = $('.burger');
  const setMenu = open => {
    nav.classList.toggle('open', open); burger.classList.toggle('x', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    syncLock();
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Cursor propio y botones magnéticos ---------- */
  if (fine && !reduce) {
    const dot = $('.cur-dot'), ring = $('.cur-ring');
    let x = -100, y = -100, rx = x, ry = y;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (rx < -50) { rx = e.clientX; ry = e.clientY; d.body.classList.add('has-cursor'); }
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
    const loop = () => { rx += (x - rx) * .18; ry += (y - ry) * .18; ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`; requestAnimationFrame(loop); };
    loop();
    d.addEventListener('pointerover', e => ring.classList.toggle('big', !!e.target.closest('a, button, [data-tilt], .ring-stage, #sig-canvas')));
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .32}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Aparición al bajar ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* ---------- Manifiesto: las palabras se encienden al bajar ---------- */
  const wordsEl = $('#words');
  let wordSpans = [];
  if (wordsEl) {
    const frag = d.createDocumentFragment();
    [...wordsEl.childNodes].forEach(node => {
      const hot = node.nodeType === 1;
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
        const s = d.createElement('span');
        s.className = hot ? 'w hot' : 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
    });
    wordsEl.textContent = '';
    wordsEl.appendChild(frag);
    wordSpans = $$('.w', wordsEl);
    if (reduce) wordSpans.forEach(s => s.classList.add('on'));
  }
  function words() {
    if (!wordSpans.length || reduce) return;
    const r = wordsEl.getBoundingClientRect(), vh = innerHeight;
    const n = Math.round(clamp((vh * .85 - r.top) / (r.height + vh * .3), 0, 1) * wordSpans.length);
    wordSpans.forEach((s, i) => s.classList.toggle('on', i < n));
  }

  /* ---------- Foto con inclinación 3D ---------- */
  if (fine && !reduce) $$('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('moving');
      el.style.setProperty('--ry', `${(px - .5) * 16}deg`);
      el.style.setProperty('--rx', `${(.5 - py) * 12}deg`);
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('moving'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- Mi mundo: recorrido lateral al bajar (ordenador) ---------- */
  const palaceEl = $('#palacio'), track = $('.palace-track'), rooms = $$('.room', track), pbar = $('.palace-progress span');
  const desk = matchMedia('(min-width: 901px)');
  let overflow = 0;
  function palaceSize() {
    if (!desk.matches) { palaceEl.style.height = ''; track.style.transform = ''; overflow = 0; return; }
    overflow = Math.max(0, track.scrollWidth - innerWidth);
    palaceEl.style.height = `${innerHeight + overflow}px`;
  }
  function palace() {
    if (!overflow) return;
    const r = palaceEl.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, palaceEl.offsetHeight - innerHeight), 0, 1);
    track.style.transform = `translate3d(${-p * overflow}px, 0, 0)`;
    pbar.style.setProperty('--pp', p);
    if (reduce || r.bottom < 0 || r.top > innerHeight) return;
    const cx = innerWidth / 2;
    rooms.forEach(el => {
      const b = el.getBoundingClientRect(), o = clamp((b.left + b.width / 2 - cx) / innerWidth, -1, 1);
      el.style.setProperty('--ry', `${o * -24}deg`);
      el.style.setProperty('--s', 1 - Math.abs(o) * .08);
      el.style.setProperty('--px', `${o * -40}px`);
    });
  }
  palaceSize();
  addEventListener('resize', () => { palaceSize(); onScroll(); });
  addEventListener('load', () => { palaceSize(); onScroll(); });

  /* ---------- Cartas que se giran (en móvil, al tocar) ---------- */
  $$('.flip:not(.intro)').forEach(f => {
    f.addEventListener('click', e => { if (e.target.closest('a')) return; if (!matchMedia('(hover: hover)').matches) { f.classList.toggle('on'); sound.play('tick'); } });
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('on'); } });
  });

  /* ---------- La carta: rueda 3D de prácticas ---------- */
  const CARTA = [
    { n: 'Cuerdas', d: 'Te ato con precisión. Sin escapatoria.', t: ['Shibari', 'Suspensión', 'Bondage', 'Ataduras', 'Inmovilización', 'Momificación', 'Privación sensorial', 'Control de la respiración'] },
    { n: 'Cuerpo a cuerpo', d: 'Fuerza, técnica y golpes, a mi ritmo.', t: ['Wrestling', 'Bofetadas', 'Spanking', 'Flagelación', 'Ballbusting', 'CBT', 'Trampling', 'Spitting', 'Cera'] },
    { n: 'Mente', d: 'Tu cabeza es lo primero que me pertenece.', t: ['Dominación mental', 'Humillación', 'Control de orgasmo', 'Control de la castidad', 'Cuckold', 'Feminización', 'Lencería'] },
    { n: 'Fetiches', d: 'Mi látex, mis pies y mis caprichos.', t: ['Foot fetish', 'Face-sitting', 'Látex', 'Food play', 'Medical', 'Agujas', 'Dogging'] },
    { n: 'Strap-on', d: 'Aquí mando Yo. También en esto.', t: ['Strap-on', 'Pegging', 'Sodomización', 'Dilatación anal', 'Vibradores'] },
    { n: 'Online y tributo', d: 'Sírveme también a distancia. Y paga por ello.', t: ['Findom', 'Money slave', 'Vídeos personalizados', 'Contenido personalizado', 'Venta de artículos'] }
  ];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const ringEl = $('#ring'), stageEl = $('#ring-stage'), tagsEl = $('#ring-tags');
  ringEl.innerHTML = CARTA.map((c, i) => `<button type="button" class="ring-item" style="--i:${i}" data-i="${i}"><span class="n">${ROMAN[i]}</span><span><b>${c.n}</b><small>${c.d}</small></span><span class="cnt">${c.t.length} prácticas</span></button>`).join('');
  const ringItems = $$('.ring-item', ringEl);
  const STEP = 360 / CARTA.length;
  let ringCur = 0, rot = 0;
  const select = (i, silent) => {
    ringCur = ((i % CARTA.length) + CARTA.length) % CARTA.length;
    rot += ((((-ringCur * STEP) - rot) % 360) + 540) % 360 - 180;
    ringEl.style.setProperty('--rot', `${rot}deg`);
    ringItems.forEach((el, k) => { el.classList.toggle('on', k === ringCur); el.setAttribute('aria-pressed', k === ringCur); });
    tagsEl.innerHTML = CARTA[ringCur].t.map((t, k) => `<li style="--k:${k}">${t}</li>`).join('');
    if (!silent) sound.play('tick');
  };
  select(0, true);
  $('#ring-prev').addEventListener('click', () => select(ringCur - 1));
  $('#ring-next').addEventListener('click', () => select(ringCur + 1));
  let dragX = null, startRot = 0, moved = false;
  stageEl.addEventListener('pointerdown', e => { dragX = e.clientX; startRot = rot; moved = false; });
  stageEl.addEventListener('pointermove', e => {
    if (dragX === null) return;
    const dx = e.clientX - dragX;
    if (!moved && Math.abs(dx) > 6) { moved = true; ringEl.classList.add('drag'); try { stageEl.setPointerCapture(e.pointerId); } catch (err) {} }
    if (moved) { rot = startRot + dx * .32; ringEl.style.setProperty('--rot', `${rot}deg`); }
  });
  const endDrag = () => { if (dragX === null) return; dragX = null; if (moved) { ringEl.classList.remove('drag'); select(Math.round(-rot / STEP)); } };
  stageEl.addEventListener('pointerup', endDrag);
  stageEl.addEventListener('pointercancel', endDrag);
  ringEl.addEventListener('click', e => { if (moved) { moved = false; return; } const b = e.target.closest('.ring-item'); if (b) select(+b.dataset.i); });
  stageEl.addEventListener('keydown', e => { if (e.key === 'ArrowRight') select(ringCur + 1); if (e.key === 'ArrowLeft') select(ringCur - 1); });

  /* ---------- Pestañas de juegos ---------- */
  const gtabs = $$('.game-tabs [role="tab"]');
  gtabs.forEach(t => t.addEventListener('click', () => {
    gtabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).classList.toggle('active', on); });
    if (t.id !== 'tab-obey') game.pause();
    sound.play('tick');
  }));

  /* ---------- Test: ¿Qué clase de esclavo eres? ---------- */
  const TYPES = {
    sumiso: ['Sumiso de verdad', 'Nada de juego light: quieres entregar el control. Lo que te falta es una Domina que explore tus límites sin miedo.'],
    cuerda: ['Muñeco de cuerda', 'Naciste para estar atado. Conmigo aprenderás lo que es la inmovilidad absoluta.'],
    saco: ['Saco de boxeo', 'Te gusta resistir… y perder. Una vez inmóvil, serás mi saco, a mi ritmo y con técnica.'],
    castidad: ['Esclavo enjaulado', 'Tu placer ya no es tuyo. Yo guardo la llave y tú cuentas los días.'],
    sissy: ['Sissy en formación', 'Lencería, látex y feminización. Conmigo dejarás de fingir quién eres.'],
    pagafantas: ['Money slave', 'Tu forma de servir es pagar. Y a Mí me encanta que pagues.']
  };
  const QS = [
    ['Llegas a la sesión. ¿Qué es lo primero que haces?', [['Me arrodillo y espero órdenes', 'sumiso'], ['Le ofrezco mis muñecas para que me ate', 'cuerda'], ['La reto a ver quién puede más', 'saco'], ['Dejo un sobre con billetes en la entrada', 'pagafantas']]],
    ['Tu fantasía secreta es…', [['Quedarme suspendido en el aire, sin poder moverme', 'cuerda'], ['Que me vista de mujer y me ponga en mi sitio', 'sissy'], ['Que Ella guarde la llave de mi jaula', 'castidad'], ['Que Ella decida cuándo y cuánto pago', 'pagafantas']]],
    ['¿Qué te tiene más enganchado de la Domina?', [['Sus manos haciendo nudos', 'cuerda'], ['Su fuerza cuando me tiene en el suelo', 'saco'], ['Su látex… para ponérmelo', 'sissy'], ['Su mirada cuando me da una orden', 'sumiso']]],
    ['Si te portas mal, prefieres…', [['Una buena tanda de bofetadas', 'saco'], ['Una semana más sin salir de la jaula', 'castidad'], ['Pagar una buena multa', 'pagafantas'], ['Ponerme lencería y limpiar de rodillas', 'sissy']]],
    ['¿Qué regalo le harías?', [['Cuerdas nuevas de yute', 'cuerda'], ['Mi obediencia absoluta', 'sumiso'], ['La llave de mi castidad', 'castidad'], ['Mi tarjeta de crédito', 'pagafantas']]],
    ['¿Dónde está tu sitio en la sesión?', [['De rodillas, a su lado', 'sumiso'], ['En el suelo, después de perder el combate', 'saco'], ['En una jaula, contando los días', 'castidad'], ['En un rincón, con tacones y medias', 'sissy']]]
  ];
  const quizEl = $('#quiz');
  let qi = 0, qScore = {};
  const dots = n => `<div class="q-dots">${QS.map((_, k) => `<i class="${k < n ? 'done' : ''}"></i>`).join('')}</div>`;
  const qIntro = () => {
    quizEl.innerHTML = `<div class="q-card in q-result"><span class="k">Test de la Domina · ${QS.length} preguntas</span><p class="t">¿Qué clase de esclavo eres?</p><p>Responde con sinceridad. La Domina siempre sabe cuándo mientes.</p><div class="row"><button class="btn btn-red" type="button" data-q="start">Empezar el test</button></div></div>`;
  };
  const qRender = () => {
    if (qi >= QS.length) return qResult();
    const [q, answers] = QS[qi];
    quizEl.innerHTML = `${dots(qi)}<div class="q-card in"><span class="q-num">Pregunta ${qi + 1} de ${QS.length}</span><p class="q-text">${q}</p><div class="q-answers">${answers.map((a, k) => `<button type="button" data-t="${a[1]}"><b>${'ABCD'[k]}</b>${a[0]}</button>`).join('')}</div></div>`;
  };
  const qResult = () => {
    const top = Object.keys(qScore).sort((a, b) => qScore[b] - qScore[a])[0] || 'sumiso';
    const [t, p] = TYPES[top];
    quizEl.innerHTML = `${dots(QS.length)}<div class="q-card in q-result"><span class="k">La Domina ha decidido. Eres…</span><p class="t">${t}</p><p>${p}</p><div class="row"><a class="btn btn-red" href="${wa(`Mistress, he hecho su test y soy: ${t}. ¿Puedo dirigirme a usted?`)}" target="_blank" rel="noopener">Preséntate como tal</a><button class="btn btn-ghost" type="button" data-q="again">Repetir el test</button></div></div>`;
    sound.play('win');
  };
  quizEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-t]');
    if (b) {
      qScore[b.dataset.t] = (qScore[b.dataset.t] || 0) + 1;
      sound.play('tick');
      const card = $('.q-card', quizEl);
      card.classList.remove('in'); card.classList.add('out');
      $$('button', card).forEach(x => { x.disabled = true; });
      qi++;
      setTimeout(qRender, reduce ? 0 : 400);
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) { sound.play(q.dataset.q === 'start' ? 'crack' : 'tick'); qi = 0; qScore = {}; qRender(); }
  });
  qIntro();

  /* ---------- Juego: La Domina ordena ---------- */
  const game = (() => {
    const ICONS = {
      latigo: ['el látigo', 'Látigo', '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 42 9-10"/><path d="m13 35 5 5M15 31l3 3"/><path d="M19 29c5-9 15-14 20-10s0 12-8 11-9-7-3-11c3-2 7-1 8 1"/></svg>'],
      tacon: ['el tacón', 'Tacón', '<svg viewBox="0 0 114 110" fill="currentColor" aria-hidden="true"><path d="M2 102 C14 94 30 84 44 82 C66 78 92 44 104 8 C110 9 112 15 110 22 C108 52 106 84 105.5 106 L103.5 106 C103.5 84 102.5 54 99 34 C86 50 62 98 38 104 L8 104.6 Q3 104.6 2 102 Z"/></svg>'],
      collar: ['el collar', 'Collar', '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="24" cy="18" rx="16" ry="7"/><path d="M8 18v5c0 3.9 7.2 7 16 7s16-3.1 16-7v-5"/><path d="M24 30v3"/><circle cx="24" cy="37.5" r="4.5"/></svg>'],
      esposas: ['las esposas', 'Esposas', '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="30" r="9"/><circle cx="34" cy="30" r="9"/><circle cx="14" cy="30" r="4.5"/><circle cx="34" cy="30" r="4.5"/><path d="M19 22.5c2-4.5 8-4.5 10 0"/></svg>']
    };
    const KEYS = Object.keys(ICONS);
    const RANKS = [
      [0, 'Perro desobediente', 'Ni una orden bien cumplida. Necesitas mano dura… y Yo la tengo.'],
      [5, 'Sumiso en prácticas', 'Apuntas maneras, pero todavía te distraes. Te falta adiestramiento.'],
      [10, 'Esclavo obediente', 'Sabes escuchar y sabes callar. Empiezo a fijarme en ti.'],
      [18, 'Esclavo ejemplar', 'Pocos llegan hasta aquí. Mereces arrodillarte ante Mí.'],
      [26, 'Propiedad de la Domina', 'Obediencia absoluta. Ya eres mío: preséntate ante Mí.']
    ];
    const box = $('#game'), pad = $('#g-pad'), orderEl = $('#g-order'), em = $('em', orderEl), strong = $('strong', orderEl);
    const timerEl = $('#g-timer'), over = $('#g-over'), livesEl = $('#g-lives'), scoreEl = $('#g-score'), bestEl = $('#g-best');
    const heart = c => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.7 4.5c2.2 0 3.6 1.2 5.3 3 1.7-1.8 3.1-3 5.3-3 3.7 0 5.9 3.8 4.3 7.3C19.5 16.4 12 21 12 21Z"/></svg>`;
    let order = KEYS.slice(), state = 'idle', score = 0, lives = 3, round = null, raf = 0, timer = 0;
    let best = parseInt(store.get('dihami-record'), 10) || 0;
    bestEl.textContent = best;
    const drawPad = () => { pad.innerHTML = order.map((k, i) => `<button type="button" class="g-btn" data-k="${k}">${ICONS[k][2]}${ICONS[k][1]}<kbd>${i + 1}</kbd></button>`).join(''); };
    const drawLives = () => { livesEl.innerHTML = [0, 1, 2].map(i => heart(i < lives ? '' : 'lost')).join(''); livesEl.setAttribute('aria-label', `${lives} vidas`); };
    drawPad(); drawLives();
    const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };

    function next() {
      if (state !== 'play') return;
      if (score >= 8 && Math.random() < .45) { order.sort(() => Math.random() - .5); drawPad(); }
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      const obey = Math.random() < (score < 3 ? .8 : .68);
      round = { k, obey, t0: performance.now(), dur: Math.max(850, 2400 - score * 70), done: false };
      orderEl.classList.remove('pop'); void orderEl.offsetWidth; orderEl.classList.add('pop');
      em.textContent = obey ? 'La Domina ordena:' : '';
      strong.textContent = `Toca ${ICONS[k][0]}`;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (state !== 'play' || !round || round.done) return;
      const left = 1 - (now - round.t0) / round.dur;
      timerEl.style.setProperty('--t', Math.max(0, left));
      if (left <= 0) { round.done = true; return round.obey ? fail(null, 'Demasiado lento.') : win(null); }
      raf = requestAnimationFrame(tick);
    }
    const flash = (btn, cls) => { if (!btn) return; btn.classList.remove('good', 'bad'); void btn.offsetWidth; btn.classList.add(cls); setTimeout(() => btn.classList.remove(cls), 450); };
    function win(btn) { score++; scoreEl.textContent = score; flash(btn, 'good'); sound.play(btn ? 'good' : 'tick'); later(next, 280); }
    function fail(btn, msg) {
      lives--; drawLives(); flash(btn, 'bad'); sound.play('bad');
      box.classList.remove('hurt'); void box.offsetWidth; box.classList.add('hurt');
      if (btn && navigator.vibrate) navigator.vibrate(120);
      em.textContent = '¡Castigo!'; strong.textContent = msg;
      if (lives <= 0) return later(end, 700);
      later(next, 1000);
    }
    function press(k, btn) {
      if (state !== 'play' || !round || round.done) return;
      round.done = true;
      cancelAnimationFrame(raf);
      if (!round.obey) return fail(btn, 'No lo he ordenado Yo.');
      if (k !== round.k) return fail(btn, 'Eso no es lo que te he pedido.');
      win(btn);
    }
    function start() {
      state = 'play'; score = 0; lives = 3; round = null; order = KEYS.slice();
      drawPad(); drawLives(); scoreEl.textContent = 0; over.hidden = true;
      timerEl.style.setProperty('--t', 1);
      em.textContent = ''; strong.textContent = 'Atento…';
      sound.play('crack');
      later(next, 900);
    }
    function end() {
      state = 'over'; cancelAnimationFrame(raf); timerEl.style.setProperty('--t', 0);
      const record = score > best;
      if (record) { best = score; store.set('dihami-record', best); bestEl.textContent = best; }
      const [, t, p] = RANKS.filter(r => score >= r[0]).pop();
      over.innerHTML = `<span class="score">${score} ${score === 1 ? 'orden cumplida' : 'órdenes cumplidas'}${record ? ' · nuevo récord' : ''}</span><p class="t">${t}</p><p>${p}</p><div class="row"><button class="btn btn-red" type="button" data-g="start">Otra vez</button><a class="btn btn-ghost" href="${wa(`Mistress, he cumplido ${score} órdenes en su juego de obediencia. Mi rango: ${t}. ¿Puedo dirigirme a usted?`)}" target="_blank" rel="noopener">Enséñaselo a la Domina</a></div>`;
      over.hidden = false;
      sound.play(score >= 10 ? 'win' : 'bad');
    }
    function pause() {
      if (state !== 'play') return;
      state = 'paused'; cancelAnimationFrame(raf); clearTimeout(timer);
      over.innerHTML = `<h3>Pausa</h3><p>La Domina te espera. No la hagas esperar mucho.</p><div class="row"><button class="btn btn-red" type="button" data-g="resume">Continuar</button></div>`;
      over.hidden = false;
    }
    over.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (!b) return;
      if (b.dataset.g === 'start') start();
      if (b.dataset.g === 'resume') { over.hidden = true; state = 'play'; later(next, 500); }
    });
    $('#g-start').dataset.g = 'start';
    pad.addEventListener('pointerdown', e => { const b = e.target.closest('.g-btn'); if (b) { e.preventDefault(); press(b.dataset.k, b); } });
    pad.addEventListener('click', e => { if (e.detail !== 0) return; const b = e.target.closest('.g-btn'); if (b) press(b.dataset.k, b); });
    d.addEventListener('keydown', e => {
      if (state !== 'play') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) { e.preventDefault(); const k = order[n - 1]; press(k, $(`[data-k="${k}"]`, pad)); }
    });
    new IntersectionObserver(([en]) => { if (!en.isIntersecting) pause(); }, { threshold: .3 }).observe(box);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    return { pause };
  })();

  /* ---------- Contrato de sumisión ---------- */
  const DESEOS = ['Shibari', 'Suspensión', 'Wrestling', 'Bofetadas', 'Spanking', 'Ballbusting', 'Dominación mental', 'Humillación', 'Control de la castidad', 'Feminización', 'Látex', 'Foot fetish', 'Face-sitting', 'Trampling', 'Strap-on', 'Findom'];
  const chipsEl = $('#c-deseos');
  chipsEl.innerHTML = DESEOS.map(x => `<button type="button" class="chip" aria-pressed="false">${x}</button>`).join('');
  const F = { alias: $('#c-alias'), limites: $('#c-limites'), palabra: $('#c-palabra'), dispo: $('#c-dispo'), adulto: $('#c-adulto') };
  let tipo = 'presencial en Zaragoza';
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  $('#doc-date').textContent = `Zaragoza, ${today}`;
  const listEs = arr => arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr[arr.length - 1]}`;
  const vals = () => ({
    alias: F.alias.value.trim(),
    deseos: listEs($$('.chip[aria-pressed="true"]', chipsEl).map(b => b.textContent.toLowerCase())),
    limites: F.limites.value.trim(),
    palabra: F.palabra.value.trim(),
    dispo: F.dispo.value.trim()
  });
  const setV = (k, val, fallback) => { const el = $(`.doc .v[data-k="${k}"]`); el.textContent = val || fallback; el.classList.toggle('empty', !val); };
  function updateDoc() {
    const v = vals();
    setV('alias', v.alias, '________');
    setV('tipo', tipo, tipo);
    setV('deseos', v.deseos, 'lo que Ella decida');
    setV('limites', v.limites, 'los que hablemos antes de empezar');
    setV('palabra', v.palabra, '________');
    setV('dispo', v.dispo, 'cuando la Domina ordene');
  }
  const clauses = () => {
    const v = vals();
    return [
      `Yo, ${v.alias}, me entrego a Mistress Dihami como su esclavo, por voluntad propia y siendo mayor de edad.`,
      `Solicito una sesión ${tipo}.`,
      `Deseo que la Domina disponga de mí para: ${v.deseos || 'lo que Ella decida'}.`,
      `Mis límites son: ${v.limites || 'los que hablemos antes de empezar'}. La Domina los respetará siempre.`,
      `Mi palabra de seguridad es «${v.palabra}». Al decirla, todo se detiene.`,
      `Estoy disponible: ${v.dispo || 'cuando la Domina ordene'}.`,
      'Acepto obedecer, respetar sus normas y rendirle el tributo que Ella marque.'
    ];
  };
  $('#c-tipo').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#c-tipo button').forEach(x => x.setAttribute('aria-pressed', x === b));
    tipo = b.dataset.v; sound.play('tick'); updateDoc();
  });
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
    sound.play('tick'); updateDoc();
  });
  [F.alias, F.limites, F.palabra, F.dispo].forEach(el => el.addEventListener('input', updateDoc));
  $('#c-form').addEventListener('submit', e => e.preventDefault());

  // Firma con el dedo o el ratón
  const sigBox = $('#sig'), sigC = $('#sig-canvas'), sctx = sigC.getContext('2d');
  let drawing = false, signed = false, last = null;
  const sigStyle = () => { sctx.lineCap = 'round'; sctx.lineJoin = 'round'; sctx.strokeStyle = '#f5eeeb'; sctx.fillStyle = '#f5eeeb'; sctx.lineWidth = 2.4; };
  function sizeSig() {
    const r = sigC.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!r.width) return;
    const prev = signed ? sigC.toDataURL() : null;
    sigC.width = Math.round(r.width * dpr); sigC.height = Math.round(r.height * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sigStyle();
    if (prev) { const im = new Image(); im.onload = () => sctx.drawImage(im, 0, 0, r.width, r.height); im.src = prev; }
  }
  sizeSig();
  addEventListener('resize', sizeSig);
  const pt = e => { const r = sigC.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  sigC.addEventListener('pointerdown', e => {
    e.preventDefault(); drawing = true; last = pt(e);
    try { sigC.setPointerCapture(e.pointerId); } catch (err) {}
    sctx.beginPath(); sctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); sctx.fill();
  });
  sigC.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pt(e);
    sctx.beginPath(); sctx.moveTo(last.x, last.y); sctx.lineTo(p.x, p.y); sctx.stroke();
    last = p;
  });
  const showSig = () => { $('#doc-sig').innerHTML = signed ? `<img src="${sigC.toDataURL('image/png')}" alt="Firma del esclavo">` : ''; };
  const endSig = () => { if (!drawing) return; drawing = false; signed = true; sigBox.classList.add('signed'); showSig(); };
  sigC.addEventListener('pointerup', endSig);
  sigC.addEventListener('pointercancel', endSig);
  $('#sig-clear').addEventListener('click', () => { sctx.clearRect(0, 0, sigC.width, sigC.height); signed = false; sigBox.classList.remove('signed'); showSig(); });

  const err = $('#c-error');
  const validate = () => {
    if (!F.alias.value.trim()) return 'Dime cómo quieres que te llame.';
    if (!F.palabra.value.trim()) return 'Necesitas una palabra de seguridad.';
    if (!signed) return 'Falta tu firma.';
    if (!F.adulto.checked) return 'Debes declarar que eres mayor de edad.';
    return '';
  };
  const check = () => { const m = validate(); err.textContent = m; if (m) { sound.play('bad'); err.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } return !m; };
  $('#c-send').addEventListener('click', () => {
    if (!check()) return;
    sound.play('crack');
    const text = ['CONTRATO DE SUMISIÓN · Mistress Dihami', ...clauses().map((c, i) => `${ROMAN[i]}. ${c}`), `Firmado en Zaragoza, ${today}.`, '¿Puedo dirigirme a usted?'].join('\n');
    window.open(wa(text), '_blank', 'noopener');
    toast('Descarga también el contrato firmado y envíaselo como imagen.');
  });
  const wrap = (g, text, x, y, maxW, lh) => {
    let line = '';
    text.split(' ').forEach(w => {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
    });
    g.fillText(line, x, y);
    return y + lh;
  };
  $('#c-download').addEventListener('click', () => {
    if (!check()) return;
    const W = 1080, H = 1500, c = d.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#170b0e'); bg.addColorStop(1, '#080506');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W / 2, 0, 0, W / 2, 0, 720); rg.addColorStop(0, 'rgba(110,5,19,.5)'); rg.addColorStop(1, 'rgba(110,5,19,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,46,74,.5)'; g.lineWidth = 2; g.strokeRect(30, 30, W - 60, H - 60);
    g.strokeStyle = 'rgba(217,211,213,.16)'; g.lineWidth = 1; g.strokeRect(48, 48, W - 96, H - 96);
    const heel = new Path2D('M2 102 C14 94 30 84 44 82 C66 78 92 44 104 8 C110 9 112 15 110 22 C108 52 106 84 105.5 106 L103.5 106 C103.5 84 102.5 54 99 34 C86 50 62 98 38 104 L8 104.6 Q3 104.6 2 102 Z');
    g.save(); g.translate(W / 2 - 57, 96); g.shadowColor = 'rgba(227,18,45,.8)'; g.shadowBlur = 34; g.fillStyle = '#e3122d'; g.fill(heel); g.restore();
    g.textAlign = 'center'; g.fillStyle = '#f5eeeb'; g.font = '700 52px "Cinzel Decorative", serif';
    g.fillText('Contrato de sumisión', W / 2, 286);
    g.fillStyle = '#a3969a'; g.font = '600 19px Manrope, sans-serif';
    g.fillText('MISTRESS DIHAMI  ·  ZARAGOZA', W / 2, 330);
    g.textAlign = 'left';
    let y = 420;
    clauses().forEach((txt, i) => {
      g.fillStyle = '#ff2e4a'; g.font = '700 24px "Cinzel Decorative", serif'; g.fillText(`${ROMAN[i]}.`, 96, y);
      g.fillStyle = '#e4dcdc'; g.font = '30px "Bodoni Moda", serif';
      y = wrap(g, txt, 170, y, W - 270, 42) + 20;
    });
    const sy = Math.max(y + 170, H - 300);
    g.strokeStyle = '#4a2329'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(110, sy); g.lineTo(500, sy); g.moveTo(W - 500, sy); g.lineTo(W - 110, sy); g.stroke();
    if (signed) {
      const ratio = sigC.width / sigC.height, bw = 390, bh = Math.min(150, bw / ratio);
      g.drawImage(sigC, 110 + (390 - bh * ratio) / 2, sy - bh - 6, bh * ratio, bh);
    }
    g.textAlign = 'center'; g.fillStyle = '#ff2e4a'; g.font = '700 56px "Cinzel Decorative", serif';
    g.fillText('Dihami', W - 305, sy - 22);
    g.fillStyle = '#a3969a'; g.font = '600 17px Manrope, sans-serif';
    g.fillText('FIRMA DEL ESCLAVO', 305, sy + 36); g.fillText('LA DOMINA', W - 305, sy + 36);
    g.fillText(`Zaragoza, ${today}`, W / 2, H - 96);
    c.toBlob(b => {
      if (!b) return;
      const a = d.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'contrato-de-sumision-dihami.png';
      d.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      sound.play('win');
      toast('Contrato descargado. Envíaselo a la Domina por WhatsApp.');
    }, 'image/png');
  });
  updateDoc();

  /* ---------- Tributo ---------- */
  const amountsEl = $('#amounts'), other = $('#amount-other'), tbtn = $('#tribute-btn'), tamt = $('#tribute-amount'), tpp = $('#tribute-paypal');
  const setAmount = v => { tamt.textContent = v; tbtn.href = wa(`Mistress, quiero ofrecerle un tributo de ${v} €. ¿Cómo desea recibirlo?`); tpp.href = `https://www.paypal.me/dihami/${v}EUR`; };
  amountsEl.addEventListener('click', e => {
    const b = e.target.closest('.amount'); if (!b) return;
    $$('.amount', amountsEl).forEach(x => x.setAttribute('aria-pressed', x === b));
    other.value = ''; setAmount(b.dataset.v); sound.play('tick');
  });
  other.addEventListener('input', () => {
    const v = parseInt(other.value.replace(/\D/g, ''), 10);
    other.value = Number.isNaN(v) ? '' : v;
    if (v > 0) { $$('.amount', amountsEl).forEach(x => x.setAttribute('aria-pressed', 'false')); setAmount(v); }
  });
  [tbtn, tpp].forEach(b => b.addEventListener('click', () => sound.play('crack')));
  setAmount(50);

  /* ---------- Visor de fotos ---------- */
  const shots = $$('.g-item img');
  const lbImg = $('img', lb), lbCount = $('.count', lb);
  let cur = 0, lastFocus = null;
  const show = i => {
    cur = (i + shots.length) % shots.length;
    lbImg.src = shots[cur].currentSrc || shots[cur].src; lbImg.alt = shots[cur].alt;
    lbCount.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
  };
  const openLb = i => { lastFocus = d.activeElement; show(i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); syncLock(); $('.x', lb).focus(); };
  const closeLb = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); syncLock(); if (lastFocus) lastFocus.focus({ preventScroll: true }); };
  shots.forEach((img, i) => img.parentElement.addEventListener('click', () => openLb(i)));
  $('.x', lb).addEventListener('click', closeLb);
  $('.prev', lb).addEventListener('click', () => show(cur - 1));
  $('.next', lb).addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });

  /* ---------- Textos legales (también con #aviso-legal, #privacidad, #cookies, #condiciones o #mayores-de-edad) ---------- */
  let closeLegal = () => {};
  if (legal) {
    const legalBody = $('.body', legal), ltabs = $$('.ltab', legal), docs = ltabs.map(t => t.dataset.doc);
    let legalFrom = null;
    const showDoc = id => {
      if (!docs.includes(id)) id = docs[0];
      ltabs.forEach(t => { const on = t.dataset.doc === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#doc-' + t.dataset.doc).classList.toggle('active', on); });
      legalBody.scrollTop = 0;
    };
    const openLegal = id => {
      if (!legal.classList.contains('open')) legalFrom = d.activeElement;
      showDoc(id); legal.classList.add('open'); legal.setAttribute('aria-hidden', 'false'); syncLock();
      $('.top button', legal).focus();
    };
    closeLegal = () => {
      legal.classList.remove('open'); legal.setAttribute('aria-hidden', 'true'); syncLock();
      if (docs.includes(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search);
      if (legalFrom) legalFrom.focus({ preventScroll: true });
    };
    $$('[data-legal]').forEach(b => b.addEventListener('click', () => openLegal(b.dataset.legal)));
    ltabs.forEach((t, i) => {
      t.addEventListener('click', () => showDoc(t.dataset.doc));
      t.addEventListener('keydown', e => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        const n = ltabs[(i + k + ltabs.length) % ltabs.length];
        showDoc(n.dataset.doc); n.focus();
      });
    });
    $('.top button', legal).addEventListener('click', closeLegal);
    legal.addEventListener('click', e => { if (e.target === legal) closeLegal(); });
    if (docs.includes(location.hash.slice(1))) openLegal(location.hash.slice(1));
  }

  d.addEventListener('keydown', e => {
    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    } else if (e.key === 'Escape') {
      if (legal && legal.classList.contains('open')) closeLegal();
      else if (nav.classList.contains('open')) setMenu(false);
    }
  });

  $('#year').textContent = new Date().getFullYear();
  onScroll();
})();
