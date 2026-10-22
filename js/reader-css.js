// Reader mode styles, applied inside the overlay's shadow root.
// Layout values adapted from Postlight Reader (MIT, (c) Postlight).
var readAloudReaderCss = `
.ra-root {
  all: initial;
  display: block;
  position: absolute;
  inset: 0;
  --bg: #e9e9e9;
  --page: #f8f8f8;
  --page-border: #dbdbdb;
  --text: #333333;
  --byline: #696969;
  --divider: #cbcbcb;
  --rule: #e9e9e9;
  --link: #f06040;
  --chunk: rgba(255, 221, 87, 0.55);
  --mark: #ffc21a;
  --chunk-hover: rgba(0, 0, 0, 0.04);
  --serif: "ReadAloud Reader Serif", Charter, "Iowan Old Style", Georgia, serif;
  --sans: "ReadAloud Reader Sans", "Avenir Next", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text);
  font-family: var(--serif);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
}
.ra-root.theme-dark {
  --bg: #171717;
  --page: #272727;
  --page-border: #373737;
  --text: #dddddd;
  --byline: #aaaaaa;
  --divider: #555555;
  --rule: #373737;
  --chunk: rgba(255, 196, 0, 0.24);
  --mark: rgba(255, 196, 0, 0.62);
  --chunk-hover: rgba(255, 255, 255, 0.05);
  color-scheme: dark;
}
.ra-root *, .ra-root *::before, .ra-root *::after {
  box-sizing: border-box;
}

/* page */
.ra-scroller {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--bg);
  outline: none;
}
.ra-root.minimized .ra-scroller {
  display: none;
}
.ra-page {
  max-width: 900px;
  min-height: 100%;
  margin: 0 auto;
  padding: 64px 16px 140px;
  background: var(--page);
  border: 1px solid var(--page-border);
  border-top: none;
  border-bottom: none;
}
.ra-column {
  margin: 0 auto;
  max-width: 700px;
}
.size-small .ra-column { max-width: 580px; }
.size-large .ra-column { max-width: 800px; }

/* header */
.ra-site {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 13px;
  color: var(--byline);
}
.size-large .ra-site { font-size: 15px; }
.ra-site img {
  width: 16px;
  height: 16px;
}
.ra-title {
  display: block;
  margin: 22px 0 15px;
  font-family: var(--serif);
  font-weight: 700;
  font-size: 44px;
  line-height: 46px;
  letter-spacing: -0.5px;
  color: var(--text);
}
.size-small .ra-title { margin: 15px 0 16px; font-size: 36px; line-height: 38px; letter-spacing: -0.4px; }
.size-large .ra-title { margin: 13px 0 26px; font-size: 50px; line-height: 54px; letter-spacing: -0.6px; }
.ra-byline {
  margin: 0 0 20px;
  padding-bottom: 22px;
  border-bottom: 2px solid var(--rule);
  font-family: var(--sans);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.2px;
  color: var(--byline);
}
.size-small .ra-byline { margin-bottom: 18px; font-size: 12px; }
.size-large .ra-byline { padding-bottom: 24px; font-size: 18px; letter-spacing: -0.3px; }
.ra-byline .ra-divider {
  margin: 0 8px;
  font-weight: 400;
  color: var(--divider);
}

/* body */
.ra-body {
  font-size: 21px;
  line-height: 32px;
}
.size-small .ra-body { font-size: 17px; line-height: 26px; }
.size-large .ra-body { font-size: 27px; line-height: 39px; }
.type-sans .ra-title, .type-sans .ra-body {
  font-family: var(--sans);
}
.ra-body p {
  margin: 0 0 1em;
  overflow-wrap: break-word;
}
.ra-placeholder {
  font-family: var(--sans);
  font-size: 15px;
  color: var(--byline);
}
.ra-chunk {
  border-radius: 3px;
  transition: background-color 150ms ease-out;
}
.ra-root.is-source .ra-chunk {
  cursor: pointer;
}
.ra-root.is-source .ra-chunk:hover {
  background-color: var(--chunk-hover);
}
.ra-root.is-source .ra-chunk.active {
  background-color: var(--chunk);
}
.ra-chunk mark {
  color: inherit;
  background-color: var(--mark);
  border-radius: 3px;
}

/* error */
.ra-error {
  position: fixed;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  width: max-content;
  max-width: min(560px, calc(100% - 32px));
  padding: 10px 14px;
  border-radius: 8px;
  background: #fff4e5;
  color: #663c00;
  border: 1px solid #ffd8a8;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.4;
  pointer-events: auto;
}
.ra-error[hidden] {
  display: none;
}
.ra-error a {
  color: #c2410c;
  text-decoration: underline;
  cursor: pointer;
}

/* control bar */
.ra-bar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  max-width: calc(100% - 24px);
  padding: 6px 8px;
  border-radius: 999px;
  background: rgba(34, 34, 34, 0.96);
  color: #e8e8e8;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28);
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1;
  pointer-events: auto;
  user-select: none;
}
.ra-bar button, .ra-menu button {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ra-bar button {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: inherit;
}
.ra-bar button:hover { background: rgba(255, 255, 255, 0.12); }
.ra-bar button:focus-visible, .ra-menu button:focus-visible {
  outline: 2px solid #8ab4f8;
  outline-offset: 1px;
}
.ra-bar button[hidden] { display: none; }
.ra-bar button.ra-primary {
  width: 40px;
  height: 40px;
  background: #f06040;
  color: #ffffff;
}
.ra-bar button.ra-primary:hover { background: #e2502f; }
.ra-bar svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}
.ra-bar .ra-text-button {
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 700;
}
.ra-loading {
  flex: none;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ra-loading[hidden] { display: none; }
.ra-loading::after {
  content: "";
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #f06040;
  animation: ra-spin 0.9s linear infinite;
}
@keyframes ra-spin { to { transform: rotate(360deg); } }
.ra-status {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 260px;
  padding: 0 10px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #bdbdbd;
}
.ra-status:empty { display: none; }
.ra-sep {
  flex: none;
  width: 1px;
  height: 22px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.18);
}
@media (max-width: 560px) {
  .ra-status { display: none; }
}

/* display menu */
.ra-menu {
  position: fixed;
  left: 50%;
  bottom: 80px;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 10px 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(34, 34, 34, 0.97);
  color: #e8e8e8;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28);
  font-family: var(--sans);
  font-size: 13px;
  pointer-events: auto;
}
.ra-menu[hidden] { display: none; }
.ra-menu .ra-group {
  justify-self: start;
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  background: #111111;
}
.ra-menu .ra-group button {
  min-width: 64px;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #8a8a8a;
}
.ra-menu .ra-group button:hover { color: #dddddd; }
.ra-menu .ra-group button.selected {
  background: #f06040;
  color: #ffffff;
  cursor: default;
}

@media (prefers-reduced-motion: reduce) {
  .ra-chunk { transition: none; }
  .ra-loading::after { animation-duration: 2s; }
}
@media print {
  .ra-bar, .ra-menu, .ra-error { display: none; }
}
`
