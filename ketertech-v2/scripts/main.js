/**
 * SCENE | Master Router & Persistent Audio v1
 * Handles Single Page Application (SPA) transitions and persistent audio playback.
 */

// Global Audio State (Persists across SPA navigations)
window.SCENE_AUDIO = {
    player: null,
    isPlaying: false,
    currentTrackIndex: 0,
    playlist: [
        { file: 'assets/audio/Angels_Cry_KLICKAUD.mp3', name: 'ANGELS CRY' },
        { file: 'assets/audio/Suddenly_KLICKAUD.mp3', name: 'SUDDENLY' },
        { file: 'assets/audio/ana_caprix_-_Alone_2Nite_KLICKAUD.mp3', name: 'ALONE 2NITE' },
        { file: 'assets/audio/do_drugs_in_public_cry_in_private_KLICKAUD.mp3', name: 'CRY IN PRIVATE' },
        { file: 'assets/audio/nation-Leafblower_KLICKAUD.mp3', name: 'LEAFBLOWER' },
        { file: 'assets/audio/push_up_on_it_KLICKAUD.mp3', name: 'PUSH UP ON IT' },
        { file: 'assets/audio/monker178_-_2_Real_Dj_Mix_KLICKAUD.mp3', name: '2 REAL DJ MIX' }
    ],
    progressInterval: null
};

/**
 * Main Initialization
 */
function initScene() {
    // 0. Hard-Purge Residual Legacy Metrics (Ghost Prevention)
    const ghostMetrics = document.querySelectorAll('.metric-block, .metric-label, .metric-bar-container, .metric-bar-fill, .metric-item, #systemMetrics, .system-metrics');
    ghostMetrics.forEach(m => m.remove());

    // 1. Intercept all internal links for SPA navigation
    initRouter();
    
    // 2. Persistent Module Injection (Sidebar)
    renderMiniAudio();
    
    // 3. Initialize Page-Specific Elements
    initComponents();
    
    // 4. sync audio UI
    syncAudioUI();
}

/**
 * Ensures the mini-audio controller is present in the sidebar for all pages
 */
function renderMiniAudio() {
    const sidebarTrack = document.querySelector('.sidebar-track');
    const header = document.querySelector('.main-header');
    
    // Sidebar Mini (Desktop)
    if (sidebarTrack && !document.querySelector('.mini-audio-module')) {
        const miniModule = document.createElement('div');
        miniModule.className = 'mini-audio-module';
        miniModule.innerHTML = `
            <div class="mini-audio-label">SYSTEM_AUDIO <div class="mini-status-dot" id="miniStatusDot"></div></div>
            <div class="mini-lcd" id="miniLcd">SELECT PLAY TO START</div>
            <div class="mini-controls">
                <button class="mini-btn" onclick="changeTrack(-1)">◄</button>
                <button class="mini-btn" id="miniPlayBtn" onclick="togglePlay()">► PLAY</button>
                <button class="mini-btn" onclick="changeTrack(1)">►</button>
            </div>
        `;
        sidebarTrack.appendChild(miniModule);
    }
    
    // Header Mini (Mobile/Small Screens)
    if (header && !document.querySelector('.header-mini-audio')) {
        const headerModule = document.createElement('div');
        headerModule.className = 'header-mini-audio';
        headerModule.innerHTML = `
            <button class="header-audio-btn" onclick="changeTrack(-1)">◄</button>
            <div class="header-audio-lcd" id="headerLcd">OFFLINE</div>
            <button class="header-audio-btn" id="headerPlayBtn" onclick="togglePlay()">►</button>
            <button class="header-audio-btn" onclick="changeTrack(1)">►</button>
        `;
        header.appendChild(headerModule);
    }
}

/**
 * SPA Router — Fetches page content via AJAX to prevent audio cutoff
 */
