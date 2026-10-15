window.BR = window.BR || {};

BR.Assets = (function () {
  var cache = {};
  var pending = {};

  function tryLoad(key, src) {
    if (cache[key] || pending[key]) return;
    pending[key] = true;
    var img = new Image();
    img.onload = function () { cache[key] = img; delete pending[key]; };
    img.onerror = function () { delete pending[key]; };
    img.src = src;
  }

  function get(key) { return cache[key] || null; }

  function loadManifest(manifest) {
    Object.keys(manifest).forEach(function (key) {
      tryLoad(key, manifest[key]);
    });
  }

  return { tryLoad: tryLoad, get: get, loadManifest: loadManifest };
})();
