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

  // pinned phone: the step nearest the middle of the screen is lit and its screen shown.
  // Measured on every scroll frame, so fast scrolls, scrolling back and any window height work.
  var phone = document.getElementById("phone");
  var shots = phone ? phone.querySelectorAll("img") : [];
  var steps = [].slice.call(document.querySelectorAll(".step"));
  var cur = -1;
  function pickStep() {
    var mid = window.innerHeight / 2, best = -1, bestD = 1e9;
    steps.forEach(function (s, i) {
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var c = s.querySelector(".step-card") || s, cr = c.getBoundingClientRect();
      var d = Math.abs((cr.top + cr.bottom) / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0 || best === cur) return;
    cur = best;
    steps.forEach(function (s, i) { s.classList.toggle("active", i === best); });
    for (var k = 0; k < shots.length; k++) shots[k].classList.toggle("on", k === +steps[best].getAttribute("data-i"));
  }
  if (steps[0]) { steps[0].classList.add("active"); cur = 0; }

  // fallback for the fade-in: anything already on screen is shown, even if the observer missed it
  function revealVisible() {
    var h = window.innerHeight;
    document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < h && r.bottom > 0) el.classList.add("in");
    });
  }
  var queued = false;
  function onFrame() { queued = false; revealVisible(); pickStep(); }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(onFrame); } }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  window.addEventListener("load", queue);
  window.addEventListener("pageshow", queue);
  queue();
})();

// store badges: until the app is out, a tap tells when it comes
(function () {
  var dlg = document.getElementById("storeMsg");
  if (!dlg) return;
  document.querySelectorAll("button.store[data-msg]").forEach(function (b) {
    b.addEventListener("click", function () {
      dlg.querySelector("p").textContent = b.getAttribute("data-msg");
      if (dlg.showModal) dlg.showModal(); else alert(b.getAttribute("data-msg"));
    });
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
})();
