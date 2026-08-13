document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  let tasks = [];
  let filter = 'all';

  const $ = (id) => document.getElementById(id);

  const loginStage = $('loginStage');
  const appStage = $('appStage');
  const loginView = $('loginView');
  const signupView = $('signupView');
  const coverSub = $('coverSub');

  // ---------- Storage Helpers (localStorage Fallback) ----------
  async function getAccounts() {
    try {
      if (window.storage) {
        const r = await window.storage.get('dayline:accounts', false);
        return r ? JSON.parse(r.value) : {};
      }
      return JSON.parse(localStorage.getItem('dayline:accounts') || '{}');
    } catch (e) {
      return {};
    }
  }

  async function saveAccounts(accounts) {
    try {
      if (window.storage) {
        await window.storage.set('dayline:accounts', JSON.stringify(accounts), false);
      } else {
        localStorage.setItem('dayline:accounts', JSON.stringify(accounts));
      }
    } catch (e) {
      console.error('Save accounts failed', e);
    }
  }

  async function getTasks(username) {
    try {
      if (window.storage) {
        const r = await window.storage.get('dayline:tasks:' + username, false);
        return r ? JSON.parse(r.value) : [];
      }
      return JSON.parse(localStorage.getItem('dayline:tasks:' + username) || '[]');
    } catch (e) {
      return [];
    }
  }

  async function saveTasks(username, list) {
    try {
      if (window.storage) {
        await window.storage.set('dayline:tasks:' + username, JSON.stringify(list), false);
      } else {
        localStorage.setItem('dayline:tasks:' + username, JSON.stringify(list));
      }
    } catch (e) {
      console.error('Save tasks failed', e);
    }
  }

  // Simple string hash
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }

  // ---------- Auto-Fill Logic ----------
  function autoFillSignupDetails() {
    const id = Math.floor(1000 + Math.random() * 9000);
    $('fullName').value = "User " + id;
    $('email').value = "user" + id + "@example.com";
    $('username').value = "user" + id;
    $('password').value = "password123";
    $('confirmPassword').value = "password123";
  }

  // ---------- View Switching ----------
  function showLogin() {
    loginView.classList.remove('hidden');
    signupView.classList.add('hidden');
    coverSub.textContent = 'A little notebook for your to-dos.';
    $('authError').textContent = '';
  }

  function showSignup() {
    signupView.classList.remove('hidden');
    loginView.classList.add('hidden');
    coverSub.textContent = 'Set up your notebook in a few seconds.';
    $('authError').textContent = '';
    autoFillSignupDetails();
  }

  $('toSignup').addEventListener('click', showSignup);
  $('toLogin').addEventListener('click', showLogin);

  // ---------- Authentication ----------
  $('signupBtn').addEventListener('click', async () => {
    const name = $('fullName').value.trim();
    const u = $('username').value.trim();
    const e = $('email').value.trim();
    const p = $('password').value;
    const pc = $('confirmPassword').value;
    const err = $('authError');

    err.style.color = '#E38F84';
    if (!name) { err.textContent = 'Enter your full name.'; return; }
    if (!u) { err.textContent = 'Pick a username.'; return; }
    if (!e || !/^\S+@\S+\.\S+$/.test(e)) { err.textContent = 'Enter a valid email.'; return; }
    if (!p || p.length < 4) { err.textContent = 'Password should be at least 4 characters.'; return; }
    if (p !== pc) { err.textContent = 'Passwords don\'t match.'; return; }

    const accounts = await getAccounts();
    if (accounts[u]) { err.textContent = 'That username is already taken.'; return; }

    accounts[u] = { pass: hash(p), email: e, fullName: name, createdAt: Date.now() };
    await saveAccounts(accounts);

    err.style.color = 'var(--done-green)';
    err.textContent = 'Account created — opening your notebook…';
    setTimeout(() => enterApp(u, name), 500);
  });

  // Login (Username only)
  $('loginBtn').addEventListener('click', async () => {
    const u = $('loginUsername').value.trim();
    const err = $('authError');

    err.style.color = '#E38F84';
    if (!u) { err.textContent = 'Enter a username first.'; return; }

    const accounts = await getAccounts();
    if (!accounts[u]) {
      err.textContent = 'No matching account. Check username or create one.';
      return;
    }

    err.textContent = '';
    enterApp(u, accounts[u].fullName);
  });

  $('loginUsername').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('loginBtn').click();
  });

  [$('fullName'), $('email'), $('username'), $('password'), $('confirmPassword')].forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('signupBtn').click(); });
  });

  $('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    tasks = [];
    appStage.classList.add('hidden');
    loginStage.classList.remove('hidden');
    showLogin();
    $('loginUsername').value = '';
    $('fullName').value = '';
    $('email').value = '';
    $('username').value = '';
    $('password').value = '';
    $('confirmPassword').value = '';
    $('authError').textContent = '';
  });

  async function enterApp(username, fullName) {
    currentUser = username;
    loginStage.classList.add('hidden');
    appStage.classList.remove('hidden');
    $('greeting').textContent = 'Hey ' + (fullName ? fullName.split(' ')[0] : username) + ' —';
    $('dateStamp').textContent = new Date().toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
    });
    tasks = await getTasks(username);
    render();
  }

  // ---------- Task CRUD Operations ----------
  function uid() { 
    return 't' + Date.now() + Math.random().toString(36).slice(2, 7); 
  }

  async function addTask() {
    const input = $('taskInput');
    const text = input.value.trim();
    if (!text) return;

    tasks.unshift({ id: uid(), text, done: false, createdAt: Date.now() });
    input.value = '';
    await saveTasks(currentUser, tasks);
    render();
  }

  $('addBtn').addEventListener('click', addTask);
  $('taskInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

  async function toggleTask(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    await saveTasks(currentUser, tasks);
    render();
  }

  async function deleteTask(id) {
    const li = document.querySelector('[data-id="' + id + '"]');
    if (li) {
      li.classList.add('removing');
      await new Promise(r => setTimeout(r, 260));
    }
    tasks = tasks.filter(t => t.id !== id);
    await saveTasks(currentUser, tasks);
    render();
  }

  async function editTask(id, newText) {
    tasks = tasks.map(t => t.id === id ? { ...t, text: newText } : t);
    await saveTasks(currentUser, tasks);
    render();
  }

  // ---------- Filters ----------
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      render();
    });
  });

  // ---------- Rendering ----------
  function render() {
    const list = $('taskList');
    const empty = $('emptyState');
    list.innerHTML = '';

    let visible = tasks;
    if (filter === 'active') visible = tasks.filter(t => !t.done);
    if (filter === 'done') visible = tasks.filter(t => t.done);

    if (visible.length === 0) {
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
    }

    visible.forEach(t => {
      const li = document.createElement('li');
      li.className = 'task' + (t.done ? ' done' : '');
      li.dataset.id = t.id;

      li.innerHTML = `
        <button class="checkbox" aria-label="${t.done ? 'Mark as not done' : 'Mark as done'}">
          <svg viewBox="0 0 22 22">
            <path class="box" d="M3.5 4.2 C3.2 9, 3.4 15, 3.8 18.1 C9 18.6, 15.2 18.4, 18.3 18 C18.6 13, 18.4 7.5, 18.1 4 C13 3.5, 7.8 3.7, 3.5 4.2 Z"/>
            <path class="tick" d="M5.5 11.5 L9.3 15.3 L16.5 6.8"/>
          </svg>
        </button>
        <div class="task-text">
          <span class="label">${escapeHtml(t.text)}</span>
          <span class="strike"></span>
        </div>
        <div class="task-actions">
          <button class="icon-btn edit-btn" aria-label="Edit task" title="Edit">✎</button>
          <button class="icon-btn del-btn" aria-label="Delete task" title="Delete">✕</button>
        </div>
      `;

      li.querySelector('.checkbox').addEventListener('click', () => toggleTask(t.id));
      li.querySelector('.del-btn').addEventListener('click', () => deleteTask(t.id));
      li.querySelector('.edit-btn').addEventListener('click', () => startEdit(li, t));

      list.appendChild(li);
    });

    const doneCount = tasks.filter(t => t.done).length;
    $('footerCount').textContent = tasks.length + (tasks.length === 1 ? ' task' : ' tasks');
    $('footerBadge').textContent = doneCount + ' done';
  }

  function startEdit(li, t) {
    const textDiv = li.querySelector('.task-text');
    const input = document.createElement('input');
    input.className = 'task-edit-input';
    input.value = t.text;
    input.maxLength = 140;
    textDiv.replaceWith(input);
    li.querySelector('.task-actions').classList.add('hidden');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    function commit() {
      const val = input.value.trim();
      if (val) editTask(t.id, val); else render();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') render();
    });
    input.addEventListener('blur', commit);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});


                                                  
