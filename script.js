/* =============================================
   DETECÇÃO DE HARDWARE / PERFORMANCE
   ============================================= */
/* Hardware genuinamente fraco = ≤2 núcleos OU prefers-reduced-motion.
   Celulares com 4-8 núcleos NÃO são low-perf — apenas têm layout mobile.
   Mid-perf = desktop com 3-4 núcleos: mantém animações, reduz GPU. */
const _cores         = navigator.hardwareConcurrency || 8;
const _prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const _isDesktop     = !window.matchMedia('(max-width: 768px)').matches;
const isLowPerf      = _cores <= 2 || _prefersReduced;
const isMidPerf      = !isLowPerf && _isDesktop && _cores <= 4;
if (isLowPerf) document.body.classList.add('low-perf');
if (isMidPerf) document.body.classList.add('mid-perf');

/* Throttle de scroll via rAF — um único listener central */
let _scrollRAF = false;
const _scrollCBs = [];
function onScroll(cb) { _scrollCBs.push(cb); }
window.addEventListener('scroll', () => {
    if (_scrollRAF) return;
    _scrollRAF = true;
    requestAnimationFrame(() => {
        _scrollCBs.forEach(fn => fn());
        _scrollRAF = false;
    });
}, { passive: true });

/* =============================================
   UTILITY
   ============================================= */
function splitTextIntoChars(el) {
    const raw   = el.textContent;
    const total = raw.length;
    el.innerHTML = '';
    raw.split('').forEach((ch, i) => {
        const span = document.createElement('span');
        if (ch === ' ') {
            span.className = 'char space';
        } else {
            span.className = 'char';
            span.setAttribute('data-char', ch);
            span.style.setProperty('--char-index', i);
            span.style.setProperty('--char-total', total);
        }
        span.textContent = ch;
        el.appendChild(span);
    });
}

/* =============================================
   INTRO ANIMATION
   ============================================= */
