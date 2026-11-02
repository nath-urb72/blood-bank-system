(function () {
  'use strict';

  function init() {
    const aboutSection = document.getElementById('about');
    if (!aboutSection) return;

    // Prevent double initialization
    if (aboutSection.dataset.interactiveInitialized === 'true') return;
    aboutSection.dataset.interactiveInitialized = 'true';

    // 1. Inject Styles for Interactive Elements
    injectStyles();

    // 2. Add Animated Interactive Impact Stats Counter to the Hero Card
    enhanceAboutHero(aboutSection);

    // 3. Transform Static About Cards into Interactive Feature Cards
    enhanceAboutCards(aboutSection);

    // 4. Inject an Interactive Live Blood Type Compatibility Explorer
    injectCompatibilityExplorer(aboutSection);

    // 5. Inject an Interactive Quick FAQ Accordion
    injectFAQSection(aboutSection);

    // 6. Live stats: update when the dashboard announces numbers; refresh whenever About is opened
    document.addEventListener('bb:stats', function (e) { setStats(e.detail); });
    window.addEventListener('hashchange', function () {
      if (location.hash === '#about' && window.BloodBankDashboard) BloodBankDashboard.refresh();
    });
  }

  // Run immediately or when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* -------------------------------------------------------------
   * 1. Dynamic CSS Injection
   * ------------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById('about-interactive-styles')) return;
    const style = document.createElement('style');
    style.id = 'about-interactive-styles';
    style.textContent = `
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

  function enhanceAboutCards(aboutSection) {
    const cards = aboutSection.querySelectorAll('.about-grid .card');
    const details = [
      {
        title: "Dashboard Overview Feature",
        desc: "Provides real-time visibility into current inventory levels. Displays exact percentages for all 8 blood groups and total bags separated by components.",
        tip: "Click on any arrow icon in the dashboard cards to bring up quick data breakdowns!"
      },
      {
        title: "Database Management Feature",
        desc: "Maintains relational integrity between donors and collected blood bags using Foreign Keys (donor_id). Enables inline search and status tracking.",
        tip: "Deleting a donor automatically cleans up associated blood bags to prevent orphan records."
      },
      {
        title: "Unified New Entry System",
        desc: "Streamlines data input by combining donor registration and blood bag logging into a single workflow.",
        tip: "You can easily access this page anytime via the '+ New Entry' button!"
      }
    ];

    cards.forEach((card, index) => {
      if (card.querySelector('.about-card-badge')) return;
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const info = details[index];
      if (info) {
        const badge = document.createElement('div');
        badge.className = 'about-card-badge';
        badge.innerHTML = `<span>Click to explore</span>`;
        card.appendChild(badge);

        const openModal = () => {
          const detailDialog = document.getElementById('detail-dialog');
          if (!detailDialog) return;

          document.getElementById('detail-title').textContent = info.title;
          document.getElementById('detail-desc').textContent = info.desc;

          detailDialog.querySelectorAll('[data-detail-body]').forEach(el => el.hidden = true);

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
                💡 <strong>Feature Insight:</strong> ${info.tip}
              </p>
            </div>
          `;
          detailDialog.showModal();
        };

        card.addEventListener('click', openModal);
      }
    });
  }

  function injectCompatibilityExplorer(aboutSection) {
    if (document.getElementById('compat-widget')) return;

    const compatData = {
      "O-":  { give: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], receive: ["O-"] },
      "O+":  { give: ["O+", "A+", "B+", "AB+"], receive: ["O+", "O-"] },
      "A-":  { give: ["A-", "A+", "AB-", "AB+"], receive: ["A-", "O-"] },
      "A+":  { give: ["A+", "AB+"], receive: ["A+", "A-", "O+", "O-"] },
      "B-":  { give: ["B-", "B+", "AB-", "AB+"], receive: ["B-", "O-"] },
      "B+":  { give: ["B+", "AB+"], receive: ["B+", "B-", "O+", "O-"] },
      "AB-": { give: ["AB-", "AB+"], receive: ["AB-", "A-", "B-", "O-"] },
      "AB+": { give: ["AB+"], receive: ["Everyone (Universal Recipient)"] }
    };

    const widget = document.createElement('article');
    widget.id = 'compat-widget';
    widget.className = 'interactive-widget-card';

    widget.innerHTML = `
      <div class="widget-title">Red Blood Cell Compatibility Tool</div>
      <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 14px;">Select a blood type to see which red cell donations it can give and receive. Plasma and platelets follow different rules.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;" id="type-btn-container">
        ${Object.keys(compatData).map((type, idx) => `
          <button type="button" class="type-selector-btn ${idx === 0 ? 'active' : ''}" data-type="${type}">${type}</button>
        `).join('')}
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

    function updateCompat(type) {
      const info = compatData[type];
      if (!info) return;
      giveContainer.innerHTML = info.give.map(t => `<span class="type-tag">${t}</span>`).join('');
      receiveContainer.innerHTML = info.receive.map(t => `<span class="type-tag">${t}</span>`).join('');
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCompat(btn.dataset.type);
      });
    });

    updateCompat('O-');
  }

  function injectFAQSection(aboutSection) {
    if (document.getElementById('about-faq-widget')) return;

    const faqs = [
      { q: "How often can donors donate blood?", a: "Whole blood donors usually need to wait at least 8 to 12 weeks between donations. The exact interval depends on local guidelines." },
      { q: "Does this system assign blood bags to patients?", a: "No. It tracks inventory only. In practice, staff match units to patients by blood type compatibility, the component needed, and expiry date, and the filters on the Database tab help find suitable bags." }
    ];

    const faqCard = document.createElement('article');
    faqCard.id = 'about-faq-widget';
    faqCard.className = 'interactive-widget-card';
    faqCard.style.marginTop = '16px';

    faqCard.innerHTML = `
      <div class="widget-title">Frequently Asked Questions</div>
      <div style="margin-top: 10px;">
        ${faqs.map((faq) => `
          <div class="faq-item">
            <button type="button" class="faq-trigger" aria-expanded="false">
              <span>${faq.q}</span>
              <span class="faq-icon">+</span>
            </button>
            <div class="faq-content">
              <p>${faq.a}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    aboutSection.appendChild(faqCard);

    faqCard.querySelectorAll('.faq-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        faqCard.querySelectorAll('.faq-item').forEach(i => {
          i.classList.remove('open');
          i.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* ---------- Live stats ---------- */
  function setStats(d) {
    var s = d.statuses || {};
    var values = { donors: d.donors, total: d.total, stored: s.Stored, expired: s.Expired };
    document.querySelectorAll('#about-stats-banner .stat-number').forEach(function (el) {
      countTo(el, Number(values[el.dataset.key]) || 0);
    });
  }

  function countTo(el, target) {
    clearInterval(el._timer);
    var reduce = document.documentElement.getAttribute('data-motion') === 'reduce' ||
      (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var current = parseInt(el.textContent, 10) || 0;
    if (reduce || current === target) { el.textContent = target; return; }

    var dir = target > current ? 1 : -1;
    var step = Math.max(1, Math.ceil(Math.abs(target - current) / 25));
    el._timer = setInterval(function () {
      current += dir * step;
      if ((dir > 0 && current >= target) || (dir < 0 && current <= target)) {
        current = target;
        clearInterval(el._timer);
      }
      el.textContent = current;
    }, 30);
  }

})();