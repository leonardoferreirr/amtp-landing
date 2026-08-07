(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Menu mobile ---------- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('nav--open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav__mobile a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Entrada do hero (kinetic type) ----------
     rAF duplo garante que o estado inicial do CSS foi aplicado antes da
     transição. Em aba de fundo o rAF não dispara, então o timeout entra
     como failsafe: sem ele o hero ficaria invisível. */
  function heroReady() { root.classList.add('is-ready'); }
  requestAnimationFrame(function () { requestAnimationFrame(heroReady); });
  setTimeout(heroReady, 150);

  /* ---------- Reveal + cascata ---------- */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    [].forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, [data-stagger]').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------- Contadores ---------- */
  function animateCount(el) {
    var to = parseInt(el.dataset.to, 10);
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    var dur = 1600;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(to * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.count').forEach(function (el) {
    countObserver.observe(el);
  });

  /* ---------- Scroll: navbar densa + parallax do hero ---------- */
  (function () {
    var hero = document.querySelector('.hero');
    var glow1 = document.querySelector('.hero__glow--1');
    var glow2 = document.querySelector('.hero__glow--2');
    var pixels = document.querySelector('.hero__pixels');
    var ticking = false;

    function update() {
      var y = window.scrollY || 0;
      if (nav) nav.classList.toggle('is-stuck', y > 24);
      if (!reduceMotion && hero && y < hero.offsetHeight) {
        if (glow1) glow1.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)';
        if (glow2) glow2.style.transform = 'translate3d(0,' + (y * -0.1).toFixed(1) + 'px,0)';
        if (pixels) pixels.style.transform = 'translate3d(0,' + (y * 0.26).toFixed(1) + 'px,0)';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ---------- Grade magnética do hero ----------
     Malha de nós em repouso. Perto do cursor cada nó é puxado na direção dele
     com força que decai com a distância, e volta por mola quando o mouse sai.
     As linhas ligam nós vizinhos, então a grade inteira se curva como limalha
     de ferro em volta de um ímã. */
  (function () {
    var canvas = document.getElementById('heroMesh');
    var hero = document.querySelector('.hero');
    if (!canvas || !hero || reduceMotion || !finePointer) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var SPACING = 66;   // distância de repouso entre nós
    var RADIUS = 200;   // alcance do ímã
    var PULL = 0.42;    // fração da distância que o nó percorre até o cursor
    var EASE = 0.12;    // mola

    var W = 0, H = 0, cols = 0, rows = 0, pts = [];
    var mx = 0, my = 0, hasMouse = false, running = false, rect = null;

    function build() {
      rect = hero.getBoundingClientRect();
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      if (!W || !H) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(W / SPACING) + 1;
      rows = Math.ceil(H / SPACING) + 1;
      pts = new Array(cols * rows);
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var ox = i * SPACING, oy = j * SPACING;
          pts[j * cols + i] = { ox: ox, oy: oy, x: ox, y: oy, e: 0 };
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // malha inteira num único path
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.055)';
      ctx.beginPath();
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var p = pts[j * cols + i];
          if (i < cols - 1) {
            var r = pts[j * cols + i + 1];
            ctx.moveTo(p.x, p.y); ctx.lineTo(r.x, r.y);
          }
          if (j < rows - 1) {
            var b = pts[(j + 1) * cols + i];
            ctx.moveTo(p.x, p.y); ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.stroke();

      if (!hasMouse && !running) return;

      // segmentos sob influência: um gradiente radial no cursor faz o falloff
      var g = ctx.createRadialGradient(mx, my, 0, mx, my, RADIUS);
      g.addColorStop(0, 'rgba(39,209,200,.62)');
      g.addColorStop(0.55, 'rgba(39,209,200,.22)');
      g.addColorStop(1, 'rgba(39,209,200,0)');

      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var j2 = 0; j2 < rows; j2++) {
        for (var i2 = 0; i2 < cols; i2++) {
          var q = pts[j2 * cols + i2];
          if (q.e < 0.03) continue;
          if (i2 < cols - 1) {
            var r2 = pts[j2 * cols + i2 + 1];
            ctx.moveTo(q.x, q.y); ctx.lineTo(r2.x, r2.y);
          }
          if (j2 < rows - 1) {
            var b2 = pts[(j2 + 1) * cols + i2];
            ctx.moveTo(q.x, q.y); ctx.lineTo(b2.x, b2.y);
          }
        }
      }
      ctx.stroke();

      // nós acesos
      ctx.fillStyle = g;
      for (var k = 0; k < pts.length; k++) {
        var n = pts[k];
        if (n.e < 0.12) continue;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1 + n.e * 2.2, 0, 6.2832);
        ctx.fill();
      }
    }

    function frame() {
      var moving = 0;
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var tx = p.ox, ty = p.oy, pull = 0;
        if (hasMouse) {
          var dx = mx - p.ox, dy = my - p.oy;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < RADIUS) {
            var f = 1 - d / RADIUS;
            f *= f;
            pull = f;
            tx = p.ox + dx * f * PULL;
            ty = p.oy + dy * f * PULL;
          }
        }
        p.x += (tx - p.x) * EASE;
        p.y += (ty - p.y) * EASE;
        p.e += (pull - p.e) * EASE;
        moving += Math.abs(tx - p.x) + Math.abs(ty - p.y) + p.e;
      }
      draw();
      if (hasMouse || moving > 0.5) {
        requestAnimationFrame(frame);
      } else {
        running = false;
        draw();
      }
    }

    function kick() {
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    hero.addEventListener('mousemove', function (e) {
      if (!rect) return;
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
      hasMouse = true;
      kick();
    }, { passive: true });

    hero.addEventListener('mouseleave', function () {
      hasMouse = false;
      kick();
    }, { passive: true });

    var rz;
    window.addEventListener('resize', function () {
      clearTimeout(rz);
      rz = setTimeout(function () { build(); draw(); }, 160);
    }, { passive: true });

    window.addEventListener('scroll', function () {
      rect = hero.getBoundingClientRect();
    }, { passive: true });

    build();
    if (W && H) {
      draw();
      hero.classList.add('hero--mesh');
    }
  })();

  /* ---------- Conversa da Lunna ---------- */
  (function () {
    var chat = document.getElementById('lunnaChat');
    var typing = document.getElementById('chatTyping');
    var status = document.getElementById('chatStatus');
    if (!chat || !typing || !status || reduceMotion) return;
    // abaixo de 1020px o card vai para cima do texto e o CSS mostra a conversa
    // inteira: encenar aqui só empurraria o conteúdo
    if (!window.matchMedia('(min-width: 1021px)').matches) return;

    var msgs = [].slice.call(chat.querySelectorAll('.chat__msg'));
    if (!msgs.length) return;

    var step = 0, timer = null, active = false;

    function reset() {
      clearTimeout(timer);
      step = 0;
      msgs.forEach(function (m) { m.classList.remove('is-shown'); });
      typing.classList.remove('is-shown', 'chat__typing--in');
      status.classList.remove('is-shown');
    }

    function next() {
      if (!active) return;
      if (step >= msgs.length) {
        status.classList.add('is-shown');
        timer = setTimeout(function () { reset(); next(); }, 4600);
        return;
      }
      var msg = msgs[step];
      var isIn = msg.classList.contains('chat__msg--in');
      typing.classList.toggle('chat__typing--in', isIn);
      typing.classList.add('is-shown');
      timer = setTimeout(function () {
        typing.classList.remove('is-shown');
        msg.classList.add('is-shown');
        step++;
        timer = setTimeout(next, isIn ? 640 : 900);
      }, isIn ? 700 : 1080);
    }

    // só roda enquanto o card está na tela
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !active) {
          active = true;
          reset();
          timer = setTimeout(next, 500);
        } else if (!entry.isIntersecting && active) {
          active = false;
          clearTimeout(timer);
        }
      });
    }, { threshold: 0.25 }).observe(chat);
  })();

  /* ---------- CTAs magnéticos ---------- */
  (function () {
    if (reduceMotion || !finePointer) return;
    document.querySelectorAll('.btn--lg, .btn--xl').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width;
        var y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = 'translate(' + (x * 16).toFixed(1) + 'px,' + (y * 9 - 3).toFixed(1) + 'px)';
      }, { passive: true });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  })();
})();