(function IntroAnimation() {
    const overlay = document.getElementById('intro-overlay');
    const canvas  = document.getElementById('intro-canvas');

    /* Só pula se o usuário pediu explicitamente redução de movimento */
    if (_prefersReduced) {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; revealContent(); }, 100);
        return;
    }

    /* ── Cooking Letters intro ── */
    canvas.style.display = 'none';

    const container = document.createElement('div');
    container.id = 'intro-text';

    ['NÃO É SOBRE POSTAR.', 'É SOBRE POSICIONAR.'].forEach((text, idx) => {
        const p = document.createElement('p');
        p.className = 'intro-phrase';
        p.style.setProperty('--idx', idx);
        p.textContent = text;
        container.appendChild(p);
    });
    overlay.appendChild(container);

    container.querySelectorAll('.intro-phrase').forEach(p => splitTextIntoChars(p));

    /* Alinha o container da intro exatamente sobre o hero text */
    requestAnimationFrame(() => {
        const h1 = document.getElementById('hero-text-1');
        const h2 = document.getElementById('hero-text-2');
        if (h1 && h2) {
            const r1 = h1.getBoundingClientRect();
            const r2 = h2.getBoundingClientRect();
            const heroCenterY = (r1.top + r2.bottom) / 2;
            const viewCenterY  = window.innerHeight / 2;
            container.style.transform = `translateY(${heroCenterY - viewCenterY}px)`;
        }
    });

    /* Low-perf: mesma animação mas um pouco mais curta (sem GSAP no reveal) */
    const introDuration = isLowPerf ? 2800 : 3800;
    setTimeout(() => {
        overlay.style.transition = 'opacity 1s ease';
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; revealContent(); }, 1050);
    }, introDuration);
    return;

    const isMobileAnim = window.matchMedia('(max-width: 768px)').matches;
    const ctx = canvas.getContext('2d');

    let W, H, cx, cy;
    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        cx = W / 2; cy = H / 2;
    }
    resize();

    let phase            = 'waiting';
    let T                = 0;
    let contentTriggered = false;
    let fadeAlpha        = 1; // controla overlay.style.opacity no fadeout

    /* --- Gota --- */
    let dropY  = -60;
    let dropVY = 0.6;
    const dropTrail = [];

    /* --- Partículas --- */
    const particles = [];

    const PARTICLE_COUNT = isMobileAnim ? 40 : 120;

    function spawnParticles() {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.15 + Math.random() * 2.2;
            const col   = [[255,255,255],[218,205,255],[195,170,255],[245,240,255]][Math.floor(Math.random()*4)];
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.7 - Math.random() * 0.3,
                size:  0.5 + Math.random() * 2.0,
                alpha: 0.2 + Math.random() * 0.5,
                cr: col[0], cg: col[1], cb: col[2],
                softR: 5 + Math.random() * 10,
                gatherDelay: Math.random() * 0.8,
            });
        }
    }

    function drawParticle(p, alphaScale, softR) {
        const a = p.alpha * alphaScale;
        if (a < 0.004) return;

        if (isMobileAnim) {
            /* Mobile: círculo simples — sem gradiente, muito mais rápido */
            ctx.globalAlpha = a;
            ctx.fillStyle = `rgb(${p.cr},${p.cg},${p.cb})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else {
            const r = p.size + softR * 0.4;
            if (r < 0.1) return;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
            g.addColorStop(0,    `rgba(${p.cr},${p.cg},${p.cb},${a})`);
            g.addColorStop(0.4,  `rgba(${p.cr},${p.cg},${p.cb},${a * 0.3})`);
            g.addColorStop(1,    `rgba(${p.cr},${p.cg},${p.cb},0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCenterGlow(intensity) {
        if (intensity < 0.004) return;
        if (isMobileAnim) {
            /* Mobile: um único gradiente simples */
            const ri = intensity * 120;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ri);
            g.addColorStop(0, `rgba(255,255,255,${intensity * 0.9})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.fill();
        } else {
            const ri = intensity * 110;
            const ro = intensity * 300;
            const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, ri);
            ig.addColorStop(0,    `rgba(255,255,255,${intensity * 0.95})`);
            ig.addColorStop(0.3,  `rgba(220,205,255,${intensity * 0.5})`);
            ig.addColorStop(1,    'rgba(0,0,0,0)');
            ctx.fillStyle = ig;
            ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.fill();

            const og = ctx.createRadialGradient(cx, cy, ri * 0.3, cx, cy, ro);
            og.addColorStop(0, `rgba(140,105,255,${intensity * 0.2})`);
            og.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = og;
            ctx.beginPath(); ctx.arc(cx, cy, ro, 0, Math.PI * 2); ctx.fill();
        }
    }

    function tick() {
        T += 0.016;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        /* ── FASE: CAINDO ── */
        if (phase === 'falling') {
            dropVY += 0.022;
            dropY  += dropVY;
            dropTrail.push({ x: cx, y: dropY });
            if (dropTrail.length > 32) dropTrail.shift();

            for (let i = 0; i < dropTrail.length; i++) {
                const t  = i / dropTrail.length;
                const pt = dropTrail[i];
                const r  = t * 2.5;
                if (r < 0.2) continue;
                const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 6);
                g.addColorStop(0, `rgba(255,255,255,${t * 0.22})`);
                g.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 6, 0, Math.PI * 2); ctx.fill();
            }

            const elong = Math.min(1 + dropVY * 0.08, 3.0);
            const hg = ctx.createRadialGradient(cx, dropY, 0, cx, dropY, 18);
            hg.addColorStop(0, 'rgba(215,200,255,0.38)');
            hg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.ellipse(cx, dropY, 18, 18 * elong * 0.4, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.beginPath(); ctx.ellipse(cx, dropY, 2.0, 2.0 * elong, 0, 0, Math.PI * 2); ctx.fill();

            if (dropY >= cy) { phase = 'impact'; T = 0; spawnParticles(); }
        }

        /* ── FASE: IMPACTO ── */
        else if (phase === 'impact') {
            const fa = Math.max(0, 1 - T / 0.6) * 0.75;
            if (fa > 0.01) {
                const fr = 20 + T * 520;
                const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
                fg.addColorStop(0,    `rgba(255,255,255,${fa})`);
                fg.addColorStop(0.4,  `rgba(210,195,255,${fa * 0.4})`);
                fg.addColorStop(1,    'rgba(0,0,0,0)');
                ctx.fillStyle = fg;
                ctx.beginPath(); ctx.arc(cx, cy, fr, 0, Math.PI * 2); ctx.fill();
            }

            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                p.vx *= 0.972; p.vy *= 0.972;
                drawParticle(p, 1, p.softR);
            });

            if (T > (isMobileAnim ? 0.25 : 0.4)) { phase = 'floating'; T = 0; }
        }

        /* ── FASE: FLUTUANDO — sem peso, deriva lenta ── */
        else if (phase === 'floating') {
            particles.forEach((p, i) => {
                p.vx *= 0.985; p.vy *= 0.985;
                p.x  += p.vx + Math.sin(T * 0.9 + i * 0.48) * 0.1;
                p.y  += p.vy + Math.cos(T * 0.75 + i * 0.61) * 0.09;
                drawParticle(p, 1, p.softR);
            });
            if (T > (isMobileAnim ? 0.35 : 0.7)) { phase = 'gathering'; T = 0; }
        }

        /* ── FASE: CONVERGINDO — atraídas ao centro ── */
        else if (phase === 'gathering') {
            particles.forEach((p, i) => {
                if (T < p.gatherDelay) {
                    p.x += Math.sin(T * 0.9 + i * 0.48) * 0.1;
                    p.y += Math.cos(T * 0.75 + i * 0.61) * 0.09;
                    drawParticle(p, 1, p.softR);
                    return;
                }
                const elapsed = T - p.gatherDelay;
                const pull    = 0.012 + elapsed * 0.006;
                p.vx += (cx - p.x) * pull;
                p.vy += (cy - p.y) * pull;
                p.vx *= 0.88; p.vy *= 0.88;
                p.x  += p.vx; p.y  += p.vy;

                const dist  = Math.hypot(p.x - cx, p.y - cy);
                const nearT = Math.max(0, 1 - dist / 80);
                drawParticle(p, 1 - nearT * 0.3, p.softR * (1 - nearT * 0.9));
            });

            drawCenterGlow(Math.min(T / 1.0, 1) * 0.9);
            if (T > (isMobileAnim ? 0.7 : 1.2)) { phase = 'forming'; T = 0; }
        }

        /* ── FASE: FORMANDO — brilho sólido e suave ── */
        else if (phase === 'forming') {
            const glow = Math.max(0, 1 - T / 0.6);
            drawCenterGlow(glow);
            if (T > (isMobileAnim ? 0.5 : 0.8)) { phase = 'fadeout'; T = 0; revealContent(); }
        }

        /* ── FASE: FADE OUT — fade do overlay inteiro ── */
        else if (phase === 'fadeout') {
            fadeAlpha = Math.max(0, 1 - T / (isMobileAnim ? 0.6 : 0.9));
            overlay.style.opacity = fadeAlpha;
            if (fadeAlpha <= 0) {
                overlay.style.display = 'none';
                return;
            }
        }

        requestAnimationFrame(tick);
    }

    setTimeout(() => { phase = 'falling'; requestAnimationFrame(tick); }, isMobileAnim ? 150 : 300);
    window.addEventListener('resize', resize);
})();

/* =============================================
   CONTENT REVEAL — GSAP
   ============================================= */
function revealContent() {
    /* Em hardware fraco: exibe tudo direto, sem GSAP */
    if (isLowPerf) {
        const nb = document.getElementById('navbar');
        if (nb) nb.style.opacity = '1';
        const bg = document.querySelector('.hero-bg-img img');
        if (bg) bg.style.opacity = '1';
        const si = document.querySelector('.scroll-indicator');
        if (si) si.style.opacity = '1';
        const hw = document.getElementById('hero-welcome');
        if (hw) heroWelcomeScramble();
        return;
    }

    /* ── Scramble começa junto com o reveal ── */
    heroWelcomeScramble();

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    /* ── Imagem de fundo do hero ── */
    tl.fromTo('.hero-bg-img img',
        { opacity: 0, scale: 1.08, filter: 'blur(18px)' },
        { opacity: 1, scale: 1,    filter: 'blur(0px)',  duration: 1.6 },
        0
    );

    /* ── Navbar: emerge do centro para cima ──
       Sem filter: Chrome mobile quebra position:fixed quando filter fica inline */
    tl.fromTo('#navbar',
        { y: '38vh', opacity: 0, scale: 0.9 },
        { y: '0vh',  opacity: 1, scale: 1, duration: 1.4, clearProps: 'transform,scale' },
        0
    );

    /* ── Scroll indicator ── */
    tl.to('.scroll-indicator', {
        opacity: 1,
        duration: 0.7,
        ease: 'power2.out'
    }, '-=0.2');
}

/* =============================================
   HERO WELCOME — SCRAMBLE
   ============================================= */
function heroWelcomeScramble() {
    const el = document.getElementById('hero-welcome');
    if (!el) return;

    const chars      = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*<>[]{}=+?';
    const target     = 'bem vindo';
    let   raf        = null;
    let   frame      = 0;
    let   tick_count = 0;
    const TICK_EVERY = 1; /* cada rAF avança 1 frame — velocidade normal */

    const queue = target.split('').map((ch, i) => ({
        to:    ch,
        start: Math.floor(i * 2),
        end:   Math.floor(i * 2) + Math.floor(Math.random() * 8 + 6),
        char:  ch === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)],
    }));

    function tick() {
        tick_count++;
        if (tick_count % TICK_EVERY === 0) {
            let html = '';
            let done = 0;
            queue.forEach(item => {
                if (item.to === ' ') { html += ' '; done++; return; }
                if (frame >= item.end) {
                    html += item.to;
                    done++;
                } else {
                    if (Math.random() < 0.28) item.char = chars[Math.floor(Math.random() * chars.length)];
                    html += `<span class="scramble-dud">${item.char}</span>`;
                }
            });
            el.innerHTML = html;
            frame++;
            if (done >= queue.length) return;
        }
        raf = requestAnimationFrame(tick);
    }

    cancelAnimationFrame(raf);
    el.style.opacity = '1'; /* torna visível junto com o scramble */
    requestAnimationFrame(tick);
}

/* =============================================
   CURSOR — CROSS + GLOW TRAIL
   ============================================= */
(function Cursor() {
    /* Cursor nativo do sistema — cruz e trail desativados */
    return;

    const cross  = document.getElementById('cursor-cross');
    const canvas = document.getElementById('cursor-trail');

    /* Em hardware fraco desativa o trail canvas */
    if (isLowPerf) {
        canvas.style.display = 'none';
        document.addEventListener('mousemove', e => {
            cross.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
        });
        return;
    }

    const ctx = canvas.getContext('2d');
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    /* Trail points — each has x, y, age */
    const trail   = [];
    const MAX     = 25;
    const MAX_AGE = 40;
    let   mx = -200, my = -200;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cross.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%))`;
        trail.push({ x: mx, y: my, age: 0 });
        if (trail.length > MAX) trail.shift();
    });

    function render() {
        ctx.clearRect(0, 0, W, H);

        /* Age every point each frame; remove expired ones */
        for (let i = trail.length - 1; i >= 0; i--) {
            trail[i].age++;
            if (trail[i].age > MAX_AGE) trail.splice(i, 1);
        }

        for (let i = 0; i < trail.length; i++) {
            const p     = trail[i];
            const posT  = i / Math.max(trail.length - 1, 1);       // 0→1 position
            const ageT  = 1 - p.age / MAX_AGE;                      // 1→0 as it ages
            const t     = posT * ageT;
            const r     = t * 13;
            const a     = t * 0.2;

            if (r < 0.4 || a < 0.002) continue;

            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, `rgba(255,255,255,${a})`);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    window.addEventListener('resize', resize);
})();

/* =============================================
   LENIS SMOOTH SCROLL
   ============================================= */
let lenis = null;
if (!isLowPerf) {
    lenis = new Lenis({
        duration: isMidPerf ? 1.1 : 1.4,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
    });
    function lenisRaf(time) {
        lenis.raf(time);
        requestAnimationFrame(lenisRaf);
    }
    requestAnimationFrame(lenisRaf);
}

/* =============================================
   ACTIVE NAV LINK (highlight on scroll)
   ============================================= */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-links li a');

const navAliases = { 'lista-servicos': 'servicos' };

function updateActiveNav() {
    let current = null;
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.4) {
            current = section.id;
        }
    });
    if (current && navAliases[current]) current = navAliases[current];
    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
}

