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

  // Section dots and header links follow the section in view. A section is
  // current once its top passes a line just below the sticky header. The hero
  // has no link, so it clears the underline. At the bottom of the page the last
  // section wins, since short sections can't reach the line.
  var links = document.querySelectorAll(".dots a, .bar nav a");
  var sections = ["top", "about", "experience", "capabilities", "photos", "works", "contact"]
    .map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var current = null, locked = null, lockTimer = 0, ticking = false;

  function setActive(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + id); });
    if (!hovered) restDot();
  }
  function sectionInView() {
    var line = document.querySelector(".bar").offsetHeight + window.innerHeight * 0.25;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      return sections[sections.length - 1].id;
    }
    var id = sections[0].id;
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) id = s.id; });
    return id;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (locked) {
        // Hold the clicked item while the smooth scroll runs; release once it settles.
        clearTimeout(lockTimer);
        lockTimer = setTimeout(function () { locked = null; setActive(sectionInView()); }, 150);
        return;
      }
      setActive(sectionInView());
    });
  }
  links.forEach(function (l) {
    l.addEventListener("click", function () {
      var id = l.getAttribute("href").slice(1);
      locked = id;
      setActive(id);
      clearTimeout(lockTimer);
      lockTimer = setTimeout(function () { locked = null; }, 1200);
    });
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

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
  }
  setActive(sectionInView());
})();

