// Neural-network-to-gears animation on the Research page. The art is driven by
// how far the box has scrolled through the viewport instead of by a slider.
function mix(a, b, t) {
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  var p = hex(a), q = hex(b);
  return "#" + p.map(function (v, i) { var r = Math.round(v + (q[i] - v) * t); return (r < 16 ? "0" : "") + r.toString(16); }).join("");
}
function F(v) { return (+v).toFixed(1); }
function gearPath(cx, cy, n, rOut, rIn, phase) {
  var step = (Math.PI * 2) / n, tipH = 0.12 * step, rootH = 0.33 * step, h = rOut - rIn;
  var cR = rIn + 0.62 * h, cH = tipH + 0.6 * (rootH - tipH);
  function P(r, a) { return F(cx + r * Math.cos(a)) + " " + F(cy + r * Math.sin(a)); }
  var d = "";
  for (var i = 0; i < n; i++) {
    var a = phase + i * step;
    if (i === 0) d += "M" + P(rIn, a - rootH);
    d += " Q" + P(cR, a - cH) + " " + P(rOut, a - tipH);
    d += " A" + F(rOut) + " " + F(rOut) + " 0 0 1 " + P(rOut, a + tipH);
    d += " Q" + P(cR, a + cH) + " " + P(rIn, a + rootH);
    d += " A" + F(rIn) + " " + F(rIn) + " 0 0 1 " + P(rIn, a + step - rootH);
  }
  return d + " Z";
}
function circlePath(cx, cy, r) {
  return "M" + F(cx - r) + " " + F(cy) + " a" + F(r) + " " + F(r) + " 0 1 0 " + F(2 * r) + " 0 a" + F(r) + " " + F(r) + " 0 1 0 " + F(-2 * r) + " 0 Z";
}

// Site colors: yellow and two blues for the gears, the link blue for the network.
var PAL = { bg: '#f4f7fb', bone: '#7fa6d4', brass: '#ffcc33', copper: '#2360a1', accent: '#2360a1' };

// Fixed layout: a symmetric 5-7-7-7-7-7-7-7-5 fully connected network, with gears centred on some of its nodes.
// Each gear: [node index, teeth, pitch radius, tooth height, phase, direction, speed ratio, colour].
var GEARS = [[2,23,134.922,17.692,5.5641,1,1,"#ffcc33"],[6,22,129.056,17.692,2.094,-1,1.04545,"#7fa6d4"],[14,10,58.662,17.692,3.9414,1,2.3,"#2360a1"],[9,9,52.796,17.692,4.0052,-1,2.55556,"#7fa6d4"],[4,14,82.126,17.692,4.6595,-1,1.64286,"#7fa6d4"],[12,10,58.662,17.692,2.5529,1,2.3,"#2360a1"],[16,17,99.725,17.692,3.054,1,1.35294,"#2360a1"],[24,15,87.993,17.692,3.7038,-1,1.53333,"#7fa6d4"],[22,15,87.993,17.692,2.3592,-1,1.53333,"#ffcc33"],[56,23,134.922,17.692,4.1982,1,1,"#2360a1"],[49,9,52.796,17.692,0.5146,-1,2.55556,"#ffcc33"],[52,22,129.056,17.692,5.3784,-1,1.04545,"#7fa6d4"],[44,10,58.662,17.692,0.4857,1,2.3,"#2360a1"],[37,16,93.859,17.692,6.176,-1,1.4375,"#7fa6d4"],[46,10,58.662,17.692,5.3803,1,2.3,"#2360a1"],[54,14,82.126,17.692,1.7423,-1,1.64286,"#7fa6d4"],[42,17,99.725,17.692,6.3804,1,1.35294,"#2360a1"],[30,10,58.662,17.692,6.1405,1,2.3,"#2360a1"],[35,9,52.796,17.692,6.0996,-1,2.55556,"#ffcc33"],[28,17,99.725,17.692,2.6844,1,1.35294,"#2360a1"],[34,9,52.796,17.692,1.2307,1,2.55556,"#7fa6d4"],[20,15,87.993,17.692,0.7716,-1,1.53333,"#7fa6d4"]];
function makeLayout() {
  var COUNTS = [5, 7, 7, 7, 7, 7, 7, 7, 5], X0 = 170, X1 = 1430, DY = 110;
  var cols = COUNTS.map(function (c, li) {
    var x = X0 + (li * (X1 - X0)) / (COUNTS.length - 1), top = 450 - ((c - 1) * DY) / 2, out = [];
    for (var i = 0; i < c; i++) out.push({ x: x, y: top + i * DY, gear: null });
    return out;
  });
  var nodes = [].concat.apply([], cols), links = [];
  for (var li = 0; li + 1 < cols.length; li++)
    cols[li].forEach(function (a) { cols[li + 1].forEach(function (b) { links.push({ a: a, b: b }); }); });
  var gears = GEARS.map(function (r) {
    var nd = nodes[r[0]], h = r[3];
    var g = { node: nd, x: nd.x, y: nd.y, n: r[1], pr: r[2], h: h, rOut: r[2] + 0.45 * h, rIn: r[2] - 0.55 * h, phase: r[4], dir: r[5], ratio: r[6], base: r[7] };
    nd.gear = g;
    return g;
  });
  return { gears: gears, nodes: nodes, links: links };
}

