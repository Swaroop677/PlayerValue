/**
 * PlayerValue Motion Engine
 * GSAP + ScrollTrigger + Lenis integration
 * Cinematic, high-contrast, performant (only transform, opacity, filter)
 * Full prefers-reduced-motion & dual-theme token support
 */

(function () {
  'use strict';

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  // ── Helper: Safe Token Color Extraction ───────────────────────────
  function getTokenColor(varName, fallback) {
    if (typeof window === 'undefined' || !document.documentElement) return fallback;
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val || fallback;
  }

  // ── CDN Dynamic Loader for GSAP, ScrollTrigger & Lenis ─────────────
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.dataset.loaded = 'true';
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initMotionLibraries() {
    try {
      await Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js'),
        loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js')
      ]);

      if (window.gsap && window.ScrollTrigger) {
        window.gsap.registerPlugin(window.ScrollTrigger);
      }

      initAllMotion();
    } catch (err) {
      console.warn('[Motion] CDN scripts failed to load; using CSS fallback motion:', err);
      initFallbackInteractions();
    }
  }

  let lenisInstance = null;

  function initAllMotion() {
    initLenis();
    initScrollProgressBar();
    initCustomCursor();
    initHeroCanvas();
    initHeroSplitText();
    initAnimatedPlaceholder();
    initMagneticButtons();
    initCardSpotlights();
    initLiveBoardMotion();
    initHowItWorksPinned();
    initSpotlightWaterfall();
    initTrustStripCountUp();
  }

  // ── 1. Smooth Scroll with Lenis ───────────────────────────────────
  function initLenis() {
    if (isReducedMotion || isTouchDevice || !window.Lenis) return;

    try {
      lenisInstance = new window.Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        touchMultiplier: 1.5
      });

      if (window.ScrollTrigger) {
        lenisInstance.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add((time) => {
          lenisInstance.raf(time * 1000);
        });
        window.gsap.ticker.lagSmoothing(0);
      } else {
        function raf(time) {
          lenisInstance.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    } catch (e) {
      console.warn('[Motion] Lenis init skipped:', e);
    }
  }

  // ── 2. Scroll Progress Bar ─────────────────────────────────────────
  function initScrollProgressBar() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
      bar.style.width = `${progress}%`;
    }, { passive: true });
  }

  // ── 3. Custom Desktop Cursor Ring ─────────────────────────────────
  function initCustomCursor() {
    if (isTouchDevice || isReducedMotion) return;

    const ring = document.getElementById('custom-cursor-ring');
    const dot = document.getElementById('custom-cursor-dot');
    if (!ring || !dot) return;

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isHoveringInteractive = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });

    function renderCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      const scale = isHoveringInteractive ? 1.75 : 1;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${scale})`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Interactive element hover detection
    const interactives = 'a, button, input, .board-row, .tab-pill, .league-pill, [data-interactive]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactives)) {
        isHoveringInteractive = true;
        ring.classList.add('cursor-active');
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactives)) {
        isHoveringInteractive = false;
        ring.classList.remove('cursor-active');
      }
    }, { passive: true });
  }

  // ── 4. Interactive Hero Canvas: Market Particle Field ───────────────
  function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || isReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let isVisible = true;
    let mouse = { x: -9999, y: -9999, radius: 110 };

    const nodeCount = window.innerWidth < 768 ? 80 : 220;
    const nodes = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    // Create particles
    for (let i = 0; i < nodeCount; i++) {
      const isSpecial = Math.random() < 0.12; // 12% undervalued accent pulse
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: isSpecial ? (Math.random() * 1.8 + 2.2) : (Math.random() * 1.2 + 1.2),
        isSpecial,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Pause when offscreen or tab hidden
    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
    });
    observer.observe(canvas);

    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    function draw() {
      if (!isVisible) {
        requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const baseNodeColor = isDark ? 'rgba(236, 238, 241, 0.28)' : 'rgba(11, 15, 23, 0.22)';
      const accentColor = isDark ? '#2EE6A6' : '#0FA971';
      const lineColor = isDark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(10, 15, 25, 0.04)';
      const maxDist = 72;

      // Update and draw connections
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        // Move
        n1.x += n1.vx;
        n1.y += n1.vy;
        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;

        // Repel from cursor
        const dxMouse = n1.x - mouse.x;
        const dyMouse = n1.y - mouse.y;
        const distMouse = Math.hypot(dxMouse, dyMouse);
        if (distMouse < mouse.radius && distMouse > 0) {
          const force = (mouse.radius - distMouse) / mouse.radius;
          n1.x += (dxMouse / distMouse) * force * 2.5;
          n1.y += (dyMouse / distMouse) * force * 2.5;
        }

        // Connect near nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Draw node
        ctx.beginPath();
        if (n1.isSpecial) {
          n1.pulsePhase += 0.04;
          const pulse = (Math.sin(n1.pulsePhase) + 1) / 2;
          ctx.arc(n1.x, n1.y, n1.radius + pulse * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = accentColor;
          ctx.shadowBlur = 8;
          ctx.shadowColor = accentColor;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
          ctx.fillStyle = baseNodeColor;
          ctx.fill();
        }
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ── 5. Hero Headline Split-Text Reveal ──────────────────────────────
  function initHeroSplitText() {
    const title = document.querySelector('.home-hero-title');
    if (!title) return;

    if (isReducedMotion || !window.gsap) {
      title.style.opacity = '1';
      return;
    }

    // Split words into overflow-hidden wrappers
    const text = title.textContent.trim();
    const words = text.split(/\s+/);

    title.innerHTML = words.map(w => {
      const isAccent = (w.toLowerCase().includes('market') || w.toLowerCase().includes('wrong'));
      const spanClass = isAccent ? 'hero-word hero-accent-word' : 'hero-word';
      return `<span class="hero-word-wrap"><span class="${spanClass}">${w}</span></span>`;
    }).join(' ');

    const wordEls = title.querySelectorAll('.hero-word');
    window.gsap.fromTo(wordEls, 
      { y: '115%', opacity: 0, filter: 'blur(8px)' },
      {
        y: '0%',
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.85,
        ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
        stagger: 0.055,
        delay: 0.15
      }
    );

    // Fade in subtitle
    const sub = document.querySelector('.home-hero-subtitle');
    if (sub) {
      window.gsap.fromTo(sub,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.6, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }

    // Fade in search bar
    const searchWrap = document.querySelector('.home-search-wrap');
    if (searchWrap) {
      window.gsap.fromTo(searchWrap,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.75, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
  }

  // ── 6. Animated Placeholder Cycling ────────────────────────────────
  function initAnimatedPlaceholder() {
    const input = document.getElementById('home-search-input');
    if (!input) return;

    const names = ['Erling Haaland', 'Bukayo Saka', 'Jude Bellingham', 'Kylian Mbappé', 'Cole Palmer', 'Pedri'];
    let idx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timer = null;

    function tick() {
      if (document.activeElement === input) {
        // Paused while focused
        timer = setTimeout(tick, 800);
        return;
      }

      const current = names[idx];
      if (!isDeleting) {
        charIdx++;
        input.placeholder = `Search real players (e.g. ${current.slice(0, charIdx)})...`;
        if (charIdx >= current.length) {
          isDeleting = true;
          timer = setTimeout(tick, 2200); // pause at end
          return;
        }
        timer = setTimeout(tick, 75);
      } else {
        charIdx--;
        input.placeholder = `Search real players (e.g. ${current.slice(0, charIdx)})...`;
        if (charIdx <= 0) {
          isDeleting = false;
          idx = (idx + 1) % names.length;
          timer = setTimeout(tick, 450);
          return;
        }
        timer = setTimeout(tick, 40);
      }
    }
    timer = setTimeout(tick, 1200);
  }

  // ── 7. Magnetic Hover on Primary CTA ────────────────────────────────
  function initMagneticButtons() {
    if (isTouchDevice || isReducedMotion) return;

    const btns = document.querySelectorAll('.magnetic-btn');
    btns.forEach(btn => {
      let isInside = false;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist < 60) {
          isInside = true;
          const pullX = dx * 0.28;
          const pullY = dy * 0.28;
          btn.style.transform = `translate3d(${pullX}px, ${pullY}px, 0)`;
        }
      });

      btn.addEventListener('mouseleave', () => {
        isInside = false;
        btn.style.transform = 'translate3d(0, 0, 0)';
      });
    });
  }

  // ── 8. Radial Cursor Spotlight for Cards ───────────────────────────
  function initCardSpotlights() {
    if (isTouchDevice) return;

    const cards = document.querySelectorAll('.spotlight-card, .board-card, .how-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--card-mouse-x', `${x}px`);
        card.style.setProperty('--card-mouse-y', `${y}px`);
      }, { passive: true });
    });
  }

  // ── 9. Live Board Motion & Interactive Tabs ─────────────────────────
  function initLiveBoardMotion() {
    // Sliding pill for Live Board tabs (Undervalued vs Overvalued)
    const tabBtns = document.querySelectorAll('.board-view-tab');
    const tabIndicator = document.getElementById('board-tab-pill-indicator');

    function updateTabIndicator(activeBtn) {
      if (!tabIndicator || !activeBtn) return;
      tabIndicator.style.width = `${activeBtn.offsetWidth}px`;
      tabIndicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
    }

    if (tabBtns.length > 0 && tabIndicator) {
      const active = document.querySelector('.board-view-tab.active') || tabBtns[0];
      updateTabIndicator(active);

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateTabIndicator(btn);

          const target = btn.dataset.tab;
          const underCol = document.getElementById('board-col-undervalued');
          const overCol = document.getElementById('board-col-overvalued');

          if (underCol && overCol) {
            if (target === 'undervalued') {
              underCol.style.display = 'block';
              overCol.style.display = 'none';
            } else if (target === 'overvalued') {
              underCol.style.display = 'none';
              overCol.style.display = 'block';
            } else {
              underCol.style.display = 'block';
              overCol.style.display = 'block';
            }
          }
        });
      });
    }

    // Live Ticker Pulse: subtle highlight every 8 seconds
    setInterval(() => {
      const rows = document.querySelectorAll('.board-row');
      if (rows.length === 0) return;
      const randIdx = Math.floor(Math.random() * rows.length);
      const row = rows[randIdx];
      row.classList.add('row-ticker-pulse');
      setTimeout(() => row.classList.remove('row-ticker-pulse'), 1400);
    }, 8000);
  }

  // ── 10. How It Works Scroll-Pinned Section ──────────────────────────
  function initHowItWorksPinned() {
    if (isReducedMotion || !window.gsap || !window.ScrollTrigger) return;

    const section = document.querySelector('.how-it-works-section');
    const steps = document.querySelectorAll('.how-step-item');
    const accentLine = document.getElementById('how-accent-line-fill');
    if (!section || steps.length === 0) return;

    const tl = window.gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top+=80',
        end: '+=900',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1
      }
    });

    steps.forEach((step, idx) => {
      tl.fromTo(step, 
        { opacity: 0.25, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        idx * 0.4
      );

      if (accentLine) {
        tl.to(accentLine, {
          height: `${((idx + 1) / steps.length) * 100}%`,
          duration: 0.4,
          ease: 'none'
        }, idx * 0.4);
      }
    });
  }

  // ── 11. Spotlight Player SHAP Waterfall Scroll Trigger ──────────────
  function initSpotlightWaterfall() {
    const section = document.querySelector('.spotlight-section');
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateWaterfallBars();
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(section);

    function animateWaterfallBars() {
      const bars = document.querySelectorAll('.waterfall-bar-fill');
      bars.forEach((bar, idx) => {
        const targetWidth = bar.dataset.width || '50%';
        bar.style.width = '0%';
        setTimeout(() => {
          bar.style.transition = 'width 650ms cubic-bezier(0.22, 1, 0.36, 1)';
          bar.style.width = targetWidth;
        }, idx * 120 + 100);
      });
    }
  }

  // ── 12. Trust Strip Verified Metrics Count-Up ───────────────────────
  function initTrustStripCountUp() {
    const strip = document.querySelector('.trust-strip');
    if (!strip) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        runCountUps();
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(strip);

    function runCountUps() {
      const items = strip.querySelectorAll('[data-target-num]');
      items.forEach(el => {
        const target = parseFloat(el.dataset.targetNum);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const duration = 1600;
        const start = performance.now();

        function update(now) {
          const progress = Math.min((now - start) / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = (target * eased).toFixed(decimals);
          el.textContent = `${prefix}${current}${suffix}`;

          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
          }
        }
        requestAnimationFrame(update);
      });
    }
  }

  // Fallback for interactions when GSAP is disabled or unavailable
  function initFallbackInteractions() {
    initScrollProgressBar();
    initAnimatedPlaceholder();
    initLiveBoardMotion();
    initTrustStripCountUp();
  }

  // Auto-run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotionLibraries);
  } else {
    initMotionLibraries();
  }
})();
