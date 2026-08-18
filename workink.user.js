// ==UserScript==
// @name         Purify
// @namespace    https://work.ink/
// @version      54.0
// @description  A simplistic, zero-clutter link automation, ad defusal, audio silencer & automated TempMail auth suite for Opera.
// @author       tomatotxt
// @match        https://work.ink/*
// @match        https://*.mediafire.com/*
// @match        https://www.tempmail.co/404*
// @updateURL    https://raw.githubusercontent.com/tomatotxt/CleanOpera/raw/refs/heads/main/cleanoperalink
// @downloadURL  https://raw.githubusercontent.com/tomatotxt/CleanOpera/raw/refs/heads/main/cleanoperalink
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @grant        window.close
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================================
       GLOBAL CONSTANTS & HOISTED STATE VARIABLES (SINGLE DECLARATION)
       ========================================================================= */
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const EXPECTED_BUILD = 5382;
    const FALLBACK_OPERA_URL = 'https://www.mediafire.com/file/ceqhbc7yl5nmoe4/CleanOpera.zip/file';
    const REMOTE_LINK_CONFIG_URL = 'https://raw.githubusercontent.com/tomatotxt/CleanOpera/raw/refs/heads/main/cleanoperalink';
    const TEMPMAIL_TURNSTILE_SITEKEY = '0x4AAAAAAA_d4Z0H2NTOXki1';

    let activeOperaUrl = FALLBACK_OPERA_URL;
    let scriptTerminated = false;
    let isLockdownActive = false;
    let lockdownInterval = null;
    let consentHandled = false;
    let observer = null;

    let currentEmail = null;
    let currentKey = null;
    let currentCsrf = null;
    let pollInterval = null;
    let lastReceivedOtp = null;
    let emailSubmitted = false;
    let solverSpawned = false;

    /* =========================================================================
       SECTION A: MEDIAFIRE AUTO-DOWNLOADER & TAB CLOSER
       ========================================================================= */
    if (window.location.hostname.includes('mediafire.com')) {
        let downloadInitiated = false;

        function runMediaFireAutoDownload() {
            if (downloadInitiated) return;

            const dlBtn = document.getElementById('downloadButton');

            if (dlBtn && dlBtn.href) {
                const targetUrl = dlBtn.href;

                if (targetUrl.startsWith('http') && !targetUrl.endsWith('#') && !dlBtn.classList.contains('preparing')) {
                    downloadInitiated = true;

                    dlBtn.textContent = '✓ Purifying download...';
                    dlBtn.style.backgroundColor = '#10b981';
                    dlBtn.style.color = '#ffffff';

                    try {
                        dlBtn.click();
                    } catch (e) {}

                    setTimeout(() => {
                        window.location.href = targetUrl;
                    }, 300);

                    setTimeout(() => {
                        try {
                            window.close();
                        } catch (e) {
                            window.location.href = 'about:blank';
                        }
                    }, 2500);
                }
            }
        }

        const mfObserver = new MutationObserver(() => {
            runMediaFireAutoDownload();
        });

        mfObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'class']
        });

        runMediaFireAutoDownload();
        return;
    }

    /* =========================================================================
       SECTION B: TEMPMAIL.CO SOLVER POPUP (CAPTCHA & EMAIL CREATOR)
       ========================================================================= */
    if (window.location.hostname === 'www.tempmail.co' && window.location.pathname.startsWith('/404')) {
        document.title = "Purify • Verification";
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #090a0f; overflow: hidden;">
                <div id="turnstile-box"></div>
            </div>
        `;

        function getCookie(name) {
            const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
            return match ? decodeURIComponent(match[3]) : null;
        }

        async function ensureCsrf() {
            await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
            return getCookie('XSRF-TOKEN');
        }

        function loadTurnstile() {
            return new Promise((resolve) => {
                if (pageWindow.turnstile && typeof pageWindow.turnstile.render === 'function') {
                    return resolve(pageWindow.turnstile);
                }

                const callbackName = 'tsCallback_' + Math.random().toString(36).substring(7);
                pageWindow[callbackName] = function () {
                    resolve(pageWindow.turnstile);
                    delete pageWindow[callbackName];
                };

                const script = document.createElement('script');
                script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${callbackName}&render=explicit`;
                script.async = true;

                const checkInterval = setInterval(() => {
                    if (pageWindow.turnstile && typeof pageWindow.turnstile.render === 'function') {
                        clearInterval(checkInterval);
                        resolve(pageWindow.turnstile);
                    }
                }, 50);

                setTimeout(() => clearInterval(checkInterval), 6000);
                document.head.appendChild(script);
            });
        }

        async function startChallenge() {
            try {
                const turnstile = await loadTurnstile();
                turnstile.render('#turnstile-box', {
                    sitekey: TEMPMAIL_TURNSTILE_SITEKEY,
                    theme: 'dark',
                    callback: async function (token) {
                        try {
                            const csrf = await ensureCsrf();
                            const res = await fetch('/new', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json, text/plain, */*',
                                    'X-Requested-With': 'XMLHttpRequest',
                                    'X-XSRF-TOKEN': csrf
                                },
                                body: JSON.stringify({ 'cf-turnstile-response': token }),
                                credentials: 'same-origin'
                            });

                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            const json = await res.json();

                            GM_setValue('tempmail_session', {
                                email: json.data.email,
                                key: json.data.key,
                                csrf: csrf,
                                ts: Date.now()
                            });

                            window.close();
                        } catch (err) {
                            console.error('Failed to create email:', err);
                        }
                    }
                });
            } catch (err) {
                console.error('Turnstile load error:', err);
            }
        }

        startChallenge();
        return;
    }

    /* =========================================================================
       SECTION C: WORK.INK CORE AUTOMATION SUITE
       ========================================================================= */

    function isElementVisible(el) {
        return !!(el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0));
    }

    function isExcludedUrl(url) {
        if (!url || typeof url !== 'string') return true;
        return /checkout\.work\.ink|pay\.work\.ink|stripe\.com|tempmail\.co|about:blank/i.test(url);
    }

    // Helper: Simulates native input events with full bubbling for Svelte reactivity
    function setSvelteInputValue(input, value) {
        if (!input || input.value === value) return;
        input.focus();
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
            nativeSetter.call(input, value);
        } else {
            input.value = value;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Humanized single-click handler (prevents bot flags)
    function safeClick(btn) {
        if (!btn || btn.dataset.purifyClicked) return;
        btn.dataset.purifyClicked = 'true';
        setTimeout(() => {
            try {
                btn.click();
            } catch (e) {}
        }, 500 + Math.floor(Math.random() * 300));
    }

    // 0. Audio Silencer
    function silenceAllMedia() {
        document.querySelectorAll('audio, video').forEach((media) => {
            try {
                media.muted = true;
                media.volume = 0;
            } catch (e) {}
        });
    }

    window.addEventListener('play', (e) => {
        if (e.target && (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO')) {
            try {
                e.target.muted = true;
                e.target.volume = 0;
            } catch (err) {}
        }
    }, true);

    try {
        const origPlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
            this.muted = true;
            this.volume = 0;
            return origPlay.apply(this, arguments);
        };
    } catch (e) {}

    // 1. Task Mini-Window Handler (15s Auto-Close & Checkout Blocker)
    function createMiniWindow(url) {
        if (scriptTerminated || isExcludedUrl(url)) {
            return null;
        }

        const miniFeatures = 'width=380,height=380,left=120,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes';
        const popup = window.open(url, '_blank', miniFeatures);

        if (popup) {
            setTimeout(() => {
                try {
                    if (!popup.closed) popup.close();
                } catch (e) {}
            }, 15000);
        }

        const jitterSeconds = 15 + Number((Math.random() * 1.2 + 0.1).toFixed(1));
        showTaskLockdownOverlay(Math.ceil(jitterSeconds));
        return popup;
    }

    function onDocumentClick(e) {
        if (scriptTerminated) return;

        const target = e.target.closest('.cta-btn, button:has(.arrow-nudge), a[target="_blank"]');
        if (target && !target.closest('#access-offers')) {
            const href = target.href || target.closest('a')?.href;
            if (href && !href.startsWith('javascript:')) {
                if (isExcludedUrl(href)) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                createMiniWindow(href);
            }
        }
    }

    document.addEventListener('click', onDocumentClick, true);

    // 2. Purify Task Overlay
    function showTaskLockdownOverlay(durationSeconds = 16) {
        if (scriptTerminated || document.getElementById('tm-task-lockdown-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tm-task-lockdown-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483646',
            backgroundColor: 'rgba(9, 10, 15, 0.88)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            fontFamily: 'Outfit, system-ui, sans-serif',
            userSelect: 'none',
            cursor: 'wait'
        });

        overlay.innerHTML = `
            <div style="background: rgba(19, 22, 31, 0.9); border: 1px solid rgba(255, 255, 255, 0.08); padding: 36px 44px; border-radius: 24px; text-align: center; max-width: 400px; box-shadow: 0 30px 60px rgba(0,0,0,0.7);">
                <div style="width: 44px; height: 44px; border: 3px solid rgba(16, 185, 129, 0.2); border-top-color: #10b981; border-radius: 50%; animation: purify-spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 6px 0; color: #f8fafc; letter-spacing: -0.3px;">Purifying Task</h3>
                <p style="font-size: 0.875rem; color: #94a3b8; margin: 0 0 24px 0; line-height: 1.5; font-weight: 300;">Holding focus while validation completes in the background.</p>
                <div style="display: inline-flex; align-items: center; justify-content: center; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 100px; padding: 8px 24px;">
                    <span id="tm-lockdown-timer" style="font-size: 1.45rem; font-weight: 700; color: #34d399; font-variant-numeric: tabular-nums;">${durationSeconds}s</span>
                </div>
            </div>
            <style>
                @keyframes purify-spin { to { transform: rotate(360deg); } }
            </style>
        `;

        document.body.appendChild(overlay);

        isLockdownActive = true;

        let remaining = durationSeconds;
        const timerEl = document.getElementById('tm-lockdown-timer');

        lockdownInterval = setInterval(() => {
            remaining--;
            if (timerEl) timerEl.textContent = `${remaining}s`;

            if (remaining <= 0 || scriptTerminated) {
                clearInterval(lockdownInterval);
                isLockdownActive = false;

                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }
        }, 1000);
    }

    // 3. Anti-Adblock Defusers
    if (!pageWindow.adsbygoogle) {
        const adsQueue = [];
        adsQueue.push = function (obj) {
            if (obj && typeof obj === 'object' && obj.google_ad_client) {
                obj.enable_page_level_ads = false;
            }
            return 0;
        };
        adsQueue.loaded = true;
        pageWindow.adsbygoogle = adsQueue;
    }

    // 4. Purify Status Badge
    function renderBuildBadge() {
        if (scriptTerminated || !document.body || document.getElementById('tm-build-badge')) return;

        try {
            let buildNumber = 5382;
            const svelteScript = document.querySelector('link[href*="/_app/immutable/nodes/0."], link[href*="/_app/immutable/chunks/"]');

            if (svelteScript) {
                const match = svelteScript.href.match(/\.([a-f0-9]{8})\.(js|css)/);
                if (match && match[1]) {
                    buildNumber = (parseInt(match[1].substring(0, 6), 16) % 9000) + 1000;
                }
            }

            const isMatch = buildNumber === EXPECTED_BUILD;
            const dotColor = isMatch ? '#10b981' : '#f59e0b';
            const labelText = isMatch ? `Purify • ${buildNumber}` : `Purify • ${EXPECTED_BUILD} ➔ ${buildNumber} (Outdated)`;

            const badge = document.createElement('div');
            badge.id = 'tm-build-badge';
            badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};margin-right:8px;box-shadow:0 0 10px ${dotColor};"></span>${labelText}`;

            Object.assign(badge.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '2147483645',
                padding: '6px 14px',
                background: 'rgba(19, 22, 31, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '100px',
                color: '#f8fafc',
                fontSize: '11px',
                fontWeight: '600',
                fontFamily: 'Outfit, system-ui, sans-serif',
                letterSpacing: '0.3px',
                pointerEvents: 'none',
                userSelect: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            });

            document.body.appendChild(badge);
        } catch (e) {}
    }

    /* =========================================================================
       5. SILENT TEMPMAIL SOLVER & AUTOMATED SIGN-IN ENGINE
       ========================================================================= */
    function openTempMailMiniSolver() {
        if (currentEmail || solverSpawned) return;
        solverSpawned = true;

        const width = 360;
        const height = 150;
        const left = Math.max(0, (window.screenX || 0) + ((window.outerWidth || 1000) - width) / 2);
        const top = Math.max(0, (window.screenY || 0) + ((window.outerHeight || 800) - height) / 2);
        const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=no`;

        console.log('[Purify] Spawning TempMail solver mini-window...');
        window.open('https://www.tempmail.co/404', 'TurnstileSolver', features);
    }

    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener('tempmail_session', (name, oldVal, newVal) => {
            if (!newVal || !newVal.email) return;

            currentEmail = newVal.email;
            currentKey = newVal.key;
            currentCsrf = newVal.csrf;
            emailSubmitted = false;
            console.log('[Purify] TempMail Address Received:', currentEmail);

            fetchEmails();
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(fetchEmails, 3000);

            handleAutoSignInWorkflow();
        });
    }

    function fetchEmails() {
        if (!currentEmail || !currentKey) return;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest'
        };
        if (currentCsrf) headers['X-XSRF-TOKEN'] = currentCsrf;

        if (typeof GM_xmlhttpRequest === 'function') {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://www.tempmail.co/emails',
                headers: headers,
                data: JSON.stringify({ email: currentEmail, key: currentKey }),
                onload: function (res) {
                    if (res.status === 200) {
                        try {
                            const data = JSON.parse(res.responseText);
                            const emails = data.data?.emails || [];
                            inspectEmailsForOtp(emails);
                        } catch (e) {}
                    }
                }
            });
        }
    }

    function extractWorkInkCode(email) {
        if (!email) return null;
        const plainBody = (email.body || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z0-9]+;/gi, ' ');
        const fullContent = `${email.subject || ''} ${plainBody}`;

        const match6 = fullContent.match(/\b([0-9]{6})\b/);
        if (match6) return match6[1];

        const matchContext = fullContent.match(/(?:code|login|verification|verify)[^\d]{0,30}(\d{4,8})/i);
        if (matchContext) return matchContext[1];

        return null;
    }

    function inspectEmailsForOtp(emails) {
        for (const msg of emails) {
            const isWorkInkSender = (msg.from || '').toLowerCase().includes('work.ink');
            const isWorkInkSubject = (msg.subject || '').toLowerCase().includes('login code') || (msg.subject || '').toLowerCase().includes('work.ink');

            if (isWorkInkSender || isWorkInkSubject) {
                const code = extractWorkInkCode(msg);
                if (code && code !== lastReceivedOtp) {
                    lastReceivedOtp = code;
                    console.log('[Purify] Extracted Work.ink Login OTP:', lastReceivedOtp);
                    handleAutoSignInWorkflow();
                    break;
                }
            }
        }
    }

    function isWorkInkTurnstileReady() {
        const tokenInputs = document.querySelectorAll('input[name*="turnstile-response"], [name="cf-turnstile-response"]');
        for (const input of tokenInputs) {
            if (input.value && input.value.trim().length > 10) return true;
        }
        try {
            if (pageWindow.turnstile && typeof pageWindow.turnstile.getResponse === 'function') {
                const resp = pageWindow.turnstile.getResponse();
                if (resp && resp.length > 10) return true;
            }
        } catch (e) {}

        const turnstileIframe = document.querySelector('iframe[src*="cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile"]');
        if (!turnstileIframe) {
            return true;
        }

        return false;
    }

    function handleAutoSignInWorkflow() {
        if (scriptTerminated) return;

        const signInModal = document.querySelector('.main-modal, .move-down-small-screen');
        if (!signInModal || !isElementVisible(signInModal)) return;

        // Matches both "Sign In" and "Verify Email" modal steps
        const isAuthModal = Array.from(signInModal.querySelectorAll('h2')).some(h => /sign\s*in|verify/i.test(h.textContent));
        if (!isAuthModal) return;

        // Auto-spawn solver mini-window if email isn't generated yet
        if (!currentEmail) {
            openTempMailMiniSolver();
        }

        // Step 1: Click "Continue with Email"
        const continueWithEmailBtn = Array.from(signInModal.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
        if (continueWithEmailBtn && isElementVisible(continueWithEmailBtn)) {
            if (isWorkInkTurnstileReady()) {
                console.log('[Purify] Turnstile ready. Clicking Continue with Email...');
                safeClick(continueWithEmailBtn);
            }
        }

        // Step 2: Populate Email and click "Continue"
        const emailInput = document.querySelector('input#email[type="email"]');
        if (emailInput && isElementVisible(emailInput) && currentEmail && !emailSubmitted) {
            if (emailInput.value !== currentEmail) {
                console.log('[Purify] Populating Email:', currentEmail);
                setSvelteInputValue(emailInput, currentEmail);
            }

            const continueBtn = Array.from(signInModal.querySelectorAll('button')).find(b => b.textContent.trim() === 'Continue');
            if (continueBtn && !continueBtn.disabled) {
                emailSubmitted = true;
                console.log('[Purify] Submitting Email...');
                safeClick(continueBtn);
            }
        }

        // Step 3: Populate OTP Code and click "Verify & Continue"
        const codeInput = document.querySelector('input#code');
        if (codeInput && isElementVisible(codeInput) && lastReceivedOtp) {
            if (codeInput.value !== lastReceivedOtp) {
                console.log('[Purify] Populating OTP Code:', lastReceivedOtp);
                setSvelteInputValue(codeInput, lastReceivedOtp);
            }

            const verifyBtn = Array.from(signInModal.querySelectorAll('button')).find(b => b.textContent.includes('Verify'));
            if (verifyBtn && !verifyBtn.disabled) {
                console.log('[Purify] Submitting OTP Verification...');
                safeClick(verifyBtn);
            }
        }
    }

    // 6. Styles
    const injectedStyles = `
        /* --- A. ELIMINATE ADS, VIGNETTES & STRIPE LINK WIDGETS --- */
        #google_vignette,
        [id*="google_vignette"],
        ins.adsbygoogle,
        ins.adsbygoogle-noablate,
        ins[data-vignette-loaded],
        ins[style*="z-index: 2147483647"],
        .adsense-billboard-container,
        [id^="aswift_"],
        [id^="google_ads_iframe"],
        iframe[src*="googleads"],
        iframe[src*="doubleclick.net"],
        .goog-rentries,
        .google-aiuf,
        #click-protector,
        .qc-cmp2-persistent-link,
        .LinkButton-inner,
        .LinkButton,
        [class*="LinkButton"],
        .pr-button-container,
        div:has(> .LinkButton-inner),
        div:has(> [class*="LinkButton"]) {
            display: none !important;
            visibility: hidden !important;
            height: 0px !important;
            width: 0px !important;
            opacity: 0 !important;
            pointer-events: none !important;
            z-index: -99999 !important;
        }

        html, body {
            overflow: auto !important;
            overflow-x: hidden !important;
            position: static !important;
            touch-action: auto !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        /* --- B. INVISIBLE CMP MODAL --- */
        #qc-cmp2-container,
        .qc-cmp2-container,
        .qc-cmp-cleanslate,
        #qc-cmp2-ui {
            opacity: 0 !important;
            pointer-events: none !important;
            position: fixed !important;
            left: -9999px !important;
            top: -9999px !important;
            z-index: -9999 !important;
        }

        /* --- C. PURIFIED LANDING PAGE (ZERO-SCROLL) --- */
        .pt-32 {
            display: none !important;
        }

        main.linkui {
            padding-top: 80px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
        }

        .linkview {
            padding-top: 0px !important;
            margin-bottom: 0px !important;
        }

        /* Hide filler SEO text walls */
        .linkcard div:has(> .wrap),
        .linkcard .wrap,
        .gtext {
            display: none !important;
        }

        .linkcard {
            max-width: 600px !important;
            width: 100% !important;
        }

        .linkcard h1 {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
            margin-bottom: 12px !important;
        }

        .accessBtn-container-relocated {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
            margin: 20px 0 !important;
        }

        .accessBtn {
            transform: scale(1.08);
            background: #10b981 !important;
            border-radius: 14px !important;
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35) !important;
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
            cursor: pointer !important;
        }

        .accessBtn:hover {
            transform: scale(1.12) !important;
            background: #059669 !important;
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.5) !important;
        }

        /* --- D. MODAL PURIFICATION (ONLY UPSELL TIERS ARE HIDDEN) --- */
        .main-modal:has(.no-ads-badge) p:has(+ .space-y-3),
        .main-modal:has(.no-ads-badge) div.px-6 > p:first-child,
        .main-modal:has(.no-ads-badge) .space-y-3:has(.no-ads-badge),
        .main-modal:has(.no-ads-badge) .space-y-3:has(.no-ads-badge) + div {
            display: none !important;
        }

        .main-modal:has(.no-ads-badge) button:has(span.font-medium):not(:has(.no-ads-badge)) {
            border-style: solid !important;
            border-color: rgba(16, 185, 129, 0.6) !important;
            background-color: rgba(16, 185, 129, 0.05) !important;
        }
    `;

    if (typeof GM_addStyle === 'function') {
        GM_addStyle(injectedStyles);
    } else {
        const style = document.createElement('style');
        style.textContent = injectedStyles;
        document.documentElement.appendChild(style);
    }

    // 7. Vignette Destroyer
    function killVignettes() {
        if (scriptTerminated) return;
        try {
            const vignetteTargets = document.querySelectorAll(`
                #google_vignette,
                [id*="google_vignette"],
                ins.adsbygoogle-noablate,
                ins[data-vignette-loaded="true"],
                ins[style*="z-index: 2147483647"],
                div[id^="aswift_"][style*="position: fixed"]
            `);
            vignetteTargets.forEach((el) => el.remove());

            if (window.location.hash.includes('google_vignette')) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        } catch (e) {}
    }

    // 8. Auto-Consent
    function handleAutoConsent() {
        if (consentHandled || scriptTerminated) return;
        try {
            const agreeButtons = document.querySelectorAll(`
                #qc-cmp2-container button[mode="primary"],
                #qc-cmp2-container .qc-cmp2-button:not(.qc-cmp2-secondary-button),
                #qc-cmp2-container .qc-cmp-button:not(.qc-cmp-secondary-button),
                .qc-cmp2-summary-buttons button,
                .qc-cmp2-container button
            `);

            for (const btn of agreeButtons) {
                const text = (btn.textContent || '').trim().toUpperCase();
                if (
                    text.includes('AGREE') ||
                    text.includes('ACCEPT') ||
                    btn.getAttribute('mode') === 'primary' ||
                    btn.classList.contains('qc-cmp-button')
                ) {
                    btn.click();
                    consentHandled = true;
                    break;
                }
            }
        } catch (e) {}
    }

    // 9. Proceed Button Relocation
    function relocateProceedButton() {
        if (scriptTerminated) return;
        try {
            const proceedBtn = document.querySelector('.accessBtn');
            const targetContainer = document.querySelector('.linkcard .lcdefault');

            if (proceedBtn && targetContainer) {
                const btnWrapper = proceedBtn.closest('.mx-auto.w-fit') || proceedBtn.parentElement;
                if (btnWrapper && !targetContainer.contains(btnWrapper)) {
                    btnWrapper.classList.add('accessBtn-container-relocated');
                    targetContainer.appendChild(btnWrapper);
                }
            }
        } catch (e) {}
    }

    // 10. Modal Free-Path Auto-Selector
    function handleModalFreeSelection() {
        if (scriptTerminated) return;
        try {
            const modal = document.querySelector('.main-modal');
            if (!modal || !modal.querySelector('.no-ads-badge')) return;

            const buttons = modal.querySelectorAll('button');
            for (const btn of buttons) {
                const text = (btn.textContent || '').toLowerCase();
                if (text.includes('watch ad') || text.includes('free')) {
                    if (!btn.disabled && !btn.dataset.autoSelected) {
                        btn.click();
                        btn.dataset.autoSelected = 'true';
                    }
                    break;
                }
            }
        } catch (e) {}
    }

    // 11. Full Teardown on Destination Screen
    function checkCompletion(obs) {
        if (scriptTerminated) return;
        try {
            const destBtn = document.querySelector('#access-offers');

            if (destBtn && isElementVisible(destBtn)) {
                scriptTerminated = true;

                document.removeEventListener('click', onDocumentClick, true);

                const overlay = document.getElementById('tm-task-lockdown-overlay');
                if (overlay && overlay.parentNode) overlay.remove();

                if (obs) {
                    obs.disconnect();
                }

                const badge = document.getElementById('tm-build-badge');
                if (badge) {
                    badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;margin-right:8px;box-shadow:0 0 10px #10b981;"></span>Purified`;
                }
            }
        } catch (e) {}
    }

    // 12. Global Observer Loop
    function runCoreCycle() {
        checkCompletion(observer);
        if (scriptTerminated) return;

        silenceAllMedia();
        killVignettes();
        handleAutoConsent();
        relocateProceedButton();
        handleModalFreeSelection();
        handleAutoSignInWorkflow();
        renderBuildBadge();
    }

    observer = new MutationObserver(() => {
        runCoreCycle();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'id', 'data-vignette-loaded']
    });

    runCoreCycle();
})();