// s: 0 = all neural, 1 = all mechanical. Returns per-element visual state.
function frame(layout, s, accent) {
  accent = accent || PAL.accent;
  var W = 500;                         // width of the morphing band
  var B = -W + s * (1600 + 2 * W);     // boundary: mechanical to its left, neural to its right
  function m(x) { var u = Math.max(0, Math.min(1, (x - B) / W + 0.5)); return u * u * (3 - 2 * u); }
  function early(e) { var u = Math.min(1, e / 0.3); return u * u * (3 - 2 * u); }
  var NODE_R = 18;
  var turn = s * Math.PI * 2 * 1.6;    // root gear rotation across the full scroll

  var gears = layout.gears.map(function (g) {
    var e = m(g.x);
    var ang = g.phase + g.dir * g.ratio * turn;
    var R = g.pr + (NODE_R - g.pr) * e;
    var h = g.h * Math.pow(1 - e, 1.3) * Math.sqrt(R / g.pr);
    // Wash toward white mid-morph so yellow-to-blue blends don't turn olive.
    var t = Math.min(1, e * 1.15);
    var fill = mix(mix(g.base, accent, t), "#ffffff", 0.55 * Math.sin(Math.PI * t));
    var bore = g.rIn * (g.n <= 9 ? 0.33 : 0.5) * Math.pow(1 - e, 1.6);
    var boreD = bore > 0.5 ? " " + circlePath(g.x, g.y, bore) : "";
    var rIn = R - 0.55 * h;
    var ring = bore + Math.max(0, (rIn - bore) * 0.45);
    return {
      d: (h > 0.6 ? gearPath(g.x, g.y, g.n, R + 0.45 * h, rIn, ang) : circlePath(g.x, g.y, R)) + boreD,
      fill: fill,
      hubD: circlePath(g.x, g.y, ring) + boreD, hub: mix(fill, PAL.bg, 0.2), hubO: Math.pow(1 - e, 1.5) * 0.9,
      halo: { x: g.x, y: g.y, r: R + 11, o: 0.2 * Math.pow(e, 3) }
    };
  });
  var free = layout.nodes.filter(function (n) { return !n.gear; }).map(function (n) {
    var e = m(n.x);
    return { x: n.x, y: n.y, r: NODE_R * e, o: 0.2 * e, fill: accent };
  });
  var links = layout.links.map(function (l) {
    // A gear's end of a link is ready early (it starts losing mesh as soon as it shrinks);
    // a plain node's end is only ready as that node grows in. So gear-to-gear links appear first.
    function ready(n) { var e = m(n.x); return n.gear ? early(e) : Math.pow(e, 1.5); }
    var e = Math.min(ready(l.a), ready(l.b));
    return { x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y, o: 0.45 * e };
  });
  return { gears: gears, free: free, links: links };
}