(function () {
  // Experience: skill spokes. Categories form the inner ring; each skill is a spoke
  // with one dot per organization that used it. Organizations are never ordered by date.
  var root = document.querySelector(".orbit");
  if (!root) return;
  var data = JSON.parse(document.getElementById("orbit-data").textContent);
  var svg = document.getElementById("orbit");
  var NS = "http://www.w3.org/2000/svg", TAU = Math.PI * 2;
  var panels = [].slice.call(root.querySelectorAll(".orbit-panel .rd"));
  var chips = [].slice.call(root.querySelectorAll(".orbit-chips button"));
  var orgName = {};
  data.orgs.forEach(function (o) { orgName[o.id] = o.name; });

  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pol(r, a) { return [r * Math.sin(a), -r * Math.cos(a)]; }
  function arc(r0, r1, a0, a1) {
    var p0 = pol(r1, a0), p1 = pol(r1, a1), p2 = pol(r0, a1), p3 = pol(r0, a0), big = a1 - a0 > Math.PI ? 1 : 0;
    return "M" + p0 + " A" + r1 + "," + r1 + " 0 " + big + " 1 " + p1 + " L" + p2 + " A" + r0 + "," + r0 + " 0 " + big + " 0 " + p3 + " Z";
  }

  // Dots stack outward in a fixed order: organizations with the most skills sit closest to the ring.
  var total = 0, breadth = {};
  data.cats.forEach(function (c) { c.skills.forEach(function (s) { total++; s.roles.forEach(function (r) { breadth[r] = (breadth[r] || 0) + 1; }); }); });
  var rank = data.orgs.map(function (o) { return o.id; }).sort(function (a, b) { return breadth[b] - breadth[a]; });

  var dots = [], labels = [], spokes = [], acc = 0, n = 0;
  data.cats.forEach(function (c, ci) {
    var span = c.skills.length / total * TAU, a0 = acc, mid = a0 + span / 2;
    acc += span;
    svg.appendChild(el("path", { "class": "o-cat", d: arc(96, 146, a0 + 0.01, a0 + span - 0.01), style: "opacity:" + (ci % 2 ? 0.78 : 1) }));
    if (span > 0.36) {
      var lp = pol(121, mid), t = el("text", { "class": "o-cat-lab", x: lp[0], y: lp[1] + 3.5 });
      t.textContent = c.short;
      svg.appendChild(t);
    }
    c.skills.forEach(function (s, si) {
      var m = a0 + (si + 0.5) * span / c.skills.length, roles = s.roles.slice().sort(function (a, b) { return rank.indexOf(a) - rank.indexOf(b); });
      var q0 = pol(154, m), q1 = pol(162 + roles.length * 9, m);
      var line = el("line", { "class": "o-spoke", x1: q0[0], y1: q0[1], x2: q1[0], y2: q1[1] });
      svg.appendChild(line);
      roles.forEach(function (r, k) {
        var p = pol(162 + k * 9, m);
        var d = el("circle", { "class": "o-dot", cx: p[0], cy: p[1], r: 3.2, "data-org": r, style: "--d:" + (n * 6 + k * 25) });
        svg.appendChild(d);
        dots.push(d);
      });
      var lp2 = pol(172 + roles.length * 9, m), deg = m * 180 / Math.PI, flip = m > Math.PI;
      var lab = el("text", { "class": "o-lab", x: lp2[0], y: lp2[1], dy: 3.5, "text-anchor": flip ? "end" : "start",
        transform: "rotate(" + (flip ? deg + 90 : deg - 90) + " " + lp2[0] + " " + lp2[1] + ")" });
      lab.textContent = s.name;
      svg.appendChild(lab);
      var hit = el("path", { "class": "o-hit", d: arc(150, 250, a0 + si * span / c.skills.length, a0 + (si + 1) * span / c.skills.length) });
      hit.addEventListener("mouseenter", function () { showSkill(s, c, lab, line); });
      hit.addEventListener("mouseleave", function () { if (!pinned) restore(); });
      hit.addEventListener("click", function () { pinned = pinned === s ? null : s; pinned ? showSkill(s, c, lab, line) : restore(); });
      svg.appendChild(hit);
      labels.push(lab);
      spokes.push(line);
      n++;
    });
  });
  var c1 = el("text", { "class": "o-center", y: 4 }), c2 = el("text", { "class": "o-center2", y: 24 });
  svg.appendChild(c1);
  svg.appendChild(c2);

  var org = null, pinned = null;
  function showPanel(p) { panels.forEach(function (x) { x.hidden = x !== p; }); }
  function clearMarks() {
    labels.forEach(function (l) { l.classList.remove("on"); });
    spokes.forEach(function (l) { l.classList.remove("on"); });
  }
  function center() {
    if (org) {
      var count = dots.filter(function (d) { return d.getAttribute("data-org") === org; }).length;
      c1.textContent = orgName[org];
      c2.textContent = count + " skills";
    } else {
      c1.textContent = total + " skills";
      c2.textContent = data.orgs.length + " organizations";
    }
  }
  function restore() {
    clearMarks();
    showPanel(root.querySelector(org ? '.rd[data-org="' + org + '"]' : ".rd-default"));
  }
  function showSkill(s, c, lab, line) {
    clearMarks();
    lab.classList.add("on");
    line.classList.add("on");
    var p = root.querySelector(".rd-skill");
    p.querySelector("h3").textContent = s.name;
    p.querySelector(".rd-meta").textContent = c.name + ", used at " + s.roles.length + (s.roles.length === 1 ? " organization" : " organizations");
    p.querySelector(".rd-orgs").innerHTML = "";
    s.roles.map(function (r) { return orgName[r]; }).sort().forEach(function (name) {
      var li = document.createElement("li");
      li.textContent = name;
      p.querySelector(".rd-orgs").appendChild(li);
    });
    showPanel(p);
  }
  function selectOrg(id) {
    org = id || null;
    pinned = null;
    chips.forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-org") || null) === org)); });
    dots.forEach(function (d) {
      var mine = d.getAttribute("data-org") === org;
      d.classList.toggle("fade", !!org && !mine);
      d.classList.toggle("hot", !!org && mine);
    });
    center();
    restore();
  }
  chips.forEach(function (b) { b.addEventListener("click", function () { selectOrg(b.getAttribute("data-org")); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && (org || pinned)) selectOrg(null); });

  // Play the dot entrance once, when the chart scrolls into view.
  root.classList.add("pending");
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    root.classList.remove("pending");
    root.classList.add("play");
    io.disconnect();
  }, { threshold: 0.25 });
  io.observe(svg);
  selectOrg(null);
})();