onScroll(updateActiveNav);
updateActiveNav();

/* =============================================
   SMOOTH ANCHOR SCROLL
   ============================================= */
const easings = {
    /* easeInOutCubic — aceleração gradual, usado para "descer" */
    lift:     t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    /* easeOutExpo — arranca imediato, desacelera suavemente — ideal para "subir" */
    glide:    t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    default:  t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
};

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        /* data-scroll-skip: tratado pelo PortfolioCarousel — ignora aqui */
        if ('scrollSkip' in link.dataset) return;
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        const duration = parseFloat(link.dataset.scrollDuration) || 1.6;
        const easing   = easings[link.dataset.scrollEasing] || easings.default;
        if (lenis) lenis.scrollTo(target, { duration, easing });
        else target.scrollIntoView({ behavior: 'smooth' });
    });
});

/* =============================================
   EQUIPE — REVEAL (mesma animação do hero text)
   ============================================= */
(function EquipeReveal() {
    const cards = document.querySelectorAll('.equipe-card');
    if (!cards.length) return;

    if (isLowPerf) {
        cards.forEach(c => { c.style.opacity = '1'; });
        return;
    }

    let triggered = false;

    function checkReveal() {
        if (triggered) return;
        const trigger = window.innerHeight * 0.88;
        const first   = cards[0].getBoundingClientRect();
        if (first.top > trigger) return;

        triggered = true;

        gsap.fromTo(cards,
            {
                opacity: 0,
                y:      () => gsap.utils.random(40, 100),
                x:      () => gsap.utils.random(-60, 60),
                scale:  () => gsap.utils.random(0.7, 1.0),
            },
            {
                opacity: 1,
                y: 0, x: 0, scale: 1,
                duration: 3.0,
                ease: 'power4.out',
                stagger: { each: 1.3, from: 'start' },
                clearProps: 'transform,scale',
            }
        );
    }

    onScroll(checkReveal);
    checkReveal();
})();

