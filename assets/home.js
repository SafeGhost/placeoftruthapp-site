(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // nav background after the hero
  var nav = document.getElementById("nav");
  function onNav() { nav.classList.toggle("solid", window.scrollY > 40); }
  onNav();
  window.addEventListener("scroll", onNav, { passive: true });

  // reveal on scroll
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -10% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  // parallax bands
  var bands = [].slice.call(document.querySelectorAll("[data-parallax]"));
  if (!reduce && bands.length) {
    var ticking = false;
    function para() {
      ticking = false;
      var vh = window.innerHeight;
      bands.forEach(function (b) {
        var r = b.parentNode.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        b.style.transform = "translate3d(0," + (p * -14).toFixed(2) + "%,0)";
      });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(para); } }, { passive: true });
    para();
  }

  // pinned phone: switch screen to the active step
  var phone = document.getElementById("phone");
  var shots = phone ? phone.querySelectorAll("img") : [];
  var steps = document.querySelectorAll(".step");
  var sio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = +e.target.getAttribute("data-i");
      steps.forEach(function (s) { s.classList.toggle("active", s === e.target); });
      for (var k = 0; k < shots.length; k++) shots[k].classList.toggle("on", k === i);
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(function (s) { sio.observe(s); });
  if (steps[0]) steps[0].classList.add("active");

  // dream search: names, then dream texts, then near spellings; never a dead end
  var q = document.getElementById("q"), list = document.getElementById("results"), data = null, sel = -1;
  var POPULAR = [["snakes", "Snakes"], ["teeth", "Teeth"], ["water", "Water"], ["flying", "Flying"], ["wedding", "A wedding"]];
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function stem(w) { return w.replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "") || w; }
  function words(s) { return norm(s).split(/[^a-z0-9']+/).filter(function (w) { return w && !/^(a|an|the|of|to|in|on|and|or|you|your|is|it)$/.test(w); }); }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
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
    fetch("/assets/data/dreams-en.json?v=2").then(function (r) { return r.json(); }).then(function (d) {
      data = d.map(function (x) {
        var nw = words(x[1] + " " + x[0].replace(/-/g, " "));
        return { slug: x[0], name: x[1], text: x[2] || "", nw: nw, ns: nw.map(stem), ts: words(x[2] || "").map(stem) };
      });
      cb();
    }).catch(function () {});
  }
  function snippet(text, st) {
    var re = new RegExp("\\b(" + st.replace(/[^a-z0-9]/g, "") + "[a-z']*)", "i"), m = text.match(re);
    if (!m) return "";
    var i = m.index, a = Math.max(0, i - 40), b = Math.min(text.length, i + 70);
    return (a ? "…" : "") + esc(text.slice(a, i)) + "<b>" + esc(m[0]) + "</b>" + esc(text.slice(i + m[0].length, b)) + (b < text.length ? "…" : "");
  }
  function render() {
    var qw = words(q.value), raw = norm(q.value.trim());
    sel = -1;
    if (!raw) { list.classList.remove("open"); list.innerHTML = ""; return; }
    var qs = qw.length ? qw.map(stem) : [raw];
    var scored = [];
    data.forEach(function (d) {
      var sc = 0, how = "name", near = false;
      qs.forEach(function (w, k) {
        var orig = qw[k] || w, best = 0;
        d.ns.forEach(function (n, i) {
          if (n === w) best = Math.max(best, 100);
          else if (orig.length >= 3 && d.nw[i].indexOf(orig) === 0) best = Math.max(best, 80);
          else if (w.length >= 4 && n.length >= 4 && dist(n, w) <= (w.length > 5 ? 2 : 1)) best = Math.max(best, 25);
        });
        if (best < 80 && d.ts.indexOf(w) >= 0) { best = Math.max(best, 40); if (best === 40) how = "text"; }
        if (best === 25) near = true;
        sc += best;
      });
      if (sc > 0) scored.push({ d: d, sc: sc - d.name.length * 0.01, how: how, near: near });
    });
    scored.sort(function (a, b) { return b.sc - a.sc; });
    var exact = scored.filter(function (x) { return !x.near; });
    var res = (exact.length ? exact : scored).slice(0, 7), h = "";
    if (res.length && !exact.length) h += '<li class="none">Nothing for “' + esc(q.value.trim()) + '”. Did you mean:</li>';
    h += res.map(function (x) {
      var sn = x.how === "text" ? snippet(x.d.text, qs[0]) : "";
      return '<li role="option"><a href="/dreams/' + x.d.slug + '/">' + esc(x.d.name) + (sn ? '<small>' + sn + "</small>" : "") + "</a></li>";
    }).join("");
    if (res.length && !exact.length) h += '<li><a class="all" href="/dreams/">All 789 dreams from A to Z →</a></li>';
    if (!res.length) {
      h = '<li class="none">Nothing for “' + esc(q.value.trim()) + '” yet. Dreams people often look up:</li>' +
        POPULAR.map(function (p) { return '<li role="option"><a href="/dreams/' + p[0] + '/">' + p[1] + "</a></li>"; }).join("") +
        '<li><a class="all" href="/dreams/">All 789 dreams from A to Z →</a></li>';
    }
    list.innerHTML = h;
    list.classList.add("open");
  }
  if (q) {
    q.addEventListener("focus", function () { load(function () {}); });
    q.addEventListener("input", function () { load(render); });
    q.addEventListener("keydown", function (e) {
      var links = list.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!links.length) return;
        e.preventDefault();
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
      } else if (e.key === "Enter") {
        e.preventDefault();
        var a = links[sel >= 0 ? sel : 0];
        if (a) location.href = a.getAttribute("href");
      } else if (e.key === "Escape") { list.classList.remove("open"); }
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".search")) list.classList.remove("open"); });
  }
})();
