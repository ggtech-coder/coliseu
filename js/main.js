/* Coliseu Convenções — interações da página */
(() => {
  'use strict';

  // Número do WhatsApp comercial (DDI + DDD + número, só dígitos). Substituir pelo número real.
  const WHATSAPP_NUMBER = '5511999999999';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  const fmt = n => Math.round(n).toLocaleString('pt-BR');
  const waLink = text => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  $$('[data-whatsapp]').forEach(a => {
    a.href = waLink('Olá! Gostaria de saber mais sobre o Coliseu Convenções.');
  });

  /* --- Rolagem suave ------------------------------------------------------- */
  let lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!reduceMotion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
  }

  const scrollToTarget = target => {
    if (lenis) lenis.scrollTo(target, { offset: -60 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]:not([data-skip])').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  /* --- Carregamento -------------------------------------------------------- */
  const loaderCount = $('[data-loader-count]');
  const started = performance.now();
  const MIN_LOAD = reduceMotion ? 0 : 1500;
  let loaded = false;
  (function tickLoader() {
    const p = Math.min(1, (performance.now() - started) / Math.max(MIN_LOAD, 1));
    const eased = 1 - Math.pow(1 - p, 3);
    loaderCount.textContent = String(Math.round(eased * (loaded ? 3000 : 2850))).padStart(4, '0');
    if (p < 1 || !loaded) requestAnimationFrame(tickLoader);
    else finishLoading();
  })();
  const markLoaded = () => { loaded = true; };
  Promise.all([
    new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r))),
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ]).then(markLoaded);
  setTimeout(markLoaded, 5000); // nunca prende o visitante no loader

  let finished = false;
  function finishLoading() {
    if (finished) return;
    finished = true;
    loaderCount.textContent = '3000';
    document.body.classList.remove('is-loading');
    window.__coliseuReady = true;
    dispatchEvent(new Event('coliseu:ready'));
    if (lenis) lenis.start();
    introHero();
  }

  // Ato I entra como a abertura de um filme: o nome se assenta, depois o convite para rolar
  function introHero() {
    if (!hasGsap || reduceMotion) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__letterbox i', { scaleY: 6, duration: 1.8, ease: 'expo.inOut' }, 0)
      .from('.act__mark', { opacity: 0, letterSpacing: '.6em', filter: 'blur(14px) drop-shadow(0 10px 40px rgba(0,0,0,.55))', duration: 2.4 }, 0.5)
      .from('.act__eyebrow, .act__sub', { opacity: 0, y: 14, duration: 1.4, stagger: 0.15 }, 1.2)
      .from('.act__cue, .hero__skip, .hero__progress, .nav', { opacity: 0, duration: 1.4 }, 1.8);
  }

  /* --- Hero: progresso da rolagem dentro da abertura ---------------------------- */
  const hero = $('[data-hero]');
  const wa = $('.wa');
  function heroProgress() {
    const total = hero.offsetHeight - innerHeight;
    const p = reduceMotion ? 1 : Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(total, 1)));
    if (!reduceMotion) hero.style.setProperty('--p', p.toFixed(4));
    window.__heroP = p;
    hero.classList.toggle('is-arrived', p > 0.9);
    // O botão do WhatsApp só aparece depois da abertura, para não competir com o filme
    wa.classList.toggle('is-on', finished && hero.getBoundingClientRect().bottom < innerHeight * 0.6);
  }
  heroProgress();
  addEventListener('scroll', heroProgress, { passive: true });
  addEventListener('resize', heroProgress);

  // "Pular abertura" percorre a sequência inteira depressa, em vez de cortar para o fim
  $('[data-skip]').addEventListener('click', e => {
    e.preventDefault();
    const end = hero.offsetTop + hero.offsetHeight - innerHeight;
    if (lenis) lenis.scrollTo(end, { duration: 2.6, easing: t => 1 - Math.pow(1 - t, 3) });
    else scrollTo({ top: end, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* --- Navegação ----------------------------------------------------------- */
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > innerHeight && y > lastY + 4 && menu.hidden);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && hasGsap && !reduceMotion) gsap.from('.menu a', { y: 40, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' });
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  const sections = $$('main section[id]');
  const links = $$('.nav__links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  /* --- Manifesto: as palavras acendem conforme a leitura -------------------- */
  const manifesto = $('[data-split]');
  if (manifesto) {
    const wrap = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s); }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) wrap(child);
      });
    };
    wrap(manifesto);
    const words = $$('.w', manifesto);
    if (hasGsap && !reduceMotion) {
      ScrollTrigger.create({
        trigger: manifesto, start: 'top 80%', end: 'bottom 45%', scrub: true,
        onUpdate: self => {
          const n = Math.round(self.progress * words.length);
          words.forEach((w, i) => { w.style.opacity = i < n ? 1 : 0.16; });
        },
      });
    } else words.forEach(w => { w.style.opacity = 1; });
  }

  /* --- Percurso horizontal -------------------------------------------------- */
  const tourPin = $('[data-tour]');
  const zones = $$('.plan [data-zone]');
  const stops = $$('.stop');
  const setZone = n => zones.forEach(z => z.classList.toggle('is-on', +z.dataset.zone === n));
  setZone(1);

  if (hasGsap) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', () => {
      const track = $('.tour__track', tourPin);
      const distance = () => track.scrollWidth - (tourPin.clientWidth - $('.tour__plan').clientWidth);
      const tween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: tourPin, start: 'top top', end: () => `+=${distance()}`,
          pin: true, scrub: reduceMotion ? true : 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: self => setZone(Math.min(7, 1 + Math.floor(self.progress * 7))),
        },
      });
      return () => tween.kill();
    });
  }

  /* --- Revelações e contadores ---------------------------------------------- */
  if (hasGsap && !reduceMotion) {
    $$('.h2, .section-lede, .scale__item, .event, .local__copy > *, .faq__list details, .contact__title, .contact__form, .builder__app, .specs li')
      .forEach(el => {
        gsap.from(el, {
          y: 40, opacity: 0, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    gsap.to('.contact__arch', {
      scale: 1.15, yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  $$('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    const run = () => {
      if (reduceMotion) { el.textContent = fmt(target); return; }
      const t0 = performance.now(), dur = 1600;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { run(); obs.disconnect(); }
    }, { threshold: 0.6 }).observe(el);
  });

  /* --- Fotos que se abrem como portões quando entram na tela -------------------- */
  const doorObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-open');
      doorObserver.unobserve(entry.target);
    });
  }, { threshold: 0.35 });
  $$('.duo').forEach(el => doorObserver.observe(el));

  const courts = $('.courts');
  if (courts) {
    new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      $$('rect, line', courts).forEach((el, i) => { el.style.transitionDelay = `${i * 70}ms`; });
      courts.classList.add('is-on');
      obs.disconnect();
    }, { threshold: 0.6 }).observe(courts);
  }

  // Os portões da seção de contato abrem conforme a seção sobe na tela
  const contactDoors = $('.contact__doors');
  if (contactDoors) {
    if (hasGsap && !reduceMotion) {
      ScrollTrigger.create({
        trigger: '.contact', start: 'top 85%', end: 'top 15%', scrub: true,
        onUpdate: self => contactDoors.style.setProperty('--open', self.progress.toFixed(3)),
      });
    } else contactDoors.style.setProperty('--open', 1);
  }

  /* --- Eventos: painéis que se abrem ---------------------------------------- */
  const events = $$('.event');
  const openEvent = ev => events.forEach(e => e.classList.toggle('is-open', e === ev));
  if (events.length) openEvent(events[0]);
  events.forEach(ev => {
    ev.addEventListener('click', () => openEvent(ev));
    ev.addEventListener('focus', () => openEvent(ev));
    ev.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) openEvent(ev); });
  });

  /* --- Simulador de montagem ------------------------------------------------ */
  const planner = $('[data-planner]');
  if (planner) setupPlanner(planner);

  function setupPlanner(cv) {
    const ctx = cv.getContext('2d');
    const W = 560, H = 448;           // espaço lógico (5:4)
    const S = 8;                      // pixels por metro
    const PW = 50, PH = 40;           // plenária: 50 m × 40 m = 2.000 m²
    const OX = (W - PW * S) / 2, OY = 104;
    const STAGE = { w: 24.5, h: 10 }; // 245 m²
    const css = getComputedStyle(document.documentElement);
    const C = {
      amber: css.getPropertyValue('--amber').trim() || '#FFB45E',
      bronze: css.getPropertyValue('--bronze').trim() || '#C28A4E',
      stone: css.getPropertyValue('--stone').trim() || '#EAE1D4',
      dim: 'rgba(234,225,212,.35)',
      line: 'rgba(234,225,212,.18)',
      purple: '#6E2860',
    };

    const formatsUI = $$('input[name="format"]');
    const extrasUI = $$('input[name="extra"]');
    const range = $('[data-guests]');
    const out = $('[data-guests-out]');
    const label = $('[data-guests-label]');
    const minEl = $('[data-min]'), maxEl = $('[data-max]');
    const occ = $('[data-occupancy]'), per = $('[data-perperson]');
    const tip = $('[data-tip]');
    const send = $('[data-send-brief]');
    const perLabel = per.previousElementSibling;

    const FORMATS = {
      auditorio: { name: 'Auditório', unit: 'Convidados', min: 100, max: 3000, step: 50, value: 800 },
      banquete: { name: 'Banquete', unit: 'Convidados', min: 100, max: 1200, step: 10, value: 400 },
      coquetel: { name: 'Coquetel', unit: 'Convidados', min: 100, max: 3000, step: 50, value: 1200 },
      feira: { name: 'Feira', unit: 'Estandes', min: 10, max: 80, step: 1, value: 40 },
      show: { name: 'Show', unit: 'Público', min: 200, max: 3000, step: 50, value: 2500 },
    };
    const remembered = {};
    let format = 'auditorio';
    let items = [];
    let animStart = 0;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * 0.8 * dpr);
      ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      draw(1);
    }

    // Pseudoaleatório determinístico: a planta não "pula" a cada redesenho
    const rand = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function layout(f, n) {
      const list = [];
      const px = m => OX + m * S, py = m => OY + m * S;
      if (f === 'auditorio') {
        const seatW = 0.5, pitch = 0.95, aisle = 2, side = 1.5, front = 3;
        const half = Math.floor((PW - side * 2 - aisle) / 2 / seatW);
        let placed = 0;
        for (let row = 0; placed < n; row++) {
          for (let c = 0; c < half * 2 && placed < n; c++) {
            const left = c < half;
            const x = side + (left ? c : c + 0) * seatW + (left ? 0 : aisle);
            list.push({ t: 'seat', x: px(x), y: py(front + row * pitch) });
            placed++;
          }
        }
      } else if (f === 'banquete') {
        const tables = Math.ceil(n / 10), cell = 3.4, pista = 7;
        const cols = Math.floor((PW - 2) / cell);
        const x0 = (PW - cols * cell) / 2 + cell / 2;
        for (let i = 0; i < tables; i++) {
          const r = Math.floor(i / cols), c = i % cols;
          list.push({ t: 'table', x: px(x0 + c * cell), y: py(pista + 1.5 + r * cell), seats: i === tables - 1 ? n - i * 10 : 10 });
        }
        list.unshift({ t: 'floor', x: px(PW / 2 - 9), y: py(1), w: 18 * S, h: (pista - 1.5) * S, label: 'Pista' });
      } else if (f === 'coquetel') {
        const r = rand(7);
        list.push({ t: 'bar', x: px(1), y: py(6), w: 2 * S, h: 26 * S });
        list.push({ t: 'bar', x: px(PW - 3), y: py(6), w: 2 * S, h: 26 * S });
        const tables = Math.round(n / 25);
        for (let i = 0; i < tables; i++) list.push({ t: 'hightop', x: px(5 + r() * (PW - 10)), y: py(4 + r() * (PH - 7)) });
        for (let i = 0; i < n; i++) list.push({ t: 'person', x: px(4 + r() * (PW - 8)), y: py(2.5 + r() * (PH - 4)) });
      } else if (f === 'feira') {
        const size = 3, aisle = 3.5, perRow = Math.floor((PW - 4) / size);
        const x0 = (PW - perRow * size) / 2;
        for (let i = 0; i < n; i++) {
          const band = Math.floor(i / (perRow * 2)), inBand = i % (perRow * 2);
          const row = Math.floor(inBand / perRow), c = inBand % perRow;
          list.push({ t: 'stand', x: px(x0 + c * size), y: py(3 + band * (size * 2 + aisle) + row * size), w: size * S - 2, h: size * S - 2 });
        }
      } else if (f === 'show') {
        const r = rand(11);
        list.push({ t: 'foh', x: px(PW / 2 - 2.5), y: py(PH * 0.68), w: 5 * S, h: 4 * S });
        for (let i = 0; i < n; i++) {
          // Mais gente perto do palco
          const d = Math.pow(r(), 1.8) * (PH - 4);
          const spread = 18 + d * 0.6;
          const x = PW / 2 + (r() - 0.5) * 2 * Math.min(spread, PW / 2 - 1.5);
          const y = 2 + d;
          if (Math.abs(x - PW / 2) < 3.2 && y > PH * 0.68 - 0.5 && y < PH * 0.68 + 4.5) { i--; continue; }
          list.push({ t: 'person', x: px(x), y: py(y) });
        }
      }
      return list;
    }

    function zone(x, y, w, h, text, on) {
      ctx.save();
      ctx.setLineDash(on ? [] : [3, 4]);
      ctx.strokeStyle = on ? C.amber : C.line;
      ctx.fillStyle = on ? 'rgba(255,180,94,.14)' : 'transparent';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? C.stone : C.dim;
      ctx.font = '500 10px "Instrument Sans", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + w / 2, y + h / 2);
      ctx.restore();
    }

    function draw(progress) {
      const extras = extrasUI.filter(i => i.checked).map(i => i.value);
      ctx.clearRect(0, 0, W, H);

      // Plenária
      ctx.fillStyle = 'rgba(234,225,212,.03)';
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(OX, OY, PW * S, PH * S, 6); ctx.fill(); ctx.stroke();
      // Grade de 5 m
      ctx.strokeStyle = 'rgba(234,225,212,.05)';
      for (let m = 5; m < PW; m += 5) { ctx.beginPath(); ctx.moveTo(OX + m * S, OY); ctx.lineTo(OX + m * S, OY + PH * S); ctx.stroke(); }
      for (let m = 5; m < PH; m += 5) { ctx.beginPath(); ctx.moveTo(OX, OY + m * S); ctx.lineTo(OX + PW * S, OY + m * S); ctx.stroke(); }

      // Palco
      const sw = STAGE.w * S, sh = STAGE.h * S, sx = (W - sw) / 2, sy = OY - sh;
      const grad = ctx.createLinearGradient(0, sy, 0, OY);
      grad.addColorStop(0, '#3a2440'); grad.addColorStop(1, '#241a2c');
      ctx.fillStyle = grad; ctx.strokeStyle = C.bronze;
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, [6, 6, 0, 0]); ctx.fill(); ctx.stroke();
      if (extras.includes('Telão de LED')) {
        ctx.save();
        ctx.shadowColor = C.amber; ctx.shadowBlur = 18;
        ctx.fillStyle = C.amber;
        ctx.fillRect(sx + 14, sy + 8, sw - 28, 5);
        ctx.restore();
      }
      ctx.fillStyle = C.stone; ctx.font = '700 13px "Big Shoulders Display", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PALCO · 245 m²', W / 2, sy + sh / 2 + 6);

      // Áreas de apoio
      zone(OX, 24, sx - OX - 12, 70, 'Food trucks', extras.includes('Food trucks'));
      zone(sx + sw + 12, 24, OX + PW * S - (sx + sw + 12), 70, 'Patrocinadores', extras.includes('Área de patrocinadores'));
      zone(W / 2 - 70, OY + PH * S + 4, 140, 16, 'Credenciamento · entrada', extras.includes('Credenciamento'));

      // Montagem
      const count = Math.floor(items.length * progress);
      for (let i = 0; i < count; i++) {
        const it = items[i];
        switch (it.t) {
          case 'seat':
            ctx.fillStyle = C.amber; ctx.fillRect(it.x, it.y, 3.2, 3); break;
          case 'table':
            ctx.fillStyle = 'rgba(255,180,94,.18)'; ctx.strokeStyle = C.amber;
            ctx.beginPath(); ctx.arc(it.x, it.y, 7.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = C.stone;
            for (let s = 0; s < it.seats; s++) {
              const a = (s / 10) * Math.PI * 2;
              ctx.beginPath(); ctx.arc(it.x + Math.cos(a) * 10.5, it.y + Math.sin(a) * 10.5, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            break;
          case 'floor':
            ctx.fillStyle = 'rgba(196,91,255,.12)'; ctx.strokeStyle = 'rgba(196,91,255,.6)';
            ctx.beginPath(); ctx.roundRect(it.x, it.y, it.w, it.h, 4); ctx.fill(); ctx.stroke();
            ctx.fillStyle = C.stone; ctx.font = '500 10px "Instrument Sans", sans-serif';
            ctx.fillText(it.label, it.x + it.w / 2, it.y + it.h / 2); break;
          case 'bar':
            ctx.fillStyle = C.bronze; ctx.beginPath(); ctx.roundRect(it.x, it.y, it.w, it.h, 3); ctx.fill(); break;
          case 'hightop':
            ctx.strokeStyle = C.bronze; ctx.beginPath(); ctx.arc(it.x, it.y, 3.5, 0, Math.PI * 2); ctx.stroke(); break;
          case 'person':
            ctx.fillStyle = 'rgba(255,180,94,.8)'; ctx.beginPath(); ctx.arc(it.x, it.y, 1.3, 0, Math.PI * 2); ctx.fill(); break;
          case 'stand':
            ctx.fillStyle = 'rgba(255,180,94,.2)'; ctx.strokeStyle = C.amber;
            ctx.beginPath(); ctx.roundRect(it.x + 1, it.y + 1, it.w, it.h, 2); ctx.fill(); ctx.stroke(); break;
          case 'foh':
            ctx.strokeStyle = C.stone; ctx.setLineDash([2, 3]);
            ctx.strokeRect(it.x, it.y, it.w, it.h); ctx.setLineDash([]);
            ctx.fillStyle = C.dim; ctx.font = '500 9px "Instrument Sans", sans-serif';
            ctx.fillText('Técnica', it.x + it.w / 2, it.y + it.h / 2); break;
        }
      }

      // Escala
      ctx.strokeStyle = C.dim; ctx.beginPath();
      const ex = OX + PW * S;
      ctx.moveTo(ex - 10 * S, H - 6); ctx.lineTo(ex, H - 6); ctx.stroke();
      ctx.fillStyle = C.dim; ctx.font = '400 10px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
      ctx.fillText('10 m', ex - 10 * S - 6, H - 6);
    }

    function animate() {
      if (reduceMotion) { draw(1); return; }
      animStart = performance.now();
      const loop = now => {
        const p = Math.min(1, (now - animStart) / 650);
        draw(1 - Math.pow(1 - p, 3));
        if (p < 1) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    function update(rebuild = true) {
      const cfg = FORMATS[format];
      const n = +range.value;
      out.textContent = fmt(n);
      range.style.setProperty('--p', `${((n - cfg.min) / (cfg.max - cfg.min)) * 100}%`);
      const ratio = n / cfg.max;
      occ.textContent = `${Math.round(ratio * 100)}%`;
      if (format === 'feira') {
        perLabel.textContent = 'Visitantes ao mesmo tempo';
        per.textContent = `~${fmt(n * 22)}`;
      } else {
        perLabel.textContent = 'Espaço por pessoa';
        per.textContent = `${(PW * PH / n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²`;
      }
      tip.textContent = tipFor(format, ratio, n);

      const extras = extrasUI.filter(i => i.checked).map(i => i.value);
      const brief = [
        'Olá! Quero fazer um evento no Coliseu Convenções.',
        `Formato: ${cfg.name}`,
        `${cfg.unit}: ${fmt(n)}`,
        extras.length ? `Incluir: ${extras.join(', ')}` : null,
        'Podemos agendar uma visita?',
      ].filter(Boolean).join('\n');
      send.href = waLink(brief);

      if (rebuild) { items = layout(format, n); animate(); } else draw(1);
    }

    function tipFor(f, ratio, n) {
      if (f === 'auditorio') return ratio > 0.85 ? 'Lotação máxima: o telão de LED garante visão do palco até a última fileira.' : 'Sobra espaço atrás das cadeiras para coffee break ou estandes.';
      if (f === 'banquete') return `${Math.ceil(n / 10)} mesas redondas de 10 lugares, com pista de dança em frente ao palco.`;
      if (f === 'coquetel') return ratio > 0.8 ? 'Casa cheia: considere a praça de food trucks para distribuir o público.' : 'Circulação confortável, com bares nas laterais e mesas bistrô.';
      if (f === 'feira') return `${n} estandes de 3 × 3 m com corredores de 3,5 m.`;
      return ratio > 0.8 ? 'Pista cheia com área técnica centralizada.' : 'Pista com folga para cenografia e áreas VIP.';
    }

    formatsUI.forEach(r => r.addEventListener('change', () => {
      remembered[format] = +range.value;
      format = r.value;
      const cfg = FORMATS[format];
      range.min = cfg.min; range.max = cfg.max; range.step = cfg.step;
      range.value = remembered[format] ?? cfg.value;
      label.textContent = cfg.unit;
      minEl.textContent = fmt(cfg.min); maxEl.textContent = fmt(cfg.max);
      update();
    }));
    let rafId = 0;
    range.addEventListener('input', () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { items = layout(format, +range.value); update(false); });
    });
    range.addEventListener('change', () => update());
    extrasUI.forEach(c => c.addEventListener('change', () => update(false)));

    new ResizeObserver(resize).observe(cv);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => draw(1));
    items = layout(format, +range.value);
    update();
    resize();

    // Monta a planta quando o simulador entra na tela
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) { animate(); obs.disconnect(); }
    }, { threshold: 0.4 }).observe(cv);
  }

  /* --- Telão de LED --------------------------------------------------------- */
  const ledCanvas = $('[data-led]');
  if (ledCanvas) setupLed(ledCanvas);

  function setupLed(cv) {
    const ctx = cv.getContext('2d');
    const input = $('[data-led-input]');
    const view = $('.stage__view');
    const swatches = $$('[data-led-color]');
    const COLS = 176, ROWS = 56;           // resolução da matriz de pixels
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d', { willReadFrequently: true });
    let color = '#FFB45E';
    let pixels = null, textW = COLS, offset = 0, visible = false;

    function rasterize() {
      const text = (input.value.trim() || 'COLISEU').toUpperCase();
      // Encolhe o texto para caber no telão; só rola quando nem assim cabe
      let px = ROWS * 0.8;
      bctx.font = `800 ${px}px "Big Shoulders Display", sans-serif`;
      const full = bctx.measureText(text).width;
      if (full > COLS - 12) px = Math.max(ROWS * 0.5, px * (COLS - 12) / full);
      const font = `800 ${px}px "Big Shoulders Display", sans-serif`;
      bctx.font = font;
      const measured = Math.ceil(bctx.measureText(text).width);
      textW = measured > COLS - 8 ? measured + 40 : COLS;
      buf.width = textW; buf.height = ROWS;
      bctx.fillStyle = '#000'; bctx.fillRect(0, 0, textW, ROWS);
      bctx.font = font;
      bctx.fillStyle = '#fff'; bctx.textBaseline = 'middle'; bctx.textAlign = 'center';
      bctx.fillText(text, textW / 2, ROWS / 2 + 2);
      pixels = bctx.getImageData(0, 0, textW, ROWS).data;
      offset = 0;
    }

    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
    }

    function draw(t) {
      if (!pixels) return;
      const w = cv.width, h = cv.height;
      const cw = w / COLS, ch = h / ROWS, r = Math.min(cw, ch) * 0.36;
      ctx.fillStyle = '#07040A'; ctx.fillRect(0, 0, w, h);
      const scrolling = textW > COLS;
      const start = scrolling ? Math.floor(offset) % textW : Math.floor((textW - COLS) / 2);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const sx = (start + x) % textW;
          const on = pixels[(y * textW + sx) * 4] > 110;
          // Brilho de fundo ondulante, como um telão em repouso
          const wave = 0.06 + 0.05 * Math.sin(x * 0.12 + t * 0.002 + y * 0.08);
          ctx.globalAlpha = on ? 1 : wave;
          ctx.fillStyle = on ? color : '#6E2860';
          ctx.beginPath(); ctx.arc(x * cw + cw / 2, y * ch + ch / 2, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (scrolling && !reduceMotion) offset += 0.35;
    }

    let last = 0;
    function loop(t) {
      requestAnimationFrame(loop);
      if (!visible || t - last < 33) return;
      last = t;
      draw(t);
    }

    input.addEventListener('input', () => { rasterize(); draw(performance.now()); });
    $('[data-led-form]').addEventListener('submit', e => e.preventDefault());
    swatches.forEach(b => b.addEventListener('click', () => {
      color = b.dataset.ledColor;
      view.style.setProperty('--led', color);
      swatches.forEach(s => s.setAttribute('aria-checked', String(s === b)));
      draw(performance.now());
    }));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);
    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(cv);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { rasterize(); size(); draw(0); });
    requestAnimationFrame(loop);
  }

  /* --- Formulário de contato → WhatsApp -------------------------------------- */
  const form = $('[data-contact]');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const nameField = form.elements.nome.closest('.field');
      nameField.classList.toggle('has-error', !data.nome.trim());
      if (!data.nome.trim()) { form.elements.nome.focus(); return; }
      const date = data.data ? new Date(`${data.data}T12:00`).toLocaleDateString('pt-BR') : null;
      const text = [
        `Olá! Meu nome é ${data.nome.trim()}${data.empresa ? `, da ${data.empresa.trim()}` : ''}.`,
        'Gostaria de agendar uma visita ao Coliseu Convenções.',
        `Tipo de evento: ${data.tipo}`,
        data.pessoas ? `Convidados: ${fmt(+data.pessoas)}` : null,
        date ? `Data prevista: ${date}` : null,
        data.msg ? `Sobre o evento: ${data.msg.trim()}` : null,
      ].filter(Boolean).join('\n');
      window.open(waLink(text), '_blank', 'noopener');
    });
    form.elements.nome.addEventListener('input', e => {
      if (e.target.value.trim()) e.target.closest('.field').classList.remove('has-error');
    });
  }

  // Recalcula posições quando imagens e fontes terminam de carregar
  if (hasGsap) addEventListener('load', () => ScrollTrigger.refresh());
})();