/* =============================================
   LISTA SERVIÇOS — SCROLL REVEAL
   ============================================= */
(function ListaServicosReveal() {
    const section    = document.getElementById('lista-servicos');
    const fraseWrap  = document.querySelector('.ls-frase-wrap');
    const fraseEl    = document.querySelector('.ls-frase');
    const cardsWrap  = document.querySelector('.ls-cards-wrap');
    const leftCards  = Array.from(document.querySelectorAll('.ls-col-left .ls-card'));
    const rightCards = Array.from(document.querySelectorAll('.ls-col-right .ls-card'));
    const allCards   = [...leftCards, ...rightCards];
    if (!section || !fraseWrap || !fraseEl || !cardsWrap || !allCards.length) return;

    /* Em hardware genuinamente fraco: sem animações, mostra tudo estático */
    if (isLowPerf) {
        fraseWrap.style.opacity = '1';
        allCards.forEach(c => { c.style.opacity = '1'; c.style.transform = 'none'; });
        return;
    }

    /* Mobile: sem scroll-pin, animação suave ao descer com o dedo */
    if (window.matchMedia('(max-width: 768px)').matches) {
        fraseWrap.style.opacity = '1';
        const obsCards = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                gsap.to(e.target, {
                    opacity: 1,
                    y: 0,
                    duration: 0.55,
                    ease: 'power2.out'
                });
                obsCards.unobserve(e.target);
            });
        }, { threshold: 0.15 });
        allCards.forEach(c => obsCards.observe(c));
        return;
    }

    const VH = window.innerHeight;

    /*
     * 1º scroll (0 → VH):      frase aparece, desintegra no fim
     * ~1.1×VH:                  cards entram — tela "trava" aqui
     * 2º scroll (VH → 2×VH):   cards ficam visíveis (dwell = 1 VH completo)
     * 3º scroll (2×VH → 3×VH): seção termina, portfólio aparece
     */
    const EXPLODE_START = VH * 0.6;
    const CARDS_IN      = VH * 1.0;

    let fraseIn  = false;
    let fraseOut = false;
    let cardsIn  = false;

    fraseEl.querySelectorAll('.ls-line').forEach(l => splitTextIntoChars(l));
    const chars = fraseEl.querySelectorAll('.char');

    /* Cache do topo absoluto da seção — evita reflow a cada scroll */
    let sectionTop = 0;
    function cacheTop() {
        sectionTop = section.getBoundingClientRect().top + window.scrollY;
    }
    window.addEventListener('load',   cacheTop);
    window.addEventListener('resize', cacheTop, { passive: true });

    function update() {
        const scrolled = window.scrollY - sectionTop;

        /*
         * Visibilidade do container da frase: 1 entre 0 e CARDS_IN,
         * 0 fora desse range. Não depende de onComplete — sem conflito.
         */
        fraseWrap.style.opacity = (scrolled >= 0 && scrolled < CARDS_IN) ? '1' : '0';

        /* ── Fase 1: frase entra ── */
        if (scrolled >= 0 && !fraseIn) {
            fraseIn = true;
            gsap.killTweensOf(chars);
            gsap.fromTo(chars,
                { opacity: 0, x: () => gsap.utils.random(-80, 80), y: () => gsap.utils.random(-30, 30), scale: () => gsap.utils.random(0.6, 1.1), filter: 'blur(10px)' },
                { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.4, ease: 'power4.out', stagger: { each: 0.022, from: 'center' } }
            );
        }
        if (scrolled < 0 && fraseIn) {
            fraseIn = false;
            fraseOut = false;
            gsap.killTweensOf(chars);
            gsap.set(chars, { opacity: 0, x: 0, y: 0, scale: 1, filter: 'blur(0px)' });
        }

        /* ── Fase 2: frase desintegra ── */
        if (scrolled >= EXPLODE_START && fraseIn && !fraseOut) {
            fraseOut = true;
            gsap.killTweensOf(chars);
            gsap.to(chars, {
                opacity: 0,
                x:      () => gsap.utils.random(-200, 200),
                y:      () => gsap.utils.random(-200, -350),
                scale:  () => gsap.utils.random(0.05, 0.5),
                filter: 'blur(14px)',
                duration: 1.0,
                ease: 'power3.in',
                stagger: { each: 0.012, from: 'random' }
                /* sem onComplete — visibilidade gerenciada acima */
            });
        }
        if (scrolled < EXPLODE_START && fraseOut) {
            fraseOut = false;
            gsap.killTweensOf(chars);
            gsap.to(chars, { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out', stagger: { each: 0.012, from: 'center' } });
        }

        /* ── Fase 3: todos os cards de uma vez, dos lados ── */
        if (scrolled >= CARDS_IN && !cardsIn) {
            cardsIn = true;
            gsap.fromTo(leftCards,
                { opacity: 0, x: -80, filter: 'blur(6px)' },
                { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power4.out', stagger: { each: 0.07, from: 'start' }, overwrite: true }
            );
            gsap.fromTo(rightCards,
                { opacity: 0, x: 80, filter: 'blur(6px)' },
                { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power4.out', stagger: { each: 0.07, from: 'start' }, overwrite: true }
            );
        }
        if (scrolled < CARDS_IN && cardsIn) {
            cardsIn = false;
            gsap.killTweensOf(allCards);
            gsap.to(leftCards,  { opacity: 0, x: -50, filter: 'blur(4px)', duration: 0.5, ease: 'power2.in', stagger: { each: 0.04, from: 'end' }, overwrite: true });
            gsap.to(rightCards, { opacity: 0, x:  50, filter: 'blur(4px)', duration: 0.5, ease: 'power2.in', stagger: { each: 0.04, from: 'end' }, overwrite: true });
        }
    }

    /* Mouse desce e some com o scroll */
    const mouseWrap = document.querySelector('.ls-mouse-wrap');
    if (mouseWrap) {
        function updateMouse() {
            const scrolled = window.scrollY - sectionTop;
            /* desce 1px por px de scroll, máx 160px */
            const drop = Math.min(160, Math.max(0, scrolled * 1.0));
            /* some quando os cards estão prestes a entrar */
            const opacity = scrolled < CARDS_IN * 0.7 ? 1 : Math.max(0, 1 - (scrolled - CARDS_IN * 0.7) / (CARDS_IN * 0.3));
            mouseWrap.style.transform = `translate(-50%, calc(80px + ${drop}px))`;
            mouseWrap.style.opacity   = opacity;
        }
        onScroll(updateMouse);
        window.addEventListener('load', updateMouse);
        updateMouse();
    }

    onScroll(update);
    window.addEventListener('load', update);
    update();
})();

/* =============================================
   PORTFÓLIO — CAROUSEL
   Desktop: scroll da página → translateX + scrubber
   Mobile:  swipe direto → translateX + snap
   ============================================= */
(function PortfolioCarousel() {
    const section  = document.getElementById('portfolio');
    const track    = document.getElementById('pf-track');
    const viewport = document.getElementById('pf-viewport');
    const scrubber = document.getElementById('pf-scrubber');
    const fill     = document.getElementById('pf-scrubber-fill');
    const thumb    = document.getElementById('pf-scrubber-thumb');
    if (!section || !track || isLowPerf) return;

    const isMobileView = window.matchMedia('(max-width: 768px)').matches;
    const pfCards = Array.from(track.querySelectorAll('.pf-card'));
    const videos  = Array.from(track.querySelectorAll('video'));
    const N       = pfCards.length;

    let prog = 0, maxShift = 0, sectionTop = 0;

    function cache() {
        const vw = viewport ? viewport.offsetWidth : window.innerWidth;

        /* Calcula o shift necessário para CENTRAR o último card no viewport.
           track.scrollWidth - vw alinha a borda direita — o último card fica
           deslocado para a direita. A fórmula correta usa o centro do card. */
        const cardW  = pfCards[0]?.offsetWidth || 0;
        const gapPx  = parseFloat(getComputedStyle(track).gap) || 17;
        const padL   = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const lastI  = pfCards.length - 1;
        const lastCenter = padL + lastI * (cardW + gapPx) + cardW / 2;
        maxShift = cardW > 0
            ? Math.max(0, lastCenter - vw / 2)
            : Math.max(0, track.scrollWidth - vw);

        if (!isMobileView) {
            sectionTop = section.getBoundingClientRect().top + window.scrollY;
            if (maxShift > 0) {
                /* dwell: espaço extra para o usuário assistir o último vídeo */
                const dwell = window.innerHeight * 0.85;
                section.style.height = (window.innerHeight + maxShift + dwell) + 'px';
            }
        }
    }

    /* Efeito 3D por card */
    function apply3D() {
        const vw = viewport ? viewport.offsetWidth : window.innerWidth;
        const cx = vw / 2;
        pfCards.forEach(card => {
            const r    = card.getBoundingClientRect();
            const dist = (r.left + r.width / 2) - cx;
            const t    = Math.min(1, Math.abs(dist) / (vw * 0.55));
            card.style.transform = `rotateY(${(dist * 0.038).toFixed(2)}deg) scale(${(1 - t * 0.15).toFixed(3)})`;
        });
    }

    /* Vídeo: toca o centralizado, pré-carrega vizinho */
    let syncTimer = null;
    const syncDelay = isMobileView ? 150 : 80; /* mobile: espera mais antes de checar — menos CPU durante swipe */
    function syncVideos() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            const vw = viewport ? viewport.offsetWidth : window.innerWidth;
            const cx = vw / 2;
            const ranked = videos.map(v => {
                const r = v.closest('.pf-card').getBoundingClientRect();
                return { v, d: Math.abs((r.left + r.right) / 2 - cx) };
            }).sort((a, b) => a.d - b.d);
            const best = ranked[0]?.v, neighbor = ranked[1]?.v;
            videos.forEach(v => {
                if (v === best) {
                    /* Inicia carga apenas se ainda não começou */
                    if (v.preload !== 'auto') {
                        v.preload = 'auto';
                        v.load();
                    }
                    if (v.paused) {
                        if (v.readyState >= 2) {
                            v.play().catch(() => {});
                        } else if (!v._playPending) {
                            /* Flag evita acumular listeners e re-chamar v.load()
                               (cada v.load() extra aborta o carregamento anterior) */
                            v._playPending = true;
                            v.addEventListener('canplay', () => {
                                v._playPending = false;
                                v.play().catch(() => {});
                            }, { once: true });
                            /* Só dispara load() se o browser ainda não começou */
                            if (v.readyState === 0) v.load();
                        }
                    }
                } else if (v === neighbor) {
                    if (v.preload !== 'auto') {
                        v.preload = 'auto';
                        v.load();
                    }
                    if (!v.paused) v.pause();
                } else {
                    if (!v.paused) v.pause();
                    /* Limpa a flag quando o vídeo sai do foco */
                    v._playPending = false;
                }
            });
        }, syncDelay);
    }

    window.addEventListener('load', () => {
        /* Mobile usa play-on-demand — não pré-carrega nada */
        if (isMobileView) return;
        /* Desktop: pré-carrega os primeiros 3 e o último vídeo */
        const toPreload = [...new Set([
            ...videos.slice(0, 3),
            videos[videos.length - 1],
        ])].filter(Boolean);
        toPreload.forEach(v => {
            v.preload = 'auto';
            v.load();
        });
    });

    function apply(p) {
        prog = Math.min(1, Math.max(0, p));
        track.style.transition = 'none';
        track.style.transform  = `translateX(-${prog * maxShift}px)`;
        if (!isMobileView && fill && thumb) {
            const pct = (prog * 100).toFixed(2) + '%';
            fill.style.width = pct;
            thumb.style.left = pct;
        }
        if (!isMobileView && !isMidPerf) requestAnimationFrame(apply3D);
        syncVideos();
    }

    cache();
    requestAnimationFrame(() => { cache(); apply(0); });
    window.addEventListener('load',   () => { cache(); apply(prog); });
    window.addEventListener('resize', () => { cache(); apply(prog); }, { passive: true });

    /* ── MOBILE: swipe nativo + play-on-demand ── */
    if (isMobileView) {
        section.style.height = '';
        track.style.transform = 'none';

        const mobileCards = pfCards.filter(c => !c.classList.contains('pf-mobile-hidden'));

        /* Ícones do botão */
        const ICON_PLAY  =
            '<svg width="20" height="24" viewBox="0 0 20 24" fill="white" aria-hidden="true">' +
              '<polygon points="2,1 19,12 2,23"/>' +
            '</svg>';
        const ICON_PAUSE =
            '<svg width="20" height="24" viewBox="0 0 20 24" fill="white" aria-hidden="true">' +
              '<rect x="2"  y="1" width="6" height="22" rx="1.5"/>' +
              '<rect x="12" y="1" width="6" height="22" rx="1.5"/>' +
            '</svg>';

        /* Cria botão de play/pause para cada card com vídeo */
        const playBtns = new Map(); /* Map<card, btn> */
        mobileCards.forEach(card => {
            const v = card.querySelector('video');
            if (!v) return;

            const btn = document.createElement('div');
            btn.className = 'pf-play-btn';
            btn.innerHTML = '<div class="pf-play-btn-inner">' + ICON_PLAY + '</div>';
            const inner = btn.querySelector('.pf-play-btn-inner');

            btn.addEventListener('click', () => {
                if (v.paused) {
                    v._userPlay = true;
                    inner.innerHTML = ICON_PAUSE;
                    v.play().catch(() => {
                        v._userPlay = false;
                        inner.innerHTML = ICON_PLAY;
                    });
                } else {
                    v._userPlay = false;
                    v.pause();
                    inner.innerHTML = ICON_PLAY;
                }
            });

            /* Bloqueia autoplay do browser usando 'playing' (dispara depois do play() resolver,
               evitando conflito com o clique do usuário que já setou _userPlay = true) */
            v.addEventListener('playing', () => {
                if (!v._userPlay) v.pause();
            });

            /* Sincroniza ícone se o browser pausar o vídeo por conta própria */
            v.addEventListener('pause', () => { inner.innerHTML = ICON_PLAY; });

            card.appendChild(btn);
            playBtns.set(card, btn);
        });

        /* Pausa vídeos de cards que saíram do centro e volta o ícone para play */
        function pauseOffCenter() {
            const cx = (viewport ? viewport.offsetWidth : window.innerWidth) / 2;
            let centered = null, minDist = Infinity;
            mobileCards.forEach(card => {
                const r    = card.getBoundingClientRect();
                const dist = Math.abs((r.left + r.width / 2) - cx);
                if (dist < minDist) { minDist = dist; centered = card; }
            });
            mobileCards.forEach(card => {
                if (card === centered) return;
                const v = card.querySelector('video');
                if (!v || v.paused) return;
                v.pause(); /* o listener 'pause' já troca o ícone para play */
            });
        }

        let mobileTimer = null;
        if ('onscrollend' in window) {
            track.addEventListener('scrollend', pauseOffCenter, { passive: true });
        } else {
            track.addEventListener('scroll', () => {
                clearTimeout(mobileTimer);
                mobileTimer = setTimeout(pauseOffCenter, 80);
            }, { passive: true });
        }

        /* Decode antecipado de imagens apenas — vídeos carregam sob demanda no clique */
        window.addEventListener('load', () => {
            mobileCards.forEach(c => {
                const img = c.querySelector('img');
                if (img && !img.complete) img.decode?.().catch(() => {});
            });
        });

        return;
    }

    /* ── DESKTOP: scroll da página + scrubber ── */
    if (!scrubber || !thumb) return;

    /* Botões subir/descer — pula a animação do carrossel.
       Teletransporta para a borda da seção e depois scroll suave ao destino. */
    document.querySelectorAll('.pf-nav-btns a[data-scroll-skip]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const dest = document.querySelector(btn.getAttribute('href'));
            if (!dest) return;

            /* Descobre se o destino está acima ou abaixo do portfólio */
            const destAbsY   = dest.getBoundingClientRect().top + window.scrollY;
            const goingUp    = destAbsY < sectionTop;
            const dwell      = window.innerHeight * 0.85;
            const sectionEnd = sectionTop + window.innerHeight + maxShift + dwell;

            /* Pula para a borda da seção instantaneamente */
            const edge = goingUp ? sectionTop : sectionEnd - window.innerHeight;
            if (lenis) lenis.scrollTo(edge, { duration: 0 });
            else window.scrollTo({ top: edge });

            /* Após dois frames, scroll suave até o destino.
               Subir → glide (easeOutExpo): arranca já e desacelera devagar — sem dureza.
               Descer → lift (easeInOutCubic): saída suave, chegada suave. */
            requestAnimationFrame(() => requestAnimationFrame(() => {
                const easing   = goingUp ? easings.glide : easings.lift;
                const duration = goingUp ? 2.2 : 1.8;
                if (lenis) lenis.scrollTo(dest, { duration, easing });
                else dest.scrollIntoView({ behavior: 'smooth' });
            }));
        });
    });

    function updateFromScroll() {
        if (!maxShift) return;
        apply((window.scrollY - sectionTop) / maxShift);
    }
    onScroll(updateFromScroll);

    function scrollToProgress(p) {
        const target = sectionTop + Math.min(1, Math.max(0, p)) * maxShift;
        if (lenis) lenis.scrollTo(target, { duration: 0.6 });
        else window.scrollTo({ top: target, behavior: 'smooth' });
    }

    scrubber.addEventListener('mousedown', e => e.preventDefault());
    scrubber.addEventListener('click', e => {
        if (e.target === thumb) return;
        const r = scrubber.getBoundingClientRect();
        scrollToProgress((e.clientX - r.left) / r.width);
    });

    let drag = false, startX = 0, startP = 0;
    thumb.addEventListener('mousedown', e => {
        drag = true; startX = e.clientX; startP = prog;
        thumb.classList.add('dragging');
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (!drag) return;
        const r = scrubber.getBoundingClientRect();
        const p = startP + (e.clientX - startX) / r.width;
        apply(p); scrollToProgress(p);
    });
    document.addEventListener('mouseup', () => {
        if (!drag) return;
        drag = false; thumb.classList.remove('dragging');
        document.body.style.userSelect = '';
    });
})();

