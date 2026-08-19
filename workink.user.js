// ==UserScript==
// @name         Purify
// @namespace    https://work.ink/
// @version      69.7
// @description  A simplistic link automation, ad defusal, audio silencer & native modal text swapper suite for Opera.
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
    const OPERA_SPOOFER_RELEASE_URL = 'https://github.com/tomatotxt/operaspoofer/releases/tag/v';

    let activeOperaUrl = FALLBACK_OPERA_URL;
    let scriptTerminated = false;
    let isLockdownActive = false;
    let lockdownInterval = null;
    let lockdownStartTime = 0;
    let consentHandled = false;
    let observer = null;
    let isCycleScheduled = false;

    let currentEmail = null;
    let currentKey = null;
    let currentCsrf = null;
    let pollInterval = null;
    let lastReceivedOtp = null;
    let emailSubmitted = false;
    let solverSpawned = false;

    let trackedPopups = [];

    /* =========================================================================
       POPUP CLEANUP ENGINE
       ========================================================================= */
    function closeTrackedPopup(popup) {
        if (!popup) return;
        try {
            if (!popup.closed) {
                popup.close();
            }
        } catch (e) {}
    }

    function schedulePopupClose(popup, delayMs) {
        if (!popup) return;

        trackedPopups.push(popup);

        const retryIntervals = [delayMs, delayMs + 1000, delayMs + 2500, delayMs + 4000];
        retryIntervals.forEach((time) => {
            setTimeout(() => {
                closeTrackedPopup(popup);
            }, time);
        });
    }

    /* =========================================================================
       OPERA BROWSER VERIFICATION & GATEKEEPER
       ========================================================================= */
    function isOperaBrowser() {
        const ua = navigator.userAgent || '';
        const isOprUA = /OPR\/|Opera/i.test(ua);
        const isOprGlobal = typeof window.opr !== 'undefined';
        const isOprBrand = Array.isArray(navigator.userAgentData?.brands) &&
            navigator.userAgentData.brands.some(b => /Opera|OPR/i.test(b.brand));
        return isOprUA || isOprGlobal || isOprBrand;
    }

    function fetchRemoteConfig() {
        if (typeof GM_xmlhttpRequest === 'function') {
            GM_xmlhttpRequest({
                method: 'GET',
                url: REMOTE_LINK_CONFIG_URL,
                onload: function (res) {
                    if (res.status === 200 && res.responseText.trim().startsWith('http')) {
                        activeOperaUrl = res.responseText.trim();
                        const btn = document.getElementById('purify-download-opera-btn');
                        if (btn) btn.href = activeOperaUrl;
                    }
                }
            });
        }
    }

    function showNonOperaOverlay(onProceedAnyway) {
        let existing = document.getElementById('purify-opera-required-overlay');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        const overlay = document.createElement('div');
        overlay.id = 'purify-opera-required-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '2147483647',
            backgroundColor: 'rgba(9, 10, 15, 0.96)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f8fafc',
            fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
            userSelect: 'none',
            padding: '20px',
            pointerEvents: 'auto'
        });

        overlay.innerHTML = `
            <div style="background: rgba(19, 22, 31, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); padding: 36px 40px; border-radius: 24px; text-align: center; max-width: 480px; box-shadow: 0 30px 70px rgba(0,0,0,0.8); pointer-events: auto;">
                <div style="width: 52px; height: 52px; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                
                <h2 style="font-size: 1.4rem; font-weight: 700; margin: 0 0 8px 0; color: #f8fafc; letter-spacing: -0.4px;">Browser Optimization Notice</h2>
                <p style="font-size: 0.875rem; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5; font-weight: 300;">
                    Purify is optimized for Opera. You can use our pre-configured portable Opera build, download official Opera, or attempt running the script in your current browser.
                </p>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <a href="${activeOperaUrl}" target="_blank" id="purify-download-opera-btn" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 12px 16px; background: #10b981; color: #ffffff; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); transition: background 0.2s ease; box-sizing: border-box;">
                        <span style="font-weight: 600; font-size: 0.9rem;">Download Portable CleanOpera (.zip)</span>
                        <span style="font-size: 0.75rem; opacity: 0.85; font-weight: 300;">Pre-configured standalone environment</span>
                    </a>

                    <a href="https://www.opera.com/download" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; font-weight: 500; font-size: 0.85rem; border-radius: 12px; text-decoration: none; box-sizing: border-box;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Official Opera Download Page
                    </a>

                    <button id="purify-proceed-anyway-btn" type="button" style="width: 100%; padding: 12px 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #f8fafc; font-weight: 600; font-size: 0.85rem; border-radius: 12px; cursor: pointer; margin-top: 4px; pointer-events: auto;">
                        Continue in current browser (Unoptimized)
                    </button>
                </div>
            </div>
        `;

        function handleDismiss(e) {
            if (e && e.target && e.target.closest('#purify-proceed-anyway-btn')) {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();

                const el = document.getElementById('purify-opera-required-overlay');
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                } else if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }

                if (typeof onProceedAnyway === 'function') {
                    const cb = onProceedAnyway;
                    onProceedAnyway = null;
                    cb();
                }
            }
        }

        overlay.addEventListener('click', handleDismiss, true);
        overlay.addEventListener('pointerdown', handleDismiss, true);

        const attach = () => {
            const target = document.body || document.documentElement;
            if (target && !document.getElementById('purify-opera-required-overlay')) {
                target.appendChild(overlay);
            }
        };

        if (document.body) {
            attach();
        } else {
            window.addEventListener('DOMContentLoaded', attach, { once: true });
            setTimeout(attach, 50);
        }
    }

    /* =========================================================================
       SECTION 0: FIREFOX-COMPATIBLE PRISTINE STATE INITIALIZER
       ========================================================================= */
    function clearPristineState() {
        try {
            if (typeof localStorage !== 'undefined' && localStorage.clear) {
                localStorage.clear();
            }

            if (typeof sessionStorage !== 'undefined' && sessionStorage.clear) {
                sessionStorage.clear();
            }

            const knownDbs = ['workink', 'svelte', 'firebaseLocalStorageDb', 'work.ink', 'app', 'keyval-store'];
            if (window.indexedDB) {
                if (typeof window.indexedDB.databases === 'function') {
                    window.indexedDB.databases().then((dbs) => {
                        dbs.forEach((db) => {
                            if (db.name) window.indexedDB.deleteDatabase(db.name);
                        });
                    }).catch(() => {});
                }
                knownDbs.forEach((dbName) => {
                    try { window.indexedDB.deleteDatabase(dbName); } catch (e) {}
                });
            }

            const cookies = document.cookie.split(';');
            const host = window.location.hostname;
            const hostParts = host.split('.');
            const domains = ['', host, '.' + host];

            for (let i = 0; i < hostParts.length - 1; i++) {
                domains.push('.' + hostParts.slice(i).join('.'));
            }

            const paths = ['/', ''];
            const currentPathParts = window.location.pathname.split('/');
            let accumulatedPath = '';
            for (const part of currentPathParts) {
                if (part) {
                    accumulatedPath += '/' + part;
                    paths.push(accumulatedPath);
                    paths.push(accumulatedPath + '/');
                }
            }

            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

                if (name) {
                    const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    domains.forEach((d) => {
                        paths.forEach((p) => {
                            const domAttr = d ? `; domain=${d}` : '';
                            const pathAttr = p ? `; path=${p}` : '';
                            document.cookie = `${name}=; ${expires}${domAttr}${pathAttr}`;
                        });
                    });
                }
            }
        } catch (e) {}
    }

    /* =========================================================================
       SECTION A: MEDIAFIRE AUTO-DOWNLOADER
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
       SECTION B: TEMPMAIL.CO SOLVER POPUP
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

    function isExcludedFromIntercept(url) {
        if (!url || typeof url !== 'string') return true;
        if (/outgoing\.work\.ink/i.test(url)) return true;
        return /checkout\.work\.ink|pay\.work\.ink|stripe\.com|tempmail\.co|about:blank/i.test(url);
    }

    function isOperaDownloadOffer(url) {
        return typeof url === 'string' && url.includes('opera-download.work.ink');
    }

    function isSocialLink(url) {
        if (!url || typeof url !== 'string') return false;
        return /discord\.(com|gg)|youtube\.com|youtu\.be|twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com|t\.me|telegram\.org/i.test(url);
    }

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

    function safeClick(btn) {
        if (!btn || btn.dataset.purifyClicked) return;
        btn.dataset.purifyClicked = 'true';
        setTimeout(() => {
            try {
                btn.click();
            } catch (e) {}
        }, 500 + Math.floor(Math.random() * 300));
    }

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

    const originalOpen = pageWindow.open;

    function showOperaSpooferModal(targetUrl) {
        if (document.getElementById('purify-opera-spoofer-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'purify-opera-spoofer-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            backgroundColor: 'rgba(9, 10, 15, 0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: 'Outfit, system-ui, sans-serif',
            color: '#f8fafc'
        });

        modal.innerHTML = `
            <div style="background: rgba(19, 22, 31, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); padding: 32px; border-radius: 20px; max-width: 440px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
                <h3 style="margin: 0 0 10px 0; font-size: 1.25rem; font-weight: 700;">Opera Offer Task Detected</h3>
                <p style="font-size: 0.875rem; color: #94a3b8; margin: 0 0 20px 0; line-height: 1.5;">
                    This task requires an Opera installation. Choose how you would like to handle this offer:
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="spoofer-btn-install" style="padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
                        Install Opera Normally to Complete Offer
                    </button>
                    <button id="spoofer-btn-spoofer" style="padding: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 12px; font-weight: 600; cursor: pointer;">
                        Use Opera Spoofer Tool
                    </button>
                    <button id="spoofer-btn-cancel" style="padding: 8px; background: transparent; border: none; color: #64748b; font-size: 0.8rem; cursor: pointer; margin-top: 4px;">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('spoofer-btn-install').addEventListener('click', () => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
            originalOpen.call(pageWindow, targetUrl, '_blank');
        });

        document.getElementById('spoofer-btn-spoofer').addEventListener('click', () => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
            originalOpen.call(pageWindow, OPERA_SPOOFER_RELEASE_URL, '_blank');
        });

        document.getElementById('spoofer-btn-cancel').addEventListener('click', () => {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
        });
    }

    function createTaskMiniWindow(url) {
        if (isOperaDownloadOffer(url)) {
            showOperaSpooferModal(url);
            return null;
        }

        if (isExcludedFromIntercept(url)) {
            return originalOpen.call(pageWindow, url, '_blank');
        }

        const miniFeatures = 'width=380,height=380,left=120,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes';
        const popup = originalOpen.call(pageWindow, url, '_blank', miniFeatures);

        const isSocial = isSocialLink(url);
        const baseSeconds = isSocial ? 5 : 15;
        const randomJitterSec = isSocial
            ? Number((Math.random() * 0.7 + 0.1).toFixed(1))
            : Number((Math.random() * 1.1 + 0.1).toFixed(1));
        const totalDurationSec = Math.ceil(baseSeconds + randomJitterSec);

        const closeDelayMs = isSocial ? 4000 : 6000;
        if (popup) {
            schedulePopupClose(popup, closeDelayMs);
        }

        showTaskLockdownOverlay(totalDurationSec, isSocial ? 'Social Media Link' : 'Sponsored Task');
        return popup;
    }

    function openProxy(url, target, features) {
        if (url && typeof url === 'string' && !isExcludedFromIntercept(url)) {
            console.log('[Purify] Intercepted programmatic window.open:', url);
            return createTaskMiniWindow(url);
        }
        return originalOpen.apply(this, arguments);
    }

    try {
        pageWindow.open = openProxy;
        if (typeof unsafeWindow !== 'undefined') {
            unsafeWindow.open = openProxy;
        }
    } catch (err) {
        console.error('[Purify] Failed to overwrite pageWindow.open:', err);
    }

    function onDocumentClick(e) {
        if (e.target.closest('#purify-opera-required-overlay, #purify-opera-spoofer-modal, #access-offers, #tm-build-badge, #tm-task-lockdown-overlay')) {
            return;
        }

        const target = e.target.closest('.cta-btn, button:has(.arrow-nudge), button:has(svg), a[target="_blank"], a[href*="/api/"]');
        if (target) {
            const href = target.href || target.closest('a')?.href;
            if (href && !href.startsWith('javascript:')) {
                if (isExcludedFromIntercept(href)) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                createTaskMiniWindow(href);
            }
        }
    }

    document.addEventListener('click', onDocumentClick, true);

    function removeLockdownOverlay() {
        if (lockdownInterval) {
            clearInterval(lockdownInterval);
            lockdownInterval = null;
        }
        isLockdownActive = false;

        trackedPopups.forEach(closeTrackedPopup);
        trackedPopups = [];

        const overlay = document.getElementById('tm-task-lockdown-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }

        try {
            pageWindow.dispatchEvent(new Event('focus'));
        } catch (e) {}
    }

    function checkEarlyTaskCompletion() {
        if (!isLockdownActive) return;

        // Guard: Prevent early completion from triggering within the first 3 seconds of a task
        if (Date.now() - lockdownStartTime < 3000) return;

        const activeTaskDone = document.querySelector('.task-item.done [data-task-done="true"], [data-task-status="done"] .lucide-check');
        if (activeTaskDone && isElementVisible(activeTaskDone)) {
            removeLockdownOverlay();
        }
    }

    function updateNativeWorkInkOverlayText(remainingSec, taskTypeLabel) {
        try {
            const modalTitle = document.querySelector('.modalwrapper .title, .modalwrapper span.title');
            if (modalTitle) {
                modalTitle.textContent = `Purifying ${taskTypeLabel}...`;
            }

            const modalSubtitle = document.querySelector('.modalwrapper .subtitle, .modalwrapper span.subtitle');
            if (modalSubtitle) {
                modalSubtitle.textContent = `Holding focus in background (${remainingSec}s)...`;
            }

            if (!modalTitle) {
                const allElements = document.querySelectorAll('span.title, span.subtitle, h1, h2, h3, p');
                allElements.forEach((el) => {
                    if (el.children.length === 0) {
                        const text = el.textContent || '';
                        if (text.includes('Continue browsing...')) {
                            el.textContent = `Purifying ${taskTypeLabel}...`;
                        } else if (text.includes('Accept cookies on the opened page') || text.includes('proceed faster')) {
                            el.textContent = `Holding focus in background (${remainingSec}s)...`;
                        }
                    }
                });
            }
        } catch (e) {}
    }

    function showTaskLockdownOverlay(durationSeconds = 16, taskTypeLabel = 'Sponsored Task') {
        if (document.getElementById('tm-task-lockdown-overlay')) return;

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
                <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0 0 6px 0; color: #f8fafc; letter-spacing: -0.3px;">Purifying ${taskTypeLabel}</h3>
                <p style="font-size: 0.875rem; color: #94a3b8; margin: 0 0 24px 0; line-height: 1.5; font-weight: 300;">Mini-window opened & closing in 5s. Holding focus while verification completes.</p>
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
        lockdownStartTime = Date.now();

        const startTime = Date.now();
        const endTime = startTime + (durationSeconds * 1000);

        lockdownInterval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

            const timerEl = document.getElementById('tm-lockdown-timer');
            if (timerEl) timerEl.textContent = `${remaining}s`;

            updateNativeWorkInkOverlayText(remaining, taskTypeLabel);

            if (remaining <= 0 || now >= endTime) {
                removeLockdownOverlay();
            }
        }, 200);

        setTimeout(() => {
            removeLockdownOverlay();
        }, (durationSeconds + 1) * 1000);
    }

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

    function renderBuildBadge() {
        if (!document.body || document.getElementById('tm-build-badge')) return;

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

    function openTempMailMiniSolver() {
        if (currentEmail || solverSpawned) return;
        solverSpawned = true;

        const width = 360;
        const height = 150;
        const left = Math.max(0, (window.screenX || 0) + ((window.outerWidth || 1000) - width) / 2);
        const top = Math.max(0, (window.screenY || 0) + ((window.outerHeight || 800) - height) / 2);
        const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=no`;

        console.log('[Purify] Spawning TempMail solver mini-window...');
        originalOpen.call(pageWindow, 'https://www.tempmail.co/404', 'TurnstileSolver', features);
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
        const signInModal = document.querySelector('.main-modal, .move-down-small-screen');
        if (!signInModal || !isElementVisible(signInModal)) return;

        const isAuthModal = Array.from(signInModal.querySelectorAll('h2')).some(h => /sign\s*in|verify/i.test(h.textContent));
        if (!isAuthModal) return;

        if (!currentEmail) {
            openTempMailMiniSolver();
        }

        const continueWithEmailBtn = Array.from(signInModal.querySelectorAll('button')).find(b => b.textContent.includes('Continue with Email'));
        if (continueWithEmailBtn && isElementVisible(continueWithEmailBtn)) {
            if (isWorkInkTurnstileReady()) {
                console.log('[Purify] Turnstile ready. Clicking Continue with Email...');
                safeClick(continueWithEmailBtn);
            }
        }

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

    const injectedStyles = `
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

        main.linkui > div.pt-32 {
            display: none !important;
        }

        main.linkui {
            padding-top: 75px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
        }

        .linkview {
            padding-top: 0px !important;
            margin-top: 0px !important;
            margin-bottom: 0px !important;
        }

        .linkview > div:has(.linklist.vertical),
        div.sticky:has(.linklist),
        .linklist.vertical {
            display: none !important;
        }

        .linkcard p.gtext,
        .linkcard .wrap > p.gtext,
        .linkcard .hasvideo,
        .linkcard div:has(> .hasvideo) {
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

        .lcdefault {
            display: flex !important;
            flex-direction: column !important;
        }

        .lcdefault > div:first-child,
        .lcdefault > h1 {
            order: 1 !important;
        }

        .lcdefault > div:has(.accessBtn) {
            order: 2 !important;
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
            margin: 12px 0 20px 0 !important;
        }

        .lcdefault > * {
            order: 3 !important;
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

        .main-modal:has(.no-ads-badge) p:has(+ .space-y-3),
        .main-modal:has(.no-ads-badge) div.px-6 > p:first-child,
        .main-modal:has(.no-ads-badge) .space-y-3:has(.no-ads-badge),
        .main-modal:has(.no-ads-badge) .space-y-3:has(.no-ads-badge) + div,
        div.my-3:has(> span.svelte-1o00xxn),
        div.flex.items-center.justify-center.my-3:has(.flex-1.h-px) {
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

    function killVignettes() {
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

    function handleAutoConsent() {
        if (consentHandled) return;
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

    function handleModalFreeSelection() {
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

    function updateCompletionStatus() {
        try {
            const headings = document.querySelectorAll('h2');
            let isDone = false;
            for (const h of headings) {
                if (h.textContent.includes('That was easy, right?') && isElementVisible(h)) {
                    isDone = true;
                    break;
                }
            }

            if (!isDone) {
                const destBtn = document.querySelector('#access-offers');
                if (destBtn && isElementVisible(destBtn)) {
                    const cardText = destBtn.closest('div')?.parentElement?.textContent || '';
                    if (cardText.includes('That was easy, right?') || cardText.includes('helped an independent publisher')) {
                        isDone = true;
                    }
                }
            }

            if (isDone) {
                const badge = document.getElementById('tm-build-badge');
                if (badge) {
                    badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;margin-right:8px;box-shadow:0 0 10px #10b981;"></span>Purified`;
                }
            }
        } catch (e) {}
    }

    function runCoreCycle() {
        updateCompletionStatus();
        checkEarlyTaskCompletion();
        silenceAllMedia();
        killVignettes();
        handleAutoConsent();
        handleModalFreeSelection();
        handleAutoSignInWorkflow();
        renderBuildBadge();
    }

    function initWorkInkSuite() {
        if (window.location.hostname.includes('work.ink')) {
            clearPristineState();
        }

        observer = new MutationObserver(() => {
            if (!isCycleScheduled) {
                isCycleScheduled = true;
                requestAnimationFrame(() => {
                    isCycleScheduled = false;
                    runCoreCycle();
                });
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'id', 'data-vignette-loaded']
        });

        runCoreCycle();
    }

    /* =========================================================================
       ENTRYPOINT INITIALIZATION
       ========================================================================= */
    if (window.location.hostname.includes('work.ink')) {
        fetchRemoteConfig();
        if (!isOperaBrowser()) {
            console.warn('[Purify] Non-Opera browser detected. Displaying setup options...');
            showNonOperaOverlay(() => {
                initWorkInkSuite();
            });
        } else {
            initWorkInkSuite();
        }
    }
})();
