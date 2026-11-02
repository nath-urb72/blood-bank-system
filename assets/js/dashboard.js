/* ==========================================================================
   Blood Bank - Dashboard script

   Makes the Dashboard page interactive and fills it with live numbers.

   Contents
   1.  Settings + data
   2.  Small helpers
   3.  Styles (injected into <head>)
   4.  Build the controls
   5.  Blood type chart
   6.  Total bags counter
   7.  Component meters
   8.  Detail dialogs
   9.  Loading live statistics
   10. Public API (window.BloodBankDashboard)
   11. Start-up
   ========================================================================== */
(function () {
  "use strict";

  const section = document.getElementById("dashboard");
  if (!section) return;


  /* ======================================================================
     1. SETTINGS + DATA
     ====================================================================== */

  /* A blood type is "low" when fewer than this many bags are in stock */
  const LOW_COUNT = 5;

  const ORDER = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const COMPONENT_NAMES = ["Red cells", "Plasma", "Platelets"];
  const STATUS_NAMES = ["Stored", "Testing", "Expired", "Used"];

  /* Numbers shown on the page (all zero until the server answers) */
  const data = {
    types:      { "A+": 0, "A-": 0, "B+": 0, "B-": 0, "AB+": 0, "AB-": 0, "O+": 0, "O-": 0 },
    components: { "Red cells": 0, "Plasma": 0, "Platelets": 0 },
    statuses:   { "Stored": 0, "Testing": 0, "Expired": 0, "Used": 0 },
    total: 0,
    donors: 0
  };

  /* What each blood component is used for */
  const COMPONENT_INFO = {
    "Red cells": "Carry oxygen. Used for surgery, trauma, and anemia. Shelf life: 35 days.",
    "Plasma": "The liquid part of blood. Used for burns and clotting problems. Shelf life: 1 year.",
    "Platelets": "Help blood clot. Used for cancer treatment and bleeding. Shelf life: 5 days (the shortest)."
  };

  /* What the user has chosen on the page */
  const state = {
    sort: "type",        // "type" | "high" | "low"
    lowOnly: false,      // show only low-stock bars
    selected: null,      // selected blood type (or null)
    comp: null           // selected component (or null)
  };


  /* ======================================================================
     2. SMALL HELPERS
     ====================================================================== */

  /* Find one element / all elements inside the dashboard (or inside root) */
  function $(selector, root) {
    return (root || section).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || section).querySelectorAll(selector));
  }

  /* Add up every value in an object */
  function sum(obj) {
    return Object.keys(obj).reduce(function (total, key) {
      return total + obj[key];
    }, 0);
  }

  /* n as a whole-number percent of total (0 when total is 0) */
  function pct(n, total) {
    return total ? Math.round((n / total) * 100) : 0;
  }

  /* True when the user wants less animation */
  function reduceMotion() {
    return document.documentElement.getAttribute("data-motion") === "reduce" ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* True when a blood type is low on stock */
  function isLow(label) {
    return (data.types[label] || 0) < LOW_COUNT;
  }


  /* ======================================================================
     3. STYLES
     ====================================================================== */

  /* CSS for the controls, tooltips and highlights added by this script */
  const style = document.createElement("style");
  style.textContent = `
    /* ----- Sort + filter controls ----- */
    .dash-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin: -4px 0 14px;
    }
    .dash-controls .seg {
      display: flex;
      gap: 4px;
      background: var(--bg);
      padding: 4px;
      border-radius: 999px;
    }
    .dash-controls button {
      border: 0;
      cursor: pointer;
      font: inherit;
      font-size: .8125rem;
      font-weight: 700;
      color: var(--muted);
      background: transparent;
      padding: 7px 14px;
      border-radius: 999px;
    }
    .dash-controls button:hover { color: var(--ink); }
    .dash-controls button[aria-pressed='true'] { background: var(--blue); color: var(--on-blue); }
    .dash-controls .low-btn { border: 1px solid var(--line); background: var(--surface); }
    .dash-controls .low-btn[aria-pressed='true'] { border-color: var(--blue); }

    /* ----- Blood type bars ----- */
    .chart .bar { transition: height .6s cubic-bezier(.2, .8, .2, 1), opacity .2s, filter .2s; }
    .chart .bar.is-low { background: var(--bar-low); }
    .chart .bar-col { position: relative; cursor: pointer; border-radius: 12px; }
    .chart .bar-col:hover .bar { filter: brightness(1.1); }
    .chart .bar-col.dim { opacity: .3; }
    .chart .bar-col.selected .bar { outline: 3px solid var(--ink); outline-offset: 2px; }

    /* Tooltip above a bar */
    .chart .bar-col[data-tip]:hover::after,
    .chart .bar-col[data-tip]:focus-visible::after {
      content: attr(data-tip);
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--ink);
      color: var(--bg);
      font-size: .75rem;
      font-weight: 700;
      white-space: nowrap;
      padding: 6px 10px;
      border-radius: 10px;
      z-index: 5;
      pointer-events: none;
    }

    /* ----- Info box under the chart ----- */
    .type-info {
      margin-top: 12px;
      padding: 12px 16px;
      border-radius: 14px;
      background: var(--blue-soft);
      color: var(--ink);
      font-size: .9375rem;
    }
    .type-info strong { font-weight: 800; }
    .type-info .ok { color: var(--ok); font-weight: 700; }
    .type-info .low { color: var(--warn); font-weight: 700; }

    /* ----- Component meters ----- */
    .components li {
      cursor: pointer;
      border-radius: 14px;
      padding: 6px 8px;
      margin: -6px -8px;
      transition: opacity .2s, background .2s;
    }
    .components li:hover { background: var(--bg); }
    .components li.dim { opacity: .35; }
    .components li.selected { background: var(--bg); box-shadow: inset 0 0 0 2px var(--line); }
    .meter i { transition: width .7s cubic-bezier(.2, .8, .2, 1); }
    .comp-info { margin-top: 12px; font-size: .875rem; color: var(--muted); }
    .comp-info strong { color: var(--ink); }
  `;
  document.head.appendChild(style);


  /* ======================================================================
     4. BUILD THE CONTROLS
     ====================================================================== */

  const chart = $(".chart");
  const chartNote = $(".chart-note");

  /* Sort buttons + "Low stock only" button, placed above the chart */
  const controls = document.createElement("div");
  controls.className = "dash-controls";
  controls.innerHTML =
    '<div class="seg" role="group" aria-label="Sort blood types">' +
      '<button type="button" data-sort="type" aria-pressed="true">By type</button>' +
      '<button type="button" data-sort="high" aria-pressed="false">Highest</button>' +
      '<button type="button" data-sort="low" aria-pressed="false">Lowest</button>' +
    "</div>" +
    '<button type="button" class="low-btn" aria-pressed="false">Low stock only</button>';
  chart.parentNode.insertBefore(controls, chart);

  /* Info box under the chart (read out by screen readers when it changes) */
  const typeInfo = document.createElement("div");
  typeInfo.className = "type-info";
  typeInfo.setAttribute("aria-live", "polite");
  chartNote.parentNode.insertBefore(typeInfo, chartNote);

  /* Info line under the component meters */
  const compList = $(".components");
  const compInfo = document.createElement("p");
  compInfo.className = "comp-info";
  compInfo.setAttribute("aria-live", "polite");
  compList.parentNode.appendChild(compInfo);

  /* Make every bar clickable (mouse + keyboard) and remember it by blood type */
  const cols = $$(".bar-col", chart);
  const colByType = {};

  cols.forEach(function (col) {
    const label = $(".bar span", col).textContent.trim();
    colByType[label] = col;

    col.setAttribute("role", "button");
    col.setAttribute("tabindex", "0");
    col.setAttribute("aria-pressed", "false");

    col.addEventListener("click", function () {
      selectType(label);
    });

    col.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectType(label);
      }
    });
  });


  /* ======================================================================
     5. BLOOD TYPE CHART
     ====================================================================== */

  /* Draws the bars, percentages and tooltips from `data`.
     When animate is true the bars grow from zero. */
  function drawTypes(animate) {
    const total = sum(data.types);

    /* The biggest share becomes the tallest bar */
    const shares = ORDER.map(function (label) {
      return pct(data.types[label] || 0, total);
    });
    const maxShare = Math.max(1, Math.max.apply(null, shares));

    function barValue(label) {
      return String(pct(data.types[label] || 0, total) / maxShare * 32);
    }

    ORDER.forEach(function (label) {
      const col = colByType[label];
      if (!col) return;

      const count = data.types[label] || 0;
      const bar = $(".bar", col);

      $(".bar-pct", col).textContent = pct(count, total) + "%";
      bar.classList.toggle("is-low", isLow(label));
      col.dataset.tip = label + ": " + count + " bags";
      bar.style.setProperty("--v", animate ? "0" : barValue(label));
    });

    /* Animate: start at zero, then grow to the real height on the next frame */
    if (animate) {
      void chart.offsetWidth;   // force the browser to apply the zero height first

      requestAnimationFrame(function () {
        ORDER.forEach(function (label) {
          const col = colByType[label];
          if (col) $(".bar", col).style.setProperty("--v", barValue(label));
        });
      });
    }

    updateChartLabel();
    applyOrderAndFilter();
    showTypeInfo();
  }

  /* Screen reader description that always matches the real numbers */
  function updateChartLabel() {
    const total = sum(data.types);
    const lows = ORDER.filter(isLow);

    const perType = ORDER.map(function (label) {
      const count = data.types[label] || 0;
      return label + " " + count + " (" + pct(count, total) + "%)";
    }).join(", ");

    chart.setAttribute("aria-label",
      "Bar chart of bags in stock by blood type, " + total + " bags in total: " + perType + "." +
      (lows.length ? " Low stock: " + lows.join(", ") + "." : ""));
  }

  /* Applies the chosen sort order, "low only" filter and selected bar */
  function applyOrderAndFilter() {
    const list = ORDER.slice();

    if (state.sort === "high") {
      list.sort(function (a, b) { return data.types[b] - data.types[a]; });
    }
    if (state.sort === "low") {
      list.sort(function (a, b) { return data.types[a] - data.types[b]; });
    }

    /* Re-adding a column moves it, so this reorders the bars */
    list.forEach(function (label) {
      chart.appendChild(colByType[label]);
    });

    ORDER.forEach(function (label) {
      const col = colByType[label];
      const hiddenByFilter = state.lowOnly && !isLow(label);
      const notSelected = state.selected && state.selected !== label;

      col.classList.toggle("dim", hiddenByFilter || !!notSelected);
      col.classList.toggle("selected", state.selected === label);
      col.setAttribute("aria-pressed", String(state.selected === label));
    });
  }

  /* Fills the info box under the chart (selected bar, or a stock summary) */
  function showTypeInfo() {
    const total = sum(data.types);

    /* A bar is selected: show its details */
    if (state.selected) {
      const count = data.types[state.selected];
      const share = pct(count, total);
      const low = isLow(state.selected);

      typeInfo.innerHTML =
        "<strong>" + state.selected + "</strong>: " + count + " bags (" + share + "% of stock). " +
        (low
          ? '<span class="low">Low stock (under ' + LOW_COUNT + " bags), more donors needed.</span>"
          : '<span class="ok">Stock is OK.</span>');
      return;
    }

    /* Nothing selected: show which types are low */
    const lows = ORDER.filter(isLow);

    typeInfo.innerHTML = lows.length
      ? "<strong>" + lows.length + " blood type" + (lows.length > 1 ? "s are" : " is") +
        " low (under " + LOW_COUNT + " bags):</strong> " + lows.join(", ") + ". Select a bar for details."
      : "All blood types are well stocked. Select a bar for details.";
  }

  /* Click on a bar: select it, or unselect it if it was already selected */
  function selectType(label) {
    state.selected = state.selected === label ? null : label;
    applyOrderAndFilter();
    showTypeInfo();
  }

  /* Sort buttons */
  $$("[data-sort]", controls).forEach(function (button) {
    button.addEventListener("click", function () {
      state.sort = button.dataset.sort;

      $$("[data-sort]", controls).forEach(function (other) {
        other.setAttribute("aria-pressed", String(other === button));
      });

      applyOrderAndFilter();
    });
  });

  /* "Low stock only" button */
  $(".low-btn", controls).addEventListener("click", function (e) {
    state.lowOnly = !state.lowOnly;
    e.currentTarget.setAttribute("aria-pressed", String(state.lowOnly));

    applyOrderAndFilter();
    showTypeInfo();
  });


  /* ======================================================================
     6. TOTAL BAGS COUNTER
     ====================================================================== */

  /* The big number's text node (the "bags" label next to it is left alone) */
  const big = $(".big-number");
  let bigText = null;

  Array.prototype.forEach.call(big.childNodes, function (node) {
    if (!bigText && node.nodeType === 3) bigText = node;
  });

  if (!bigText) {
    bigText = document.createTextNode("0");
    big.insertBefore(bigText, big.firstChild);
  }

  let countTimer = null;

  /* Shows the total. When animate is true it counts up from 0. */
  function drawTotal(animate) {
    const target = data.total;
    cancelAnimationFrame(countTimer);

    if (!animate || reduceMotion()) {
      bigText.nodeValue = String(target);
      return;
    }

    const duration = 900;   // milliseconds
    let start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;

      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);   // starts fast, ends slow

      bigText.nodeValue = String(Math.round(target * eased));
      if (progress < 1) countTimer = requestAnimationFrame(step);
    }

    bigText.nodeValue = "0";
    countTimer = requestAnimationFrame(step);
  }


  /* ======================================================================
     7. COMPONENT METERS
     ====================================================================== */

  /* The three list items, in the same order as COMPONENT_NAMES */
  const compItems = $$("li", compList);

  /* Make every meter clickable (mouse + keyboard) */
  compItems.forEach(function (li, index) {
    const name = COMPONENT_NAMES[index];

    li.setAttribute("role", "button");
    li.setAttribute("tabindex", "0");
    li.setAttribute("aria-pressed", "false");

    function toggle() {
      state.comp = state.comp === name ? null : name;
      markComponents();
    }

    li.addEventListener("click", toggle);

    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  /* Highlights the selected component and shows what it is used for */
  function markComponents() {
    compItems.forEach(function (li, index) {
      const name = COMPONENT_NAMES[index];

      li.classList.toggle("selected", state.comp === name);
      li.classList.toggle("dim", !!state.comp && state.comp !== name);
      li.setAttribute("aria-pressed", String(state.comp === name));
    });

    compInfo.innerHTML = state.comp
      ? "<strong>" + state.comp + ":</strong> " + COMPONENT_INFO[state.comp]
      : "Select a component to see what it is used for.";
  }

  /* Draws the meters (bag counts + percentage fill).
     When animate is true the bars grow from zero. */
  function drawComponents(animate) {
    const total = sum(data.components);

    compItems.forEach(function (li, index) {
      const name = COMPONENT_NAMES[index];
      const count = data.components[name] || 0;
      const share = pct(count, total);

      const fill = $(".meter i", li);
      const fillLabel = $(".meter i span", li);

      $(".comp-row span:last-child", li).textContent = count + " bags";
      fillLabel.textContent = share + "%";

      if (animate) {
        /* Start at 0%, then grow to the real width on the next frame */
        fill.style.setProperty("--w", "0%");
        void fill.offsetWidth;   // force the browser to apply 0% first

        requestAnimationFrame(function () {
          fill.style.setProperty("--w", share + "%");
        });
      } else {
        fill.style.setProperty("--w", share + "%");
      }
    });

    markComponents();
  }


  /* ======================================================================
     8. DETAIL DIALOGS (opened by the arrow buttons in index.html)
     ====================================================================== */

  /* Fills the three dialog bodies with the current numbers */
  function renderDetails() {
    const typesBox = document.querySelector('[data-detail-body="types"]');
    const totalBox = document.querySelector('[data-detail-body="total"]');
    const compBox = document.querySelector('[data-detail-body="components"]');
    const stored = sum(data.types);

    /* Blood types: bags, share and stock level for each type */
    if (typesBox) {
      const rows = ORDER.map(function (label) {
        const count = data.types[label] || 0;
        const low = isLow(label);

        return "<tr><td>" + label + "</td><td>" + count + "</td><td>" + pct(count, stored) + "%</td>" +
          '<td class="status' + (low ? " pending" : "") + '">' + (low ? "Low" : "OK") + "</td></tr>";
      }).join("");

      typesBox.innerHTML =
        '<table class="detail-list"><caption class="sr-only">Bags in stock by blood type</caption>' +
        '<thead><tr><th scope="col">Blood type</th><th scope="col">Bags</th>' +
        '<th scope="col">Share</th><th scope="col">Stock</th></tr></thead>' +
        "<tbody>" + rows + "</tbody></table>" +
        '<p class="comp-info">Counts only bags with status Stored. Low means fewer than ' + LOW_COUNT + " bags.</p>";
    }

    /* Total bags: count for each status, then the total */
    if (totalBox) {
      const rows = STATUS_NAMES.map(function (status) {
        return "<tr><td>" + status + "</td><td>" + (data.statuses[status] || 0) + "</td></tr>";
      }).join("");

      totalBox.innerHTML =
        '<table class="detail-list"><caption class="sr-only">All bags by status</caption>' +
        '<thead><tr><th scope="col">Status</th><th scope="col">Bags</th></tr></thead>' +
        "<tbody>" + rows +
        "<tr><td><strong>Total</strong></td><td><strong>" + data.total + "</strong></td></tr></tbody></table>" +
        '<p class="comp-info">Only Stored bags appear in the blood type chart and the component totals. ' +
        "Registered donors: " + data.donors + ".</p>";
    }

    /* Components: bags in stock and what each is used for */
    if (compBox) {
      const items = COMPONENT_NAMES.map(function (name) {
        return "<div><strong>" + name + ": " + (data.components[name] || 0) + " bags in stock</strong>" +
          "<span>" + COMPONENT_INFO[name] + "</span></div>";
      }).join("");

      compBox.innerHTML = '<div class="detail-text">' + items + "</div>";
    }
  }


  /* ======================================================================
     9. LOADING LIVE STATISTICS
     ====================================================================== */

  /* Asks the server for the latest numbers and redraws everything */
  function fetchStatsAndRender() {
    fetch("backend/read.php?what=stats")
      .then(function (response) {
        if (!response.ok) throw new Error("API status: " + response.status);
        return response.json();
      })
      .then(function (stats) {
        if (!stats || !stats.success) throw new Error("Stats unavailable");

        /* Copy the server's numbers into `data` (anything missing becomes 0) */
        ORDER.forEach(function (key) {
          data.types[key] = Number(stats.types[key]) || 0;
        });
        COMPONENT_NAMES.forEach(function (key) {
          data.components[key] = Number(stats.components[key]) || 0;
        });
        STATUS_NAMES.forEach(function (key) {
          data.statuses[key] = Number((stats.statuses || {})[key]) || 0;
        });
        data.total = Number(stats.total) || 0;
        data.donors = Number(stats.donors) || 0;

        /* Redraw everything */
        const animate = !reduceMotion();
        drawTypes(animate);
        drawComponents(animate);
        drawTotal(true);
        renderDetails();

        /* Tell other scripts (the About page) that new numbers are ready */
        document.dispatchEvent(new CustomEvent("bb:stats", {
          detail: window.BloodBankDashboard.getData()
        }));
      })
      .catch(function (error) {
        /* Server unreachable: just redraw what we have, without animation */
        console.warn("Could not load stats:", error);
        drawTypes(false);
        drawComponents(false);
        drawTotal(false);
        renderDetails();
      });
  }


  /* ======================================================================
     10. PUBLIC API (used by index.html and about.js)
     ====================================================================== */
  window.BloodBankDashboard = {

    /* Reload the numbers from the server */
    refresh: fetchStatsAndRender,

    /* Set blood type / component numbers by hand (no server call) */
    update: function (next) {
      if (next && next.types) {
        ORDER.forEach(function (key) {
          if (key in next.types) data.types[key] = Number(next.types[key]) || 0;
        });
      }

      if (next && next.components) {
        COMPONENT_NAMES.forEach(function (key) {
          if (key in next.components) data.components[key] = Number(next.components[key]) || 0;
        });
      }

      drawTypes(false);
      drawComponents(false);
      drawTotal(false);
      renderDetails();
    },

    /* A copy of the current numbers */
    getData: function () {
      return JSON.parse(JSON.stringify(data));
    }
  };


  /* ======================================================================
     11. START-UP
     ====================================================================== */

  /* Draw the empty dashboard first (it fills in when the server answers) */
  drawTypes(false);
  drawComponents(false);
  drawTotal(false);
  renderDetails();

  /* Reload the numbers every time the Dashboard page is opened */
  let wasActive = section.classList.contains("active");

  new MutationObserver(function () {
    const isActive = section.classList.contains("active");

    if (isActive && !wasActive) {
      fetchStatsAndRender();
    }
    wasActive = isActive;
  }).observe(section, { attributes: true, attributeFilter: ["class"] });

  /* If the Dashboard is already showing, load the numbers now */
  if (wasActive) {
    fetchStatsAndRender();
  }

})();