function initRouter() {
    document.addEventListener('click', (e) => {
        // Find the interactive element (A, or something with onclick, or something with data-spa-href)
        const el = e.target.closest('a, [onclick*="location.href"], [data-spa-href]');
        if (!el) return;
        
        let targetUrl = '';
        
        // Priority 1: Data-SPA-Href (Explicit SPA routes)
        if (el.dataset.spaHref) {
            targetUrl = el.dataset.spaHref;
        } 
        // Priority 2: Standard Anchor tags
        else if (el.tagName === 'A' && el.href) {
            // Ignore if it's meant to open in a new tab or is a download
            if (el.hasAttribute('download') || el.target === '_blank') return;
            
            const url = new URL(el.href);
            if (url.origin === window.location.origin) {
                targetUrl = el.href;
            }
        }
        // Priority 3: Inline Legacy Onclick
        else {
            const attr = el.getAttribute('onclick') || '';
            const match = attr.match(/location\.href\s*=\s*['"](.*?)['"]/);
            if (match && match[1]) {
                targetUrl = match[1];
            }
        }
        
        if (targetUrl) {
            e.preventDefault();
            e.stopPropagation(); // Stop the inline onclick handler from firing
            navigateToPage(targetUrl);
        }
    }, true); // Use capture phase so we get it BEFORE inline handlers

    window.onpopstate = () => {
        navigateToPage(window.location.href, true);
    };
}

async function navigateToPage(url, isPopState = false) {
    try {
        console.log('SPA: Navigating to', url);
        const workspace = document.querySelector('.workspace');
        if (workspace) workspace.classList.add('page-exit');
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed: ' + response.status);
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        if (!isPopState) {
            window.history.pushState({}, '', url);
        }

        const newWorkspace = doc.querySelector('.workspace');
        const currentWorkspace = document.querySelector('.workspace');
        
        if (newWorkspace && currentWorkspace) {
            console.log('SPA: Swapping workspace content');
            currentWorkspace.innerHTML = newWorkspace.innerHTML;
            currentWorkspace.className = newWorkspace.className;
            document.body.className = doc.body.className;
            document.title = doc.title;
        } else {
            console.warn('SPA: Workspace not found in target or source');
        }

        // Run component initializers on new content
        syncNavStates(url);
        initComponents();
        syncAudioUI();
        
        if (currentWorkspace) {
            setTimeout(() => {
                currentWorkspace.classList.remove('page-exit');
                window.scrollTo(0, 0);
            }, 50);
        }
        
    } catch (err) {
        console.error('SPA Navigation Error:', err);
        if (!isPopState) window.location.href = url;
    }
}

/**
 * Syncs the [active] state of navigation buttons after an SPA transition
 */
function syncNavStates(url) {
    const filename = url.split('/').pop() || 'index.html';
    const allBtns = document.querySelectorAll('.nav-btn, .side-btn');
    
    allBtns.forEach(btn => {
        btn.classList.remove('active');
        const onclick = btn.getAttribute('onclick') || '';
        const dataHref = btn.dataset.spaHref || '';
        if (onclick.includes(filename) || dataHref.includes(filename)) {
            btn.classList.add('active');
        }
    });
}

/**
 * Initialize Components for the current page
 */
function initComponents() {
    initTerminalBootSequence();
    if (typeof initializeGallery === 'function') initializeGallery();
    initConsoleCascade();
    initLogoGlimmer();
    
    // Ensure codefield canvas exists if it was destroyed
    if (!document.getElementById('codeFieldCanvas')) {
        window.dispatchEvent(new Event('resize')); 
    }
}

/**
 * --- Audio Logic (Persistent) ---
 */

function togglePlay() {
    const s = window.SCENE_AUDIO;
    if (!s.player) {
        s.player = new Audio();
        s.player.volume = 0.6;
        s.player.addEventListener('ended', () => changeTrack(1));
    }
    
    if (s.isPlaying) {
        s.player.pause();
        s.isPlaying = false;
        clearInterval(s.progressInterval);
        syncAudioUI();
    } else {
        if (!s.player.src || s.player.src === '') {
            s.player.src = s.playlist[s.currentTrackIndex].file;
        }
        s.player.play().then(() => {
            s.isPlaying = true;
            startProgress();
            syncAudioUI(); // Sync AFTER promise resolves
        }).catch(err => {
            console.warn('Audio play blocked:', err);
        });
    }
}

function changeTrack(direction) {
    const s = window.SCENE_AUDIO;
    if (!s.player) togglePlay(); 
    
    s.currentTrackIndex += direction;
    if (s.currentTrackIndex >= s.playlist.length) s.currentTrackIndex = 0;
    if (s.currentTrackIndex < 0) s.currentTrackIndex = s.playlist.length - 1;

    s.player.src = s.playlist[s.currentTrackIndex].file;
    if (s.isPlaying) {
        s.player.play();
    }
    syncAudioUI();
}

function syncAudioUI() {
    const s = window.SCENE_AUDIO;
    const playBtn = document.getElementById('playBtn');
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const headerPlayBtn = document.getElementById('headerPlayBtn');
    
    const statusDot = document.getElementById('statusDot');
    const miniStatusDot = document.getElementById('miniStatusDot');
    
    const statusText = document.getElementById('statusText');
    const lcd = document.getElementById('lcdDisplay');
    const miniLcd = document.getElementById('miniLcd');
    const headerLcd = document.getElementById('headerLcd');
    
    const label = s.isPlaying ? '❚❚ PAUSE' : '► PLAY';
    const shortLabel = s.isPlaying ? '❚❚' : '►';
    
    if (playBtn) playBtn.textContent = label;
    if (miniPlayBtn) miniPlayBtn.textContent = label;
    if (headerPlayBtn) headerPlayBtn.textContent = shortLabel;
    
    if (statusDot) s.isPlaying ? statusDot.classList.add('active') : statusDot.classList.remove('active');
    if (miniStatusDot) s.isPlaying ? miniStatusDot.classList.add('active') : miniStatusDot.classList.remove('active');
    
    if (statusText) statusText.textContent = s.isPlaying ? 'PLAYING' : 'PAUSED';
    
    const trackInfo = 'TRACK_' + String(s.currentTrackIndex + 1).padStart(2, '0') + ' // ' + s.playlist[s.currentTrackIndex].name;
    if (lcd) lcd.textContent = trackInfo;
    if (miniLcd) miniLcd.textContent = trackInfo;
    if (headerLcd) headerLcd.textContent = s.isPlaying ? trackInfo : 'STANDBY';
}

function startProgress() {
    const s = window.SCENE_AUDIO;
    clearInterval(s.progressInterval);
    
    s.progressInterval = setInterval(() => {
        const bar = document.getElementById('progressBar');
        if (!bar) return;
        
        if (s.player && s.player.duration) {
            const pct = (s.player.currentTime / s.player.duration) * 100;
            bar.style.width = pct + '%';
        }
    }, 300);
}

// --- Legacy Init Handlers (Integrated) ---

function initTerminalBootSequence() {
    const logElements = document.querySelectorAll('.static-terminal .term-heading, .static-terminal .term-list li');
    if (logElements.length === 0) return;
    
    logElements.forEach(el => {
        if (!el.dataset.fullText) {
            el.dataset.fullText = el.textContent;
            el.textContent = '';
        }
    });

    let currentIdx = 0;
    function typeNextLine() {
        if (currentIdx < logElements.length) {
            const el = logElements[currentIdx];
            const fullText = el.dataset.fullText;
            let charIdx = 0;
            const typeInterval = setInterval(() => {
                if (charIdx < fullText.length) {
                    el.textContent += fullText[charIdx];
                    charIdx++;
                } else {
                    clearInterval(typeInterval);
                    currentIdx++;
                    let pause = el.classList.contains('term-heading') ? 350 : 20;
                    setTimeout(typeNextLine, pause);
                }
            }, 10);
        }
    }
    setTimeout(typeNextLine, 600);
}

function initConsoleCascade() {
    const console = document.querySelector('.console-hub');
    if (!console) return;
    const elements = console.querySelectorAll('.panel-header, .term-heading, .term-list li, .metric-item, .log-entry');
    elements.forEach((el, i) => {
        el.classList.add('code-drop');
        el.style.animationDelay = (0.3 + (i * 0.06)) + 's';
    });
}

/**
 * Random Logo Glimmer — periodic glint of light across the brand wordmark
 */
function initLogoGlimmer() {
    const logo = document.querySelector('.brand-logo');
    if (!logo || window.LOGO_GLIMMER_ACTIVE) return;
    window.LOGO_GLIMMER_ACTIVE = true;
    
    function triggerGlint() {
        logo.classList.remove('glint');
        void logo.offsetWidth; // Force reflow
        logo.classList.add('glint');
        
        // Schedule next random glint (16 to 40 seconds)
        const nextTime = 16000 + (Math.random() * 24000);
        setTimeout(triggerGlint, nextTime);
    }
    
    // Initial start
    setTimeout(triggerGlint, 4000);
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
} else {
    initScene();
}
