// Shared helpers: theme toggle and markdown rendering.

(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme');
  if (!btn) return;
  function current() {
    return root.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function label() { btn.textContent = current() === 'dark' ? 'light' : 'dark'; }
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    label();
  });
  label();
})();

// Render markdown into el, sanitized. resolve(url, kind) rewrites relative
// links ("link") and image sources ("img") so they point somewhere real.
function renderMarkdown(el, md, resolve) {
  el.innerHTML = DOMPurify.sanitize(marked.parse(md));
  var isRelative = function (u) { return u && !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u); };
  el.querySelectorAll('img[src]').forEach(function (img) {
    var s = img.getAttribute('src');
    if (isRelative(s)) img.setAttribute('src', resolve(s, 'img'));
  });
  el.querySelectorAll('a[href]').forEach(function (a) {
    var h = a.getAttribute('href');
    if (isRelative(h)) a.setAttribute('href', resolve(h, 'link'));
  });
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function el(tag, attrs, text) {
  var e = document.createElement(tag);
  for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  return e;
}