(function PortfolioLsBgFade() {
    const lsSection = document.getElementById('lista-servicos');
    const lsBg      = document.querySelector('.ls-bg img') || document.querySelector('.ls-video');
    if (lsBg && lsSection) {
        onScroll(() => {
            const lsTop       = lsSection.getBoundingClientRect().top + window.scrollY;
            const lsHeight    = lsSection.offsetHeight;
            const scrolledInLs = window.scrollY - lsTop;
            const fadeStart   = lsHeight - window.innerHeight * 2.3;
            const fadeEnd     = lsHeight;
            const t = Math.min(1, Math.max(0, (scrolledInLs - fadeStart) / (fadeEnd - fadeStart)));
            lsBg.style.opacity = (0.75 * (1 - t)).toFixed(3);
        });
    }
})();

/* Fade do ls-bg no mobile também */
(function LsBgFadeMobile() {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const lsSection = document.getElementById('lista-servicos');
    const lsBg      = document.querySelector('.ls-bg img') || document.querySelector('.ls-video');
    if (!lsBg || !lsSection) return;
    onScroll(() => {
        const lsTop    = lsSection.getBoundingClientRect().top + window.scrollY;
        const lsHeight = lsSection.offsetHeight;
        const scrolledInLs = window.scrollY - lsTop;
        const fadeStart    = lsHeight - window.innerHeight * 2.3;
        const fadeEnd      = lsHeight;
        const t = Math.min(1, Math.max(0, (scrolledInLs - fadeStart) / (fadeEnd - fadeStart)));
        lsBg.style.opacity = (0.75 * (1 - t)).toFixed(3);
    });
})();

