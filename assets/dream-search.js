/* Dream search for the home page and the dream book, in 9 languages.
   Order: dream names, synonyms, dream texts, near spellings. Never a dead end. */
(function () {
  var cfgEl = document.getElementById("i18n");
  var form = document.querySelector("form.search");
  if (!cfgEl || !form) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var lang = cfg.lang, prefix = cfg.prefix, S = cfg.s, V = cfg.v || "1";
  var q = form.querySelector("input"), list = form.querySelector("ul");
  var data = null, appKeys = [], sel = -1, loading = false, waiting = [];

  var STOP = {
    en: "a an the of to in on and or you your is it i my me was were dreamed dreamt dream about with",
    ru: "я мне меня мой моя во в на и с о об что как снилось снился снилась снились приснилось приснился приснилась приснились снится сон сне",
    es: "el la los las un una de del que en y con soñe sueno mi me",
    pt: "o a os as um uma de do da que em e com sonhei sonho meu minha",
    de: "ich habe hatte der die das ein eine einen einem und mit von vom traum getraumt mein meine",
    fr: "je j'ai ai le la les un une de du des et d'un d'une reve mon ma",
    it: "io ho il lo la i gli le un una di del e con sognato sogno mio mia",
    tr: "bir ve ile ruyamda ruya gordum benim",
    ja: ""
  };
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ё/g, "е"); }
  var stop = {};
  (STOP[lang] || "").split(" ").forEach(function (w) { if (w) stop[norm(w)] = 1; });
  function stem(w) {
    if (lang === "en") return w.replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "") || w;
    if (w.length <= 3) return w;
    var t = w.replace(/[aeiouyаеиоуыэюяйьsx]+$/, "");
    if (lang === "tr") t = t.replace(/(lar|ler)$/, "");
    if (lang === "de") t = t.replace(/(n|e|en|er|s)+$/, "");
    if (t.length < 3) t = w.slice(0, 3);
    return t.length >= 7 ? t.slice(0, -1) : t;
  }
  function words(s) {
    return norm(s).split(/[^\p{L}\p{N}']+/u).filter(function (w) { return w && w.length > 1 && !stop[w]; });
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function dist(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var p = [], i, j;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      var prev = p[0]; p[0] = i;
      for (j = 1; j <= b.length; j++) { var t = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return p[b.length];
  }
  function load(cb) {
    if (data) return cb();
    waiting.push(cb);
    if (loading) return;
    loading = true;
    fetch("/assets/data/app-keys-" + lang + ".json?v=" + V).then(function (r) { return r.json(); })
      .then(function (k) { appKeys = k.map(function (w) { return norm(w); }); }).catch(function () {});
    fetch("/assets/data/dreams-" + lang + ".json?v=" + V).then(function (r) { return r.json(); }).then(function (d) {
      data = d.map(function (x) {
        var nw = words(x[1] + (lang === "en" ? " " + x[0].replace(/-/g, " ") : ""));
        return { slug: x[0], name: x[1], text: x[2] || "", nn: norm(x[1]), nt: norm(x[2] || ""), nk: norm(x[3] || ""),
                 nw: nw, ns: nw.map(stem), ks: words(x[3] || "").map(stem), ts: words(x[2] || "").map(stem) };
      });
      waiting.splice(0).forEach(function (f) { f(); });
    }).catch(function () { loading = false; });
  }
  function snippet(text, word) {
    var low = text.toLowerCase(), i = low.indexOf(word.toLowerCase());
    if (i < 0) return "";
    var a = Math.max(0, i - 40), b = Math.min(text.length, i + word.length + 60);
    return (a ? "…" : "") + esc(text.slice(a, i)) + "<b>" + esc(text.slice(i, i + word.length)) + "</b>" + esc(text.slice(i + word.length, b)) + (b < text.length ? "…" : "");
  }
  function link(d, sn) {
    return '<li role="option"><a href="' + prefix + "/dreams/" + d.slug + '/">' + esc(d.name) + (sn ? "<small>" + sn + "</small>" : "") + "</a></li>";
  }
  function fill(t, v) { return esc(t).replace("{q}", esc(v)); }

  function searchJa(raw) {
    var out = [];
    data.forEach(function (d) {
      var sc = d.nn.indexOf(raw) >= 0 ? 100 : d.nk.indexOf(raw) >= 0 ? 70 : d.nt.indexOf(raw) >= 0 ? 40 : 0;
      if (sc) out.push({ d: d, sc: sc - d.name.length * 0.01, how: sc === 40 ? "text" : "name", near: false });
    });
    return out;
  }
  function searchWords(qw) {
    var qs = qw.map(stem), out = [];
    data.forEach(function (d) {
      var sc = 0, how = "name", near = false;
      qs.forEach(function (w, k) {
        var orig = qw[k], best = 0;
        d.ns.forEach(function (n, i) {
          if (n === w) best = Math.max(best, 100);
          else if (orig.length >= 3 && d.nw[i].indexOf(orig) === 0) best = Math.max(best, 80);
          else if (w.length >= 4 && n.length >= 4 && dist(n, w) <= (w.length > 5 ? 2 : 1)) best = Math.max(best, 25);
        });
        if (best < 70 && d.ks.indexOf(w) >= 0) best = 70;
        if (best < 70 && d.ts.indexOf(w) >= 0) { best = 40; how = "text"; }
        if (best === 25) near = true;
        sc += best;
      });
      if (sc > 0) out.push({ d: d, sc: sc - d.name.length * 0.01, how: how, near: near });
    });
    return out;
  }
  function inApp(raw, qw) {
    if (!appKeys.length) return false;
    if (lang === "ja") return appKeys.some(function (k) { return k.indexOf(raw) >= 0 || raw.indexOf(k) >= 0; });
    return qw.some(function (w) { var s = stem(w); return appKeys.some(function (k) { return k === w || stem(k) === s; }); });
  }

  function render() {
    var shown = q.value.trim(), raw = norm(shown);
    sel = -1;
    if (!raw) { list.classList.remove("open"); list.innerHTML = ""; return; }
    var qw = lang === "ja" ? [] : words(shown);
    if (lang !== "ja" && !qw.length) qw = [raw];
    var scored = lang === "ja" ? searchJa(raw) : searchWords(qw);
    scored.sort(function (a, b) { return b.sc - a.sc; });
    var exact = scored.filter(function (x) { return !x.near; });
    var res = (exact.length ? exact : scored).slice(0, 7);
    var app = inApp(raw, qw), h = "";
    if (exact.length) {
      h = res.map(function (x) { return link(x.d, x.how === "text" ? snippet(x.d.text, lang === "ja" ? shown : qw[0]) : ""); }).join("");
    } else if (res.length && !app) {
      h = '<li class="none">' + fill(S.s_near, shown) + "</li>" + res.map(function (x) { return link(x.d); }).join("");
    } else if (!app) {
      h = '<li class="none">' + fill(S.s_none, shown) + "</li>" +
        cfg.popular.map(function (p) { return link({ slug: p[0], name: p[1] }); }).join("");
    }
    if (app) h += '<li class="pap">𓂀 ' + esc(S.s_pap) + "</li>";
    h += '<li><a class="all" href="' + prefix + '/dreams/">' + esc(S.s_all) + "</a></li>";
    list.innerHTML = h;
    list.classList.add("open");
  }

  q.addEventListener("focus", function () { load(function () {}); });
  q.addEventListener("input", function () { load(render); });
  q.addEventListener("keydown", function (e) {
    var links = list.querySelectorAll("a");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!links.length) return;
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
      links[sel].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      var a = links[sel >= 0 ? sel : 0];
      if (a) location.href = a.getAttribute("href");
    } else if (e.key === "Escape") { list.classList.remove("open"); }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  document.addEventListener("click", function (e) { if (!e.target.closest || !e.target.closest("form.search")) list.classList.remove("open"); });
  // ?q= in the address opens the search with that word
  var pre = new URLSearchParams(location.search).get("q");
  if (pre) { q.value = pre; load(render); }
})();
