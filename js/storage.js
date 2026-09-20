// Simple localStorage-backed data layer for the ledger app.
const Storage = (() => {
  const KEYS = {
    entries: 'ledger.entries',
    pinHash: 'ledger.pinHash',
    budgets: 'ledger.budgets',
  };

  // Categories are fixed in code (not user-editable) — edit this list to
  // change what shows up in the entry form's category dropdown.
  // Types: 'expense' (counts as spending), 'income', and 'transfer'
  // (Investment / Card Payment — deducts Balance but is NOT counted as expense).
  // 'inc-carried-over' is system-generated only (see ensureCarryOverEntries in
  // app.js) — it's excluded from the manual entry form's category dropdown.
  const CATEGORIES = [
    // Expenses
    { id: 'exp-food', name: '🍽️ Foods', type: 'expense' },
    { id: 'exp-beauty', name: '💄 Beauty', type: 'expense' },
    { id: 'exp-clothing', name: '👕 Clothing', type: 'expense' },
    { id: 'exp-health', name: '💪 Health', type: 'expense' },
    { id: 'exp-apps-entertainment', name: '📱 Apps', type: 'expense' },
    { id: 'exp-education', name: '📚 Education', type: 'expense' },
    { id: 'exp-transport', name: '🚗 Transportation', type: 'expense' },
    { id: 'exp-supplies', name: '📦 Supplies', type: 'expense' },
    { id: 'exp-medical', name: '🏥 Medical', type: 'expense' },
    { id: 'exp-utility', name: '💡 Utilities', type: 'expense' },
    { id: 'exp-electronics', name: '💻 Electronics', type: 'expense' },
    { id: 'exp-donation', name: '❤️ Donation', type: 'expense' },
    { id: 'exp-gift', name: '🎁 Gift', type: 'expense' },
    { id: 'exp-weddings-funerals', name: '💒 Weddings', type: 'expense' },
    { id: 'exp-family', name: '👨‍👩‍👧‍👦 Family', type: 'expense' },
    { id: 'exp-flexible', name: '🔄 Flexible', type: 'expense' },
    // Income
    { id: 'inc-salary', name: '💰 Salary', type: 'income' },
    { id: 'inc-pocket-money', name: '👛 Pocket Money', type: 'income' },
    { id: 'inc-interest', name: '📈 Interest', type: 'income' },
    { id: 'inc-asset-withdrawal', name: '🏦 Asset Withdrawal', type: 'income' },
    { id: 'inc-carried-over', name: '🔁 Carried Over', type: 'income' },
    // Transfers (deduct Balance, not counted as expenses)
    { id: 'trf-investment', name: '📊 Investment', type: 'transfer' },
    { id: 'trf-card-payment', name: '💳 Card Payment', type: 'transfer' },
  ];

  const CARRY_OVER_CATEGORY_ID = 'inc-carried-over';

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Storage read failed for', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCategories() {
    return CATEGORIES;
  }

  function getEntries() {
    return read(KEYS.entries, []);
  }

  function saveEntries(entries) {
    write(KEYS.entries, entries);
  }

  function getEntriesForDate(dateStr) {
    return getEntries().filter(e => e.date === dateStr);
  }

  function getEntriesForMonth(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return getEntries().filter(e => e.date.startsWith(prefix));
  }

  function upsertEntry(entry) {
    const entries = getEntries();
    const idx = entries.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      entries[idx] = entry;
    } else {
      entry.id = entry.id || uid();
      entries.push(entry);
    }
    saveEntries(entries);
    return entries;
  }

  function deleteEntry(id) {
    const entries = getEntries().filter(e => e.id !== id);
    saveEntries(entries);
    return entries;
  }

  async function hashPin(pin) {
    const bytes = new TextEncoder().encode(pin);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getPinHash() {
    return read(KEYS.pinHash, null);
  }

  function setPinHash(hash) {
    write(KEYS.pinHash, hash);
  }

  function wipeAll() {
    localStorage.removeItem(KEYS.entries);
    localStorage.removeItem(KEYS.pinHash);
    localStorage.removeItem(KEYS.budgets);
  }

  // Monthly budgets — { [categoryId]: amount }. Only meaningful for expense
  // categories. Same budget applies every month (no per-month variation).
  function getBudgets() {
    return read(KEYS.budgets, {});
  }

  function getBudget(categoryId) {
    return getBudgets()[categoryId] || 0;
  }

  function setBudget(categoryId, amount) {
    const budgets = getBudgets();
    if (amount > 0) budgets[categoryId] = amount;
    else delete budgets[categoryId];
    write(KEYS.budgets, budgets);
  }

  return {
    uid,
    getCategories,
    CARRY_OVER_CATEGORY_ID,
    getEntries, saveEntries, getEntriesForDate, getEntriesForMonth,
    upsertEntry, deleteEntry,
    hashPin, getPinHash, setPinHash, wipeAll,
    getBudgets, getBudget, setBudget,
  };
})();
