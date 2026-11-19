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

  // dream search
  var q = document.getElementById("q"), list = document.getElementById("results"), data = null, sel = -1;
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^(a|an|the)\s+/, ""); }
  function load(cb) {
    if (data) return cb();
    fetch("/assets/data/dreams-en.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d.map(function (x) { return { slug: x[0], name: x[1], key: norm(x[1]) + " " + x[0].replace(/-/g, " ") }; });
      cb();
    }).catch(function () {});
  }
  function render() {
    var v = norm(q.value.trim());
    sel = -1;
    if (!v) { list.classList.remove("open"); list.innerHTML = ""; return; }
    var starts = [], has = [];
    data.forEach(function (d) {
      var words = d.key.split(/\s+/);
      if (words.some(function (w) { return w.indexOf(v) === 0; })) starts.push(d);
      else if (d.key.indexOf(v) >= 0) has.push(d);
    });
    var res = starts.concat(has).slice(0, 7);
    list.innerHTML = res.length
      ? res.map(function (d) { return '<li role="option"><a href="/dreams/' + d.slug + '/">' + d.name.replace(/</g, "&lt;") + "</a></li>"; }).join("")
      : '<li class="none">No such dream yet. Open the whole dream book below.</li>';
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
