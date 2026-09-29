#!/usr/bin/env python3
"""Render the site from data/*.json.

Writes layouts/index.html (the whole page; Hugo copies it through untouched),
static/llms.txt, and static/index.md. Photos live in static/img/.

Run from the repo root: python3 site/build.py
"""
import html
from collections import OrderedDict
import json
from pathlib import Path

HERE = Path(__file__).parent
P = json.loads((HERE / "data/profile.json").read_text())
G = json.loads((HERE / "data/engagements.json").read_text())
E = html.escape
ROOT = HERE.parent
SITE = P["site"]
LINKEDIN = next(l["url"] for l in P["links"] if l["name"] == "LinkedIn")

MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
MONTHS_LONG = ("January February March April May June July August September "
               "October November December").split()
KIND = {"keynote": "Keynote", "talk": "Talk", "workshop": "Workshop", "course": "Course",
        "podcast": "Podcast", "organizing": "Organizing", "press": "Press"}



def mon(d, long=False):
    if len(d) < 7:
        return ""
    return (MONTHS_LONG if long else MONTHS)[int(d[5:7]) - 1]


def span_of(x, long=False):
    """Length of a role, e.g. "6 yrs 11 mos". Empty when the role has no dates."""
    if not x.get("start"):
        return ""
    end = x["end"] or P["updated"][:7]
    months = (int(end[:4]) - int(x["start"][:4])) * 12 + int(end[5:7]) - int(x["start"][5:7]) + 1
    y, m = divmod(months, 12)
    parts = []
    if y:
        parts.append(f"{y} yr{'s' if y > 1 else ''}")
    if m:
        parts.append(f"{m} mo{'s' if m > 1 else ''}")
    return " ".join(parts)


