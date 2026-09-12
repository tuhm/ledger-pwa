(() => {
  const state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-indexed
    selectedDate: todayStr(),
    editingEntryId: null,
    modalType: 'expense',
    modalMethod: 'cash',
  };

  // ---------- Helpers ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function dateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
  function formatKRW(n) { return '₩' + Number(n || 0).toLocaleString('ko-KR'); }
  function monthLabel(y, m) {
    return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  function categoryById(id) {
    return Storage.getCategories().find(c => c.id === id);
  }

  // ---------- DOM refs ----------
  const el = {
    monthLabel: document.getElementById('month-label'),
    calendarGrid: document.getElementById('calendar-grid'),
    btnPrevMonth: document.getElementById('btn-prev-month'),
    btnNextMonth: document.getElementById('btn-next-month'),
    btnAdd: document.getElementById('btn-add'),
    btnAddForDay: document.getElementById('btn-add-for-day'),
    dayPanelTitle: document.getElementById('day-panel-title'),
    dayEntryList: document.getElementById('day-entry-list'),
    summaryIncome: document.getElementById('summary-income'),
    summaryCashExpense: document.getElementById('summary-cash-expense'),
    summaryCardExpense: document.getElementById('summary-card-expense'),
    summaryNet: document.getElementById('summary-net'),
    summaryDateLabel: document.getElementById('summary-date-label'),

    navBtns: document.querySelectorAll('.nav-btn'),
    screens: document.querySelectorAll('.screen'),

    expenseCategoryList: document.getElementById('expense-category-list'),
    incomeCategoryList: document.getElementById('income-category-list'),
    formAddExpenseCategory: document.getElementById('form-add-expense-category'),
    formAddIncomeCategory: document.getElementById('form-add-income-category'),
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import'),
    importFileInput: document.getElementById('import-file-input'),

    modal: document.getElementById('entry-modal'),
    modalTitle: document.getElementById('modal-title'),
    entryForm: document.getElementById('entry-form'),
    inputDate: document.getElementById('input-date'),
    inputCategory: document.getElementById('input-category'),
    inputAmount: document.getElementById('input-amount'),
    inputMemo: document.getElementById('input-memo'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    btnModalDelete: document.getElementById('btn-modal-delete'),
    typeBtns: document.querySelectorAll('.type-btn'),
    methodBtns: document.querySelectorAll('.method-btn'),
  };

  // ---------- Calendar rendering ----------
  function renderCalendar() {
    el.monthLabel.textContent = monthLabel(state.year, state.month);
    el.calendarGrid.innerHTML = '';

    const firstDay = new Date(state.year, state.month, 1).getDay();
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    const entries = Storage.getEntriesForMonth(state.year, state.month);

    const totalsByDay = {};
    entries.forEach(e => {
      const day = parseInt(e.date.split('-')[2], 10);
      if (!totalsByDay[day]) totalsByDay[day] = { income: 0, expense: 0 };
      totalsByDay[day][e.type] += Number(e.amount);
    });

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'day-cell empty';
      el.calendarGrid.appendChild(empty);
    }

    const today = todayStr();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(state.year, state.month, d);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day-cell';
      if (ds === today) cell.classList.add('today');
      if (ds === state.selectedDate) cell.classList.add('selected');

      const num = document.createElement('div');
      num.className = 'day-num';
      num.textContent = d;
      cell.appendChild(num);

      const totals = totalsByDay[d];
      if (totals) {
        const wrap = document.createElement('div');
        wrap.className = 'day-amounts';
        if (totals.income) {
          const inc = document.createElement('span');
          inc.className = 'amt-income';
          inc.textContent = '+' + Number(totals.income).toLocaleString('ko-KR');
          wrap.appendChild(inc);
        }
        if (totals.expense) {
          const exp = document.createElement('span');
          exp.className = 'amt-expense';
          exp.textContent = '-' + Number(totals.expense).toLocaleString('ko-KR');
          wrap.appendChild(exp);
        }
        cell.appendChild(wrap);
      }

      cell.addEventListener('click', () => {
        state.selectedDate = ds;
        renderCalendar();
        renderDayPanel();
        renderDaySummary();
      });

      el.calendarGrid.appendChild(cell);
    }
  }

  function renderDaySummary() {
    const entries = Storage.getEntriesForDate(state.selectedDate);
    let income = 0, cashExpense = 0, cardExpense = 0;
    entries.forEach(e => {
      if (e.type === 'income') {
        income += Number(e.amount);
      } else if (e.method === 'cash') {
        cashExpense += Number(e.amount);
      } else {
        cardExpense += Number(e.amount);
      }
    });
    el.summaryIncome.textContent = formatKRW(income);
    el.summaryCashExpense.textContent = formatKRW(cashExpense);
    el.summaryCardExpense.textContent = formatKRW(cardExpense);
    el.summaryNet.textContent = formatKRW(income - cashExpense);

    const d = new Date(state.selectedDate + 'T00:00:00');
    el.summaryDateLabel.textContent = state.selectedDate === todayStr()
      ? 'today'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ---------- Day panel ----------
  function renderDayPanel() {
    const d = new Date(state.selectedDate + 'T00:00:00');
    el.dayPanelTitle.textContent = d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });

    const entries = Storage.getEntriesForDate(state.selectedDate)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    el.dayEntryList.innerHTML = '';
    if (entries.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-hint';
      li.textContent = 'No entries for this day.';
      el.dayEntryList.appendChild(li);
      return;
    }

    entries.forEach(entry => {
      const cat = categoryById(entry.categoryId);
      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'entry-row';

      const main = document.createElement('div');
      main.className = 'entry-main';
      const catEl = document.createElement('div');
      catEl.className = 'entry-category';
      catEl.textContent = cat ? cat.name : '(deleted category)';
      const metaEl = document.createElement('div');
      metaEl.className = 'entry-meta';
      metaEl.textContent = (entry.method === 'cash' ? '💵 Cash' : '💳 Card') + (entry.memo ? ' · ' + entry.memo : '');
      main.appendChild(catEl);
      main.appendChild(metaEl);

      const amountEl = document.createElement('div');
      amountEl.className = 'entry-amount ' + entry.type;
      amountEl.textContent = (entry.type === 'income' ? '+' : '-') + formatKRW(entry.amount).slice(1);

      row.appendChild(main);
      row.appendChild(amountEl);
      row.addEventListener('click', () => openModal(state.selectedDate, entry));

      li.appendChild(row);
      el.dayEntryList.appendChild(li);
    });
  }

  // ---------- Modal ----------
  function populateCategorySelect(type, selectedId) {
    const categories = Storage.getCategories().filter(c => c.type === type);
    el.inputCategory.innerHTML = '';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      el.inputCategory.appendChild(opt);
    });
    if (selectedId) el.inputCategory.value = selectedId;
  }

  function setModalType(type) {
    state.modalType = type;
    el.typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === type));
    populateCategorySelect(type);
  }

  function setModalMethod(method) {
    state.modalMethod = method;
    el.methodBtns.forEach(b => b.classList.toggle('active', b.dataset.method === method));
  }

  function openModal(dateForNew, entry) {
    state.editingEntryId = entry ? entry.id : null;
    el.modalTitle.textContent = entry ? 'Edit Entry' : 'New Entry';
    el.btnModalDelete.classList.toggle('hidden', !entry);

    setModalType(entry ? entry.type : 'expense');
    setModalMethod(entry ? entry.method : 'cash');

    el.inputDate.value = entry ? entry.date : dateForNew;
    el.inputAmount.value = entry ? entry.amount : '';
    el.inputMemo.value = entry ? (entry.memo || '') : '';
    populateCategorySelect(state.modalType, entry ? entry.categoryId : undefined);

    el.modal.classList.remove('hidden');
  }

  function closeModal() {
    el.modal.classList.add('hidden');
    el.entryForm.reset();
    state.editingEntryId = null;
  }

  el.typeBtns.forEach(b => b.addEventListener('click', () => setModalType(b.dataset.type)));
  el.methodBtns.forEach(b => b.addEventListener('click', () => setModalMethod(b.dataset.method)));

  el.btnModalCancel.addEventListener('click', closeModal);

  el.btnModalDelete.addEventListener('click', () => {
    if (!state.editingEntryId) return;
    if (confirm('Delete this entry?')) {
      Storage.deleteEntry(state.editingEntryId);
      closeModal();
      renderCalendar();
      renderDayPanel();
      renderDaySummary();
    }
  });

  el.entryForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = Number(el.inputAmount.value);
    if (!amount || amount <= 0) return;

    const entry = {
      id: state.editingEntryId || undefined,
      date: el.inputDate.value,
      type: state.modalType,
      categoryId: el.inputCategory.value,
      amount,
      method: state.modalMethod,
      memo: el.inputMemo.value.trim(),
      createdAt: Date.now(),
    };
    Storage.upsertEntry(entry);

    state.selectedDate = entry.date;
    const entryMonth = new Date(entry.date + 'T00:00:00');
    state.year = entryMonth.getFullYear();
    state.month = entryMonth.getMonth();

    closeModal();
    renderCalendar();
    renderDayPanel();
    renderDaySummary();
  });

  el.btnAdd.addEventListener('click', () => openModal(state.selectedDate || todayStr()));
  el.btnAddForDay.addEventListener('click', () => openModal(state.selectedDate));

  // ---------- Month navigation ----------
  function selectFirstOfMonth() {
    state.selectedDate = dateStr(state.year, state.month, 1);
  }

  el.btnPrevMonth.addEventListener('click', () => {
    state.month -= 1;
    if (state.month < 0) { state.month = 11; state.year -= 1; }
    selectFirstOfMonth();
    renderCalendar();
    renderDayPanel();
    renderDaySummary();
  });
  el.btnNextMonth.addEventListener('click', () => {
    state.month += 1;
    if (state.month > 11) { state.month = 0; state.year += 1; }
    selectFirstOfMonth();
    renderCalendar();
    renderDayPanel();
    renderDaySummary();
  });

  // ---------- Bottom nav ----------
  el.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      el.screens.forEach(s => s.classList.toggle('hidden', s.id !== btn.dataset.screen));
      if (btn.dataset.screen === 'screen-settings') renderSettings();
    });
  });

  // ---------- Settings ----------
  function renderSettings() {
    const categories = Storage.getCategories();
    renderCategoryList(el.expenseCategoryList, categories.filter(c => c.type === 'expense'));
    renderCategoryList(el.incomeCategoryList, categories.filter(c => c.type === 'income'));
  }

  function renderCategoryList(listEl, categories) {
    listEl.innerHTML = '';
    categories.forEach(c => {
      const li = document.createElement('li');
      li.className = 'category-row';
      const name = document.createElement('span');
      name.textContent = c.name;
      const del = document.createElement('button');
      del.textContent = 'Remove';
      del.addEventListener('click', () => {
        if (confirm(`Remove category "${c.name}"? Existing entries keep their amount but lose this label.`)) {
          Storage.deleteCategory(c.id);
          renderSettings();
        }
      });
      li.appendChild(name);
      li.appendChild(del);
      listEl.appendChild(li);
    });
  }

  el.formAddExpenseCategory.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const input = ev.target.querySelector('input');
    const name = input.value.trim();
    if (!name) return;
    Storage.addCategory(name, 'expense');
    input.value = '';
    renderSettings();
  });

  el.formAddIncomeCategory.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const input = ev.target.querySelector('input');
    const name = input.value.trim();
    if (!name) return;
    Storage.addCategory(name, 'income');
    input.value = '';
    renderSettings();
  });

  // ---------- Export / Import ----------
  el.btnExport.addEventListener('click', () => {
    const json = Storage.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  el.btnImport.addEventListener('click', () => el.importFileInput.click());
  el.importFileInput.addEventListener('change', () => {
    const file = el.importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Storage.importAll(reader.result);
        alert('Import successful.');
        renderSettings();
        renderCalendar();
        renderDayPanel();
        renderDaySummary();
      } catch (e) {
        alert('Import failed: ' + e.message);
      }
    };
    reader.readAsText(file);
    el.importFileInput.value = '';
  });

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed', err));
    });
  }

  // ---------- Init ----------
  renderCalendar();
  renderDayPanel();
  renderDaySummary();
})();
