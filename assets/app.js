(() => {
  const data = window.SESSION_EMAIL_DATA || { groups: [], sessions: [] };
  const state = { activeSessionId: null, query: '' };
  const elements = {
    homeView: document.getElementById('home-view'),
    homeGrid: document.getElementById('home-grid'),
    sessionView: document.getElementById('session-view'),
    mainContent: document.getElementById('main-content'),
    desktopNavigation: document.getElementById('desktop-navigation'),
    mobileNavigation: document.getElementById('mobile-session-navigation'),
    mobileOffcanvas: document.getElementById('mobile-navigation'),
    searchInputs: [
      document.getElementById('desktop-search'),
      document.getElementById('mobile-search')
    ].filter(Boolean)
  };

  function sessionsForGroup(groupId) {
    return data.sessions.filter((session) => session.group === groupId);
  }

  function renderNavigation(container, prefix) {
    container.replaceChildren();

    data.groups.forEach((group) => {
      const sessions = sessionsForGroup(group.id);
      if (!sessions.length) return;

      const section = document.createElement('section');
      section.className = 'nav-group';
      const collapseId = `${prefix}-group-${group.id}`;
      const heading = document.createElement('button');
      heading.className = 'nav-group-toggle';
      heading.type = 'button';
      heading.setAttribute('data-bs-toggle', 'collapse');
      heading.setAttribute('data-bs-target', `#${collapseId}`);
      heading.setAttribute('aria-expanded', 'true');
      heading.setAttribute('aria-controls', collapseId);
      const label = document.createElement('span');
      label.textContent = group.label;
      const chevron = document.createElement('span');
      chevron.className = 'nav-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      heading.append(label, chevron);

      const collapse = document.createElement('div');
      collapse.className = 'collapse show';
      collapse.id = collapseId;
      const list = document.createElement('div');
      list.className = 'list-group list-group-flush session-list';

      sessions.forEach((session) => {
        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action session-link';
        item.href = `#${encodeURIComponent(session.id)}`;
        item.dataset.sessionId = session.id;
        item.dataset.searchText = `${session.title} ${session.duration} ${group.label}`.toLowerCase();
        const title = document.createElement('span');
        title.className = 'session-link-title';
        title.textContent = session.title;
        const duration = document.createElement('span');
        duration.className = 'session-link-duration';
        duration.textContent = session.duration;
        item.append(title, duration);
        item.addEventListener('click', closeMobileNavigation);
        list.append(item);
      });

      collapse.append(list);
      section.append(heading, collapse);
      container.append(section);
    });
  }

  function renderHomeGrid() {
    elements.homeGrid.replaceChildren();
    data.groups.forEach((group) => {
      const sessions = sessionsForGroup(group.id);
      if (!sessions.length) return;
      const card = document.createElement('a');
      card.className = 'home-card';
      card.href = `#${encodeURIComponent(sessions[0].id)}`;
      card.style.setProperty('--group-color', group.color);
      const label = document.createElement('span');
      label.className = 'home-card-label';
      label.textContent = group.label;
      const count = document.createElement('span');
      count.className = 'home-card-count';
      count.textContent = sessions.length;
      const suffix = document.createElement('span');
      suffix.className = 'home-card-suffix';
      suffix.textContent = `session${sessions.length === 1 ? '' : 's'}`;
      card.append(label, count, suffix);
      elements.homeGrid.append(card);
    });
  }

  function bindSearch() {
    elements.searchInputs.forEach((input) => {
      input.addEventListener('input', () => {
        state.query = input.value.toLowerCase().trim();
        elements.searchInputs.forEach((other) => { if (other !== input) other.value = input.value; });
        filterNavigation();
      });
    });
  }

  function filterNavigation() {
    document.querySelectorAll('.portal-nav').forEach((nav) => {
      let visibleTotal = 0;
      nav.querySelectorAll('.nav-group').forEach((group) => {
        let visibleInGroup = 0;
        group.querySelectorAll('.session-link').forEach((link) => {
          const match = !state.query || link.dataset.searchText.includes(state.query);
          link.classList.toggle('d-none', !match);
          if (match) visibleInGroup += 1;
        });
        group.classList.toggle('d-none', visibleInGroup === 0);
        visibleTotal += visibleInGroup;
      });
      nav.querySelector('.portal-nav-empty')?.remove();
      if (state.query && visibleTotal === 0) {
        const empty = document.createElement('p');
        empty.className = 'portal-nav-empty';
        empty.textContent = 'No sessions match your search.';
        nav.append(empty);
      }
    });
  }

  function routeFromHash() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    const session = data.sessions.find((item) => item.id === id);
    if (!id || !session) showHome();
    else showSession(session);
  }

  function showHome() {
    state.activeSessionId = null;
    elements.homeView.classList.remove('d-none');
    elements.sessionView.classList.add('d-none');
    elements.sessionView.replaceChildren();
    document.title = 'Aptem implementation email portal';
    updateActiveNavigation();
  }

  function showSession(session) {
    state.activeSessionId = session.id;
    elements.homeView.classList.add('d-none');
    elements.sessionView.classList.remove('d-none');
    renderSession(session);
    document.title = `${session.title} | Aptem implementation email portal`;
    updateActiveNavigation();
    window.scrollTo({ top: 0, behavior: 'auto' });
    elements.mainContent.focus({ preventScroll: true });
  }

  function updateActiveNavigation() {
    document.querySelectorAll('.session-link').forEach((link) => {
      const active = link.dataset.sessionId === state.activeSessionId;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function renderSession(session) {
    elements.sessionView.replaceChildren();
    elements.sessionView.append(renderSessionToolbar(), renderHero(session));
    const guide = document.createElement('section');
    guide.className = 'session-guide';
    guide.setAttribute('aria-label', `${session.title} suggested emails`);
    guide.append(
      renderEmailCard('Suggested pre-session email', session.preEmail, 'Copy pre-session email'),
      renderEmailCard('Suggested post-session email', session.postEmail, 'Copy post-session email')
    );
    elements.sessionView.append(guide);
  }

  function renderSessionToolbar() {
    const toolbar = document.createElement('nav');
    toolbar.className = 'session-toolbar';
    toolbar.setAttribute('aria-label', 'Session navigation');
    const homeLink = document.createElement('a');
    homeLink.className = 'btn btn-outline-secondary btn-sm session-home-link';
    homeLink.href = '#';
    homeLink.textContent = 'All sessions';
    toolbar.append(homeLink);
    return toolbar;
  }

  function renderHero(session) {
    const group = data.groups.find((item) => item.id === session.group);
    const hero = document.createElement('header');
    hero.className = 'session-hero';
    const groupLabel = document.createElement('p');
    groupLabel.className = 'session-group';
    groupLabel.textContent = group?.label || session.group;
    const title = document.createElement('h1');
    title.className = 'session-title';
    title.textContent = session.title;
    hero.append(groupLabel, title);
    return hero;
  }

  function renderEmailCard(title, email, copyLabel) {
    const card = document.createElement('section');
    card.className = 'guide-card guide-card-email';
    const heading = document.createElement('h2');
    heading.className = 'guide-card-title';
    heading.textContent = title;
    const copy = document.createElement('button');
    copy.className = 'btn btn-sm guide-copy-button guide-email-copy';
    copy.type = 'button';
    copy.textContent = copyLabel;
    copy.addEventListener('click', () => copyText(email, copy, copyLabel));
    const body = document.createElement('pre');
    body.className = 'guide-email-body';
    body.textContent = email;
    card.append(heading, copy, body);
    return card;
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Use the fallback for browsers that block clipboard access on local pages.
      }
    }
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.setAttribute('readonly', '');
    fallback.style.cssText = 'position:fixed;opacity:0';
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    return copied;
  }

  async function copyText(text, button, label) {
    button.textContent = (await writeClipboard(text)) ? 'Copied' : 'Copy unavailable';
    setTimeout(() => { button.textContent = label; }, 1600);
  }

  function closeMobileNavigation() {
    if (!window.bootstrap || !elements.mobileOffcanvas) return;
    window.bootstrap.Offcanvas.getInstance(elements.mobileOffcanvas)?.hide();
  }

  renderNavigation(elements.desktopNavigation, 'desktop');
  renderNavigation(elements.mobileNavigation, 'mobile');
  renderHomeGrid();
  bindSearch();
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();
})();