/* =============================================
   CONTATO — ANIMAÇÃO
   ============================================= */
(function ContatoReveal() {
    const section = document.getElementById('contato');
    const card    = document.querySelector('.ct-card');
    if (!section || !card) return;

    if (isLowPerf || window.matchMedia('(max-width: 768px)').matches) {
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        return;
    }

    const VH     = window.innerHeight;
    const CARD_IN = -VH * 0.4;  /* aparece junto com o background ao entrar na viewport */

    let cardIn    = false;
    let sectionTop = 0;

    function cacheTop() {
        sectionTop = section.getBoundingClientRect().top + window.scrollY;
    }
    window.addEventListener('load',   cacheTop);
    window.addEventListener('resize', cacheTop, { passive: true });

    function update() {
        if (!sectionTop) return;
        const scrolled = window.scrollY - sectionTop;

        if (scrolled >= CARD_IN && !cardIn) {
            cardIn = true;
            card.style.pointerEvents = 'auto';
            gsap.fromTo(card,
                { opacity: 0, y: 40, filter: 'blur(16px)', scale: 0.97 },
                { opacity: 1, y: 0,  filter: 'blur(0px)', scale: 1, duration: 2.0, ease: 'power3.out' }
            );
        }
        if (scrolled < CARD_IN && cardIn) {
            cardIn = false;
            card.style.pointerEvents = 'none';
            gsap.to(card, { opacity: 0, y: 30, filter: 'blur(6px)', duration: 0.5, ease: 'power2.in' });
        }
    }

    onScroll(update);
    window.addEventListener('load', () => { cacheTop(); update(); });
})();

