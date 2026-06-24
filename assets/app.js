(() => {
  const sessions = window.SESSION_EMAILS || [];
  const navigation = document.getElementById('session-navigation');
  const emailView = document.getElementById('email-view');
  const search = document.getElementById('session-search');

  function activeSession() {
    const id = decodeURIComponent(location.hash.slice(1));
    return sessions.find((session) => session.id === id) || sessions[0];
  }

  function renderNavigation() {
    const query = search.value.trim().toLowerCase();
    navigation.replaceChildren();
    const visible = sessions.filter(({ title }) => title.toLowerCase().includes(query));

    if (!visible.length) {
      const message = document.createElement('p');
      message.className = 'no-results';
      message.textContent = 'No matching session.';
      navigation.append(message);
      return;
    }

    visible.forEach((session) => {
      const link = document.createElement('a');
      link.className = 'session-link';
      link.href = `#${encodeURIComponent(session.id)}`;
      link.textContent = session.title;
      if (session.id === activeSession().id) link.setAttribute('aria-current', 'page');
      navigation.append(link);
    });
  }

  function renderEmailMarkdown(markdown) {
    const fragment = document.createDocumentFragment();
    let list;
    const flushList = () => { list = null; };

    markdown.split('\n').forEach((line) => {
      if (!line.trim()) { flushList(); return; }
      const subject = line.match(/^\*\*Subject:\*\*\s*(.+)$/);
      if (subject) {
        flushList();
        const subjectLine = document.createElement('p');
        subjectLine.className = 'subject';
        subjectLine.textContent = `Subject: ${subject[1]}`;
        fragment.append(subjectLine);
        return;
      }
      const bold = line.match(/^\*\*(.+)\*\*$/);
      if (bold) {
        flushList();
        const heading = document.createElement('h3');
        heading.textContent = bold[1];
        fragment.append(heading);
        return;
      }
      if (line.startsWith('- ')) {
        if (!list) { list = document.createElement('ul'); fragment.append(list); }
        const item = document.createElement('li');
        item.textContent = line.slice(2);
        list.append(item);
        return;
      }
      flushList();
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      fragment.append(paragraph);
    });
    return fragment;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through for browsers that block Clipboard API access on local pages.
      }
    }

    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    return copied;
  }

  async function copyEmail(email, button, label) {
    const plainText = email.replaceAll('**', '');
    try {
      button.textContent = (await copyText(plainText)) ? 'Copied' : 'Copy unavailable';
    } catch {
      button.textContent = 'Copy unavailable';
    }
    setTimeout(() => { button.textContent = label; }, 1600);
  }

  function renderEmailSection(title, email, copyLabel) {
    const section = document.createElement('section');
    section.className = 'email-section';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const actions = document.createElement('div');
    actions.className = 'email-actions';
    const copy = document.createElement('button');
    copy.className = 'copy-button';
    copy.type = 'button';
    copy.textContent = copyLabel;
    copy.addEventListener('click', () => copyEmail(email, copy, copyLabel));
    actions.append(copy);
    const emailCard = document.createElement('article');
    emailCard.className = 'email-card';
    emailCard.setAttribute('aria-label', `${title} suggested email`);
    emailCard.append(renderEmailMarkdown(email));
    section.append(heading, actions, emailCard);
    return section;
  }

  function renderSession() {
    const session = activeSession();
    if (!session) return;
    document.title = `${session.title} | Aptem Implementation Session Emails`;
    emailView.replaceChildren();
    const title = document.createElement('h1');
    title.className = 'session-title';
    title.textContent = session.title;
    const emails = document.createElement('div');
    emails.className = 'email-sections';
    emails.append(
      renderEmailSection('Pre-session email', session.preEmail, 'Copy pre-session email'),
      renderEmailSection('Post-session email', session.postEmail, 'Copy post-session email')
    );
    emailView.append(title, emails);
    renderNavigation();
  }

  search.addEventListener('input', renderNavigation);
  window.addEventListener('hashchange', renderSession);
  renderSession();
})();
