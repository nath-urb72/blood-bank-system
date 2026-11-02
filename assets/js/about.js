/* ==========================================================================
   Blood Bank - About page script

   Adds the interactive parts of the About page:
   1. Styles for those parts (injected into <head>)
   2. Live stats banner in the hero card
   3. Clickable feature cards (open the detail dialog)
   4. Blood type compatibility tool
   5. FAQ accordion
   6. Live stats updates (count-up animation)
   ========================================================================== */
(function () {
  'use strict';


  /* ======================================================================
     START-UP
     ====================================================================== */

  /* Sets up everything on the About page (runs once) */
  function init() {
    const aboutSection = document.getElementById('about');
    if (!aboutSection) return;

    /* Prevent double initialization */
    if (aboutSection.dataset.interactiveInitialized === 'true') return;
    aboutSection.dataset.interactiveInitialized = 'true';

    injectStyles();                           // 1. styles for the interactive parts
    enhanceAboutHero(aboutSection);           // 2. stats banner in the hero card
    enhanceAboutCards(aboutSection);          // 3. clickable feature cards
    injectCompatibilityExplorer(aboutSection); // 4. blood type compatibility tool
    injectFAQSection(aboutSection);           // 5. FAQ accordion

    /* 6. Live stats: update when the dashboard announces numbers,
          and refresh whenever the About page is opened */
    document.addEventListener('bb:stats', function (e) {
      setStats(e.detail);
    });

    window.addEventListener('hashchange', function () {
      if (location.hash === '#about' && window.BloodBankDashboard) {
        BloodBankDashboard.refresh();
      }
    });
  }

  /* Run immediately, or when the page has finished loading */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


  /* ======================================================================
     1. STYLES
     ====================================================================== */

  /* Adds the CSS for the stats banner, feature cards, compatibility tool
     and FAQ. Uses the theme variables, so dark mode works automatically. */
  function injectStyles() {
    if (document.getElementById('about-interactive-styles')) return;

    const style = document.createElement('style');
    style.id = 'about-interactive-styles';
    style.textContent = `
      /* ----- Stats banner ----- */
      .about-stats-banner {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 14px;
        margin-top: 24px;
      }

      .stat-box {
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
        text-align: center;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .stat-box:hover {
        transform: translateY(-3px);
        border-color: var(--blue);
      }

      .stat-number {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--blue);
        line-height: 1.2;
      }

      .stat-label {
        font-size: 0.75rem;
        color: var(--muted);
        font-weight: 700;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      /* ----- Feature cards ----- */
      .about-grid .card {
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
        position: relative;
        overflow: hidden;
      }

      .about-grid .card:hover {
        transform: translateY(-4px);
        border-color: var(--blue);
        box-shadow: 0 10px 24px rgba(200, 38, 59, 0.08);
      }

      .about-card-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 14px;
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--blue);
        background: var(--blue-soft);
        padding: 6px 12px;
        border-radius: 999px;
        transition: background 0.2s, color 0.2s;
      }

      .about-grid .card:hover .about-card-badge {
        background: var(--blue);
        color: var(--on-blue);
      }

      /* ----- Widget cards (compatibility tool + FAQ) ----- */
      .interactive-widget-card {
        margin-top: 20px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        padding: 24px;
      }

      .widget-title {
        font-size: 1.125rem;
        font-weight: 800;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* ----- Compatibility tool ----- */
      .type-selector-btn {
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--bg);
        color: var(--ink);
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .type-selector-btn:hover {
        border-color: var(--blue);
        color: var(--blue);
      }

      .type-selector-btn.active {
        background: var(--blue);
        color: var(--on-blue);
        border-color: var(--blue);
      }

      .compat-results {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }

      .compat-pill-box {
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
      }

      .compat-pill-box h4 {
        font-size: 0.8125rem;
        color: var(--muted);
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .pill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .type-tag {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.8125rem;
        font-weight: 800;
        background: var(--blue-soft);
        color: var(--blue-dark);
      }

      /* ----- FAQ accordion ----- */
      .faq-item {
        border-bottom: 1px solid var(--line);
      }

      .faq-item:last-child {
        border-bottom: 0;
      }

      .faq-trigger {
        width: 100%;
        text-align: left;
        padding: 16px 0;
        background: none;
        border: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--ink);
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .faq-trigger:hover {
        color: var(--blue);
      }

      .faq-icon {
        font-size: 1.2rem;
        transition: transform 0.2s ease;
      }

      .faq-item.open .faq-icon {
        transform: rotate(45deg);
      }

      .faq-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s cubic-bezier(0, 1, 0, 1);
        color: var(--muted);
        font-size: 0.875rem;
        line-height: 1.6;
      }

      .faq-item.open .faq-content {
        max-height: 300px;
        padding-bottom: 16px;
        transition: max-height 0.3s cubic-bezier(1, 0, 1, 0);
      }
    `;

    document.head.appendChild(style);
  }


  /* ======================================================================
     2. HERO STATS BANNER
     ====================================================================== */

  /* Adds four stat boxes (filled in later by setStats) to the hero card */
  function enhanceAboutHero(aboutSection) {
    const heroCard = aboutSection.querySelector('.about-hero');
    if (!heroCard || document.getElementById('about-stats-banner')) return;

    const statsDiv = document.createElement('div');
    statsDiv.id = 'about-stats-banner';
    statsDiv.className = 'about-stats-banner';
    statsDiv.innerHTML = `
      <div class="stat-box">
        <div class="stat-number" data-key="donors">0</div>
        <div class="stat-label">Donors registered</div>
      </div>
      <div class="stat-box">
        <div class="stat-number" data-key="total">0</div>
        <div class="stat-label">Bags collected</div>
      </div>
      <div class="stat-box">
        <div class="stat-number" data-key="stored">0</div>
        <div class="stat-label">Bags in stock</div>
      </div>
      <div class="stat-box">
        <div class="stat-number" data-key="expired">0</div>
        <div class="stat-label">Bags expired</div>
      </div>
    `;

    heroCard.appendChild(statsDiv);
  }


  /* ======================================================================
     3. CLICKABLE FEATURE CARDS
     ====================================================================== */

  /* Turns the three About cards into buttons that open the detail dialog */
  function enhanceAboutCards(aboutSection) {
    const cards = aboutSection.querySelectorAll('.about-grid .card');

    /* One entry per card, in the same order as the cards on the page */
    const details = [
      {
        title: 'Dashboard Overview Feature',
        desc: 'Provides real-time visibility into current inventory levels. Displays exact percentages for all 8 blood groups and total bags separated by components.',
        tip: 'Click on any arrow icon in the dashboard cards to bring up quick data breakdowns!'
      },
      {
        title: 'Database Management Feature',
        desc: 'Maintains relational integrity between donors and collected blood bags using Foreign Keys (donor_id). Enables inline search and status tracking.',
        tip: 'Deleting a donor automatically cleans up associated blood bags to prevent orphan records.'
      },
      {
        title: 'Unified New Entry System',
        desc: 'Streamlines data input by combining donor registration and blood bag logging into a single workflow.',
        tip: "You can easily access this page anytime via the '+ New Entry' button!"
      }
    ];

    cards.forEach(function (card, index) {
      if (card.querySelector('.about-card-badge')) return;

      /* Make the card behave like a button (mouse + keyboard) */
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const info = details[index];
      if (!info) return;

      /* "Click to explore" badge at the bottom of the card */
      const badge = document.createElement('div');
      badge.className = 'about-card-badge';
      badge.innerHTML = '<span>Click to explore</span>';
      card.appendChild(badge);

      card.addEventListener('click', function () {
        openFeatureDialog(info);
      });
    });
  }

  /* Fills the shared detail dialog with one feature's text and opens it */
  function openFeatureDialog(info) {
    const detailDialog = document.getElementById('detail-dialog');
    if (!detailDialog) return;

    document.getElementById('detail-title').textContent = info.title;
    document.getElementById('detail-desc').textContent = info.desc;

    /* Hide the dashboard's detail bodies, then use (or create) our own */
    detailDialog.querySelectorAll('[data-detail-body]').forEach(function (el) {
      el.hidden = true;
    });

    let customBody = detailDialog.querySelector('[data-detail-body="custom-about"]');
    if (!customBody) {
      customBody = document.createElement('div');
      customBody.setAttribute('data-detail-body', 'custom-about');

      const inner = detailDialog.querySelector('.dialog-inner');
      inner.insertBefore(customBody, inner.querySelector('.dialog-actions'));
    }

    customBody.hidden = false;
    customBody.innerHTML = `
      <div style="background: var(--blue-soft); padding: 14px 16px; border-radius: 14px; margin-top: 14px;">
        <p style="font-size: 0.875rem; color: var(--blue-dark); font-weight: 600;">
          \u{1F4A1} <strong>Feature Insight:</strong> ${info.tip}
        </p>
      </div>
    `;

    detailDialog.showModal();
  }


  /* ======================================================================
     4. BLOOD TYPE COMPATIBILITY TOOL
     ====================================================================== */

  /* Adds the tool: pick a blood type, see who it can give to / receive from */
  function injectCompatibilityExplorer(aboutSection) {
    if (document.getElementById('compat-widget')) return;

    /* Red blood cell compatibility for each blood type */
    const compatData = {
      'O-':  { give: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], receive: ['O-'] },
      'O+':  { give: ['O+', 'A+', 'B+', 'AB+'],                          receive: ['O+', 'O-'] },
      'A-':  { give: ['A-', 'A+', 'AB-', 'AB+'],                         receive: ['A-', 'O-'] },
      'A+':  { give: ['A+', 'AB+'],                                      receive: ['A+', 'A-', 'O+', 'O-'] },
      'B-':  { give: ['B-', 'B+', 'AB-', 'AB+'],                         receive: ['B-', 'O-'] },
      'B+':  { give: ['B+', 'AB+'],                                      receive: ['B+', 'B-', 'O+', 'O-'] },
      'AB-': { give: ['AB-', 'AB+'],                                     receive: ['AB-', 'A-', 'B-', 'O-'] },
      'AB+': { give: ['AB+'],                                            receive: ['Everyone (Universal Recipient)'] }
    };

    /* Build the card (the first blood type button starts active) */
    const widget = document.createElement('article');
    widget.id = 'compat-widget';
    widget.className = 'interactive-widget-card';

    widget.innerHTML = `
      <div class="widget-title">Red Blood Cell Compatibility Tool</div>
      <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 14px;">Select a blood type to see which red cell donations it can give and receive. Plasma and platelets follow different rules.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;" id="type-btn-container">
        ${Object.keys(compatData).map(function (type, index) {
          return `<button type="button" class="type-selector-btn ${index === 0 ? 'active' : ''}" data-type="${type}">${type}</button>`;
        }).join('')}
      </div>
      <div class="compat-results">
        <div class="compat-pill-box">
          <h4>Can Give Red Cells To</h4>
          <div class="pill-tags" id="compat-give"></div>
        </div>
        <div class="compat-pill-box">
          <h4>Can Receive Red Cells From</h4>
          <div class="pill-tags" id="compat-receive"></div>
        </div>
      </div>
    `;

    aboutSection.appendChild(widget);

    const buttons = widget.querySelectorAll('.type-selector-btn');
    const giveContainer = widget.querySelector('#compat-give');
    const receiveContainer = widget.querySelector('#compat-receive');

    /* Shows the "give" and "receive" lists for one blood type */
    function updateCompat(type) {
      const info = compatData[type];
      if (!info) return;

      giveContainer.innerHTML = info.give.map(toTag).join('');
      receiveContainer.innerHTML = info.receive.map(toTag).join('');
    }

    /* One blood type -> one small pill */
    function toTag(type) {
      return `<span class="type-tag">${type}</span>`;
    }

    /* Clicking a button highlights it and updates the lists */
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('active'); });
        button.classList.add('active');
        updateCompat(button.dataset.type);
      });
    });

    updateCompat('O-');
  }


  /* ======================================================================
     5. FAQ ACCORDION
     ====================================================================== */

  /* Adds the FAQ card (one answer open at a time) */
  function injectFAQSection(aboutSection) {
    if (document.getElementById('about-faq-widget')) return;

    const faqs = [
      {
        q: 'How often can donors donate blood?',
        a: 'Whole blood donors usually need to wait at least 8 to 12 weeks between donations. The exact interval depends on local guidelines.'
      },
      {
        q: 'Does this system assign blood bags to patients?',
        a: 'No. It tracks inventory only. In practice, staff match units to patients by blood type compatibility, the component needed, and expiry date, and the filters on the Database tab help find suitable bags.'
      }
    ];

    const faqCard = document.createElement('article');
    faqCard.id = 'about-faq-widget';
    faqCard.className = 'interactive-widget-card';
    faqCard.style.marginTop = '16px';

    faqCard.innerHTML = `
      <div class="widget-title">Frequently Asked Questions</div>
      <div style="margin-top: 10px;">
        ${faqs.map(function (faq) {
          return `
            <div class="faq-item">
              <button type="button" class="faq-trigger" aria-expanded="false">
                <span>${faq.q}</span>
                <span class="faq-icon">+</span>
              </button>
              <div class="faq-content">
                <p>${faq.a}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    aboutSection.appendChild(faqCard);

    /* Clicking a question opens it and closes the others (click again to close) */
    faqCard.querySelectorAll('.faq-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        const item = trigger.closest('.faq-item');
        const wasOpen = item.classList.contains('open');

        /* Close every item first */
        faqCard.querySelectorAll('.faq-item').forEach(function (other) {
          other.classList.remove('open');
          other.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
        });

        /* Then open this one, unless it was already open */
        if (!wasOpen) {
          item.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }


  /* ======================================================================
     6. LIVE STATS
     ====================================================================== */

  /* Updates the four stat numbers using the data sent by the dashboard */
  function setStats(data) {
    const statuses = data.statuses || {};

    const values = {
      donors: data.donors,
      total: data.total,
      stored: statuses.Stored,
      expired: statuses.Expired
    };

    document.querySelectorAll('#about-stats-banner .stat-number').forEach(function (el) {
      countTo(el, Number(values[el.dataset.key]) || 0);
    });
  }

  /* Counts an element's number up (or down) to the target value.
     Skips the animation when the user prefers reduced motion. */
  function countTo(el, target) {
    clearInterval(el._timer);

    const reduceMotion =
      document.documentElement.getAttribute('data-motion') === 'reduce' ||
      (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    let current = parseInt(el.textContent, 10) || 0;

    if (reduceMotion || current === target) {
      el.textContent = target;
      return;
    }

    const direction = target > current ? 1 : -1;
    const step = Math.max(1, Math.ceil(Math.abs(target - current) / 25));

    el._timer = setInterval(function () {
      current += direction * step;

      const reachedTarget =
        (direction > 0 && current >= target) ||
        (direction < 0 && current <= target);

      if (reachedTarget) {
        current = target;
        clearInterval(el._timer);
      }

      el.textContent = current;
    }, 30);
  }

})();
