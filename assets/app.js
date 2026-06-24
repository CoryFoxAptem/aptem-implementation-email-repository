(() => {
  const data = window.SESSION_EMAIL_DATA || { groups: [], sessions: [] };
  const state = {
    activeSessionId: null,
    activeEmailTab: 'pre',
    query: '',
    fourFourBySession: new Map(),
    emailDrafts: new Map(),
    editorSelections: new WeakMap()
  };
  const elements = {
    homeView: document.getElementById('home-view'),
    homeGrid: document.getElementById('home-grid'),
    sessionView: document.getElementById('session-view'),
    mainContent: document.getElementById('main-content'),
    desktopNavigation: document.getElementById('desktop-navigation'),
    mobileNavigation: document.getElementById('mobile-session-navigation'),
    mobileOffcanvas: document.getElementById('mobile-navigation'),
    searchInputs: [document.getElementById('desktop-search'), document.getElementById('mobile-search')].filter(Boolean)
  };

  const sessionsForGroup = (groupId) => data.sessions.filter((session) => session.group === groupId);

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
    elements.searchInputs.forEach((input) => input.addEventListener('input', () => {
      state.query = input.value.toLowerCase().trim();
      elements.searchInputs.forEach((other) => { if (other !== input) other.value = input.value; });
      filterNavigation();
    }));
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
    if (state.activeSessionId !== session.id) state.activeEmailTab = 'pre';
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
      link.toggleAttribute('aria-current', active);
      if (active) link.setAttribute('aria-current', 'page');
    });
  }

  function renderSession(session) {
    elements.sessionView.replaceChildren();
    elements.sessionView.append(renderSessionToolbar(), renderHero(session), renderEmailWorkspace(session));
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

  function renderEmailWorkspace(session) {
    const workspace = document.createElement('section');
    workspace.className = 'email-workspace';
    workspace.setAttribute('aria-label', `${session.title} suggested emails`);
    const tabs = document.createElement('div');
    tabs.className = 'email-tabs';
    tabs.setAttribute('role', 'tablist');
    const panel = document.createElement('div');
    panel.className = 'session-guide';
    panel.id = `email-panel-${session.id}`;

    [['pre', 'Pre-session email'], ['post', 'Post-session email']].forEach(([id, label]) => {
      const tab = document.createElement('button');
      const active = state.activeEmailTab === id;
      tab.className = `email-tab${active ? ' active' : ''}`;
      tab.type = 'button';
      tab.id = `${session.id}-${id}-tab`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('aria-controls', panel.id);
      tab.textContent = label;
      tab.addEventListener('click', () => {
        state.activeEmailTab = id;
        renderSession(session);
      });
      tabs.append(tab);
    });

    if (state.activeEmailTab === 'post') {
      panel.append(renderFourFourUploader(session));
      panel.append(renderEmailCard(session, 'post', 'Suggested post-session email', 'Copy post-session email'));
    } else {
      panel.append(renderEmailCard(session, 'pre', 'Suggested pre-session email', 'Copy pre-session email'));
    }
    workspace.append(tabs, panel);
    return workspace;
  }

  function renderFourFourUploader(session) {
    const card = document.createElement('section');
    card.className = 'guide-card fourfour-card';
    const heading = document.createElement('h2');
    heading.className = 'guide-card-title';
    heading.textContent = 'Tailor this post-session email with Four/Four';
    const copy = document.createElement('p');
    copy.className = 'fourfour-copy';
    copy.textContent = 'Upload your Four/Four EML summary file here. It is read only in this browser and is not stored or sent anywhere.';
    const label = document.createElement('label');
    label.className = 'btn btn-sm guide-copy-button fourfour-upload-label';
    label.textContent = 'Upload Four/Four EML file';
    const input = document.createElement('input');
    input.className = 'visually-hidden';
    input.type = 'file';
    input.accept = '.eml,message/rfc822';
    label.append(input);
    const status = document.createElement('p');
    status.className = 'fourfour-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      status.className = 'fourfour-status';
      status.textContent = 'Reading Four/Four summary…';
      try {
        const summary = await parseFourFourFile(file);
        state.fourFourBySession.set(session.id, summary);
        renderSession(session);
      } catch (error) {
        status.className = 'fourfour-status is-error';
        status.textContent = error instanceof Error ? error.message : 'The Four/Four file could not be read.';
        input.value = '';
      }
    });

    const parsed = state.fourFourBySession.get(session.id);
    if (parsed) {
      const details = document.createElement('div');
      details.className = 'fourfour-details';
      const summary = document.createElement('p');
      const parsedActionCount = parsed.clientActions.length + parsed.aptemActions.length + parsed.sharedActions.length;
      summary.textContent = parsedActionCount
        ? `Added ${parsedActionCount} Four/Four action(s) for ${parsed.clientName || 'this customer'}. The original session-template actions are still retained.`
        : 'No Four/Four action items were detected. The original post-session actions have been retained as the fallback.';
      details.append(summary);
      if (parsed.videoUrl) {
        const recording = document.createElement('a');
        recording.href = parsed.videoUrl;
        recording.target = '_blank';
        recording.rel = 'noopener noreferrer';
        recording.textContent = 'Four/Four recording and summary';
        details.append(recording);
      } else {
        const note = document.createElement('p');
        note.textContent = 'No Four/Four conversation link was found in this summary.';
        details.append(note);
      }
      const clear = document.createElement('button');
      clear.className = 'btn btn-sm guide-copy-button';
      clear.type = 'button';
      clear.textContent = 'Remove Four/Four details';
      clear.addEventListener('click', () => {
        state.fourFourBySession.delete(session.id);
        renderSession(session);
      });
      details.append(clear);
      card.append(heading, copy, label, details);
    } else {
      card.append(heading, copy, label, status);
    }
    return card;
  }

  function renderEmailCard(session, type, title, copyLabel) {
    const key = emailDraftKey(session, type);
    const suggestedEmail = plainTextToEmailHtml(suggestedEmailFor(session, type));
    const email = state.emailDrafts.get(key) ?? suggestedEmail;
    const card = document.createElement('section');
    card.className = 'guide-card guide-card-email';
    const heading = document.createElement('h2');
    heading.className = 'guide-card-title';
    heading.textContent = title;
    const hint = document.createElement('p');
    hint.className = 'guide-email-hint';
    hint.textContent = 'Edit this email directly before copying. Your changes stay available while this page is open.';
    const actions = document.createElement('div');
    actions.className = 'guide-email-actions';
    const copy = document.createElement('button');
    copy.className = 'btn btn-sm guide-copy-button guide-email-copy';
    copy.type = 'button';
    copy.textContent = copyLabel;
    const reset = document.createElement('button');
    reset.className = 'btn btn-sm guide-copy-button guide-email-reset';
    reset.type = 'button';
    reset.textContent = 'Restore suggested email';
    const body = document.createElement('div');
    body.className = 'guide-email-body';
    body.id = `${session.id}-${type}-email`;
    body.contentEditable = 'true';
    body.setAttribute('role', 'textbox');
    body.setAttribute('aria-multiline', 'true');
    body.spellcheck = true;
    body.setAttribute('aria-label', `${title} content`);
    body.innerHTML = email;
    body.addEventListener('input', () => {
      state.emailDrafts.set(key, body.innerHTML);
      saveEditorSelection(body);
    });
    body.addEventListener('focus', () => saveEditorSelection(body));
    body.addEventListener('keyup', () => saveEditorSelection(body));
    body.addEventListener('mouseup', () => saveEditorSelection(body));
    const toolbar = renderEditorToolbar(body);
    copy.addEventListener('click', () => copyText(editorPlainText(body), body.innerHTML, copy, copyLabel));
    reset.addEventListener('click', () => {
      state.emailDrafts.delete(key);
      body.innerHTML = suggestedEmail;
      body.focus();
    });
    actions.append(copy, reset);
    card.append(heading, hint, actions, toolbar, body);
    return card;
  }

  function emailDraftKey(session, type) {
    return `${session.id}:${type}`;
  }

  function suggestedEmailFor(session, type) {
    return type === 'post' ? buildPostEmail(session) : session.preEmail;
  }

  function renderEditorToolbar(editor) {
    const toolbar = document.createElement('div');
    toolbar.className = 'guide-email-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Email formatting');
    [
      ['bold', 'Bold', 'B'],
      ['italic', 'Italic', 'I'],
      ['underline', 'Underline', 'U'],
      ['insertUnorderedList', 'Bulleted list', '• List'],
      ['insertOrderedList', 'Numbered list', '1. List'],
      ['createLink', 'Add link', 'Link']
    ].forEach(([command, label, text]) => {
      const button = document.createElement('button');
      button.className = 'guide-editor-button';
      button.type = 'button';
      button.textContent = text;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => applyEditorCommand(editor, command));
      toolbar.append(button);
    });
    return toolbar;
  }

  function applyEditorCommand(editor, command) {
    let value = null;
    if (command === 'createLink') {
      value = window.prompt('Paste the web address for this link:');
      if (!value) return;
      if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    }
    editor.focus();
    restoreEditorSelection(editor);
    document.execCommand(command, false, value);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function saveEditorSelection(editor) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return;
    state.editorSelections.set(editor, selection.getRangeAt(0).cloneRange());
  }

  function restoreEditorSelection(editor) {
    const range = state.editorSelections.get(editor);
    if (!range) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function plainTextToEmailHtml(email) {
    return email.trim().split(/\n{2,}/).map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => line.startsWith('- '))) {
        return `<ul>${lines.map((line) => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
    }).join('');
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  }

  function editorPlainText(editor) {
    return editor.innerText.replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildPostEmail(session) {
    const details = state.fourFourBySession.get(session.id);
    if (!details) return session.postEmail;

    const template = parsePostTemplate(session.postEmail);
    const customerActions = mergeActions(template.actions, details.clientActions, details.sharedActions);
    const lines = [template.subject, '', template.introduction];

    if (details.videoUrl) {
      lines.push('', `You can revisit the Four/Four recording and session summary here: ${details.videoUrl}`);
    }

    appendActions(lines, 'Session summary', template.summary);
    appendActions(lines, 'Session outcomes', template.outcomes);
    appendActions(lines, 'Agreed actions for your team', customerActions);
    appendActions(lines, 'Aptem follow-up', mergeActions(details.aptemActions));
    lines.push('', ...template.closing);
    return lines.join('\n');
  }

  function appendActions(lines, heading, actions) {
    if (!actions.length) return;
    lines.push('', heading, '', ...actions.map((action) => `- ${action}`));
  }

  function parsePostTemplate(email) {
    const subject = email.split('\n', 1)[0];
    const introduction = textBeforeSection(email, 'Session summary').replace(/^Subject:.*\n\n/, '').trim();
    return {
      subject,
      introduction,
      summary: listFromSection(email, 'Session summary', 'Session outcomes'),
      outcomes: listFromSection(email, 'Session outcomes', 'Actions for your team'),
      actions: listFromSection(email, 'Actions for your team', 'Please complete the agreed actions'),
      closing: textAfterSection(email, 'Please complete the agreed actions').split('\n').filter(Boolean)
    };
  }

  function textBeforeSection(email, heading) {
    return email.split(`\n\n${heading}\n\n`, 1)[0];
  }

  function textAfterSection(email, opening) {
    const index = email.indexOf(opening);
    return index === -1 ? '' : email.slice(index);
  }

  function listFromSection(email, heading, nextHeading) {
    const start = email.indexOf(`\n\n${heading}\n\n`);
    if (start === -1) return [];
    const contentStart = start + heading.length + 4;
    const end = email.indexOf(`\n\n${nextHeading}`, contentStart);
    const content = email.slice(contentStart, end === -1 ? undefined : end);
    return content.split('\n').filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
  }

  function mergeActions(...collections) {
    const actions = collections.flat().filter(Boolean);
    return actions.filter((action, index) => actions.findIndex((candidate) => actionsMatch(candidate, action)) === index);
  }

  function actionsMatch(left, right) {
    const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const leftValue = normalise(left);
    const rightValue = normalise(right);
    return leftValue === rightValue || (leftValue.length > 24 && rightValue.length > 24 && (leftValue.includes(rightValue) || rightValue.includes(leftValue)));
  }

  async function parseFourFourFile(file) {
    if (!file.name.toLowerCase().endsWith('.eml')) {
      throw new Error('Please upload a .eml file exported from a Four/Four email summary.');
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      throw new Error('This EML file is empty or larger than 5 MB. Please use the Four/Four summary email file.');
    }
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(await file.arrayBuffer());
    const headers = parseHeaders(raw);
    const from = headers.from || '';
    const subject = decodeMimeWords(headers.subject || '');
    if (!/(four\/?four|fourfour)/i.test(`${from} ${subject}`)) {
      throw new Error('This does not look like a Four/Four summary email. Upload the .eml file headed “ready to view in Four/Four”.');
    }
    const body = extractMimePart(raw, 'text/html') || extractMimePart(raw, 'text/plain');
    if (!body) throw new Error('The Four/Four email body could not be read. Please upload the original .eml summary file.');
    return { ...parseFourFourSummary(body, subject), fileName: file.name };
  }

  function parseHeaders(raw) {
    const headerBlock = raw.split(/\r?\n\r?\n/, 1)[0].replace(/\r?\n[ \t]+/g, ' ');
    return headerBlock.split(/\r?\n/).reduce((headers, line) => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match && !headers[match[1].toLowerCase()]) headers[match[1].toLowerCase()] = match[2].trim();
      return headers;
    }, {});
  }

  function extractMimePart(raw, type) {
    const expression = new RegExp(`Content-Type:\\s*${type.replace('/', '\\/')}\\b([\\s\\S]*?)\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n--[^\\r\\n]+|$)`, 'ig');
    const match = expression.exec(raw);
    if (!match) return '';
    const headers = match[1];
    const content = match[2];
    if (/content-transfer-encoding:\s*base64/i.test(headers)) return decodeBase64(content);
    if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) return decodeQuotedPrintable(content);
    return content;
  }

  function decodeBase64(value) {
    try {
      const binary = atob(value.replace(/\s/g, ''));
      return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    } catch {
      return '';
    }
  }

  function decodeQuotedPrintable(value) {
    const source = value.replace(/=\r?\n/g, '');
    const bytes = [];
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] === '=' && /^[0-9a-f]{2}$/i.test(source.slice(index + 1, index + 3))) {
        bytes.push(Number.parseInt(source.slice(index + 1, index + 3), 16));
        index += 2;
      } else {
        bytes.push(source.charCodeAt(index) & 0xff);
      }
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  }

  function decodeMimeWords(value) {
    return value.replace(/=\?[^?]+\?([bq])\?([^?]*)\?=/ig, (full, encoding, payload) => {
      if (encoding.toLowerCase() === 'b') return decodeBase64(payload);
      return decodeQuotedPrintable(payload.replace(/_/g, ' '));
    });
  }

  function parseFourFourSummary(body, subject) {
    const document = new DOMParser().parseFromString(body, 'text/html');
    document.querySelectorAll('style, script, noscript').forEach((node) => node.remove());
    const clientName = extractClientName(subject);
    const actionItems = extractActionItems(document);
    const grouped = { clientActions: [], aptemActions: [], sharedActions: [] };
    actionItems.forEach((item) => grouped[classifyAction(item.text, item.label, clientName)].push(item.text));
    return { clientName, videoUrl: extractConversationLink(document), ...grouped };
  }

  function extractClientName(subject) {
    const match = subject.match(/conversation with\s+(.+?)\s+is ready to view in four\/?four/i);
    return match?.[1]?.trim() || '';
  }

  function extractActionItems(document) {
    const items = [];
    const headings = [...document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]
      .filter((node) => /^Action Items?\b/i.test(normaliseText(node.textContent)));

    headings.forEach((heading) => {
      const label = normaliseText(heading.textContent);
      const list = followingActionList(heading);
      if (!list) return;
      [...list.children]
        .filter((item) => item.tagName === 'LI')
        .map((item) => normaliseText(item.textContent))
        .filter(Boolean)
        .forEach((text) => items.push({ text, label }));
    });
    return [...new Map(items.map((item) => [item.text.toLowerCase(), item])).values()];
  }

  function followingActionList(heading) {
    let sibling = heading.nextElementSibling;
    while (sibling) {
      if (sibling.matches('ul, ol')) return sibling;
      if (/^(p|h[1-6])$/i.test(sibling.tagName)) return null;
      const nestedList = sibling.querySelector('ul, ol');
      if (nestedList) return nestedList;
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  function classifyAction(text, label, clientName) {
    const lower = text.toLowerCase();
    const labelLower = label.toLowerCase();
    if (/^(aptem|sales|product|implementation|support|project management)\b/i.test(text) || /\baptem\b.*\b(to|will|should|can)\b/i.test(text)) return 'aptemActions';
    if (/sales|product/.test(labelLower)) return 'aptemActions';
    if (clientName && lower.includes(clientName.toLowerCase())) return 'clientActions';
    const clientTerms = clientName.toLowerCase().split(/\s+/).filter((term) => term.length > 3 && !['limited', 'trading', 'management'].includes(term));
    if (clientTerms.some((term) => lower.startsWith(term) || lower.includes(`${term} to `))) return 'clientActions';
    if (/^(customer|client|they)\b/i.test(text)) return 'clientActions';
    if (/customer|client/.test(labelLower) && !/sales|product/.test(labelLower)) return 'clientActions';
    return 'sharedActions';
  }

  function extractConversationLink(document) {
    const links = [];
    document.querySelectorAll('a').forEach((anchor) => {
      const label = normaliseText(anchor.textContent).toLowerCase();
      ['title', 'href', 'originalsrc', 'alt'].forEach((attribute) => {
        const url = unwrapConversationUrl(anchor.getAttribute(attribute) || '');
        if (url) links.push({ url, shared: /share conversation|action=share/i.test(`${label} ${url}`) });
      });
    });
    return links.find((link) => link.shared)?.url || links[0]?.url || '';
  }

  function unwrapConversationUrl(value) {
    let candidate = value.trim();
    for (let attempts = 0; attempts < 2; attempts += 1) {
      try {
        const parsed = new URL(candidate);
        candidate = parsed.searchParams.get('redirect') || candidate;
      } catch {
        try { candidate = decodeURIComponent(candidate); } catch { return ''; }
      }
    }
    const match = candidate.match(/https:\/\/fourfour\.ai\/conversations\/[^?&#\s]+(?:\?[^#\s]*)?/i);
    return match ? match[0] : '';
  }

  function normaliseText(value) {
    return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function writeClipboard(text, html = '') {
    if (html && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' })
        })]);
        return true;
      } catch { /* Use the text fallback. */ }
    }
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* Use fallback. */ }
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

  async function copyText(text, html, button, label) {
    button.textContent = (await writeClipboard(text, html)) ? 'Copied' : 'Copy unavailable';
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