(function () {
  if (!document.getElementById("art")) return;
  var NS = "http://www.w3.org/2000/svg";
  function el(parent, tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }
  // Background tactic script (static).
  var stock = ["rewrite (mem_load_ok m a 8).", "eapply step_seq; [solve_step |].", "unfold riscv_exec; simpl.", "destruct (Z.ltb_spec off len).", "- apply asan_shadow_ok; lia.", "- exfalso; lia.", "rewrite word.unsigned_add.", "eapply run_ld; eauto.", "assert (Hinb : in_bounds sp).", "{ unfold in_bounds; lia. }", "simpl_regs; repeat rewrite get_set.", "eapply step_seq; [solve_step |].", "rewrite (mem_store_ok m b 4).", "apply frame_preserved; auto.", "inversion Hstep; subst.", "eapply run_sd; eauto.", "solve_bounds.", "apply sep_comm in Hm.", "rewrite word.unsigned_sub.", "eapply step_seq; [solve_step |].", "destruct (rb_balanced t) as [h Hh].", "apply depth_log2; lia.", "simpl_regs; reflexivity."];
  var script = document.getElementById("script");
  // Each column repeats every 23 lines (575px), with an extra period above and below so it can scroll and wrap seamlessly.
  var PERIOD = stock.length, LINE = 25, SPAN = PERIOD * LINE;
  var scriptCols = [0, 3, 8, 11].map(function (cs, ci) {
    var g = el(script, "g", {});
    for (var i = -PERIOD; i < 36 + PERIOD; i++) {
      var k = ((i % PERIOD) + PERIOD) % PERIOD;
      var t = el(g, "text", { x: 28 + ci * 409, y: 36 + i * LINE, opacity: (0.55 + ((k * 13 + cs * 3) % 7) / 14).toFixed(2) });
      t.textContent = (((k + cs) % 4 === 0) ? "" : "  ") + stock[(k * 7 + cs * 5) % PERIOD];
    }
    return g;
  });
  function scrollScript(s) {
    var off = (s * 2 * SPAN) % SPAN;           // two full periods of travel across the full scroll
    scriptCols.forEach(function (g, ci) {
      g.setAttribute("transform", "translate(0 " + (ci % 2 === 0 ? off : -off).toFixed(1) + ")");   // 1st & 3rd down, 2nd & 4th up
    });
  }

  var gLinks = document.getElementById("links"), gFree = document.getElementById("free"), gGears = document.getElementById("gears");
  var art = document.getElementById("art");
  var layout, linkEls, freeEls, gearEls;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function build() {
    layout = makeLayout();
    [gLinks, gFree, gGears].forEach(function (g) { g.textContent = ""; });
    linkEls = layout.links.map(function (l) {
      return el(gLinks, "line", { x1: F(l.a.x), y1: F(l.a.y), x2: F(l.b.x), y2: F(l.b.y), stroke: PAL.accent, "stroke-width": 3.5 });
    });
    freeEls = layout.nodes.filter(function (n) { return !n.gear; }).map(function (n) {
      return { halo: el(gFree, "circle", { cx: F(n.x), cy: F(n.y), fill: PAL.accent }), core: el(gFree, "circle", { cx: F(n.x), cy: F(n.y), fill: PAL.accent }) };
    });
    gearEls = layout.gears.map(function (g) {
      var grp = el(gGears, "g", {});
      return {
        halo: el(grp, "circle", { cx: F(g.x), cy: F(g.y) }),
        body: el(grp, "path", { "fill-rule": "evenodd" }),
        hub: el(grp, "path", { "fill-rule": "evenodd" })
      };
    });
    update();
  }

  // 0 until the whole box is on screen (or the page is at the top),
  // 1 once the top of the box reaches the top of the window.
  function progress() {
    if (reduceMotion) return 1;
    var r = art.getBoundingClientRect(), y = window.scrollY;
    var start = Math.max(0, r.bottom + y - window.innerHeight), end = r.top + y;
    if (end <= start) return y >= end ? 1 : 0;
    return Math.max(0, Math.min(1, (y - start) / (end - start)));
  }

  function draw(v) {                           // 0 = all mechanical, 1 = all neural
    scrollScript(v);
    var f = frame(layout, 1 - v);
    f.links.forEach(function (l, i) {
      linkEls[i].setAttribute("stroke-opacity", l.o.toFixed(3));
      linkEls[i].style.display = l.o < 0.002 ? "none" : "";
    });
    f.free.forEach(function (n, i) {
      var e = freeEls[i], show = n.r > 0.05;
      e.core.style.display = e.halo.style.display = show ? "" : "none";
      if (!show) return;
      e.core.setAttribute("r", F(n.r));
      e.halo.setAttribute("r", F(n.r + 11));
      e.halo.setAttribute("fill-opacity", n.o.toFixed(3));
    });
    f.gears.forEach(function (g, i) {
      var e = gearEls[i];
      e.halo.setAttribute("r", F(g.halo.r));
      e.halo.setAttribute("fill", g.fill);
      e.halo.setAttribute("fill-opacity", g.halo.o.toFixed(3));
      e.body.setAttribute("d", g.d);
      e.body.setAttribute("fill", g.fill);
      e.hub.setAttribute("d", g.hubD);
      e.hub.setAttribute("fill", g.hub);
      e.hub.setAttribute("fill-opacity", g.hubO.toFixed(3));
    });
  }

  var pending = false;
  function update() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; draw(1 - progress()); });   // starts neural, ends mechanical
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  build();
})();
