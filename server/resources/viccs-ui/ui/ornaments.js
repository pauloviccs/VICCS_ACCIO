// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Shared ArcaneMP Ornaments (CEF DOM Helpers)
// Arquivo: ui/ornaments.js
// ═══════════════════════════════════════════════════════════════

(function (global) {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function svgEl(tag, attrs) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            el.setAttribute(k, String(v));
        }
        return el;
    }

    function createCornerBracket(posClass) {
        const svg = svgEl('svg', {
            class: `frame-corner ${posClass}`,
            viewBox: '0 0 40 40',
            'aria-hidden': 'true',
        });
        svg.appendChild(svgEl('path', { d: 'M.75 40V.75H40', 'stroke-width': '1.5' }));
        svg.appendChild(svgEl('path', { d: 'M6 40V16Q6 6 16 6h24', opacity: '.55' }));
        svg.appendChild(svgEl('path', { d: 'M14 10l4 4-4 4-4-4z', fill: 'currentColor', stroke: 'none' }));
        return svg;
    }

    function injectFrameCorners(frameElement) {
        if (!frameElement) return;
        const positions = ['frame-corner-tl', 'frame-corner-tr', 'frame-corner-bl', 'frame-corner-br'];
        for (const pos of positions) {
            if (!frameElement.querySelector(`.${pos}`)) {
                frameElement.prepend(createCornerBracket(pos));
            }
        }
    }

    function createDivider(className) {
        const svg = svgEl('svg', {
            class: `divider ${className || ''}`.trim(),
            viewBox: '0 0 240 14',
            'aria-hidden': 'true',
        });
        svg.appendChild(svgEl('path', { d: 'M100 7H0M140 7h100' }));
        svg.appendChild(svgEl('path', {
            fill: 'currentColor',
            d: 'M104 7l4-4 4 4-4 4zM128 7l4-4 4 4-4 4z',
            opacity: '.6',
        }));
        svg.appendChild(svgEl('path', { d: 'M120 1l6 6-6 6-6-6z' }));
        return svg;
    }

    function applyHouseTheme(house) {
        const allowed = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
        const normalized = String(house || '').trim().toLowerCase();
        const theme = allowed.includes(normalized) ? normalized : 'gryffindor';
        document.documentElement.setAttribute('data-house-theme', theme);
        return theme;
    }

    function houseEmblemUrl(house) {
        const theme = applyHouseTheme(house);
        return `fw://resources/viccs-ui/ui/assets/emblemas/${theme}.png`;
    }

    global.ViccsOrnaments = Object.freeze({
        injectFrameCorners,
        attachCorners: injectFrameCorners,
        createDivider,
        applyHouseTheme,
        houseEmblemUrl,
    });
})(window);

