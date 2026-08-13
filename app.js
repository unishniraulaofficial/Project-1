
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const loginStage = document.getElementById('loginStage');
  const appStage = document.getElementById('appStage');
  
  const loginView = document.getElementById('loginView');
  const signupView = document.getElementById('signupView');
  const toSignup = document.getElementById('toSignup');
  const toLogin = document.getElementById('toLogin');
  
  const loginUsernameInput = document.getElementById('loginUsername');
  const loginBtn = document.getElementById('loginBtn');
  
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const signupUsernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const signupBtn = document.getElementById('signupBtn');
  const authError = document.getElementById('authError');
  
  const greeting = document.getElementById('greeting');
  const dateStamp = document.getElementById('dateStamp');
  const logoutBtn = document.getElementById('logoutBtn');
  
  const taskInput = document.getElementById('taskInput');
  const addBtn = document.getElementById('addBtn');
  const taskList = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const footerCount = document.getElementById('footerCount');
  const footerBadge = document.getElementById('footerBadge');

  // --- State ---
  let currentUser = JSON.parse(localStorage.getItem('dayline_session')) || null;
  let tasks = [];
  let currentFilter = 'all';

  // --- Initialize ---
  function init() {
    setDateStamp();
    if (currentUser) {
      showApp();
    } else {
      showAuth();
    }
  }

  function setDateStamp() {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options).toUpperCase();
    dateStamp.textContent = today;
  }

  // --- View Switches ---
  toSignup.addEventListener('click', () => {
    loginView.classList.add('hidden');
    signupView.classList.remove('hidden');
    authError.textContent = '';
  });

  toLogin.addEventListener('click', () => {
    signupView.classList.add('hidden');
    loginView.classList.remove('hidden');
    authError.textContent = '';
  });

  // --- Authentication ---
  loginBtn.addEventListener('click', handleLogin);
  loginUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

  function handleLogin() {
    const username = loginUsernameInput.value.trim();
    if (!username) {
      showError('Please enter a username.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('dayline_users')) || {};
    if (users[username.toLowerCase()]) {
      currentUser = users[username.toLowerCase()];
    } else {
      // Auto-create lightweight user for demo convenience
      currentUser = { username: username, name: username };
      users[username.toLowerCase()] = currentUser;
      localStorage.setItem('dayline_users', JSON.stringify(users));
    }

    localStorage.setItem('dayline_session', JSON.stringify(currentUser));
    showApp();
  }

  signupBtn.addEventListener('click', () => {
    const name = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const username = signupUsernameInput.value.trim();
    const pass = passwordInput.value;
    const confirmPass = confirmPasswordInput.value;

    if (!name || !email || !username || !pass) {
      showError('Please fill out all fields.');
      return;
    }
    if (pass.length < 4) {
      showError('Password must be at least 4 characters.');
      return;
    }
    if (pass !== confirmPass) {
      showError('Passwords do not match.');
      return;
    }

    const users = JSON.parse(localStorage.getItem('dayline_users')) || {};
    if (users[username.toLowerCase()]) {
      showError('Username is already taken.');
      return;
    }

    currentUser = { username, name, email };
    users[username.toLowerCase()] = currentUser;
    localStorage.setItem('dayline_users', JSON.stringify(users));
    localStorage.setItem('dayline_session', JSON.stringify(currentUser));

    showApp();
  });

  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('dayline_session');
    showAuth();
  });

  function showError(msg) {
    authError.textContent = msg;
  }

  function showAuth() {
    loginStage.classList.remove('hidden');
    appStage.classList.add('hidden');
    authError.textContent = '';
  }

  function showApp() {
    loginStage.classList.add('hidden');
    appStage.classList.remove('hidden');
    greeting.textContent = `Hey, ${currentUser.name.split(' ')[0]} —`;
    loadTasks();
    renderTasks();
  }

  // --- Task Operations ---
  function getStorageKey() {
    return `dayline_tasks_${currentUser.username.toLowerCase()}`;
  }

  function loadTasks() {
    tasks = JSON.parse(localStorage.getItem(getStorageKey())) || [];
  }

  function saveTasks() {
    localStorage.setItem(getStorageKey(), JSON.stringify(tasks));
  }

  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

  function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = {
      id: Date.now().toString(),
      text,
      done: false
    };

    tasks.unshift(newTask);
    saveTasks();
    taskInput.value = '';
    renderTasks();
  }

  // Filter tabs
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  function renderTasks() {
    taskList.innerHTML = '';

    const filtered = tasks.filter(t => {
      if (currentFilter === 'active') return !t.done;
      if (currentFilter === 'done') return t.done;
      return true;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task ${task.done ? 'done' : ''}`;
      li.dataset.id = task.id;

      li.innerHTML = `
        <button class="checkbox" aria-label="Toggle task status">
          <svg viewBox="0 0 24 24">
            <rect class="box" x="2" y="2" width="20" height="20" rx="4"/>
            <path class="tick" d="M5 12l5 5L19 7"/>
          </svg>
        </button>
        <span class="task-text">
          ${escapeHtml(task.text)}
          <span class="strike"></span>
        </span>
        <div class="task-actions">
          <button class="icon-btn delete-btn" title="Delete">✕</button>
        </div>
      `;

      // Checkbox event
      li.querySelector('.checkbox').addEventListener('click', () => {
        task.done = !task.done;
        saveTasks();
        renderTasks();
      });

      // Delete event
      li.querySelector('.delete-btn').addEventListener('click', () => {
        li.classList.add('removing');
        setTimeout(() => {
          tasks = tasks.filter(t => t.id !== task.id);
          saveTasks();
          renderTasks();
        }, 280);
      });

      taskList.appendChild(li);
    });

    updateFooter();
  }

  function updateFooter() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.done).length;
    footerCount.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
    footerBadge.textContent = `${completed} done`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  init();
});
    
