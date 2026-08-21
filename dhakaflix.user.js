// ==UserScript==
// @name         IMDb / Letterboxd → DhakaFlix Search
// @namespace    dhakaflix-search
// @version      8.1
// @description  Detect movie category and open the appropriate DhakaFlix search page.
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
        english: [
            {
                label: 'English Movies',
                url: 'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/'
            },
            {
                label: 'English Movies (1080p)',
                url: 'http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/'
            }
        ],

        hindi: [
            {
                label: 'Hindi Movies',
                url: 'http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/'
            }
        ],

        southIndian: [
            {
                label: 'South Indian Movies (Hindi Dubbed)',
                url: 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/'
            }
        ],

        foreign: [
            {
                label: 'Foreign Language Movies',
                url: 'http://172.16.50.7/DHAKA-FLIX-7/Foreign%20Language%20Movies/'
            }
        ],

        kolkataBangla: [
            {
                label: 'Kolkata Bangla Movies',
                url: 'http://172.16.50.7/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/'
            }
        ],

        tvWeb: [
            {
                label: 'TV & Web Series',
                url: 'http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/'
            }
        ],

        koreanTV: [
            {
                label: 'Korean TV & Web Series',
                url: 'http://172.16.50.14/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/'
            }
        ],

        animation: [
            {
                label: 'Animation Movies',
                url: 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/'
            },
            {
                label: 'Animation Movies (1080p)',
                url: 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/'
            }
        ]
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
        const el = document.querySelector('h1');

        return cleanTitle(
            el ? el.textContent : null
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
                            ...genres.map(
                                x =>
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
                    ...li.querySelectorAll(
                        'a'
                    )
                ].map(
                    a =>
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
                            li.textContent ||
                            ''
                        ).toLowerCase();

                    const links =
                        [
                            ...li.querySelectorAll(
                                'a'
                            )
                        ].map(
                            a =>
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
            ].map(
                a =>
                    a.textContent
                        .trim()
                        .toLowerCase()
            ),

            country: [
                ...document.querySelectorAll(
                    'a[href^="/films/country/"]'
                )
            ].map(
                a =>
                    a.textContent
                        .trim()
                        .toLowerCase()
            ),

            language: [
                ...document.querySelectorAll(
                    'a[href^="/films/language/"]'
                )
            ].map(
                a =>
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
            /tv/i.test(
                meta.type
            );

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
                    language =>
                        SOUTH_INDIAN_LANGS.includes(
                            language
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
    // OPEN DHAKAFLIX
    // ============================================================

    function openCategory(
        category,
        title
    ) {

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
            '[DhakaFlix] Opening:',
            category.label
        );

        console.log(
            '[DhakaFlix] URL:',
            category.url
        );

        GM_openInTab(
            category.url,
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
    // RUN INSIDE ACTUAL PAGE CONTEXT
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
                        '[DhakaFlix] Search elements missing.'
                    );

                    return;
                }

                /*
                 * h5ai's actual search implementation
                 * attaches the click handler to the
                 * search image.
                 */

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
                         * h5ai listens for keyup and
                         * performs its own search.
                         */

                        input.dispatchEvent(
                            new KeyboardEvent(
                                'keyup',
                                {
                                    bubbles:
                                        true,
                                    cancelable:
                                        true,
                                    key:
                                        'Enter',
                                    code:
                                        'Enter',
                                    keyCode:
                                        13,
                                    which:
                                        13
                                }
                            )
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
         * Expire old requests.
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
                            '[DhakaFlix] Search ready.'
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
    // BUTTON STYLING
    // ============================================================

    function styleButton(
        button
    ) {

        Object.assign(
            button.style,
            {
                padding:
                    '14px 22px',

                border:
                    'none',

                borderRadius:
                    '30px',

                background:
                    'linear-gradient(135deg, #ff8800, #ff5c00)',

                color:
                    '#fff',

                cursor:
                    'pointer',

                fontSize:
                    '14px',

                fontWeight:
                    'bold',

                fontFamily:
                    'Arial, sans-serif',

                boxShadow:
                    '0 4px 15px rgba(0,0,0,.35)',

                transition:
                    'transform .15s ease'
            }
        );

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
    }

    // ============================================================
    // SOURCE PAGE UI
    // ============================================================

    function initSourcePage() {

        let title = null;

        let meta = {
            type:
                null,
            genres:
                [],
            country:
                [],
            language:
                []
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

        const pages =
            matchCategory(
                meta
            );

        /*
         * Container for multiple buttons.
         */

        const wrapper =
            document.createElement(
                'div'
            );

        Object.assign(
            wrapper.style,
            {
                position:
                    'fixed',

                right:
                    '20px',

                bottom:
                    '20px',

                zIndex:
                    '999999',

                display:
                    'flex',

                flexDirection:
                    'column',

                gap:
                    '8px',

                alignItems:
                    'flex-end'
            }
        );

        pages.forEach(
            page => {

                const button =
                    document.createElement(
                        'button'
                    );

                button.textContent =
                    `DhakaFlix: ${page.label}`;

                styleButton(
                    button
                );

                button.addEventListener(
                    'click',
                    () => {

                        openCategory(
                            page,
                            title
                        );
                    }
                );

                wrapper.appendChild(
                    button
                );
            }
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
