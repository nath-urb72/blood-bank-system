/* ==========================================================================
   Blood Bank - Database script

   Adds search, filters, sorting, paging and CSV export to the two tables
   (Donors and Bags), and links the two tables through donor_id.

   Contents
   1.  Settings (what each table has)
   2.  Small helpers
   3.  Styles (injected into <head>)
   4.  One controller per table (setup)
   5.  Jumping between the tables through donor_id
   6.  "/" jumps to the search box
   7.  Public API (window.BloodBankDatabase)
   ========================================================================== */
(function () {
  "use strict";


  /* ======================================================================
     1. SETTINGS
     ====================================================================== */

  const TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const COMPONENTS = ["Red cells", "Plasma", "Platelets"];
  const STATUSES = ["Stored", "Testing", "Expired", "Used"];

  /* Month name -> month number, used to read dates like "Nov 2, 2026" */
  const MONTHS = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  /* One entry per table.
       section   - id of the page section that holds the table
       tbody     - id of the table body
       cols      - column names (also used as the CSV header)
       idCols    - columns holding ids (sorted by their number)
       dateCols  - columns holding dates (sorted by real date)
       filters   - dropdown filters (col = column number to match) */
  const CONFIGS = [
    {
      key: "donors",
      section: "database",
      tbody: "donor-rows",
      cols: ["donor_id", "name", "blood_type", "last_donation"],
      idCols: [0],
      dateCols: [3],
      filters: [
        { label: "blood types", col: 2, options: TYPES }
      ]
    },
    {
      key: "bags",
      section: "bags",
      tbody: "bag-rows",
      cols: ["bag_id", "donor_id", "blood_type", "component", "date_collected", "status"],
      idCols: [0, 1],
      dateCols: [4],
      filters: [
        { label: "blood types", col: 2, options: TYPES },
        { label: "components", col: 3, options: COMPONENTS },
        { label: "statuses", col: 5, options: STATUSES }
      ]
    }
  ];


  /* ======================================================================
     2. SMALL HELPERS
     ====================================================================== */

  /* Escape text before putting it into innerHTML */
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Trimmed text of an element ("" when there is no element) */
  function text(el) {
    return el ? el.textContent.trim() : "";
  }

  /* "Nov 2, 2026" -> time in milliseconds (NaN when it is not a date) */
  function parseDate(value) {
    const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(value);
    return match && match[1] in MONTHS
      ? Date.UTC(+match[3], MONTHS[match[1]], +match[2])
      : NaN;
  }

  /* "Nov 2, 2026" -> "2026-11-02" (other text is returned unchanged) */
  function toISO(value) {
    const ms = parseDate(value);
    return isNaN(ms) ? value : new Date(ms).toISOString().slice(0, 10);
  }

  /* Small pop-up message at the bottom of the page */
  let toastTimer;

  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 2600);
  }


  /* ======================================================================
     3. STYLES
     ====================================================================== */

  /* CSS for the search bar, sortable headers and pager added by this script */
  const style = document.createElement("style");
  style.textContent = `
    /* ----- Search + filter bar ----- */
    .db-tools {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
    }
    .db-tools input,
    .db-tools select {
      font: inherit;
      font-size: .875rem;
      font-weight: 500;
      color: var(--ink);
      background: var(--surface);
      border: 1px solid var(--field-border);
      border-radius: 999px;
      padding: 9px 14px;
    }
    .db-search { flex: 1 1 220px; min-width: 180px; }
    .db-tools .btn { padding: 9px 16px; font-size: .8125rem; }
    .db-tools .btn-ghost:disabled:hover { background: transparent; }
    .db-count { flex-basis: 100%; font-size: .8125rem; color: var(--muted); }

    /* ----- Sortable column titles ----- */
    .sort-btn {
      border: 0;
      background: none;
      font: inherit;
      font-weight: inherit;
      color: inherit;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      text-align: left;
    }
    .sort-btn:hover { color: var(--ink); }
    .sort-btn::after { content: '\\2195'; opacity: .35; font-size: .75rem; }
    th[aria-sort='ascending'] .sort-btn::after { content: '\\2191'; opacity: 1; color: var(--blue); }
    th[aria-sort='descending'] .sort-btn::after { content: '\\2193'; opacity: 1; color: var(--blue); }

    /* ----- Pager (Previous / Next) ----- */
    .db-pager {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      font-size: .875rem;
      color: var(--muted);
    }
    .db-pager[hidden] { display: none; }
    .db-pager .btn { padding: 8px 16px; font-size: .8125rem; }
    .db-pager .btn-ghost:disabled:hover { background: transparent; }

    /* ----- Rows ----- */
    tr[hidden] { display: none; }
    .no-match td { text-align: center; color: var(--muted); padding: 28px; }
  `;
  document.head.appendChild(style);


  /* ======================================================================
     4. ONE CONTROLLER PER TABLE
     ====================================================================== */

  const controllers = {};

  /* Sets up search, filters, sorting, paging and export for one table.
     Returns a small object other code can use (or null if the table is missing). */
  function setup(cfg) {
    const sec = document.getElementById(cfg.section);
    const tbody = document.getElementById(cfg.tbody);
    if (!sec || !tbody) return null;

    const card = sec.querySelector(".table-card");
    const thead = sec.querySelector("thead tr");

    /* What the user has chosen */
    const state = {
      q: "",             // search text
      f: {},             // filter values, by column number
      sortCol: 0,
      sortDir: "desc",
      sortSet: false,    // false = default order (newest id first)
      page: 1,
      size: 10           // rows per page
    };

    let lastMatched = [];   // rows matching the search + filters (used by export)


    /* ----- Build the search bar ----- */
    const bar = document.createElement("div");
    bar.className = "db-tools";
    bar.innerHTML =
      '<input type="search" class="db-search" placeholder="Search ' + cfg.key + '..." ' +
        'aria-label="Search ' + cfg.key + '" autocomplete="off">' +
      cfg.filters.map(function (filter) {
        return '<select data-col="' + filter.col + '" aria-label="Filter by ' + filter.label + '">' +
          '<option value="">All ' + filter.label + "</option>" +
          filter.options.map(function (option) {
            return '<option value="' + esc(option) + '">' + esc(option) + "</option>";
          }).join("") +
          "</select>";
      }).join("") +
      '<select class="db-size" aria-label="Rows per page">' +
        '<option value="5">5 per page</option>' +
        '<option value="10" selected>10 per page</option>' +
        '<option value="25">25 per page</option>' +
      "</select>" +
      '<button type="button" class="btn btn-ghost db-clear">Clear</button>' +
      '<button type="button" class="btn btn-ghost db-export">Export CSV</button>' +
      '<p class="db-count" aria-live="polite"></p>';
    card.parentNode.insertBefore(bar, card);


    /* ----- Build the pager ----- */
    const pager = document.createElement("div");
    pager.className = "db-pager";
    pager.hidden = true;
    pager.innerHTML =
      '<button type="button" class="btn btn-ghost db-prev">Previous</button>' +
      '<span class="db-page" aria-live="polite"></span>' +
      '<button type="button" class="btn btn-ghost db-next">Next</button>';
    card.parentNode.insertBefore(pager, card.nextSibling);


    /* ----- Find the controls we just built ----- */
    const input = bar.querySelector(".db-search");
    const selects = Array.prototype.slice.call(bar.querySelectorAll("select[data-col]"));
    const sizeSel = bar.querySelector(".db-size");
    const clearBtn = bar.querySelector(".db-clear");
    const exportBtn = bar.querySelector(".db-export");
    const countEl = bar.querySelector(".db-count");
    const prevBtn = pager.querySelector(".db-prev");
    const nextBtn = pager.querySelector(".db-next");
    const pageEl = pager.querySelector(".db-page");


    /* ----- Make the column titles sortable ----- */
    const ths = Array.prototype.slice.call(thead.children);

    ths.forEach(function (th, index) {
      if (th.classList.contains("col-actions")) return;

      /* Wrap the title in a button */
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sort-btn";
      while (th.firstChild) button.appendChild(th.firstChild);
      th.appendChild(button);

      /* Same column again flips the direction; a new column starts ascending */
      button.addEventListener("click", function () {
        if (state.sortSet && state.sortCol === index) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortCol = index;
          state.sortDir = "asc";
          state.sortSet = true;
        }
        state.page = 1;
        apply();
      });
    });


    /* ----- Row helpers ----- */

    /* True for real data rows (not the "no match" or "empty" message rows) */
    function isData(tr) {
      return !tr.classList.contains("no-match") && !tr.querySelector("td.empty");
    }

    /* The value a row is sorted by in one column (number, date or lowercase text) */
    function keyFor(tr, col) {
      const value = text(tr.cells[col]);

      if (cfg.dateCols.indexOf(col) !== -1) {
        const ms = parseDate(value);
        return isNaN(ms) ? value.toLowerCase() : ms;
      }

      if (cfg.idCols.indexOf(col) !== -1) {
        const number = parseInt(value.replace(/\D/g, ""), 10);
        return isNaN(number) ? value.toLowerCase() : number;
      }

      return value.toLowerCase();
    }

    /* Compare two sort values (numbers as numbers, everything else as text) */
    function compare(a, b) {
      if (typeof a === "number" && typeof b === "number") return a - b;
      return String(a).localeCompare(String(b));
    }

    /* True when no search, filter or sort is active */
    function isDefault() {
      let anyActive = state.q.trim() || state.sortSet;

      Object.keys(state.f).forEach(function (key) {
        if (state.f[key]) anyActive = true;
      });

      return !anyActive;
    }


    /* ----- Apply search, filters, sort and paging to the table ----- */

    /* The page rebuilds the rows whenever data changes. This watcher
       re-applies everything when that happens. */
    const observer = new MutationObserver(function () {
      apply();
    });

    function apply() {
      /* Pause the watcher while we change the rows ourselves */
      observer.disconnect();

      const oldMessage = tbody.querySelector("tr.no-match");
      if (oldMessage) oldMessage.remove();

      const rows = Array.prototype.slice.call(tbody.rows).filter(isData);

      /* Donors tab: make donor_id a link to that donor's bags */
      if (cfg.key === "donors") {
        rows.forEach(function (tr) {
          const td = tr.cells[0];
          if (td.querySelector("a")) return;

          const id = text(td);
          td.innerHTML =
            '<a class="idlink" href="#bags" data-donor="' + esc(id) + '" ' +
            'title="Show bags from ' + esc(id) + '">' + esc(id) + "</a>";
        });
      }

      /* Filter: keep rows that match the search text and every dropdown */
      const query = state.q.trim().toLowerCase();

      const matched = rows.filter(function (tr) {
        if (query) {
          const haystack = cfg.cols.map(function (name, i) {
            return text(tr.cells[i]);
          }).join(" ").toLowerCase();

          if (haystack.indexOf(query) === -1) return false;
        }

        return cfg.filters.every(function (filter) {
          return !state.f[filter.col] || text(tr.cells[filter.col]) === state.f[filter.col];
        });
      });

      /* Sort (default = newest id first, which is how the app lists them) */
      const sortCol = state.sortSet ? state.sortCol : 0;
      const sortDir = state.sortSet ? state.sortDir : "desc";

      rows.sort(function (a, b) {
        const result = compare(keyFor(a, sortCol), keyFor(b, sortCol));
        return sortDir === "asc" ? result : -result;
      });

      matched.sort(function (a, b) {
        return rows.indexOf(a) - rows.indexOf(b);
      });

      rows.forEach(function (tr) {
        tbody.appendChild(tr);
      });

      lastMatched = matched;

      /* Arrow on the sorted column title */
      ths.forEach(function (th, index) {
        if (state.sortSet && index === state.sortCol) {
          th.setAttribute("aria-sort", state.sortDir === "asc" ? "ascending" : "descending");
        } else {
          th.removeAttribute("aria-sort");
        }
      });

      /* Paging: show only the rows of the current page */
      const pages = Math.max(1, Math.ceil(matched.length / state.size));
      if (state.page > pages) state.page = pages;

      const from = (state.page - 1) * state.size;
      const to = from + state.size;

      rows.forEach(function (tr) {
        tr.hidden = matched.indexOf(tr) === -1;
      });
      matched.forEach(function (tr, i) {
        tr.hidden = i < from || i >= to;
      });

      /* Nothing matches: show a message row */
      if (rows.length && !matched.length) {
        const noMatch = document.createElement("tr");
        noMatch.className = "no-match";
        noMatch.innerHTML =
          '<td colspan="' + ths.length + '">No ' + cfg.key + " match your search or filters.</td>";
        tbody.appendChild(noMatch);
      }

      /* "Showing 1-10 of 25" text */
      if (!rows.length) {
        countEl.textContent = "";
      } else if (!matched.length) {
        countEl.textContent = "No matching records.";
      } else {
        countEl.textContent =
          "Showing " + (from + 1) + "–" + Math.min(to, matched.length) + " of " + matched.length +
          (matched.length < rows.length ? " (filtered from " + rows.length + ")" : "") + ".";
      }

      /* Pager + button states */
      pager.hidden = pages <= 1;
      pageEl.textContent = "Page " + state.page + " of " + pages;
      prevBtn.disabled = state.page <= 1;
      nextBtn.disabled = state.page >= pages;
      clearBtn.disabled = isDefault();
      exportBtn.disabled = !matched.length;

      /* Start watching again */
      observer.observe(tbody, { childList: true });
    }

    /* Clears the search, filters and sort */
    function reset() {
      state.q = "";
      state.f = {};
      state.sortSet = false;
      state.sortCol = 0;
      state.sortDir = "desc";
      state.page = 1;

      input.value = "";
      selects.forEach(function (select) {
        select.value = "";
      });
    }


    /* ----- Events ----- */

    /* Typing in the search box */
    input.addEventListener("input", function () {
      state.q = input.value;
      state.page = 1;
      apply();
    });

    /* Escape clears the search box */
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) {
        e.stopPropagation();
        input.value = "";
        state.q = "";
        state.page = 1;
        apply();
      }
    });

    /* Filter dropdowns */
    selects.forEach(function (select) {
      select.addEventListener("change", function () {
        state.f[select.dataset.col] = select.value;
        state.page = 1;
        apply();
      });
    });

    /* Rows per page */
    sizeSel.addEventListener("change", function () {
      state.size = parseInt(sizeSel.value, 10);
      state.page = 1;
      apply();
    });

    /* Clear button */
    clearBtn.addEventListener("click", function () {
      reset();
      apply();
      input.focus();
    });

    /* Previous / Next */
    prevBtn.addEventListener("click", function () {
      if (state.page > 1) {
        state.page--;
        apply();
      }
    });

    nextBtn.addEventListener("click", function () {
      state.page++;
      apply();
    });


    /* ----- Export the filtered + sorted rows (all pages) as a CSV file ----- */
    exportBtn.addEventListener("click", function () {

      /* Wrap a value in quotes when it contains a comma, quote or new line */
      function csvCell(value) {
        value = String(value);
        return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
      }

      /* Header line, then one line per row (dates as 2026-11-02) */
      const lines = [cfg.cols.join(",")];

      lastMatched.forEach(function (tr) {
        lines.push(cfg.cols.map(function (name, i) {
          const value = text(tr.cells[i]);
          return csvCell(cfg.dateCols.indexOf(i) !== -1 ? toISO(value) : value);
        }).join(","));
      });

      /* Download it (the ﻿ makes Excel read the file as UTF-8) */
      const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "blood-bank-" + cfg.key + "-" + new Date().toISOString().slice(0, 10) + ".csv";

      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
      }, 1000);

      toast("Exported " + lastMatched.length + " row" + (lastMatched.length === 1 ? "" : "s") + " to CSV.");
    });


    /* ----- First draw, then hand back the controller ----- */
    apply();

    return {
      input: input,
      section: sec,
      apply: apply,

      /* Clear everything, then show only rows containing `value` */
      showOnly: function (value) {
        reset();
        state.q = value;
        input.value = value;
        apply();
      }
    };
  }

  CONFIGS.forEach(function (cfg) {
    controllers[cfg.key] = setup(cfg);
  });


  /* ======================================================================
     5. JUMPING BETWEEN THE TABLES THROUGH donor_id
     ====================================================================== */

  const donorRows = document.getElementById("donor-rows");
  const bagRows = document.getElementById("bag-rows");

  /* Donors table: clicking a donor_id shows that donor's bags */
  if (donorRows && controllers.bags) {
    donorRows.addEventListener("click", function (e) {
      const link = e.target.closest("a[data-donor]");
      if (!link) return;

      controllers.bags.showOnly(link.dataset.donor);
      toast("Showing bags from " + link.dataset.donor + ".");
      /* the link's href (#bags) opens the Bags tab */
    });
  }

  /* Bags table: clicking a donor_id shows that donor in the Donors table */
  if (bagRows && controllers.donors) {
    bagRows.addEventListener("click", function (e) {
      const link = e.target.closest(".idlink");
      if (!link) return;

      const id = text(link);
      controllers.donors.showOnly(id);
      toast("Showing donor " + id + ".");
      /* the link's href (#database) opens the Donors tab */
    });
  }


  /* ======================================================================
     6. "/" JUMPS TO THE SEARCH BOX
     ====================================================================== */

  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;

    /* Ignore while typing in a field or while a dialog is open */
    if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || "")) || e.target.isContentEditable) return;
    if (document.querySelector("dialog[open]")) return;

    /* Find the table on the page that is showing right now */
    const activeKey = Object.keys(controllers).filter(function (key) {
      return controllers[key] && controllers[key].section.classList.contains("active");
    })[0];
    if (!activeKey) return;

    e.preventDefault();
    controllers[activeKey].input.focus();
  });


  /* ======================================================================
     7. PUBLIC API
     ====================================================================== */
  window.BloodBankDatabase = {

    /* Re-apply search, filters and sort to both tables */
    refresh: function () {
      Object.keys(controllers).forEach(function (key) {
        if (controllers[key]) controllers[key].apply();
      });
    },

    /* Show only rows containing `value` in one table ("donors" or "bags") */
    search: function (table, value) {
      if (controllers[table]) controllers[table].showOnly(value || "");
    }
  };

})();
