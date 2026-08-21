'use strict';

// A page realm for functions that run inside the browser.
//
// Playwright's `page.evaluate(fn, arg)` serializes `fn` to source and evaluates
// it in the page: nothing from the Node module that declared it exists there —
// not a constant, not a helper, only the arguments that were passed. A stub that
// calls `fn()` in Node scope, or hands back canned data without calling it at
// all, cannot see a probe reading a module binding; this helper can, because it
// replays the function the way the browser does: stringified, in a fresh `vm`
// context holding only a minimal DOM.
//
// The DOM is deliberately tiny. Elements declare which selectors they answer
// to, so `querySelectorAll` is a lookup, not a selector engine.

const vm = require('node:vm');

const BASE_STYLE = {
  display: 'block',
  visibility: 'visible',
  opacity: '1',
  fontFamily: 'system-ui',
  fontSize: '16px',
  fontWeight: '400',
  color: 'rgb(16, 20, 24)',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  background: 'none',
  boxShadow: 'none',
  filter: 'none',
  backdropFilter: 'none',
  mixBlendMode: 'normal',
  backgroundBlendMode: 'normal',
  maskImage: 'none',
  webkitMaskImage: 'none',
  overflowX: 'visible',
  pointerEvents: 'auto'
};

/**
 * Build one fake element.
 *
 * @param {object} spec
 * @param {string} [spec.tag]
 * @param {string} [spec.id]
 * @param {string} [spec.className]
 * @param {{left?: number, top?: number, width?: number, height?: number}} [spec.rect]
 * @param {object} [spec.style] computed-style overrides
 * @param {string} [spec.text] own text node content
 * @param {string[]} [spec.matches] extra selectors (beyond `body *`) this element answers to
 * @param {number} [spec.scrollWidth] defaults to the rect width
 * @param {object} [spec.props] extra own properties (img/video attributes)
 */
function element({ tag = 'div', id = '', className = '', rect = {}, style = {}, text = '', matches = [], scrollWidth = null, props = {} } = {}) {
  const box = { left: 0, top: 0, width: 100, height: 40, ...rect };
  box.right = box.left + box.width;
  box.bottom = box.top + box.height;
  return {
    tagName: tag.toUpperCase(),
    id,
    className,
    childNodes: text ? [{ nodeType: 3, textContent: text }] : [],
    textContent: text,
    scrollWidth: scrollWidth === null ? box.width : scrollWidth,
    clientWidth: box.width,
    parentElement: null,
    getBoundingClientRect: () => ({ ...box }),
    __style: { ...BASE_STYLE, ...style },
    __matches: new Set(['body *', ...matches]),
    ...props
  };
}

/**
 * Build the globals a page probe reads: `document`, `window`, `getComputedStyle`.
 *
 * @param {object} spec
 * @param {number} [spec.width] viewport width
 * @param {number} [spec.height] viewport height
 * @param {number} [spec.scrollWidth] document scroll width (> width means horizontal overflow)
 * @param {object[]} [spec.elements] elements built with `element()`
 * @param {Array<{family: string, status: string}>} [spec.fonts] FontFaceSet entries
 * @param {Array<{state: string, iterations: number}>} [spec.animations] `document.getAnimations()` entries
 */
function createPage({ width = 1280, height = 800, scrollWidth = null, elements = [], fonts = [], animations = [] } = {}) {
  const querySelectorAll = (selector) => {
    const tokens = String(selector).split(',').map((token) => token.trim());
    return elements.filter((el) => tokens.some((token) => el.__matches.has(token)));
  };
  const document = {
    documentElement: { scrollWidth: scrollWidth === null ? width : scrollWidth },
    querySelectorAll,
    fonts: { forEach: (fn) => fonts.forEach(fn) },
    getAnimations: () => animations.map((animation) => ({
      playState: animation.state,
      effect: { getTiming: () => ({ iterations: animation.iterations }) }
    }))
  };
  const window = { innerWidth: width, innerHeight: height };
  const getComputedStyle = (el) => el.__style;
  return { document, window, getComputedStyle };
}

/**
 * Replay `fn` exactly as `page.evaluate(fn, arg)` would: serialized source,
 * a fresh realm that holds only the page globals, one argument. A function that
 * reads anything from its declaring module throws `ReferenceError` here, as it
 * does in every real browser.
 */
function evaluateInPage(page, fn, arg) {
  const context = vm.createContext({
    document: page.document,
    window: page.window,
    getComputedStyle: page.getComputedStyle
  });
  const callable = vm.runInContext(`(${fn.toString()})`, context, { filename: 'page-evaluate.js' });
  // Playwright serializes the argument in and the result out: a function, a
  // module object or a DOM node on either side is a transfer error there, and
  // the result lands as plain values of the caller's realm — `structuredClone`
  // enforces both here.
  return structuredClone(callable(structuredClone(arg)));
}

/**
 * A Playwright-shaped launcher whose pages are the given fake page and whose
 * `evaluate` replays functions in the page realm. Drop-in for the `launcher`
 * option of `collectRuntimeMeasurements`.
 *
 * @param {(viewport: {width: number, height: number}) => object} pageFor builds the page for a viewport
 */
function realmLauncher(pageFor) {
  const closed = { contexts: 0, browser: false };
  const calls = [];
  return {
    closed,
    calls,
    launcher: async () => ({
      newContext: async ({ viewport }) => {
        const page = pageFor(viewport);
        return {
          newPage: async () => ({
            goto: async () => {},
            waitForTimeout: async () => {},
            evaluate: async (fn, arg) => {
              calls.push({ fn, arg, viewport });
              return evaluateInPage(page, fn, arg);
            }
          }),
          close: async () => { closed.contexts += 1; }
        };
      },
      close: async () => { closed.browser = true; }
    })
  };
}

module.exports = { element, createPage, evaluateInPage, realmLauncher };
