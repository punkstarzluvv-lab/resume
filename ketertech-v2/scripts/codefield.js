/**
 * Reactive Code Field v4 — SPA Optimized
 */
(function () {
    'use strict';

    // Singleton check — don't re-init if already running
    if (window.CODEFIELD_ACTIVE) return;
    window.CODEFIELD_ACTIVE = true;

    var CHARS = '01001011010011100101'.split('')
        .concat('.:+=<>'.split(''))
        .concat('ABCDEF09'.split(''));

    // --- Canvas ---
    var canvas = document.createElement('canvas');
    canvas.id = 'codeFieldCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;';
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var W, H;
    var mouse = { x: -500, y: -500 };
    var particles = [];
    var trailDrops = [];

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // --- Mouse ---
    var trailTimer = 0;

    document.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        // Spawn trail drops — LESS frequent (every 6th event)
        trailTimer++;
        if (trailTimer % 6 === 0) {
            spawnTrailDrop(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseleave', function () {
        mouse.x = -500;
        mouse.y = -500;
    });

    // --- Trail Drop (fewer, slower) ---
    function spawnTrailDrop(x, y) {
        if (trailDrops.length > 20) return; // less drops max
        trailDrops.push({
            x: x + (Math.random() - 0.5) * 24,
            y: y,
            speed: 0.6 + Math.random() * 1.0,       // SLOWER fall
            char: CHARS[Math.floor(Math.random() * CHARS.length)],
            opacity: 0.55 + Math.random() * 0.25,
            size: 12 + Math.random() * 3,
            life: 1.0,
            decay: 0.006 + Math.random() * 0.006,    // longer life
            isPurple: Math.random() > 0.4
        });
    }

    // --- Background Particles ---
    function createParticle(layer) {
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            speed: (0.15 + Math.random() * 0.35) * layer.speedMult, // SLOWER
            char: CHARS[Math.floor(Math.random() * CHARS.length)],
            size: (11 + Math.random() * 3) * layer.sizeMult,
            layerOpacity: layer.opacityMult,
            drift: (Math.random() - 0.5) * 0.06,
            flickerPhase: Math.random() * Math.PI * 2,
            flickerSpeed: 0.006 + Math.random() * 0.01,
            charTimer: 0,
            charInterval: 90 + Math.floor(Math.random() * 150)
        };
    }

    var LAYERS = [
        { speedMult: 0.4, sizeMult: 0.7,  opacityMult: 0.45, count: 22 },
        { speedMult: 0.65, sizeMult: 0.85, opacityMult: 0.65, count: 25 },
        { speedMult: 1.0, sizeMult: 1.0,   opacityMult: 1.0,  count: 15 }
    ];

    function initParticles() {
        particles = [];
        LAYERS.forEach(function (layer) {
            for (var i = 0; i < layer.count; i++) {
                particles.push(createParticle(layer));
            }
        });
    }

    // --- Draw ---
    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // === 1. Cursor Glow — WIDER, LIGHTER hue, more radiance ===
        if (mouse.x > 0 && mouse.y > 0) {
            // Outer soft bloom
            var bloom = ctx.createRadialGradient(
                mouse.x, mouse.y, 0,
                mouse.x, mouse.y, 260
            );
            bloom.addColorStop(0, 'rgba(200, 170, 255, 0.09)');   // light lavender center
            bloom.addColorStop(0.25, 'rgba(170, 130, 255, 0.05)');
            bloom.addColorStop(0.5, 'rgba(130, 100, 220, 0.025)');
            bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bloom;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 260, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright core
            var core = ctx.createRadialGradient(
                mouse.x, mouse.y, 0,
                mouse.x, mouse.y, 60
            );
            core.addColorStop(0, 'rgba(220, 200, 255, 0.12)');   // bright white-lavender
            core.addColorStop(0.5, 'rgba(180, 150, 255, 0.05)');
            core.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        // === 2. Background Falling Code ===
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            p.flickerPhase += p.flickerSpeed;
            var flicker = 0.6 + 0.4 * Math.sin(p.flickerPhase);

            p.charTimer++;
            if (p.charTimer >= p.charInterval) {
                p.char = CHARS[Math.floor(Math.random() * CHARS.length)];
                p.charTimer = 0;
            }

            var dx = p.x - mouse.x;
            var dy = p.y - mouse.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            // Base: subtle but READABLE
            var opacity = 0.12 * p.layerOpacity * flicker;
            // Lighter hue base — soft silvery lavender
            var r = 180, g = 175, b = 200;

            // Cursor proximity
            if (dist < 200) {
                var proximity = 1 - (dist / 200);
                var ease = proximity * proximity;

                opacity = 0.12 + 0.5 * ease;

                // Color: lighter hues — lavender → white-purple
                if (ease > 0.45) {
                    // Close: bright lavender-white (lighter hue)
                    r = 210; g = 190; b = 255;
                } else {
                    // Mid: soft periwinkle-cyan
                    r = 180 + (190 - 180) * ease * 2;
                    g = 175 + (210 - 175) * ease * 2;
                    b = 200 + (250 - 200) * ease * 2;
                }

                p.x += dx * 0.005 * ease;
                p.y += dy * 0.003 * ease;

                if (ease > 0.6 && Math.random() < 0.06) {
                    p.char = CHARS[Math.floor(Math.random() * CHARS.length)];
                }
            }

            ctx.font = p.size + 'px Share Tech Mono, Consolas, monospace';
            ctx.fillStyle = 'rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ',' + opacity.toFixed(3) + ')';

            // Glow on close particles — lighter, more radiant
            if (dist < 130) {
                var glowStrength = 1 - dist / 130;
                ctx.shadowColor = 'rgba(200, 180, 255, ' + (opacity * 0.7).toFixed(3) + ')';
                ctx.shadowBlur = 12 * glowStrength;
            }

            ctx.fillText(p.char, p.x, p.y);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // SLOWER movement
            p.y += p.speed;
            p.x += p.drift;

            if (p.y > H + 20) {
                p.y = -20;
                p.x = Math.random() * W;
                p.char = CHARS[Math.floor(Math.random() * CHARS.length)];
            }
            if (p.x < -30) p.x = W + 10;
            if (p.x > W + 30) p.x = -10;
        }

        // === 3. Cursor Trail — FEWER, SLOWER, lighter hue darker contrast ===
        for (var j = trailDrops.length - 1; j >= 0; j--) {
            var d = trailDrops[j];

            // Lighter hues: soft lavender and pale ice-blue
            var tr, tg, tb;
            if (d.isPurple) {
                tr = 200; tg = 170; tb = 255;  // light lavender
            } else {
                tr = 170; tg = 220; tb = 240;  // pale ice-blue
            }

            var trailOpacity = d.opacity * d.life;

            ctx.font = d.size + 'px Share Tech Mono, Consolas, monospace';
            ctx.fillStyle = 'rgba(' + tr + ',' + tg + ',' + tb + ',' + trailOpacity.toFixed(3) + ')';

            // Stronger glow — more light radiating
            ctx.shadowColor = 'rgba(' + tr + ',' + tg + ',' + tb + ',' + (d.life * 0.45).toFixed(3) + ')';
            ctx.shadowBlur = 10;

            ctx.fillText(d.char, d.x, d.y);

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // SLOWER fall
            d.y += d.speed;
            d.life -= d.decay;

            if (Math.random() < 0.03) {
                d.char = CHARS[Math.floor(Math.random() * CHARS.length)];
            }

            if (d.life <= 0 || d.y > H + 30) {
                trailDrops.splice(j, 1);
            }
        }

        requestAnimationFrame(draw);
    }

    // --- Start ---
    initParticles();
    draw();

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initParticles, 250);
    });
})();
