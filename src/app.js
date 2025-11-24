/**
 * Orbit Task Pro - Vision 2026
 * Features: Confetti Rewards, 3D Tilt, Persian Support
 */

const store = new Proxy({
  tasks: JSON.parse(localStorage.getItem('orbit-tasks-2026')) || [],
  draggedId: null
}, {
  set(target, prop, val) {
    target[prop] = val;
    if (prop === 'tasks') {
      localStorage.setItem('orbit-tasks-2026', JSON.stringify(val));
      if (document.startViewTransition) document.startViewTransition(() => render());
      else render();
    }
    return true;
  }
});

const els = {
  board: document.getElementById('board-container'),
  dialog: document.getElementById('task-dialog'),
  form: document.getElementById('task-form'),
  stats: {
    percent: document.querySelector('[data-stat="percent"]'),
    bar: document.getElementById('progress-bar'),
    active: document.querySelector('[data-stat="active"]'),
    done: document.querySelector('[data-stat="done"]'),
  },
  btns: {
    new: document.getElementById('btn-new-task'),
    close: document.getElementById('btn-close-dialog'),
    cancel: document.getElementById('btn-cancel')
  }
};

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-500' },
  { id: 'doing', title: 'In Progress', color: 'bg-indigo-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' }
];

function init() {
  render();
  setupEvents();
}

function setupEvents() {
  els.btns.new.addEventListener('click', () => openDialog());
  els.btns.close.addEventListener('click', () => els.dialog.close());
  els.btns.cancel.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (e) => e.target === els.dialog && els.dialog.close());

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTask(Object.fromEntries(new FormData(els.form)));
  });

  els.board.addEventListener('click', (e) => {
    const card = e.target.closest('[data-task-id]');
    if (!card) return;
    const id = card.dataset.taskId;
    const action = e.target.dataset.action;

    if (action === 'delete') deleteTask(id);
    if (action === 'edit') openDialog(id);
    if (action === 'toggle-subtask') toggleSubtask(id, e.target.dataset.index);
  });

  window.allowDrop = (e) => e.preventDefault();
  window.dragStart = (e, id) => {
    store.draggedId = id;
    e.target.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = "move";
  };
  window.dragEnd = (e) => {
    e.target.style.opacity = '1';
    store.draggedId = null;
  };
  window.drop = (e, status) => {
    e.preventDefault();
    if (!store.draggedId) return;
    updateStatus(store.draggedId, status);
  };
}

// --- Confetti Logic (Reward System) ---
function triggerConfetti() {
  const count = 200;
  const defaults = { origin: { y: 0.7 } };

  function fire(particleRatio, opts) {
    confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio)
    }));
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

function saveTask(data) {
  const subtasks = data.subtasks.split('\n').filter(t => t.trim()).map(t => ({ text: t, done: false }));
  if (data.id) {
    const idx = store.tasks.findIndex(t => t.id === data.id);
    const updated = { ...store.tasks[idx], ...data, tags: data.tags ? [data.tags] : [], subtasks: subtasks.length ? subtasks : store.tasks[idx].subtasks };
    const newTasks = [...store.tasks];
    newTasks[idx] = updated;
    store.tasks = newTasks;
  } else {
    const newTask = {
      id: crypto.randomUUID(),
      title: data.title,
      priority: data.priority,
      status: 'todo',
      tags: data.tags ? [data.tags] : [],
      subtasks,
      createdAt: new Date().toISOString()
    };
    store.tasks = [...store.tasks, newTask];
  }
  els.dialog.close();
}

function deleteTask(id) {
  if (confirm('Vaporize this task?')) store.tasks = store.tasks.filter(t => t.id !== id);
}

function updateStatus(id, status) {
  const idx = store.tasks.findIndex(t => t.id === id);
  if (store.tasks[idx].status !== status) {
    const newTasks = [...store.tasks];
    newTasks[idx] = { ...newTasks[idx], status };
    store.tasks = newTasks;
    
    // Reward Trigger: If moved to DONE, explode confetti!
    if (status === 'done') {
        triggerConfetti();
    }
  }
}

