(function () {
  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  var me = document.querySelector(".hero .me, .hero .portrait img");

  // Entrance: start once the portrait has decoded so the sequence plays as one piece.
  function go() { requestAnimationFrame(function () { root.classList.add("ready"); }); }
  if (!me || me.complete) { go(); } else { me.addEventListener("load", go); me.addEventListener("error", go); }
  setTimeout(go, 1500);

  // Pointer parallax on the floating cards and orbs (fine pointers, motion allowed, wide screens only).
  var motionOK = window.matchMedia("(prefers-reduced-motion: no-preference) and (pointer: fine) and (min-width: 901px)");
  hero.querySelectorAll("[data-depth]").forEach(function (el) { el.style.setProperty("--d", el.dataset.depth); });
  hero.addEventListener("pointermove", function (e) {
    if (!motionOK.matches) return;
    var r = hero.getBoundingClientRect();
    hero.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    hero.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  hero.addEventListener("pointerleave", function () {
    hero.style.setProperty("--px", 0); hero.style.setProperty("--py", 0);
  });

  // Section dots and header links follow the section in view.
  var links = document.querySelectorAll(".dots a, .bar nav a");
  var ids = ["top", "about", "experience", "capabilities", "works", "contact"];
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + en.target.id); });
      if (!hovered) restDot();
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ids.forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });

  // Header gets a solid background once the page scrolls under it.
  var bar = document.querySelector(".bar");
  function stick() { bar.classList.toggle("stuck", window.scrollY > 8); }
  window.addEventListener("scroll", stick, { passive: true });
  stick();

  // Header underline: follows the pointer or keyboard focus, then returns to the active section.
  var nav = document.querySelector(".bar nav");
  var dot = nav && nav.querySelector(".nav-line");
  var hovered = null;
  function moveDot(link) {
    if (!dot) return;
    if (!link) { dot.classList.remove("show"); return; }
    var n = nav.getBoundingClientRect(), r = link.getBoundingClientRect();
    dot.style.width = r.width + "px";
    dot.style.transform = "translateX(" + (r.left - n.left) + "px)";
    dot.classList.add("show");
  }
  function restDot() { moveDot(nav && nav.querySelector("a.on")); }
  if (nav) {
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("mouseenter", function () { hovered = a; moveDot(a); });
      a.addEventListener("focus", function () { hovered = a; moveDot(a); });
    });
    nav.addEventListener("mouseleave", function () { hovered = null; restDot(); });
    nav.addEventListener("focusout", function (e) { if (!nav.contains(e.relatedTarget)) { hovered = null; restDot(); } });
    window.addEventListener("resize", restDot);
    restDot();
  }
})();

(function () {
  var map = document.querySelector(".skillmap");
  if (!map) return;
  var svg = map.querySelector(".wires");
  var roles = [].slice.call(map.querySelectorAll(".role-btn"));
  var chips = [].slice.call(map.querySelectorAll(".chip"));
  var panels = [].slice.call(map.querySelectorAll(".detail .rd"));
  var wide = window.matchMedia("(min-width: 901px)");
  var pinned = null;

  function showPanel(p) { panels.forEach(function (x) { x.hidden = x !== p; }); }

  function wires(targets, from) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!from || !wide.matches) return;
    var m = map.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + m.width + " " + m.height);
    var fromRole = from.classList.contains("role-btn");
    var f = from.getBoundingClientRect();
    targets.forEach(function (t) {
      var r = fromRole ? f : t.getBoundingClientRect();   // role end
      var c = fromRole ? t.getBoundingClientRect() : f;   // chip end
      var x1 = r.right - m.left, y1 = r.top + r.height / 2 - m.top;
      var x2 = c.left - m.left + 10, y2 = c.top + c.height / 2 - m.top;
      var k = Math.max(60, (x2 - x1) * 0.55);
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M" + x1 + " " + y1 + " C" + (x1 + k) + " " + y1 + " " + (x2 - k) + " " + y2 + " " + x2 + " " + y2);
      path.setAttribute("pathLength", "1");
      svg.appendChild(path);
    });
  }

  function show(state) {
    roles.concat(chips).forEach(function (e) { e.classList.remove("lit", "dim"); });
    if (!state) { showPanel(map.querySelector(".rd-default")); wires([], null); return; }
    if (state.type === "role") {
      var id = state.el.dataset.role;
      var lit = chips.filter(function (c) { return c.dataset.roles.split(" ").indexOf(id) > -1; });
      roles.forEach(function (r) { r.classList.add(r === state.el ? "lit" : "dim"); });
      chips.forEach(function (c) { c.classList.add(lit.indexOf(c) > -1 ? "lit" : "dim"); });
      showPanel(map.querySelector('.rd[data-role="' + id + '"]'));
      wires(lit, state.el);
    } else {
      var ids = state.el.dataset.roles.split(" ");
      var litR = roles.filter(function (r) { return ids.indexOf(r.dataset.role) > -1; });
      chips.forEach(function (c) { c.classList.add(c === state.el ? "lit" : "dim"); });
      roles.forEach(function (r) { r.classList.add(litR.indexOf(r) > -1 ? "lit" : "dim"); });
      var p = map.querySelector(".rd-skill");
      p.querySelector("h3").textContent = state.el.firstElementChild.textContent;
      var n = +state.el.dataset.count;
      p.querySelector(".rd-meta").textContent = "Used in " + n + (n === 1 ? " role" : " roles");
      p.querySelector(".rd-where").textContent = state.el.dataset.where + ".";
      showPanel(p);
      wires(litR, state.el);
    }
  }

  function bind(el, type) {
    el.addEventListener("mouseenter", function () { if (!pinned) show({ type: type, el: el }); });
    el.addEventListener("mouseleave", function () { if (!pinned) show(null); });
    el.addEventListener("click", function () {
      pinned = pinned && pinned.el === el ? null : { type: type, el: el };
      roles.concat(chips).forEach(function (e) { e.setAttribute("aria-pressed", String(!!pinned && pinned.el === e)); });
      show(pinned);
    });
  }
  roles.forEach(function (r) { bind(r, "role"); });
  chips.forEach(function (c) { bind(c, "skill"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pinned) { pinned = null; roles.concat(chips).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); show(null); }
  });
  window.addEventListener("resize", function () { if (pinned) show(pinned); });
})();