/* =============================================
   EQUIPE CARD HOVER GLOW
   ============================================= */
document.querySelectorAll('.equipe-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.classList.remove('glow-out');
        card.classList.add('glow');
    });
    card.addEventListener('mouseleave', () => {
        card.classList.remove('glow');
        card.classList.add('glow-out');
        card.addEventListener('animationend', () => {
            card.classList.remove('glow-out');
        }, { once: true });
    });
});


/* =============================================
   SOBRE — INTELLIGENT TEXT REVEALS
   ============================================= */
(function SobreTextReveal() {
    const sobre = document.getElementById('sobre');
    if (!sobre) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                sobre.dataset.debug = 'false';
                observer.disconnect();
            }
        });
    }, { threshold: 0.15 });
    observer.observe(sobre);
})();

/* =============================================
   SERVIÇOS — SCRAMBLE TÍTULO "O QUE NOS DIFERENCIA"
   ============================================= */
(function ServicosTituloScramble() {
    const titulo = document.querySelector('.servicos-titulo');
    if (!titulo) return;

    const chars  = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*<>[]{}=+?';
    const target = titulo.textContent.trim();
    let   raf    = null;
    let   frame  = 0;
    let   queue  = [];

    function randomChar() {
        return chars[Math.floor(Math.random() * chars.length)];
    }

    function buildQueue() {
        queue = target.split('').map((ch, i) => ({
            to:    ch,
            start: Math.floor(i * 2),
            end:   Math.floor(i * 2) + Math.floor(Math.random() * 8 + 6),
            char:  ch === ' ' ? ' ' : randomChar(),
        }));
    }

    function tick() {
        let html = '';
        let done = 0;

        queue.forEach(item => {
            if (item.to === ' ') { html += ' '; done++; return; }

            if (frame >= item.end) {
                html += item.to;
                done++;
            } else if (frame >= item.start) {
                if (Math.random() < 0.32) item.char = randomChar();
                html += `<span class="scramble-dud">${item.char}</span>`;
            } else {
                html += `<span class="scramble-dud">${item.char}</span>`;
            }
        });

        titulo.innerHTML = html;

        if (done < queue.length) {
            frame++;
            raf = requestAnimationFrame(tick);
        }
    }

    function run() {
        cancelAnimationFrame(raf);
        frame = 0;
        buildQueue();
        titulo.innerHTML = '';
        raf = requestAnimationFrame(tick);
    }

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { run(); obs.unobserve(e.target); }
        });
    }, { threshold: 0.2 });

    obs.observe(titulo);
})();