function toggleSubtask(id, idx) {
  const taskIdx = store.tasks.findIndex(t => t.id === id);
  const newTasks = [...store.tasks];
  newTasks[taskIdx].subtasks[idx].done = !newTasks[taskIdx].subtasks[idx].done;
  store.tasks = newTasks;
}

function openDialog(id = null) {
  els.form.reset();
  document.getElementById('dialog-title').textContent = id ? 'Edit Mission' : 'New Mission';
  if (id) {
    const task = store.tasks.find(t => t.id === id);
    els.form.id.value = task.id;
    els.form.title.value = task.title;
    els.form.priority.value = task.priority;
    els.form.tags.value = task.tags.join(', ');
    els.form.subtasks.value = task.subtasks.map(s => s.text).join('\n');
  } else {
    els.form.id.value = '';
  }
  els.dialog.showModal();
}

function render() {
  const total = store.tasks.length;
  const done = store.tasks.filter(t => t.status === 'done').length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  els.stats.percent.textContent = `${percent}%`;
  els.stats.bar.style.width = `${percent}%`;
  els.stats.active.textContent = total - done;
  els.stats.done.textContent = done;

  els.board.innerHTML = COLUMNS.map(col => {
    const tasks = store.tasks.filter(t => t.status === col.id);
    return `
      <div class="flex flex-col h-full gap-4 perspective-1000" ondragover="allowDrop(event)" ondrop="drop(event, '${col.id}')">
        <header class="flex items-center justify-between px-2">
          <div class="flex items-center gap-3">
             <span class="w-2 h-2 rounded-full ${col.color} shadow-[0_0_12px_currentColor]"></span>
             <h3 class="text-sm font-bold text-slate-300 uppercase tracking-widest">${col.title}</h3>
          </div>
          <span class="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">${tasks.length}</span>
        </header>
        <div class="flex-1 space-y-5 min-h-[200px] pb-10">
           ${tasks.map(renderCard).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Apply 3D Tilt Effect to newly rendered cards
  document.querySelectorAll('.glow-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation (max 10 degrees)
        const rotateX = ((y - centerY) / centerY) * -5; // Invert Y
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    });
  });
}

function renderCard(task) {
  const pColors = { low: 'text-slate-400 border-slate-500/30', med: 'text-amber-400 border-amber-500/30', high: 'text-rose-400 border-rose-500/30' };
  
  // Check if text contains Persian characters (simple regex)
  const isPersian = /[\u0600-\u06FF]/.test(task.title);
  const dir = isPersian ? 'rtl' : 'ltr';

  return `
    <article 
      draggable="true" 
      ondragstart="dragStart(event, '${task.id}')" 
      ondragend="dragEnd(event)"
      data-task-id="${task.id}"
      dir="${dir}"
      class="glow-card p-5 rounded-2xl relative group cursor-grab active:cursor-grabbing preserve-3d"
    >
      <div class="flex justify-between items-start mb-3">
        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-black/20 ${pColors[task.priority]}">${task.priority}</span>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <button data-action="edit" class="text-slate-500 hover:text-indigo-400"><svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
           <button data-action="delete" class="text-slate-500 hover:text-rose-400"><svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
      </div>
      <h4 class="task-title font-semibold text-slate-100 text-lg mb-2 leading-tight ${isPersian ? 'font-vazir' : ''}">${task.title}</h4>
      ${task.tags.length ? `<div class="flex gap-2 mb-4">${task.tags.map(t => `<span class="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">#${t}</span>`).join('')}</div>` : ''}
      
      ${task.subtasks.length ? `
        <div class="space-y-2 pt-3 border-t border-white/5">
           ${task.subtasks.map((s, i) => `
             <div class="flex items-center gap-3 text-xs text-slate-400 hover:text-slate-200 cursor-pointer group/sub" data-action="toggle-subtask" data-index="${i}">
               <div class="w-3.5 h-3.5 rounded border border-slate-600 ${s.done ? 'bg-indigo-500 border-indigo-500' : ''} flex items-center justify-center transition pointer-events-none">
                 ${s.done ? '<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
               </div>
               <span class="${s.done ? 'line-through opacity-50' : ''} pointer-events-none transition">${s.text}</span>
             </div>
           `).join('')}
        </div>
      ` : ''}
    </article>
  `;
}

init();