def a(text, url, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<a href="{E(url)}"{c}>{E(text)}</a>' if url else E(text)


def title_of(e):
    return e["title"] or e["role"]


def by_year():
    out = OrderedDict()
    for e in G:
        out.setdefault(e["date"][:4], []).append(e)
    return out


YEARS = by_year()
FIRST_YEAR = min(YEARS)
LAST_ENGAGEMENT = G[0]


def jsonld():
    pid = SITE + "#person"
    person = {
        "@type": "Person", "@id": pid, "name": P["name"], "url": SITE,
        "image": SITE + "img/johnny-headshot-round.jpg",
        "description": P["summary"],
        "jobTitle": "Chief Technology Officer",
        "worksFor": {"@type": "Organization", "name": "Skilltype", "url": "https://www.skilltype.com/"},
        "affiliation": {"@id": SITE + "#idiomat"},
        "knowsAbout": P["knows_about"],
        "sameAs": [l["url"] for l in P["links"]],
        "hasCredential": [{"@type": "EducationalOccupationalCredential", "credentialCategory": "degree",
                           "name": d} for d in P["education"]],
    }
    org = {"@type": "Organization", "@id": SITE + "#idiomat", "name": "Idiomat",
           "url": "https://idiomat.co/", "founder": {"@id": pid},
           "description": "Software engineering training and consulting."}
    page = {"@type": "ProfilePage", "@id": SITE, "url": SITE, "mainEntity": {"@id": pid},
            "dateModified": P["updated"]}
    body = json.dumps({"@context": "https://schema.org", "@graph": [person, org, page]}, indent=1,
                      ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/ld+json">\n{body}\n</script>'


def head(fonts, css, extra=""):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Johnny Boursiquot</title>
<meta name="description" content="{E(P['summary'])}">
<link rel="alternate" type="text/markdown" href="index.md" title="This site as Markdown">
<link rel="icon" href="favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
{jsonld()}
<style>
{css}
</style>
{extra}</head>
"""


def count_public():
    return len(G)


# --------------------------------------------------------------------------------------------
# The page
# --------------------------------------------------------------------------------------------

ICONS = {
    "spark": '<path d="M10 4l1.9 5.1L17 11l-5.1 1.9L10 18l-1.9-5.1L3 11l5.1-1.9z"/><path d="M18 3v4M16 5h4M18.5 15.5v3M17 17h3"/>',
    "cloud": '<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18z"/>',
    "pulse": '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    "nodes": '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.2 7.3l2.6 8.4M15.8 7.3l-2.6 8.4M8.5 6h7"/>',
    "layers": '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    "people": '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
    "in": '<path d="M6.5 9.5V18M6.5 6.2v.1M10.5 18v-5a3 3 0 0 1 6 0v5M10.5 9.5V18"/>',
    "gh": '<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.7 4.7 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.3 4.3 0 0 0-.1 3.2A4.7 4.7 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    "x": '<path d="M4 4l16 16M20 4L4 20"/>',
    "shield": '<path d="M12 3l7 3v5.5c0 4.3-2.9 8.1-7 9.5-4.1-1.4-7-5.2-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
}


def icon(name, size=24):
    return (f'<svg class="i" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


def page():
    css = (HERE / "site.css").read_text()
    js = (HERE / "site.js").read_text()
    fonts = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
    D = "img/"
    linkedin = next(l["url"] for l in P["links"] if l["name"] == "LinkedIn")
    github = next(l["url"] for l in P["links"] if l["name"] == "GitHub")
    xurl = next(l["url"] for l in P["links"] if l["name"] == "X")
    caps = {c["id"]: c for c in P["capabilities"]}

    def orb(cid, cls):
        c = caps[cid]
        return (f'<a class="orb {cls}" href="#cap-{cid}" data-depth="{ {"o1": 18, "o2": 10, "o3": 24, "o4": 14, "o5": 16}[cls] }">'
                f'<span class="ball">{icon(c["icon"], 26)}</span><span class="lbl">{E(c["name"])}</span></a>')

    orgs = [x for x in P["experience"] if x["id"] != "earlier"]
    orgs_az = sorted(orgs, key=lambda x: x["org"].lower())
    short = {"Languages": "Languages", "Front End": "Front End", "Cloud & Delivery": "Cloud", "Architecture & APIs": "Arch & APIs",
             "Data": "Data", "Reliability & Observability": "Reliability", "AI": "AI", "Security & Compliance": "Security",
             "Leadership & Business": "Leadership", "Industries": "Industries"}
    nskills = sum(len(c["skills"]) for c in P["skillmap"])
    orbit_data = json.dumps({
        "cats": [{"name": c["name"], "short": short.get(c["name"], c["name"]),
                  "skills": [{"name": s["name"], "roles": s["roles"]} for s in c["skills"]]} for c in P["skillmap"]],
        "orgs": [{"id": x["id"], "name": x["org"]} for x in orgs],
    }, ensure_ascii=False).replace("</", "<\\/")

    def org_panel(x):
        bl = "".join(f"<li>{E(b)}</li>" for b in x["bullets"])
        tech = f'<p class="tech">{E(x["tech"])}</p>' if x["tech"] else ""
        via = f' <span class="via">via {E(x["via"])}</span>' if x.get("via") else ""
        meta = E(x["role"]) + (f", {span_of(x)}" if span_of(x) else "")
        return (f'<div class="rd" data-org="{x["id"]}" hidden><h3>{a(x["org"], x["url"])}{via}</h3>'
                f'<p class="rd-meta">{meta}</p><ul>{bl}</ul>{tech}</div>')

    chips = '<button type="button" data-org="" aria-pressed="true">All</button>' + "".join(
        f'<button type="button" data-org="{x["id"]}" aria-pressed="false">{E(x["org"])}</button>' for x in orgs_az)
    skillmap = f"""<div class="orbit">
  <div class="orbit-chips" role="group" aria-label="Show one organization">{chips}</div>
  <div class="orbit-grid">
    <div class="orbit-chart">
      <svg id="orbit" viewBox="-265 -265 530 530" role="img" aria-label="{nskills} skills in {len(P['skillmap'])} categories. Each spoke is a skill; each dot is an organization where I used it."></svg>
    </div>
    <div class="orbit-panel" aria-live="polite">
      <div class="rd rd-default"><h3>Skills and where I used them</h3>
        <p>Each spoke is a skill, and each dot on it is an organization where I used it, so longer spokes mean skills I've used in more places. Pick an organization to trace its dots around the ring, or hover a spoke.</p></div>
      <div class="rd rd-skill" hidden><h3></h3><p class="rd-meta"></p><ul class="rd-orgs"></ul></div>
      {"".join(org_panel(x) for x in orgs)}
    </div>
  </div>
  <script type="application/json" id="orbit-data">{orbit_data}</script>
</div>"""
    glance = f"""<dl class="facts">
      <div><dt>Community</dt><dd>GopherCon program chair</dd></div>
      <div><dt>Education</dt><dd>{E(P["education_short"][0])}<br>{E(P["education_short"][1])}</dd></div>
      <div><dt>Published</dt><dd>Contributing author, 97 Things Every SRE Should Know</dd></div>
      <div><dt>Keynotes</dt><dd>QCon Plus 2020; GopherCon 2019 and 2021</dd></div>
      <div><dt>Trainer</dt><dd>GopherCon workshops nearly every year since 2021: Advanced Go, serverless architectures, and agentic systems</dd></div>
    </dl>"""
    capl = "".join(
        f'<li id="cap-{c["id"]}"><span class="ball">{icon(c["icon"])}</span><div><h3>{E(c["name"])}</h3>'
        f'<p>{E(c["body"])}</p></div></li>' for c in P["capabilities"])
    stack = "".join(f'<div><dt>{E(s["area"])}</dt><dd>{"".join(f"<span>{E(t.strip())}</span>" for t in s["items"].replace("AWS: ", "").split(","))}</dd></div>'
                    for s in P["stack"])
    photos = "".join(
        f'<figure class="ph {ph["size"]}"><img src="{D}{ph["src"]}" alt="{E(ph["alt"])}" loading="lazy" style="object-position: {ph.get("pos", "50% 50%")}"><figcaption>{E(ph["cap"])}</figcaption></figure>'
        for ph in P["photos"])
    keys = "".join(
        f'<li><span class="yr">{k["date"][:4]}</span><span>{a(k["title"], k["url"])}<small>{E(k["venue"])}</small></span></li>'
        for k in P["keynotes"])
    arch = "".join(
        f'<li><time datetime="{e["date"]}">{mon(e["date"])} {e["date"][:4]}</time><span>{KIND[e["type"]]}, {E(e["venue"])}</span>{a(title_of(e), e["url"])}</li>'
        for e in G)
    about = "".join(f"<p>{E(x)}</p>" for x in P["about_1p"])
    recent = "".join(
        f'<li><div class="rw-meta"><span class="rw-kind">{E(w["kind"])}</span><time>{E(w["when"])}</time></div>'
        f'<h4>{a(w["title"], w["url"])}</h4><p class="rw-where">{E(w["where"])}</p><p>{E(w["note"])}</p>'
        f'{"<a class=rw-code href=" + chr(34) + w["code"] + chr(34) + ">" + icon("gh", 15) + "Code</a>" if w["code"] else ""}</li>'
        for w in P["recent_work"])
    oss = "".join(f'<li><a href="{r["url"]}">{icon("gh", 16)}<span class="oss-name">{E(r["name"])}</span></a><span class="oss-desc">{E(r["desc"])}</span></li>'
                  for r in P["repos"])

    body = f"""<body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
  <a class="mark" href="#top" aria-label="Johnny Boursiquot, home">JB<span>.</span></a>
  <nav aria-label="Sections">
    <a href="#about">About</a><a href="#experience">Experience</a><a href="#capabilities">Capabilities</a><a href="#photos">On Stage</a><a href="#works">Works</a><a href="#contact">Contact</a>
    <span class="nav-line" aria-hidden="true"></span>
  </nav>
  <div class="actions">
    <a class="round alt" href="{github}" aria-label="GitHub profile">{icon("gh", 20)}</a>
    <a class="round" href="{linkedin}" aria-label="LinkedIn profile">{icon("in", 20)}</a>
  </div>
</header>
<main id="main">
<section class="hero" id="top">

  <div class="disc" aria-hidden="true"></div>
  <figure class="portrait"><img src="{D}johnny-headshot-round.jpg" alt="Johnny Boursiquot smiling, in glasses, a striped collar, and a navy sweater" width="1200" height="1200"></figure>
  <div class="card name" data-depth="8">
    <p class="hello">Hello, I'm</p>
    <h1>Johnny Boursiquot</h1>
  </div>
  <div class="card role" data-depth="12">
    <p><strong>Experienced software engineer and professional maker</strong></p>
    <p>Over two decades of building software</p>
  </div>
  {orb("ai", "o1")}
  <a class="orb big" href="#cap-dist" data-depth="6"><span class="ball">{icon("nodes", 72)}</span><span class="lbl">Distributed Systems</span></a>
  {orb("sre", "o2")}
  {orb("cloud", "o3")}
  {orb("sec", "o5")}
</section>
<nav class="dots" aria-label="Page sections">
  <a href="#top" aria-label="Top" class="on"></a><a href="#about" aria-label="About"></a><a href="#experience" aria-label="Experience"></a><a href="#capabilities" aria-label="Capabilities"></a><a href="#photos" aria-label="On Stage"></a><a href="#works" aria-label="Works"></a><a href="#contact" aria-label="Contact"></a>
</nav>

<section class="wrap about" id="about">
  <figure class="about-photo"><img src="{D}about-stage.jpg" alt="Johnny smiling, seated on stage during a GopherCon 2026 conversation" loading="lazy"></figure>
  <div>
    <h2>About</h2>
    {about}
  </div>
</section>

<section class="wrap" id="experience">
  <h2>Experience</h2>
  {skillmap}
  {glance}
</section>

<section class="band" id="capabilities">
  <div class="wrap">
    <h2>Capabilities</h2>
    <ul class="caps">{capl}</ul>
    <h3 class="stack-h">Stack</h3>
    <dl class="stack">{stack}</dl>
  </div>
</section>

<section class="wrap" id="photos">
  <h2>On Stage and at Work</h2>
  <div class="mosaic">{photos}</div>
</section>

<section class="wrap public" id="works">
  <h2>Works</h2>
  <p class="sub">Recent talks, workshops, and open source. The full record goes back to {FIRST_YEAR}.</p>
  <ol class="recent">{recent}</ol>
  <h3 class="oss-h">Open source</h3>
  <ul class="oss">{oss}</ul>
  <div class="earlier-work">
    <h3>Earlier highlights</h3>
    <p>Contributing author, <a href="{P['writing'][0]['url']}">97 Things Every SRE Should Know</a> (O'Reilly). Keynotes at <a href="https://www.infoq.com/presentations/sre-build-trust/">QCon Plus 2020</a> and GopherCon <a href="https://www.youtube.com/watch?v=_Pc0bzz4-gM">2019</a> and <a href="https://www.youtube.com/watch?v=PAUjYyBfELk">2021</a>. Host of <a href="{P['writing'][1]['url']}">Go Time</a> through its final episode in December 2024. Courses on <a href="{P['courses'][0]['url']}">LinkedIn Learning</a>, O'Reilly, and <a href="{P['courses'][1]['url']}">Packt</a>.</p>
  </div>
  <details class="all"><summary>Full public record since {FIRST_YEAR} ({count_public()} entries)</summary><ol class="log">{arch}</ol></details>
</section>

<section class="contact" id="contact">
  <div class="wrap">
    <h2>Contact</h2>
    <p>The best way to reach me is a message on LinkedIn.</p>
    <div class="cta">
      <a class="btn" href="{linkedin}">{icon("in", 18)} Message me on LinkedIn</a>
    </div>
  </div>
</section>
</main>
<footer class="wrap foot"><p>&copy; 2026 Johnny Boursiquot.</p><p>Also as <a href="index.md">Markdown</a> and <a href="llms.txt">llms.txt</a>.</p></footer>
<script>
{js}
</script>
</body>
</html>
"""
    return head(fonts, css, '<link rel="preload" as="image" href="img/johnny-headshot-round.jpg">\n'
                            '<script>document.documentElement.classList.add("js")</script>\n') + body


# --------------------------------------------------------------------------------------------
# LLM-friendly outputs
# --------------------------------------------------------------------------------------------

def facts():
    return [
        "Roles, most recent first, with length: " + "; ".join(f"{x['role']}, {x['org']}" + (f" via {x['via']}" if x.get('via') else "") + (f" ({span_of(x)})" if span_of(x) else "") for x in P["experience"] if x["url"]) + ".",
        "Founder of Idiomat LLC, a software engineering training and consulting company (https://idiomat.co/).",
        "Software engineer for over two decades; earlier roles before MAARK are not listed.",
        "GopherCon: program chair; workshop instructor at GopherCon US, EU, and Singapore (most recently August 2026); closing keynotes 2019 and 2021; emcee 2024 and 2026.",
        "Go Time podcast (Changelog Media): host, 2017 to December 2024. The show ended with its final episode in December 2024; he is no longer hosting a podcast.",
        "Contributing author, 97 Things Every SRE Should Know (O'Reilly).",
        f"Most recent public engagements: {mon(LAST_ENGAGEMENT['date'], True)} {LAST_ENGAGEMENT['date'][:4]} at {LAST_ENGAGEMENT['venue']} (" + "; ".join(f"{e['role'].lower()}: {title_of(e)}" if e['title'] else e['role'].lower() for e in G if e['date'] == LAST_ENGAGEMENT['date']) + ").",
        "Education: " + "; ".join(P["education"]) + ".",
    ]


def llms_txt():
    L = [f"# {P['name']}", "", f"> {P['summary']}", "",
         f"Last updated: {P['updated']}. Contact: message on LinkedIn ({LINKEDIN}).", "",
         "Focus areas: AI systems (LLM-powered and agentic features in production), cloud architecture, distributed and data systems, reliability engineering, and engineering leadership.", "",
         "Facts, with dates where they matter:", ""]
    L += [f"- {f}" for f in facts()]
    L += ["", "## Profile", "",
          f"- [Full profile]({SITE}index.md): bios, work history, stack, training catalog, and the complete engagement archive in Markdown",
          f"- [Website]({SITE}): the same content as HTML", ""]
    L += ["## Experience", ""]
    L += [f"- [{x['org']}]({x['url'] or SITE}): {x['role']}" + (f", {span_of(x)}" if span_of(x) else "") + f". {x['what']}" for x in P["experience"]]
    L += ["", "## Workshops and courses", ""]
    L += [f"- [{w['title']}]({w['url'] or SITE + 'index.md#workshops'}): {w['length']}; for: {w['audience']}; last delivered {w['last']}"
          for w in P["workshops"]]
    L += [f"- [{c['title']}]({c['url']}): recorded course, {c['where']}" for c in P["courses"]]
    L += ["", "## Keynotes", ""]
    L += [f"- [{k['title']}]({k['url']}): {k['venue']}, {mon(k['date'], True)} {k['date'][:4]}" for k in P["keynotes"]]
    L += ["", "## Writing and podcasts", ""]
    L += [f"- [{w['title']}]({w['url']}): {w['role']}, {w['where']}" for w in P["writing"]]
    L += ["", "## Elsewhere", ""]
    L += [f"- [{l['name']}]({l['url']})" for l in P["links"]]
    L += ["", "## Optional", "",
          f"- [Engagement archive]({SITE}index.md#archive): all {count_public()} public talks, workshops, courses, and podcast episodes since {FIRST_YEAR}",
          f"- [Headshot]({SITE}img/johnny-headshot-round.jpg): 1200x1200 JPEG, free to use with bios", ""]
    return "\n".join(L)


def index_md():
    L = [f"# {P['name']}", "", P["summary"], "",
         f"Last updated: {P['updated']}. Contact: message on LinkedIn ({LINKEDIN}). Website: {SITE}", "", "## Facts", ""]
    L += [f"- {f}" for f in facts()]
    L += ["", "## Now", ""]
    L += [f"- **{n['org']}** ({n['url']}), {n['role']}. {n['what']}" for n in P["now"]]
    L += ["", "## Work history", "", "Most recent first, with length of each role. Some roles overlapped.", ""]
    dmap = {d["id"]: d["name"] for d in P["domains"]}
    for x in P["experience"]:
        L += [f"### {x['org']}" + (f" (via {x['via']})" if x.get("via") else "") + f": {x['role']}" + (f" ({span_of(x)})" if span_of(x) else ""), ""] + [f"- {b}" for b in x["bullets"]]
        if x["tech"]:
            L += [f"- Technologies: {x['tech']}"]
        L += [""]
    L += ["", "## Skills by role", ""]
    rm = {x["id"]: x for x in P["experience"]}
    for cat in P["skillmap"]:
        L += [f"### {cat['name']}", ""]
        L += [f"- {sk['name']}: " + ", ".join(rm[r]["org"] for r in sorted(sk["roles"], key=lambda r: rm[r]["start"], reverse=True)) for sk in cat["skills"]]
        L += [""]
    L += ["## Stack", ""]
    L += [f"- {s['area']}: {s['items']}" for s in P["stack"]]
    L += ["", "## Workshops", "", f"Team training topics: {P['training_topics']}", "",
          "| Workshop | Length | For | Last delivered |", "|---|---|---|---|"]
    L += [f"| {('[' + w['title'] + '](' + w['url'] + ')') if w['url'] else w['title']} | {w['length']} | {w['audience']} | {w['last']} |"
          for w in P["workshops"]]
    L += ["", "Recorded courses:", ""]
    L += [f"- [{c['title']}]({c['url']}), {c['where']}{' ' + c['year'] if c['year'] else ''}" for c in P["courses"]]
    L += ["", "## Keynotes", ""]
    L += [f"- {mon(k['date'], True)} {k['date'][:4]}, {k['venue']}: [{k['title']}]({k['url']})" for k in P["keynotes"]]
    L += ["", "## Writing and podcasts", ""]
    L += [f"- [{w['title']}]({w['url']}): {w['role']}, {w['where']}" for w in P["writing"]]
    L += ["", "## Community", ""]
    L += [f"- {c['name']} ({c['url']}): {c['role']}{' (former)' if c['former'] else ''}" for c in P["community"]]
    L += ["", "## Education and certifications", ""]
    L += [f"- {x}" for x in P["education"] + P["certifications"]]
    L += ["", "## Bios", "", "Either bio may be quoted as-is.", "", "### General", "", P["bio_general"], "",
          "### Go community", "", P["bio_go"], "",
          f"Headshot: {SITE}img/johnny-headshot-round.jpg", ""]
    L += ["## Archive", "", f"All public engagements since {FIRST_YEAR}, newest first.", ""]
    for y, es in YEARS.items():
        L += [f"### {y}", "", "| Month | Kind | Role | Where | What |", "|---|---|---|---|---|"]
        for e in es:
            t = title_of(e).replace("|", "\\|")
            what = f"[{t}]({e['url']})" if e["url"] else t
            where = e["venue"] + (f", {e['place']}" if e["place"] else "")
            L.append(f"| {mon(e['date'], True)} | {KIND[e['type']]} | {e['role']} | {where} | {what} |")
        L.append("")
    L += ["## Links", ""] + [f"- {l['name']}: {l['url']}" for l in P["links"]] + [""]
    return "\n".join(L)


def main():
    (ROOT / "layouts/index.html").write_text(page())
    (ROOT / "static/llms.txt").write_text(llms_txt())
    (ROOT / "static/index.md").write_text(index_md())
    print("built", len(G), "engagements,", len(YEARS), "years")


if __name__ == "__main__":
    main()
