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

})();