/* =============================================
   SERVIÇOS — BRILHO COLORIDO QUE SEGUE O CURSOR
   ============================================= */
(function ServicosColorGlow() {
    const cards = document.querySelectorAll('.servico-card');
    if (!cards.length || window.matchMedia('(max-width: 768px)').matches) return;

    const PROXIMITY = 40;

    /* Injeta .sc-glow em cada card */
    cards.forEach(card => {
        const glow = document.createElement('div');
        glow.className = 'sc-glow';
        card.insertBefore(glow, card.firstChild);
    });

    /* Cache de rects — recalcula só em resize, não a cada pointermove */
    let rects = [];
    function cacheRects() {
        rects = Array.from(cards).map(card => card.getBoundingClientRect());
    }
    cacheRects();
    window.addEventListener('resize', cacheRects, { passive: true });
    /* Debounce no scroll — chamar getBoundingClientRect() direto no scroll
       força recalculo de layout (thrashing). 100 ms é suficiente para o efeito. */
    let _cacheScrollTimer = null;
    window.addEventListener('scroll', () => {
        clearTimeout(_cacheScrollTimer);
        _cacheScrollTimer = setTimeout(cacheRects, 100);
    }, { passive: true });

    /* RAF throttle — aplica no máximo 1 update por frame */
    let pending = null;
    let lastX = 0, lastY = 0;

    function update() {
        pending = null;
        const ex = lastX, ey = lastY;
        cards.forEach((card, i) => {
            const b = rects[i];
            if (!b) return;
            const inProximity = (
                ex > b.left   - PROXIMITY &&
                ex < b.right  + PROXIMITY &&
                ey > b.top    - PROXIMITY &&
                ey < b.bottom + PROXIMITY
            );
            card.style.setProperty('--active', inProximity ? 1 : 0);
            if (inProximity) {
                const cx = b.left + b.width  * 0.5;
                const cy = b.top  + b.height * 0.5;
                let angle = Math.atan2(ey - cy, ex - cx) * 180 / Math.PI;
                if (angle < 0) angle += 360;
                card.style.setProperty('--start', angle + 90);
            }
        });
    }

    document.body.addEventListener('pointermove', (e) => {
        lastX = e.clientX;
        lastY = e.clientY;
        if (!pending) pending = requestAnimationFrame(update);
    }, { passive: true });
})();

/* =============================================
   HAMBÚRGUER / MOBILE MENU
   ============================================= */
(function MobileMenu() {
    const hamburger  = document.getElementById('nav-hamburger');
    const mobileMenu = document.getElementById('nav-mobile-menu');
    if (!hamburger || !mobileMenu) return;

    function closeMenu() {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', () => {
        const isOpen = hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    /* Fecha ao clicar em qualquer link */
    mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', closeMenu);
    });
})();

/* =============================================
   MOBILE: desativa lista-servicos animada e portfólio pin
   ============================================= */
const isMobile = window.matchMedia('(max-width: 768px)').matches;

/* =============================================
   NAVBAR SCROLL BEHAVIOUR
   ============================================= */
const orbWrapper = document.querySelector('.hero-orb-wrapper');
const equipeEl   = document.getElementById('equipe');

/* Posição absoluta do equipe (recalcula após load e resize) */
let equipeAbsTop = 0;
function cacheEquipeTop() {
    if (equipeEl) equipeAbsTop = equipeEl.getBoundingClientRect().top + window.scrollY;
}
window.addEventListener('load', cacheEquipeTop);
window.addEventListener('resize', cacheEquipeTop, { passive: true });

onScroll(() => {
    const s      = window.scrollY;
    const navbar = document.getElementById('navbar');

    /* Padding compacto ao rolar */
    navbar.style.paddingTop    = s > 20 ? '14px' : '22px';
    navbar.style.paddingBottom = s > 20 ? '14px' : '22px';

    /* Glass aparece só quando há conteúdo atrás para desfocar */
    if (s > 40) {
        navbar.classList.add('glass-visible');
    } else {
        navbar.classList.remove('glass-visible');
    }

    /* Orb e background somem antes dos cards da equipe */
    const siteBg = document.getElementById('hero-bg-img');
    if (equipeAbsTop > 0) {
        const fadeStart = equipeAbsTop - window.innerHeight * 0.8;
        const fadeEnd   = equipeAbsTop - window.innerHeight * 0.3;
        const progress  = Math.min(1, Math.max(0, (s - fadeStart) / (fadeEnd - fadeStart)));
        const opacity   = 1 - progress;
        if (orbWrapper) {
            orbWrapper.style.opacity    = opacity;
            orbWrapper.style.visibility = opacity <= 0 ? 'hidden' : 'visible';
            const hidden = opacity <= 0;
            orbWrapper.style.display    = hidden ? 'none' : '';
            /* Para as animações CSS quando invisível — libera GPU */
            orbWrapper.style.animationPlayState = hidden ? 'paused' : 'running';
        }
        if (siteBg) siteBg.style.opacity = opacity;
    } else if (s > window.innerHeight * 0.5) {
        if (orbWrapper) {
            orbWrapper.style.opacity    = '0';
            orbWrapper.style.visibility = 'hidden';
            orbWrapper.style.display    = 'none';
            orbWrapper.style.animationPlayState = 'paused';
        }
        if (siteBg) siteBg.style.opacity = '0';
    }

});
