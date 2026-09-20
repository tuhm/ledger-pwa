(() => {
  const state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(), // 0-indexed
    selectedDate: todayStr(),
    editingEntryId: null,
    modalType: 'expense',
    modalMethod: 'cash',
    detailCategoryId: null,
    detailYear: new Date().getFullYear(),
  };

  // ---------- Helpers ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function dateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
  function lastDayOfMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function defaultDateForMonth(y, m) {
    const now = new Date();
    const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();
    return isCurrentMonth ? todayStr() : dateStr(y, m, lastDayOfMonth(y, m));
  }
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

    navBtns: document.querySelectorAll('.nav-btn'),
    screens: document.querySelectorAll('.screen'),
    screenCalendar: document.getElementById('screen-calendar'),
    screenSummary: document.getElementById('screen-summary'),
    daySummary: document.getElementById('day-summary'),
    summaryMonthLabel: document.getElementById('summary-month-label'),
    btnSumPrevMonth: document.getElementById('btn-sum-prev-month'),
    btnSumNextMonth: document.getElementById('btn-sum-next-month'),
    summaryIncomeTotal: document.getElementById('summary-income-total'),
    summaryExpenseTotal: document.getElementById('summary-expense-total'),
    summaryTransferTotal: document.getElementById('summary-transfer-total'),
    summaryIncomeList: document.getElementById('summary-income-list'),
    summaryExpenseList: document.getElementById('summary-expense-list'),
    summaryTransferList: document.getElementById('summary-transfer-list'),
    summaryExpenseBudgetLine: document.getElementById('summary-expense-budget-line'),

    btnBudgetEdit: document.getElementById('btn-budget-edit'),
    budgetModal: document.getElementById('budget-modal'),
    btnBudgetCancel: document.getElementById('btn-budget-cancel'),
    btnBudgetSave: document.getElementById('btn-budget-save'),
    budgetFormList: document.getElementById('budget-form-list'),

    screenCategoryDetail: document.getElementById('screen-category-detail'),
    btnDetailBack: document.getElementById('btn-detail-back'),
    btnDetailPrevYear: document.getElementById('btn-detail-prev-year'),
    btnDetailNextYear: document.getElementById('btn-detail-next-year'),
    detailYearLabel: document.getElementById('detail-year-label'),
    detailCategoryTitle: document.getElementById('detail-category-title'),
    detailCategoryTotal: document.getElementById('detail-category-total'),
    barChart: document.getElementById('bar-chart'),

    btnLockChange: document.getElementById('btn-lock-change'),

    btnExportOpen: document.getElementById('btn-export-open'),
    exportModal: document.getElementById('export-modal'),
    btnExportCancel: document.getElementById('btn-export-cancel'),
    btnExportConfirm: document.getElementById('btn-export-confirm'),
    exportFromMonth: document.getElementById('export-from-month'),
    exportFromYear: document.getElementById('export-from-year'),
    exportToMonth: document.getElementById('export-to-month'),
    exportToYear: document.getElementById('export-to-year'),

    modal: document.getElementById('entry-modal'),
    modalTitle: document.getElementById('modal-title'),
    entryForm: document.getElementById('entry-form'),
    inputDate: document.getElementById('input-date'),
    inputCategory: document.getElementById('input-category'),
    inputAmount: document.getElementById('input-amount'),
    inputMemo: document.getElementById('input-memo'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    btnModalDelete: document.getElementById('btn-modal-delete'),
    methodField: document.getElementById('method-field'),
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
      if (!totalsByDay[day]) totalsByDay[day] = { income: 0, cashExpense: 0, cardExpense: 0, transfer: 0 };
      if (e.type === 'income') totalsByDay[day].income += Number(e.amount);
      else if (e.type === 'transfer') totalsByDay[day].transfer += Number(e.amount);
      else if (e.method === 'cash') totalsByDay[day].cashExpense += Number(e.amount);
      else totalsByDay[day].cardExpense += Number(e.amount);
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
        if (totals.cashExpense) {
          const cash = document.createElement('span');
          cash.className = 'amt-cash';
          cash.textContent = Number(totals.cashExpense).toLocaleString('ko-KR');
          wrap.appendChild(cash);
        }
        if (totals.cardExpense) {
          const card = document.createElement('span');
          card.className = 'amt-card';
          card.textContent = Number(totals.cardExpense).toLocaleString('ko-KR');
          wrap.appendChild(card);
        }
        if (totals.transfer) {
          const trf = document.createElement('span');
          trf.className = 'amt-transfer';
          trf.textContent = Number(totals.transfer).toLocaleString('ko-KR');
          wrap.appendChild(trf);
        }
        cell.appendChild(wrap);
      }

      cell.addEventListener('click', () => {
        state.selectedDate = ds;
        renderCalendar();
        renderDayPanel();
        renderSummary();
      });

      el.calendarGrid.appendChild(cell);
    }
  }

  function renderSummary() {
    const monthEntries = Storage.getEntriesForMonth(state.year, state.month);

    // Income / Cash Exp / Card Exp: whole-month totals, independent of selected day.
    // Transfers (Investment / Card Payment) are excluded here — they aren't expenses.
    let income = 0, cashExpense = 0, cardExpense = 0;
    monthEntries.forEach(e => {
      if (e.type === 'income') income += Number(e.amount);
      else if (e.type === 'expense') {
        if (e.method === 'cash') cashExpense += Number(e.amount);
        else cardExpense += Number(e.amount);
      }
    });
    el.summaryIncome.textContent = formatKRW(income);
    el.summaryCashExpense.textContent = formatKRW(cashExpense);
    el.summaryCardExpense.textContent = formatKRW(cardExpense);

    // Balance: this month's own net (income − cash expense − transfers), fixed
    // for every day within the month. Continuity across months comes from the
    // automatic "Carried Over" income entry on the 1st of each month (see
    // ensureCarryOverEntries) rather than an all-time lookback — that entry IS
    // the carried-forward balance, already counted in `income` above.
    el.summaryNet.textContent = formatKRW(monthNet(monthEntries));
  }

  function monthNet(entries) {
    let net = 0;
    entries.forEach(e => {
      const amt = Number(e.amount);
      if (e.type === 'income') net += amt;
      else if (e.type === 'transfer') net -= amt;
      else if (e.method === 'cash') net -= amt; // cash expense
    });
    return net;
  }

  // Creates/updates the automatic "Carried Over" income entry on the 1st of
  // every month from the earliest recorded entry up through the current real
  // month, each equal to the previous month's net. Idempotent — safe to call
  // on every app load; self-corrects if past entries are edited later.
  function ensureCarryOverEntries() {
    const all = Storage.getEntries();
    const real = all.filter(e => e.categoryId !== Storage.CARRY_OVER_CATEGORY_ID);
    if (real.length === 0) return;

    const earliestDate = real.reduce((min, e) => (e.date < min ? e.date : min), real[0].date);
    const earliest = new Date(earliestDate + 'T00:00:00');
    let cy = earliest.getFullYear();
    let cm = earliest.getMonth() + 1;
    if (cm > 11) { cm = 0; cy += 1; }

    const now = new Date();
    const realY = now.getFullYear();
    const realM = now.getMonth();

    while (cy < realY || (cy === realY && cm <= realM)) {
      const prevM = cm === 0 ? 11 : cm - 1;
      const prevY = cm === 0 ? cy - 1 : cy;
      const prevNet = monthNet(Storage.getEntriesForMonth(prevY, prevM));
      const entryDate = dateStr(cy, cm, 1);

      const existing = Storage.getEntries().find(
        e => e.categoryId === Storage.CARRY_OVER_CATEGORY_ID && e.date === entryDate
      );
      if (existing) {
        if (existing.amount !== prevNet) {
          existing.amount = prevNet;
          Storage.upsertEntry(existing);
        }
      } else {
        Storage.upsertEntry({
          date: entryDate,
          type: 'income',
          categoryId: Storage.CARRY_OVER_CATEGORY_ID,
          amount: prevNet,
          method: null,
          memo: '',
          createdAt: Date.now(),
        });
      }

      cm += 1;
      if (cm > 11) { cm = 0; cy += 1; }
    }
  }

  // ---------- Monthly summary page (category breakdown) ----------
  function budgetStatus(actual, budget) {
    if (!budget) return null;
    const diff = budget - actual;
    if (diff >= 0) {
      return { cls: 'under', text: `🎯 ${formatKRW(budget)} · Under by ${formatKRW(diff)}` };
    }
    return { cls: 'over', text: `🎯 ${formatKRW(budget)} · Over by ${formatKRW(-diff)}` };
  }

  function renderSummaryPage() {
    el.summaryMonthLabel.textContent = monthLabel(state.year, state.month);
    const entries = Storage.getEntriesForMonth(state.year, state.month);
    const categories = Storage.getCategories();

    // Income breakdown by category.
    const incomeByCat = {};
    let incomeTotal = 0;
    entries.filter(e => e.type === 'income').forEach(e => {
      incomeByCat[e.categoryId] = (incomeByCat[e.categoryId] || 0) + Number(e.amount);
      incomeTotal += Number(e.amount);
    });

    // Expense breakdown by category (cash + card combined).
    const expenseByCat = {};
    let expenseTotal = 0;
    entries.filter(e => e.type === 'expense').forEach(e => {
      expenseByCat[e.categoryId] = (expenseByCat[e.categoryId] || 0) + Number(e.amount);
      expenseTotal += Number(e.amount);
    });

    // Transfer breakdown (Investment / Card Payment) — deducts balance.
    const transferByCat = {};
    let transferTotal = 0;
    entries.filter(e => e.type === 'transfer').forEach(e => {
      transferByCat[e.categoryId] = (transferByCat[e.categoryId] || 0) + Number(e.amount);
      transferTotal += Number(e.amount);
    });

    el.summaryIncomeTotal.textContent = formatKRW(incomeTotal);
    el.summaryExpenseTotal.textContent = formatKRW(expenseTotal);
    el.summaryTransferTotal.textContent = formatKRW(transferTotal);

    function catName(id) {
      const c = categories.find(c => c.id === id);
      return c ? c.name : '(unknown)';
    }

    function fillList(listEl, byCat, type, emptyText, withBudget) {
      listEl.innerHTML = '';
      const ids = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
      if (ids.length === 0) {
        listEl.appendChild(emptyHint(emptyText));
      } else {
        ids.forEach(id => {
          let subText = null, subClass = '';
          if (withBudget) {
            const status = budgetStatus(byCat[id], Storage.getBudget(id));
            if (status) { subText = status.text; subClass = status.cls; }
          }
          listEl.appendChild(breakdownRow({
            name: catName(id), subText, subClass, amount: byCat[id], type,
            onClick: () => openCategoryDetail(id),
          }));
        });
      }
    }

    fillList(el.summaryIncomeList, incomeByCat, 'income', 'No income this month.', false);
    fillList(el.summaryExpenseList, expenseByCat, 'expense', 'No expenses this month.', true);
    fillList(el.summaryTransferList, transferByCat, 'transfer', 'No deductions this month.', false);

    // Overall expense budget line (sum of categories that have a budget set).
    const expenseCategoryIds = categories.filter(c => c.type === 'expense').map(c => c.id);
    const totalBudget = expenseCategoryIds.reduce((sum, id) => sum + Storage.getBudget(id), 0);
    if (totalBudget > 0) {
      const status = budgetStatus(expenseTotal, totalBudget);
      el.summaryExpenseBudgetLine.innerHTML =
        `Budget ${formatKRW(totalBudget)} · <span class="${status.cls}">${status.cls === 'under' ? 'Under' : 'Over'} by ${formatKRW(Math.abs(totalBudget - expenseTotal))}</span>`;
      el.summaryExpenseBudgetLine.classList.remove('hidden');
    } else {
      el.summaryExpenseBudgetLine.classList.add('hidden');
    }
  }

  function emptyHint(text) {
    const li = document.createElement('li');
    li.className = 'empty-hint';
    li.textContent = text;
    return li;
  }

  function breakdownRow({ name, subText, subClass, amount, type, onClick }) {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'breakdown-row';

    const main = document.createElement('div');
    main.className = 'bd-main';
    const nameEl = document.createElement('div');
    nameEl.className = 'bd-name';
    nameEl.textContent = name;
    main.appendChild(nameEl);
    if (subText) {
      const sub = document.createElement('div');
      sub.className = 'bd-sub' + (subClass ? ' ' + subClass : '');
      sub.textContent = subText;
      main.appendChild(sub);
    }

    const amountEl = document.createElement('div');
    amountEl.className = 'bd-amount ' + type;
    amountEl.textContent = (type === 'income' ? '+' : '') + formatKRW(amount).slice(1);

    row.appendChild(main);
    row.appendChild(amountEl);
    if (onClick) row.addEventListener('click', onClick);
    li.appendChild(row);
    return li;
  }

  function showScreen(screenId) {
    el.screens.forEach(s => s.classList.toggle('hidden', s.id !== screenId));
    if (screenId === 'screen-calendar' || screenId === 'screen-summary') {
      el.navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === screenId));
    }
    if (screenId === 'screen-summary') {
      renderSummaryPage();
    } else if (screenId === 'screen-calendar') {
      renderCalendar();
      renderDayPanel();
      renderSummary();
    }
  }

  el.navBtns.forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  // ---------- Category detail (yearly bar chart) ----------
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function categoryMonthlyTotals(categoryId, year) {
    const totals = [];
    for (let m = 0; m < 12; m++) {
      const entries = Storage.getEntriesForMonth(year, m).filter(e => e.categoryId === categoryId);
      totals.push(entries.reduce((sum, e) => sum + Number(e.amount), 0));
    }
    return totals;
  }

  function openCategoryDetail(categoryId) {
    state.detailCategoryId = categoryId;
    state.detailYear = state.year;
    showScreen('screen-category-detail');
    renderCategoryDetail();
  }

  function renderCategoryDetail() {
    const cat = categoryById(state.detailCategoryId);
    el.detailCategoryTitle.textContent = cat ? cat.name : '(unknown)';
    el.detailYearLabel.textContent = state.detailYear;

    const totals = categoryMonthlyTotals(state.detailCategoryId, state.detailYear);
    const yearTotal = totals.reduce((a, b) => a + b, 0);
    el.detailCategoryTotal.textContent = `Year total: ${formatKRW(yearTotal)}`;

    const budget = cat && cat.type === 'expense' ? Storage.getBudget(cat.id) : 0;
    const scaleMax = Math.max(...totals, budget, 1);

    el.barChart.innerHTML = '';
    totals.forEach((value, i) => {
      const col = document.createElement('div');
      col.className = 'bar-col';

      const valEl = document.createElement('div');
      valEl.className = 'bar-value';
      valEl.textContent = value ? Number(value).toLocaleString('ko-KR') : '';

      const track = document.createElement('div');
      track.className = 'bar-track';

      const fill = document.createElement('div');
      fill.className = 'bar-fill ' + (cat ? cat.type : '');
      fill.style.height = Math.max((value / scaleMax) * 100, value > 0 ? 2 : 0) + '%';
      track.appendChild(fill);

      if (budget > 0) {
        const budgetLine = document.createElement('div');
        budgetLine.className = 'bar-budget-line';
        budgetLine.style.bottom = (budget / scaleMax) * 100 + '%';
        track.appendChild(budgetLine);
      }

      const monthEl = document.createElement('div');
      monthEl.className = 'bar-month';
      monthEl.textContent = MONTH_SHORT[i];

      col.appendChild(valEl);
      col.appendChild(track);
      col.appendChild(monthEl);
      el.barChart.appendChild(col);
    });
  }

  el.btnDetailBack.addEventListener('click', () => showScreen('screen-summary'));
  el.btnDetailPrevYear.addEventListener('click', () => { state.detailYear -= 1; renderCategoryDetail(); });
  el.btnDetailNextYear.addEventListener('click', () => { state.detailYear += 1; renderCategoryDetail(); });

  // ---------- Budget editor ----------
  function renderBudgetForm() {
    el.budgetFormList.innerHTML = '';
    Storage.getCategories().filter(c => c.type === 'expense').forEach(c => {
      const row = document.createElement('div');
      row.className = 'budget-form-row';
      const label = document.createElement('label');
      label.textContent = c.name;
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '0';
      input.placeholder = '0';
      input.dataset.categoryId = c.id;
      const budget = Storage.getBudget(c.id);
      if (budget) input.value = budget;
      row.appendChild(label);
      row.appendChild(input);
      el.budgetFormList.appendChild(row);
    });
  }

  el.btnBudgetEdit.addEventListener('click', () => {
    renderBudgetForm();
    el.budgetModal.classList.remove('hidden');
  });
  el.btnBudgetCancel.addEventListener('click', () => el.budgetModal.classList.add('hidden'));
  el.btnBudgetSave.addEventListener('click', () => {
    el.budgetFormList.querySelectorAll('input').forEach(input => {
      Storage.setBudget(input.dataset.categoryId, Number(input.value) || 0);
    });
    el.budgetModal.classList.add('hidden');
    renderSummaryPage();
  });

  // Tapping the summary tiles is a shortcut to the Summary tab.
  el.daySummary.addEventListener('click', () => showScreen('screen-summary'));
  el.daySummary.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showScreen('screen-summary'); }
  });

  el.btnSumPrevMonth.addEventListener('click', () => {
    state.month -= 1;
    if (state.month < 0) { state.month = 11; state.year -= 1; }
    state.selectedDate = defaultDateForMonth(state.year, state.month);
    renderSummaryPage();
  });
  el.btnSumNextMonth.addEventListener('click', () => {
    state.month += 1;
    if (state.month > 11) { state.month = 0; state.year += 1; }
    state.selectedDate = defaultDateForMonth(state.year, state.month);
    renderSummaryPage();
  });

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
      const isCarryOver = entry.categoryId === Storage.CARRY_OVER_CATEGORY_ID;
      let methodLabel;
      if (isCarryOver) methodLabel = 'Automatic';
      else if (entry.type === 'income') methodLabel = 'Income';
      else if (entry.type === 'transfer') methodLabel = '↔ Balance deduction';
      else methodLabel = entry.method === 'cash' ? '💵 Cash' : '💳 Card';
      metaEl.textContent = methodLabel + (entry.memo ? ' · ' + entry.memo : '');
      main.appendChild(catEl);
      main.appendChild(metaEl);

      const amountEl = document.createElement('div');
      amountEl.className = 'entry-amount ' + entry.type + (entry.type === 'expense' && entry.method === 'card' ? ' card' : '');
      amountEl.textContent = (entry.type === 'income' ? '+' : '') + formatKRW(entry.amount).slice(1);

      row.appendChild(main);
      row.appendChild(amountEl);
      if (isCarryOver) {
        row.classList.add('entry-row-readonly');
        row.addEventListener('click', () => alert('This entry is generated automatically at the start of each month and can\'t be edited or deleted.'));
      } else {
        row.addEventListener('click', () => openModal(state.selectedDate, entry));
      }

      li.appendChild(row);
      el.dayEntryList.appendChild(li);
    });
  }

  // ---------- Modal ----------
  function populateCategorySelect(type, selectedId) {
    // Carried Over is system-generated only — never manually selectable.
    const categories = Storage.getCategories().filter(c => c.type === type && c.id !== Storage.CARRY_OVER_CATEGORY_ID);
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
    // Payment method (cash/card) only applies to expenses.
    el.methodField.classList.toggle('hidden', type !== 'expense');
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
      renderSummary();
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
      method: state.modalType === 'expense' ? state.modalMethod : null,
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
    renderSummary();
  });

  el.btnAdd.addEventListener('click', () => openModal(state.selectedDate || todayStr()));
  el.btnAddForDay.addEventListener('click', () => openModal(state.selectedDate));

  // ---------- Month navigation ----------
  el.btnPrevMonth.addEventListener('click', () => {
    state.month -= 1;
    if (state.month < 0) { state.month = 11; state.year -= 1; }
    state.selectedDate = defaultDateForMonth(state.year, state.month);
    renderCalendar();
    renderDayPanel();
    renderSummary();
  });
  el.btnNextMonth.addEventListener('click', () => {
    state.month += 1;
    if (state.month > 11) { state.month = 0; state.year += 1; }
    state.selectedDate = defaultDateForMonth(state.year, state.month);
    renderCalendar();
    renderDayPanel();
    renderSummary();
  });

  // ---------- Export (CSV, expenses only, by month range) ----------
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function populateExportSelects() {
    const now = new Date();
    const years = [];
    for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) years.push(y);

    [el.exportFromMonth, el.exportToMonth].forEach(sel => {
      sel.innerHTML = '';
      MONTH_NAMES.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = name;
        sel.appendChild(opt);
      });
    });
    [el.exportFromYear, el.exportToYear].forEach(sel => {
      sel.innerHTML = '';
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        sel.appendChild(opt);
      });
    });

    // Default both From and To to the month currently displayed on the calendar.
    el.exportFromMonth.value = state.month;
    el.exportFromYear.value = state.year;
    el.exportToMonth.value = state.month;
    el.exportToYear.value = state.year;
  }

  function csvField(value) {
    const s = String(value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  el.btnExportOpen.addEventListener('click', () => {
    populateExportSelects();
    el.exportModal.classList.remove('hidden');
  });
  el.btnExportCancel.addEventListener('click', () => el.exportModal.classList.add('hidden'));

  el.btnExportConfirm.addEventListener('click', () => {
    const fromDate = dateStr(Number(el.exportFromYear.value), Number(el.exportFromMonth.value), 1);
    const toYear = Number(el.exportToYear.value);
    const toMonth = Number(el.exportToMonth.value);
    const toDate = dateStr(toYear, toMonth, lastDayOfMonth(toYear, toMonth));

    if (fromDate > toDate) {
      alert('"From" month must be before or equal to "To" month.');
      return;
    }

    // Category-level monthly summary (like the Summary page), not raw entries.
    const header = ['Month', 'Category', 'Amount (KRW)'];
    const lines = [header.map(csvField).join(',')];

    let y = Number(el.exportFromYear.value), m = Number(el.exportFromMonth.value);
    const endY = toYear, endM = toMonth;
    while (y < endY || (y === endY && m <= endM)) {
      const byCat = {};
      Storage.getEntriesForMonth(y, m).filter(e => e.type === 'expense').forEach(e => {
        byCat[e.categoryId] = (byCat[e.categoryId] || 0) + Number(e.amount);
      });
      const monthTag = `${y}-${pad(m + 1)}`;
      Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]).forEach(catId => {
        const cat = categoryById(catId);
        lines.push([monthTag, cat ? cat.name : '', byCat[catId]].map(csvField).join(','));
      });
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }

    const filename = `ledger-summary-${fromDate}_to_${toDate}.csv`;
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const file = new File([blob], filename, { type: 'text/csv' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Ledger Expense Summary' })
        .catch(err => { if (err.name !== 'AbortError') alert('Share failed: ' + err.message); });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    el.exportModal.classList.add('hidden');
  });

  // ---------- Lock screen ----------
  el.btnLockChange.addEventListener('click', () => LedgerLock.startChange());

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('SW registration failed', err));
    });
  }

  // ---------- Init ----------
  ensureCarryOverEntries();
  renderCalendar();
  renderDayPanel();
  renderSummary();
  LedgerLock.init();
})();
