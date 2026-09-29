(function () {
  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  var me = document.querySelector(".hero .portrait img");

  // Entrance: start once the portrait has decoded so the sequence plays as one piece.
  function go() { requestAnimationFrame(function () { root.classList.add("ready"); }); }
  if (!me || me.complete) { go(); } else { me.addEventListener("load", go); me.addEventListener("error", go); }
  setTimeout(go, 1500);

  // Capabilities: on wide screens they sit on an arc concentric with the portrait, in evenly spaced
  // rows, with a faint rail drawn along the arc. At 900px and below they fall back to a plain list.
  var stage = hero.querySelector(".hero-stage");
  var portrait = stage.querySelector(".portrait"), rail = stage.querySelector(".hero-rail");
  var orbs = [].slice.call(stage.querySelectorAll(".fan-orb"));
  var SPAN = 64 * Math.PI / 180, railDrawn = false;
  var motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
  function layoutFan() {
    rail.textContent = "";
    if (window.innerWidth <= 900) { hero.classList.add("fanned"); return; }
    var W = stage.clientWidth, H = stage.clientHeight, pr = portrait.offsetWidth / 2;
    var cx = portrait.offsetLeft + pr, cy = H / 2, ball = orbs[0].querySelector(".fan-ball").offsetWidth, n = orbs.length;
    var labelW = Math.max.apply(null, orbs.map(function (o) { return o.querySelector(".fan-lbl").offsetWidth; }));
    // Largest radius that keeps the widest label inside the stage and the arc inside its height.
    var byW = (W - cx - ball / 2 - 14 - labelW) / Math.cos(Math.asin(Math.sin(SPAN) / (n - 1)));
    var byH = (H / 2 - ball / 2 - 4) / Math.sin(SPAN);
    var R = Math.max(pr + 70, Math.min(pr + 150, byW, byH)), ym = R * Math.sin(SPAN);
    orbs.forEach(function (o, i) {
      var a = Math.asin((-ym + i * (2 * ym / (n - 1))) / R);
      o.parentNode.style.transform = "translate(" + (cx + R * Math.cos(a) - ball / 2) + "px," + (cy + R * Math.sin(a) - o.offsetHeight / 2) + "px)";
    });
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M" + (cx + R * Math.cos(SPAN)) + "," + (cy - ym) + " A" + R + "," + R + " 0 0 1 " + (cx + R * Math.cos(SPAN)) + "," + (cy + ym));
    rail.appendChild(path);
    if (!railDrawn && motion.matches) {
      var L = path.getTotalLength();
      path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 1s cubic-bezier(.3, .7, .2, 1) .5s";
      path.style.strokeDashoffset = 0;
      orbs.forEach(function (o, i) { o.style.transitionDelay = (0.7 + i * 0.07) + "s"; });
      setTimeout(function () { orbs.forEach(function (o) { o.style.transitionDelay = ""; }); }, 2200);
    }
    railDrawn = true;
    hero.classList.add("fanned");
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(layoutFan); });
  window.addEventListener("resize", layoutFan);

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
  var chipRow = root.querySelector(".orbit-chips"), chips = [].slice.call(chipRow.querySelectorAll("button"));
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
  var defs = el("defs", {});
  svg.appendChild(defs);
  data.cats.forEach(function (c, ci) {
    var span = c.skills.length / total * TAU, a0 = acc, mid = a0 + span / 2;
    acc += span;
    svg.appendChild(el("path", { "class": "o-cat", d: arc(96, 146, a0 + 0.01, a0 + span - 0.01), style: "opacity:" + (ci % 2 ? 0.78 : 1) }));
    // Label follows the ring. Bottom-half labels run the other way so they read upright.
    {
      var lower = mid > Math.PI / 2 && mid < Math.PI * 1.5;
      var s0 = pol(121, lower ? a0 + span : a0), s1 = pol(121, lower ? a0 : a0 + span);
      var guide = el("path", { id: "o-lab-" + ci, d: "M" + s0 + " A121,121 0 " + (span > Math.PI ? 1 : 0) + " " + (lower ? 0 : 1) + " " + s1 });
      defs.appendChild(guide);
      var t = el("text", { "class": "o-cat-lab", dy: 3.5 });
      var tp = el("textPath", { href: "#o-lab-" + ci, startOffset: "50%" });
      tp.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#o-lab-" + ci);
      tp.textContent = c.short;
      t.appendChild(tp);
      svg.appendChild(t);
      // Keep only labels that fit their arc with a little breathing room.
      if (t.getComputedTextLength() > span * 121 - 6) svg.removeChild(t);
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
    chipRow.classList.remove("skill");
    chips.forEach(function (b) { b.classList.remove("lit"); });
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
    // Light the chips for the organizations that used this skill, and dim the rest.
    chipRow.classList.add("skill");
    chips.forEach(function (b) { b.classList.toggle("lit", s.roles.indexOf(b.getAttribute("data-org")) >= 0); });
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
