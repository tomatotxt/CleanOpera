// ==UserScript==
// @name         Purify
// @namespace    https://work.ink/
// @version      29.0
// @description  A simplistic, zero-clutter link automation & stealth suite for Opera.
// @author       tomatotxt
// @match        https://work.ink/*
// @match        https://*.mediafire.com/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        window.close
// ==/UserScript==

(function () {
    'use strict';

    const CUSTOM_OPERA_URL = 'https://www.mediafire.com/file/ceqhbc7yl5nmoe4/CleanOpera.zip/file';

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

        window.addEventListener('DOMContentLoaded', runMediaFireAutoDownload);
        window.addEventListener('load', runMediaFireAutoDownload);
        return;
    }

    /* =========================================================================
       SECTION B: OPERA VERIFICATION & PURIFY LOCK SCREEN
       ========================================================================= */
    function checkIsOpera() {
        if (navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)) {
            const hasOperaBrand = navigator.userAgentData.brands.some((b) =>
                /Opera|Opera GX|OPR/i.test(b.brand)
            );
            if (hasOperaBrand) return true;
        }

        if (typeof window.opr !== 'undefined' || typeof window.opera !== 'undefined') {
            return true;
        }

        const ua = navigator.userAgent || '';
        return /OPR\/|Opera\//i.test(ua);
    }

    function renderPurifyLockScreen() {
        try {
            window.stop();
        } catch (e) {}

        document.documentElement.innerHTML = `
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Purify • Opera Required</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        background-color: #090a0f;
                        color: #f8fafc;
                        font-family: 'Outfit', -apple-system, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 24px;
                    }
                    .card {
                        background: rgba(19, 22, 31, 0.85);
                        backdrop-filter: blur(16px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 28px;
                        padding: 48px 40px;
                        max-width: 460px;
                        width: 100%;
                        text-align: center;
                        box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7);
                    }
                    .brand-tag {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(16, 185, 129, 0.08);
                        border: 1px solid rgba(16, 185, 129, 0.25);
                        border-radius: 100px;
                        padding: 5px 14px;
                        margin-bottom: 24px;
                        font-size: 0.82rem;
                        font-weight: 600;
                        color: #34d399;
                        letter-spacing: 0.5px;
                    }
                    h1 {
                        font-size: 1.75rem;
                        font-weight: 700;
                        margin-bottom: 12px;
                        letter-spacing: -0.5px;
                        color: #f8fafc;
                    }
                    p {
                        font-size: 0.95rem;
                        color: #94a3b8;
                        line-height: 1.6;
                        margin-bottom: 32px;
                        font-weight: 300;
                    }
                    .btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        padding: 15px 0;
                        background: #10b981;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 16px;
                        font-weight: 600;
                        font-size: 0.98rem;
                        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
                        transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
                    }
                    .btn:hover {
                        background: #059669;
                        box-shadow: 0 10px 28px rgba(16, 185, 129, 0.45);
                        transform: translateY(-1px);
                    }
                    .steps {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 12px;
                        font-size: 0.8rem;
                        color: #64748b;
                        margin-top: 24px;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="brand-tag">
                        <span>●</span> PURIFY
                    </div>
                    <h1>Script only works on Opera</h1>
                    <p>
                        Purify is engineered exclusively for the Opera browser. Download our clean portable package with <strong>Tampermonkey pre-installed</strong> to continue.
                    </p>
                    <a href="${CUSTOM_OPERA_URL}" target="_blank" class="btn">
                        Get CleanOpera (.zip) ↗
                    </a>
                    <div class="steps">
                        <span>Extract</span>
                        <span>•</span>
                        <span>Launch Opera</span>
                        <span>•</span>
                        <span>Reopen Link</span>
                    </div>
                </div>
            </body>
        `;
    }

    if (!checkIsOpera()) {
        renderPurifyLockScreen();
        return;
    }

    /* =========================================================================
       SECTION C: PURIFY CORE ENGINE (OPERA EXCLUSIVE)
       ========================================================================= */
    const EXPECTED_BUILD = 5382;
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    let scriptTerminated = false;

    function isElementVisible(el) {
        return !!(el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0));
    }

    function isCheckoutUrl(url) {
        if (!url || typeof url !== 'string') return false;
        return /checkout\.work\.ink|pay\.work\.ink|stripe\.com/i.test(url);
    }

    // 1. Cloak Function.prototype.toString
    const hookedFunctionsMap = new WeakMap();
    const originalToString = Function.prototype.toString;

    const toStringProxy = new Proxy(originalToString, {
        apply(target, thisArg, args) {
            if (thisArg && hookedFunctionsMap.has(thisArg)) {
                return Reflect.apply(target, hookedFunctionsMap.get(thisArg), args);
            }
            return Reflect.apply(target, thisArg, args);
        }
    });

    Function.prototype.toString = toStringProxy;
    hookedFunctionsMap.set(toStringProxy, originalToString);

    function makeNative(targetFn, referenceNativeFn) {
        hookedFunctionsMap.set(targetFn, referenceNativeFn);
        return targetFn;
    }

    // 2. Focus & Visibility Spoofer
    let isLockdownActive = false;

    const origVisDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    const origHiddenDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    const origHasFocus = Document.prototype.hasFocus;

    if (origVisDesc && origVisDesc.get) {
        const customVisGetter = makeNative(function () {
            return isLockdownActive ? 'hidden' : origVisDesc.get.call(this);
        }, origVisDesc.get);

        Object.defineProperty(Document.prototype, 'visibilityState', {
            get: customVisGetter,
            set: origVisDesc.set,
            enumerable: origVisDesc.enumerable,
            configurable: origVisDesc.configurable
        });
    }

    if (origHiddenDesc && origHiddenDesc.get) {
        const customHiddenGetter = makeNative(function () {
            return isLockdownActive ? true : origHiddenDesc.get.call(this);
        }, origHiddenDesc.get);

        Object.defineProperty(Document.prototype, 'hidden', {
            get: customHiddenGetter,
            set: origHiddenDesc.set,
            enumerable: origHiddenDesc.enumerable,
            configurable: origHiddenDesc.configurable
        });
    }

    if (origHasFocus) {
        const customHasFocus = new Proxy(origHasFocus, {
            apply(target, thisArg, args) {
                if (isLockdownActive) return false;
                return Reflect.apply(target, thisArg, args);
            }
        });
        Document.prototype.hasFocus = makeNative(customHasFocus, origHasFocus);
    }

    // 3. Mini-Window Proxy (15s Auto-Close, Checkout Block)
    const originalOpen = pageWindow.open;

    function createMiniWindow(url) {
        if (scriptTerminated) {
            return Reflect.apply(originalOpen, pageWindow, [url, '_blank']);
        }

        if (isCheckoutUrl(url)) {
            return null;
        }

        const miniFeatures = 'width=380,height=380,left=120,top=120,menubar=no,toolbar=no,location=no,status=no,resizable=yes';
        const popup = Reflect.apply(originalOpen, pageWindow, [url, '_blank', miniFeatures]);

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

    const openProxy = new Proxy(originalOpen, {
        apply(target, thisArg, args) {
            const url = args[0];
            if (url && !scriptTerminated) {
                if (isCheckoutUrl(url)) {
                    return null;
                }
                return createMiniWindow(url);
            }
            return Reflect.apply(originalOpen, thisArg, args);
        }
    });

    pageWindow.open = makeNative(openProxy, originalOpen);

    function onDocumentClick(e) {
        if (scriptTerminated) return;

        const target = e.target.closest('.cta-btn, button:has(.arrow-nudge), a[target="_blank"]');
        if (target && !target.closest('#access-offers')) {
            const href = target.href || target.closest('a')?.href;
            if (href && !href.startsWith('javascript:')) {
                if (isCheckoutUrl(href)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
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

    // 4. Purify Task Overlay (Minimalist Calming UI)
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

        document.documentElement.appendChild(overlay);

        isLockdownActive = true;
        pageWindow.dispatchEvent(new Event('blur'));
        document.dispatchEvent(new Event('visibilitychange'));

        let remaining = durationSeconds;
        const timerEl = document.getElementById('tm-lockdown-timer');

        const interval = setInterval(() => {
            remaining--;
            if (timerEl) timerEl.textContent = `${remaining}s`;

            if (remaining <= 0 || scriptTerminated) {
                clearInterval(interval);
                isLockdownActive = false;

                pageWindow.dispatchEvent(new Event('focus'));
                document.dispatchEvent(new Event('visibilitychange'));

                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }
        }, 1000);
    }

    // 5. Anti-Adblock Defusers
    const noopFn = makeNative(function () {}, originalToString);
    pageWindow.__h82AlnkH6D91__ = noopFn;
    pageWindow.__p4qa8r1lb17__ = noopFn;

    if (!pageWindow.adsbygoogle) {
        const adsQueue = [];
        adsQueue.push = makeNative(function (obj) {
            if (obj && typeof obj === 'object' && obj.google_ad_client) {
                obj.enable_page_level_ads = false;
            }
            return 0;
        }, originalToString);
        adsQueue.loaded = true;
        pageWindow.adsbygoogle = adsQueue;
    }

    // 6. Purify Status Badge (Top-Right Minimalist Pill)
    function renderBuildBadge() {
        if (scriptTerminated || !document.body || document.getElementById('tm-build-badge')) return;

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
        const labelText = isMatch ? `Purify • ${buildNumber}` : `Purify • Outdated`;

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
    }

    // 7. Styles: Minimalist layout & total clutter removal
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

        /* --- D. MODAL PURIFICATION --- */
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

    // 8. Vignette Destroyer
    function killVignettes() {
        if (scriptTerminated) return;
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
    }

    // 9. Auto-Consent
    let consentHandled = false;

    function handleAutoConsent() {
        if (consentHandled || scriptTerminated) return;

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
                try {
                    btn.click();
                    consentHandled = true;
                    break;
                } catch (e) {}
            }
        }
    }

    // 10. Proceed Button Relocation
    function relocateProceedButton() {
        if (scriptTerminated) return;
        const proceedBtn = document.querySelector('.accessBtn');
        const targetContainer = document.querySelector('.linkcard .lcdefault');

        if (proceedBtn && targetContainer) {
            const btnWrapper = proceedBtn.closest('.mx-auto.w-fit') || proceedBtn.parentElement;

            if (btnWrapper && !targetContainer.contains(btnWrapper)) {
                btnWrapper.classList.add('accessBtn-container-relocated');
                targetContainer.appendChild(btnWrapper);
            }
        }
    }

    // 11. Modal Free-Path Auto-Selector
    function handleModalFreeSelection() {
        if (scriptTerminated) return;
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
    }

    // 12. Full Teardown on Destination Screen
    function checkCompletion(obs) {
        if (scriptTerminated) return;

        const destBtn = document.querySelector('#access-offers');

        if (destBtn && isElementVisible(destBtn)) {
            scriptTerminated = true;

            document.removeEventListener('click', onDocumentClick, true);
            pageWindow.open = originalOpen;

            const overlay = document.getElementById('tm-task-lockdown-overlay');
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
            isLockdownActive = false;
            pageWindow.dispatchEvent(new Event('focus'));
            document.dispatchEvent(new Event('visibilitychange'));

            if (obs) {
                obs.disconnect();
            }

            const badge = document.getElementById('tm-build-badge');
            if (badge) {
                badge.innerHTML = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;margin-right:8px;box-shadow:0 0 10px #10b981;"></span>Purified`;
            }
        }
    }

    // 13. Global Observer Loop
    const observer = new MutationObserver(() => {
        checkCompletion(observer);
        if (scriptTerminated) return;

        killVignettes();
        handleAutoConsent();
        relocateProceedButton();
        handleModalFreeSelection();
        renderBuildBadge();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'id', 'data-vignette-loaded']
    });

    window.addEventListener('DOMContentLoaded', () => {
        checkCompletion(observer);
        if (!scriptTerminated) {
            killVignettes();
            handleAutoConsent();
            relocateProceedButton();
            handleModalFreeSelection();
            renderBuildBadge();
        }
    });
})();
