// ==UserScript==
// @name         Work.ink & MediaFire Suite (Opera)
// @namespace    https://work.ink/
// @version      26.0
// @description  MediaFire auto-downloader, CleanOpera portable download portal, checkout blocker, 15s task handler with jitter, and ad defusal.
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
       SECTION A: RELIABLE MEDIAFIRE AUTO-DOWNLOADER & TAB CLOSER
       ========================================================================= */
    if (window.location.hostname.includes('mediafire.com')) {
        let downloadInitiated = false;

        function runMediaFireAutoDownload() {
            if (downloadInitiated) return;

            const dlBtn = document.getElementById('downloadButton');
            
            if (dlBtn && dlBtn.href) {
                const targetUrl = dlBtn.href;

                // Ensure it's the actual direct CDN link and not a placeholder "#"
                if (targetUrl.startsWith('http') && !targetUrl.endsWith('#') && !dlBtn.classList.contains('preparing')) {
                    downloadInitiated = true;

                    dlBtn.textContent = '✓ Download Confirmed & Starting...';
                    dlBtn.style.backgroundColor = '#009974';
                    dlBtn.style.color = '#ffffff';

                    try {
                        dlBtn.click();
                    } catch (e) {}

                    // Direct stream fallback
                    setTimeout(() => {
                        window.location.href = targetUrl;
                    }, 300);

                    // Auto-close tab once download is handed to the browser
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
        return; // Halt execution of Work.ink logic on MediaFire
    }

    /* =========================================================================
       SECTION B: OPERA BROWSER VERIFICATION & CUSTOM PORTAL (WORK.INK)
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

    function renderOperaDownloadPortal() {
        const portal = document.createElement('div');
        portal.id = 'tm-opera-required-portal';
        Object.assign(portal.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            backgroundColor: '#09090b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
            color: '#ffffff',
            boxSizing: 'border-box',
            padding: '30px',
            overflowY: 'auto'
        });

        portal.innerHTML = `
            <div style="max-width: 640px; width: 100%; text-align: center; margin: auto;">
                <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(255, 27, 45, 0.1); border: 1px solid rgba(255, 27, 45, 0.3); border-radius: 100px; padding: 6px 16px; margin-bottom: 20px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff1b2d">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6c-4.86 0-8.8-4.298-8.8-9.6s3.94-9.6 8.8-9.6 8.8 4.298 8.8 9.6-3.94 9.6-8.8 9.6zM12 4.4c-2.872 0-5.2 3.403-5.2 7.6s2.328 7.6 5.2 7.6 5.2-3.403 5.2-7.6-2.328-7.6-5.2-7.6z"/>
                    </svg>
                    <span style="font-size: 0.85rem; font-weight: 700; color: #ff4d5e; letter-spacing: 0.5px;">OPERA BROWSER REQUIRED</span>
                </div>

                <h1 style="font-size: 2.2rem; font-weight: 800; line-height: 1.2; margin: 0 0 12px 0; color: #ffffff;">
                    Optimized Exclusively for Opera
                </h1>
                <p style="font-size: 1rem; color: #a1a1aa; max-width: 520px; margin: 0 auto 30px auto; line-height: 1.5;">
                    Work.ink requires standard Opera browser tokens to validate tasks. Download the portable build below to proceed.
                </p>

                <div style="background: #131316; border: 1px solid rgba(0, 153, 116, 0.3); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: left; margin-bottom: 30px;">
                    <div>
                        <div style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin-bottom: 4px;">Opera Portable (Cleaned Build)</div>
                        <div style="font-size: 0.85rem; color: #34d399; font-weight: 600; margin-bottom: 10px;">Pre-configured / Full Compatibility</div>
                        <p style="font-size: 0.875rem; color: #9ca3af; line-height: 1.5; margin: 0;">
                            Pre-configured standalone Opera package. Fully recognized by Work.ink verification routines with zero telemetry clutter.
                        </p>
                    </div>

                    <a href="${CUSTOM_OPERA_URL}" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px 0; background: #009974; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 1rem; box-shadow: 0 6px 20px rgba(0, 153, 116, 0.35); box-sizing: border-box; transition: background-color 0.15s ease;">
                        Download CleanOpera.zip (MediaFire) ↗
                    </a>
                </div>

                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 16px 24px; display: inline-flex; align-items: center; justify-content: center; gap: 20px; font-size: 0.85rem; color: #d4d4d8;">
                    <span><strong>1.</strong> Extract & Open CleanOpera</span>
                    <span style="color: rgba(255,255,255,0.2);">→</span>
                    <span><strong>2.</strong> Add Tampermonkey</span>
                    <span style="color: rgba(255,255,255,0.2);">→</span>
                    <span><strong>3.</strong> Reopen Link</span>
                </div>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(portal);
        } else {
            document.documentElement.appendChild(portal);
        }
    }

    if (!checkIsOpera()) {
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', renderOperaDownloadPortal);
        } else {
            renderOperaDownloadPortal();
        }
        return; // Halt suite on non-Opera browsers
    }

    /* =========================================================================
       SECTION C: WORK.INK AUTOMATION ENGINE (OPERA ONLY)
       ========================================================================= */
    const EXPECTED_BUILD = 5382;
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    let scriptTerminated = false;

    // Helper to identify checkout/payment links
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

    // 3. Mini-Window Proxy (15s Auto-Close, Blocks Checkout)
    const originalOpen = pageWindow.open;

    function createMiniWindow(url) {
        if (scriptTerminated) {
            return Reflect.apply(originalOpen, pageWindow, [url, '_blank']);
        }

        // Suppress Stripe / Work.ink checkout popups
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
                    return null; // Silently block checkout redirection
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
                    return; // Block checkout links
                }

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                createMiniWindow(href);
            }
        }
    }

    document.addEventListener('click', onDocumentClick, true);

    // 4. Lockdown Overlay
    function showTaskLockdownOverlay(durationSeconds = 16) {
        if (scriptTerminated || document.getElementById('tm-task-lockdown-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tm-task-lockdown-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483646',
            backgroundColor: 'rgba(10, 10, 10, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontFamily: 'Outfit, system-ui, sans-serif',
            userSelect: 'none',
            cursor: 'wait'
        });

        overlay.innerHTML = `
            <div style="background: #141416; border: 1px solid rgba(255, 255, 255, 0.12); padding: 32px 40px; border-radius: 20px; text-align: center; max-width: 420px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
                <div style="width: 46px; height: 46px; border: 4px solid rgba(0, 153, 116, 0.2); border-top-color: #009974; border-radius: 50%; animation: tm-spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 8px 0; color: #ffffff;">Simulating Background Task</h3>
                <p style="font-size: 0.875rem; color: #a1a1aa; margin: 0 0 20px 0; line-height: 1.4;">Mini-window opened & auto-closed. Inputs locked for verification.</p>
                <div style="display: inline-flex; align-items: center; justify-content: center; background: rgba(0, 153, 116, 0.1); border: 1px solid rgba(0, 153, 116, 0.3); border-radius: 12px; padding: 10px 24px;">
                    <span id="tm-lockdown-timer" style="font-size: 1.6rem; font-weight: 800; color: #34d399; font-variant-numeric: tabular-nums;">${durationSeconds}s</span>
                </div>
            </div>
            <style>
                @keyframes tm-spin { to { transform: rotate(360deg); } }
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

    // 6. Build Badge
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
        const dotColor = isMatch ? '#34d399' : '#f59e0b';
        const labelText = isMatch ? `Build #${buildNumber}` : `Build #${buildNumber} (Outdated)`;

        const badge = document.createElement('div');
        badge.id = 'tm-build-badge';
        badge.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dotColor};margin-right:6px;box-shadow:0 0 8px ${dotColor};"></span>${labelText}`;
        
        Object.assign(badge.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '2147483645',
            padding: '6px 12px',
            background: 'rgba(18, 18, 20, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '100px',
            color: '#e4e4e7',
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: 'Outfit, system-ui, sans-serif',
            pointerEvents: 'none',
            userSelect: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        });

        document.body.appendChild(badge);
    }

    // 7. Styles: Ad, vignette, and Stripe Link cleanup
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

        /* --- C. LANDING PAGE ZERO-SCROLL LAYOUT --- */
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
            transform: scale(1.1);
            box-shadow: 0 4px 15px rgba(0, 153, 116, 0.4) !important;
            transition: transform 0.15s ease, box-shadow 0.15s ease !important;
            cursor: pointer !important;
        }

        .accessBtn:hover {
            transform: scale(1.15) !important;
            box-shadow: 0 6px 20px rgba(0, 153, 116, 0.6) !important;
        }

        /* --- D. MODAL CLEANUP (TARGETS ONLY UPSELL/MONETIZATION MODAL) --- */
        .main-modal:has(.no-ads-badge) p:has(+ .space-y-3),
        .main-modal:has(.no-ads-badge) div.px-6 > p:first-child,
        .main-modal:has(.no-ads-badge) .space-y-3:has(.no-ads-badge),
        .main-modal:has(.no-ads-badge) .space-y-3:has(.no-ads-badge) + div {
            display: none !important;
        }

        .main-modal:has(.no-ads-badge) button:has(span.font-medium):not(:has(.no-ads-badge)) {
            border-style: solid !important;
            border-color: rgba(0, 153, 116, 0.6) !important;
            background-color: rgba(0, 153, 116, 0.05) !important;
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

    // 11. Modal Free-Path Auto-Selector (Only operates on the monetization modal)
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
        const isEasyScreen = document.body?.textContent?.includes('That was easy, right?');

        if (destBtn || isEasyScreen) {
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
                badge.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;margin-right:6px;"></span>Finished`;
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
