
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-LLGIW6SH.js"
    ],
    "route": "/dashboard"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 998, hash: 'bf86dd70e20200c6e54f2883c63591d8aaf3d62dd87666332de2222adee1b521', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 979, hash: '823cea11a277afe09a8dea3d60d4dbafdbb8329cae2aa2f05322631bc6fd47ac', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 10972, hash: '8bc6b17b3dc10b0f655b24d0150a73272bdc7f2bd6eb12da372b07f6c667169b', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles.css': {size: 820, hash: 'oH4Q7HROjuQ', text: () => import('./assets-chunks/styles_css.mjs').then(m => m.default)}
  },
};
