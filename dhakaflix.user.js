// ==UserScript==
// @name         IMDb / Letterboxd → DhakaFlix Search
// @namespace    dhakaflix-search
// @version      8.0
// @description  Detect movie category, choose Normal or 1080p where available, open DhakaFlix and automatically search the title.
// @author       cthboss001
//
// Source sites
// @match        *://*.imdb.com/title/tt*
// @match        *://*.letterboxd.com/film/*
//
// DhakaFlix servers
// @match        http://172.16.50.7/*
// @match        http://172.16.50.12/*
// @match        http://172.16.50.14/*
//
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ============================================================
    // CATEGORY CONFIG
    // ============================================================

    const CATEGORIES = {
        english: {
            label: 'English Movies',
            normalUrl:
                'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/',
            hdUrl:
                'http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/'
        },

        hindi: {
            label: 'Hindi Movies',
            url:
                'http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/'
        },

        southIndian: {
            label: 'South Indian Movies (Hindi Dubbed)',
            url:
                'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/'
        },

        foreign: {
            label: 'Foreign Language Movies',
            url:
                'http://172.16.50.7/DHAKA-FLIX-7/Foreign%20Language%20Movies/'
        },

        kolkataBangla: {
            label: 'Kolkata Bangla Movies',
            url:
                'http://172.16.50.7/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/'
        },

        tvWeb: {
            label: 'TV & Web Series',
            url:
                'http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/'
        },

        koreanTV: {
            label: 'Korean TV & Web Series',
            url:
                'http://172.16.50.14/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/'
        },

        animation: {
            label: 'Animation Movies',
            normalUrl:
                'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/',
            hdUrl:
                'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/'
        }
    };

    // ============================================================
    // TITLE EXTRACTION
    // ============================================================

    function cleanTitle(raw) {
        if (!raw) {
            return null;
        }

        return raw
            .replace(/\(\d{4}\)\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getIMDbTitle() {
        const h1 = document.querySelector('h1');
        return cleanTitle(
            h1 ? h1.textContent : null
        );
    }

    function getLetterboxdTitle() {
        const el =
            document.querySelector('.headline-1');

        return cleanTitle(
            el ? el.textContent : null
        );
    }

    // ============================================================
    // METADATA EXTRACTION
    // ============================================================

    function getIMDbMetadata() {
        const meta = {
            type: null,
            genres: [],
            country: [],
            language: []
        };

        document
            .querySelectorAll(
                'script[type="application/ld+json"]'
            )
            .forEach(script => {
                try {
                    const data =
                        JSON.parse(
                            script.textContent
                        );

                    if (data['@type']) {
                        meta.type =
                            Array.isArray(
                                data['@type']
                            )
                                ? data['@type'].join(',')
                                : data['@type'];
                    }

                    if (data.genre) {
                        const genres =
                            Array.isArray(
                                data.genre
                            )
                                ? data.genre
                                : [data.genre];

                        meta.genres.push(
                            ...genres.map(x =>
                                String(
                                    x
                                ).toLowerCase()
                            )
                        );
                    }
                } catch (_) {
                    // Ignore malformed JSON-LD
                }
            });

        const getLinks =
            testid => {
                const li =
                    document.querySelector(
                        `li[data-testid="${testid}"]`
                    );

                if (!li) {
                    return [];
                }

                return [
                    ...li.querySelectorAll('a')
                ].map(a =>
                    a.textContent
                        .trim()
                        .toLowerCase()
                );
            };

        meta.country =
            getLinks(
                'title-details-origin'
            );

        meta.language =
            getLinks(
                'title-details-languages'
            );

        // IMDb fallback
        if (
            meta.country.length === 0 ||
            meta.language.length === 0
        ) {
            document
                .querySelectorAll(
                    'li.ipc-metadata-list__item, li[class*="metadata-list"]'
                )
                .forEach(li => {
                    const text =
                        (
                            li.textContent || ''
                        ).toLowerCase();

                    const links =
                        [
                            ...li.querySelectorAll(
                                'a'
                            )
                        ].map(a =>
                            a.textContent
                                .trim()
                                .toLowerCase()
                        );

                    if (
                        meta.country.length === 0 &&
                        text.includes('country')
                    ) {
                        meta.country.push(
                            ...links
                        );
                    }

                    if (
                        meta.language.length === 0 &&
                        text.includes('language')
                    ) {
                        meta.language.push(
                            ...links
                        );
                    }
                });
        }

        return meta;
    }

    function getLetterboxdMetadata() {
        return {
            type: 'movie',

            genres: [
                ...document.querySelectorAll(
                    'a[href^="/films/genre/"]'
                )
            ].map(a =>
                a.textContent
                    .trim()
                    .toLowerCase()
            ),

            country: [
                ...document.querySelectorAll(
                    'a[href^="/films/country/"]'
                )
            ].map(a =>
                a.textContent
                    .trim()
                    .toLowerCase()
            ),

            language: [
                ...document.querySelectorAll(
                    'a[href^="/films/language/"]'
                )
            ].map(a =>
                a.textContent
                    .trim()
                    .toLowerCase()
            )
        };
    }

    // ============================================================
    // CATEGORY DETECTION
    // ============================================================

    const SOUTH_INDIAN_LANGS = [
        'telugu',
        'tamil',
        'kannada',
        'malayalam'
    ];

    function matchCategory(meta) {
        const isTV =
            meta.type &&
            /tv/i.test(meta.type);

        const isIndia =
            meta.country.includes(
                'india'
            );

        const isKorea =
            meta.country.includes(
                'south korea'
            );

        const isAnimation =
            meta.genres.includes(
                'animation'
            );

        if (isTV) {
            return isKorea
                ? CATEGORIES.koreanTV
                : CATEGORIES.tvWeb;
        }

        if (isAnimation) {
            return CATEGORIES.animation;
        }

        if (isIndia) {
            if (
                meta.language.includes(
                    'bengali'
                )
            ) {
                return CATEGORIES.kolkataBangla;
            }

            if (
                meta.language.some(
                    lang =>
                        SOUTH_INDIAN_LANGS.includes(
                            lang
                        )
                )
            ) {
                return CATEGORIES.southIndian;
            }

            if (
                meta.language.includes(
                    'hindi'
                )
            ) {
                return CATEGORIES.hindi;
            }

            return CATEGORIES.hindi;
        }

        if (
            meta.language.length === 0 ||
            meta.language.includes(
                'english'
            )
        ) {
            return CATEGORIES.english;
        }

        return CATEGORIES.foreign;
    }

    // ============================================================
    // CATEGORY URL
    // ============================================================

    function getCategoryUrl(
        category,
        quality
    ) {
        if (category.url) {
            return category.url;
        }

        return quality === 'hd'
            ? category.hdUrl
            : category.normalUrl;
    }

    function supportsQualitySelection(
        category
    ) {
        return (
            Boolean(category.normalUrl) &&
            Boolean(category.hdUrl)
        );
    }

    // ============================================================
    // SAVE TITLE AND OPEN CATEGORY
    // ============================================================

    function openCategory(
        category,
        title,
        quality = 'normal'
    ) {
        const url =
            getCategoryUrl(
                category,
                quality
            );

        if (!url) {
            console.error(
                '[DhakaFlix] No URL configured for category.'
            );

            return;
        }

        GM_setValue(
            'DF_PENDING_TITLE',
            title
        );

        GM_setValue(
            'DF_PENDING_TIME',
            Date.now()
        );

        console.log(
            '[DhakaFlix] Title:',
            title
        );

        console.log(
            '[DhakaFlix] Category:',
            category.label
        );

        console.log(
            '[DhakaFlix] Quality:',
            quality
        );

        console.log(
            '[DhakaFlix] URL:',
            url
        );

        GM_openInTab(
            url,
            {
                active: true
            }
        );
    }

    // ============================================================
    // DHAKAFLIX DETECTION
    // ============================================================

    function isDhakaFlix() {
        return (
            location.hostname ===
                '172.16.50.7' ||
            location.hostname ===
                '172.16.50.12' ||
            location.hostname ===
                '172.16.50.14'
        );
    }

    // ============================================================
    // RUN CODE INSIDE PAGE CONTEXT
    // ============================================================

    function runInPageContext(
        fn,
        args
    ) {
        const script =
            document.createElement(
                'script'
            );

        script.textContent =
            `(${fn})(${JSON.stringify(args)});`;

        (
            document.head ||
            document.documentElement
        ).appendChild(
            script
        );

        script.remove();
    }

    // ============================================================
    // H5AI SEARCH
    // ============================================================

    function performH5aiSearch(
        title
    ) {
        runInPageContext(
            function (title) {

                const icon =
                    document.querySelector(
                        '#search img[alt="search"]'
                    );

                const input =
                    document.querySelector(
                        '#search input.l10n_ph-search'
                    );

                if (
                    !icon ||
                    !input
                ) {
                    console.error(
                        '[DhakaFlix page] Search elements missing.'
                    );

                    return;
                }

                console.log(
                    '[DhakaFlix page] Clicking search icon.'
                );

                // h5ai's native search toggle
                icon.click();

                setTimeout(
                    () => {

                        input.focus();

                        const setter =
                            Object.getOwnPropertyDescriptor(
                                window
                                    .HTMLInputElement
                                    .prototype,
                                'value'
                            )?.set;

                        if (setter) {
                            setter.call(
                                input,
                                title
                            );
                        } else {
                            input.value =
                                title;
                        }

                        /*
                         * h5ai listens to keyup.
                         * Trigger the same event a user
                         * typing in the box would cause.
                         */

                        input.dispatchEvent(
                            new KeyboardEvent(
                                'keyup',
                                {
                                    bubbles: true,
                                    cancelable: true,
                                    key: 'Enter',
                                    code: 'Enter',
                                    keyCode: 13,
                                    which: 13
                                }
                            )
                        );

                        console.log(
                            '[DhakaFlix page] Search value:',
                            input.value
                        );

                    },
                    150
                );
            },
            title
        );
    }

    // ============================================================
    // DHAKAFLIX INIT
    // ============================================================

    function initDhakaFlix() {
        const title =
            GM_getValue(
                'DF_PENDING_TITLE',
                null
            );

        const timestamp =
            GM_getValue(
                'DF_PENDING_TIME',
                0
            );

        if (!title) {
            return;
        }

        /*
         * Expire old pending searches.
         */

        if (
            timestamp &&
            Date.now() -
                timestamp >
                120000
        ) {
            GM_deleteValue(
                'DF_PENDING_TITLE'
            );

            GM_deleteValue(
                'DF_PENDING_TIME'
            );

            return;
        }

        GM_deleteValue(
            'DF_PENDING_TITLE'
        );

        GM_deleteValue(
            'DF_PENDING_TIME'
        );

        console.log(
            '[DhakaFlix] Received title:',
            title
        );

        let attempts = 0;

        const timer =
            setInterval(
                () => {

                    attempts++;

                    const icon =
                        document.querySelector(
                            '#search img[alt="search"]'
                        );

                    const input =
                        document.querySelector(
                            '#search input.l10n_ph-search'
                        );

                    if (
                        icon &&
                        input
                    ) {
                        clearInterval(
                            timer
                        );

                        console.log(
                            '[DhakaFlix] h5ai search ready.'
                        );

                        performH5aiSearch(
                            title
                        );

                        return;
                    }

                    if (
                        attempts >= 30
                    ) {
                        clearInterval(
                            timer
                        );

                        console.error(
                            '[DhakaFlix] Search UI not found.'
                        );
                    }

                },
                300
            );
    }

    // ============================================================
    // UI HELPERS
    // ============================================================

    function createBaseButton() {
        const button =
            document.createElement(
                'button'
            );

        Object.assign(
            button.style,
            {
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                zIndex: '999999',
                padding: '14px 24px',
                border: 'none',
                borderRadius: '30px',
                background:
                    'linear-gradient(135deg, #ff8800, #ff5c00)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 'bold',
                fontFamily:
                    'Arial, sans-serif',
                boxShadow:
                    '0 4px 15px rgba(0,0,0,.4)'
            }
        );

        return button;
    }

    function createQualityMenu(
        wrapper,
        category,
        title
    ) {
        const menu =
            document.createElement(
                'div'
            );

        Object.assign(
            menu.style,
            {
                display: 'none',
                marginBottom: '8px',
                background:
                    'rgba(25,25,25,.97)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow:
                    '0 4px 15px rgba(0,0,0,.45)',
                minWidth: '180px',
                fontFamily:
                    'Arial, sans-serif'
            }
        );

        function addOption(
            text,
            quality
        ) {
            const option =
                document.createElement(
                    'div'
                );

            option.textContent =
                text;

            Object.assign(
                option.style,
                {
                    padding:
                        '11px 16px',
                    color:
                        '#fff',
                    cursor:
                        'pointer',
                    fontSize:
                        '14px',
                    whiteSpace:
                        'nowrap'
                }
            );

            option.addEventListener(
                'mouseenter',
                () => {
                    option.style.background =
                        'rgba(255,255,255,.12)';
                }
            );

            option.addEventListener(
                'mouseleave',
                () => {
                    option.style.background =
                        'transparent';
                }
            );

            option.addEventListener(
                'click',
                () => {
                    menu.style.display =
                        'none';

                    openCategory(
                        category,
                        title,
                        quality
                    );
                }
            );

            menu.appendChild(
                option
            );
        }

        addOption(
            'Normal',
            'normal'
        );

        addOption(
            '1080p',
            'hd'
        );

        wrapper.appendChild(
            menu
        );

        return menu;
    }

    // ============================================================
    // SOURCE PAGE INIT
    // ============================================================

    function initSourcePage() {
        let title = null;

        let meta = {
            type: null,
            genres: [],
            country: [],
            language: []
        };

        if (
            location.hostname.includes(
                'imdb.com'
            )
        ) {
            title =
                getIMDbTitle();

            meta =
                getIMDbMetadata();

        } else if (
            location.hostname.includes(
                'letterboxd.com'
            )
        ) {
            title =
                getLetterboxdTitle();

            meta =
                getLetterboxdMetadata();
        }

        if (!title) {
            return;
        }

        const category =
            matchCategory(meta);

        const wrapper =
            document.createElement(
                'div'
            );

        Object.assign(
            wrapper.style,
            {
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                zIndex: '999999',
                display: 'flex',
                flexDirection:
                    'column',
                alignItems:
                    'flex-end'
            }
        );

        const button =
            createBaseButton();

        const hasQualityOptions =
            supportsQualitySelection(
                category
            );

        if (
            hasQualityOptions
        ) {
            button.textContent =
                `DhakaFlix: ${category.label} ▾`;

            const menu =
                createQualityMenu(
                    wrapper,
                    category,
                    title
                );

            button.addEventListener(
                'click',
                () => {
                    menu.style.display =
                        menu.style.display ===
                        'block'
                            ? 'none'
                            : 'block';
                }
            );

        } else {
            button.textContent =
                `DhakaFlix: ${category.label}`;

            button.addEventListener(
                'click',
                () => {
                    openCategory(
                        category,
                        title
                    );
                }
            );
        }

        button.addEventListener(
            'mouseenter',
            () => {
                button.style.transform =
                    'scale(1.04)';
            }
        );

        button.addEventListener(
            'mouseleave',
            () => {
                button.style.transform =
                    'scale(1)';
            }
        );

        button.style.transition =
            'transform .15s ease';

        wrapper.appendChild(
            button
        );

        document.body.appendChild(
            wrapper
        );
    }

    // ============================================================
    // START
    // ============================================================

    window.addEventListener(
        'load',
        () => {

            if (
                isDhakaFlix()
            ) {
                initDhakaFlix();
            } else {
                initSourcePage();
            }

        }
    );

})();
