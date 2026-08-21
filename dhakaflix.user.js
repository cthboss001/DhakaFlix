// ==UserScript==
// @name         IMDb / Letterboxd → DhakaFlix Search
// @namespace    dhakaflix-search
// @version      9.0
// @description  Detect movie category and automatically search the title on the required DhakaFlix pages.
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
    //
    // English and Animation have TWO search pages.
    // All other categories have ONE search page.
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
    // IMDb METADATA
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
                                genre =>
                                    String(
                                        genre
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

    // ============================================================
    // LETTERBOXD METADATA
    // ============================================================

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

        // TV / Web
        if (isTV) {
            return isKorea
                ? CATEGORIES.koreanTV
                : CATEGORIES.tvWeb;
        }

        // Animation
        if (isAnimation) {
            return CATEGORIES.animation;
        }

        // India
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

            return CATEGORIES.hindi;
        }

        // English
        if (
            meta.language.length === 0 ||
            meta.language.includes(
                'english'
            )
        ) {
            return CATEGORIES.english;
        }

        // Other foreign language
        return CATEGORIES.foreign;
    }

    // ============================================================
    // SOURCE → DHAKAFLIX
    //
    // One button click can open multiple pages.
    // English and Animation = 2 pages.
    // Everything else = 1 page.
    // ============================================================

    function openCategoryPages(
        pages,
        title
    ) {

        console.log(
            '[DhakaFlix] Title:',
            title
        );

        console.log(
            '[DhakaFlix] Opening',
            pages.length,
            'search page(s).'
        );

        pages.forEach(
            (page, index) => {

                // Save one search request per tab.
                const searchId =
                    `${Date.now()}_${index}_${Math.random()
                        .toString(36)
                        .slice(2)}`;

                GM_setValue(
                    `DF_PENDING_${searchId}`,
                    {
                        title,
                        createdAt:
                            Date.now()
                    }
                );

                GM_setValue(
                    'DF_LAST_SEARCH_ID',
                    searchId
                );

                console.log(
                    '[DhakaFlix] Opening:',
                    page.label
                );

                GM_openInTab(
                    page.url,
                    {
                        active:
                            index === 0,
                        insert:
                            true,
                        setParent:
                            true
                    }
                );

                /*
                 * Small delay between opening tabs.
                 * This helps avoid browser throttling and
                 * gives each tab its own pending request.
                 */

                if (
                    index <
                    pages.length - 1
                ) {
                    // Nothing needed here because GM_openInTab
                    // returns immediately.
                }
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
    // FIND WHICH SEARCH REQUEST BELONGS TO THIS TAB
    //
    // Since two pages can open at once, we use the URL as the
    // identifier and store a short-lived queue.
    // ============================================================

    function consumePendingSearch() {

        const keys = [
            'DF_PENDING_SEARCH_1',
            'DF_PENDING_SEARCH_2',
            'DF_PENDING_SEARCH_3',
            'DF_PENDING_SEARCH_4'
        ];

        /*
         * Use a queue of pending searches.
         */

        for (
            const key of keys
        ) {

            const data =
                GM_getValue(
                    key,
                    null
                );

            if (!data) {
                continue;
            }

            if (
                data.createdAt &&
                Date.now() -
                    data.createdAt >
                    120000
            ) {
                GM_deleteValue(
                    key
                );

                continue;
            }

            GM_deleteValue(
                key
            );

            return data;
        }

        return null;
    }

    // ============================================================
    // PAGE CONTEXT
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
                        '[DhakaFlix] Search elements not found.'
                    );

                    return;
                }

                /*
                 * This is the exact h5ai search interaction:
                 *
                 * 1. Click the search icon.
                 * 2. Enter title.
                 * 3. Trigger keyup.
                 *
                 * h5ai's own JavaScript handles the search.
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

                        console.log(
                            '[DhakaFlix] Searching:',
                            title
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

        /*
         * Because multiple tabs may be opened, use a simple
         * shared queue stored through GM storage.
         */

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
                        !icon ||
                        !input
                    ) {
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

                        return;
                    }

                    clearInterval(
                        timer
                    );

                    /*
                     * Look for a pending title.
                     */

                    const data =
                        findPendingTitle();

                    if (!data) {

                        console.log(
                            '[DhakaFlix] No pending search for this page.'
                        );

                        return;
                    }

                    console.log(
                        '[DhakaFlix] Received title:',
                        data.title
                    );

                    performH5aiSearch(
                        data.title
                    );

                },
                300
            );
    }

    // ============================================================
    // PENDING SEARCH STORAGE
    // ============================================================

    function findPendingTitle() {

        const candidates = [
            'DF_PENDING_0',
            'DF_PENDING_1',
            'DF_PENDING_2',
            'DF_PENDING_3'
        ];

        /*
         * First check the old single-title key so this remains
         * compatible with previous versions.
         */

        const oldTitle =
            GM_getValue(
                'DF_PENDING_TITLE',
                null
            );

        if (oldTitle) {

            GM_deleteValue(
                'DF_PENDING_TITLE'
            );

            GM_deleteValue(
                'DF_PENDING_TIME'
            );

            return {
                title:
                    oldTitle,
                createdAt:
                    Date.now()
            };
        }

        for (
            const key of candidates
        ) {

            const data =
                GM_getValue(
                    key,
                    null
                );

            if (!data) {
                continue;
            }

            if (
                data.createdAt &&
                Date.now() -
                    data.createdAt >
                    120000
            ) {

                GM_deleteValue(
                    key
                );

                continue;
            }

            GM_deleteValue(
                key
            );

            return data;
        }

        return null;
    }

    // ============================================================
    // CREATE SEARCH REQUESTS
    // ============================================================

    function prepareSearchRequests(
        pages,
        title
    ) {

        /*
         * Clear previous requests.
         */

        for (
            let i = 0;
            i < 4;
            i++
        ) {
            GM_deleteValue(
                `DF_PENDING_${i}`
            );
        }

        /*
         * Create one request for every page.
         */

        pages.forEach(
            (page, index) => {

                GM_setValue(
                    `DF_PENDING_${index}`,
                    {
                        title:
                            title,

                        createdAt:
                            Date.now(),

                        url:
                            page.url
                    }
                );
            }
        );

        console.log(
            '[DhakaFlix] Prepared',
            pages.length,
            'search requests.'
        );
    }

    // ============================================================
    // SOURCE PAGE UI
    // ============================================================

    function initSourcePage() {

        let title =
            null;

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

        // ========================================================
        // One single button
        // ========================================================

        const button =
            document.createElement(
                'button'
            );

        /*
         * For two-page categories:
         *
         * DhakaFlix: English Movies ×2
         *
         * For one-page categories:
         *
         * DhakaFlix: Hindi Movies
         */

        if (
            pages.length === 2
        ) {

            button.textContent =
                `DhakaFlix: ${pages[0].label} + 1080p`;

        } else {

            button.textContent =
                `DhakaFlix: ${pages[0].label}`;
        }

        Object.assign(
            button.style,
            {
                position:
                    'fixed',

                right:
                    '20px',

                bottom:
                    '20px',

                zIndex:
                    '999999',

                padding:
                    '14px 24px',

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
                    '15px',

                fontWeight:
                    'bold',

                fontFamily:
                    'Arial, sans-serif',

                boxShadow:
                    '0 4px 15px rgba(0,0,0,.4)',

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

        button.addEventListener(
            'click',
            () => {

                /*
                 * Prepare one search request for every target page.
                 */

                prepareSearchRequests(
                    pages,
                    title
                );

                /*
                 * Open every required page.
                 *
                 * English = 2 tabs
                 * Animation = 2 tabs
                 * Other categories = 1 tab
                 */

                pages.forEach(
                    page => {

                        console.log(
                            '[DhakaFlix] Opening:',
                            page.label
                        );

                        GM_openInTab(
                            page.url,
                            {
                                active:
                                    true,

                                insert:
                                    true,

                                setParent:
                                    true
                            }
                        );
                    }
                );
            }
        );

        document.body.appendChild(
            button
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
