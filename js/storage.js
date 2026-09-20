// Simple localStorage-backed data layer for the ledger app.
const Storage = (() => {
  const KEYS = {
    entries: 'ledger.entries',
  };

  // Categories are fixed in code (not user-editable) — edit this list to
  // change what shows up in the entry form's category dropdown.
  // Types: 'expense' (counts as spending), 'income', and 'transfer'
  // (Investment / Card Payment — deducts Balance but is NOT counted as expense).
  const CATEGORIES = [
    // Expenses
    { id: 'exp-utility', name: 'Utility', type: 'expense' },
    { id: 'exp-transport', name: 'Transportation', type: 'expense' },
    { id: 'exp-food', name: 'Food', type: 'expense' },
    { id: 'exp-beauty', name: 'Beauty', type: 'expense' },
    { id: 'exp-health', name: 'Health', type: 'expense' },
    { id: 'exp-clothing', name: 'Clothing', type: 'expense' },
    { id: 'exp-gift', name: 'Gift', type: 'expense' },
    { id: 'exp-weddings-funerals', name: 'Weddings/Funerals', type: 'expense' },
    { id: 'exp-supplies', name: 'Supplies', type: 'expense' },
    { id: 'exp-apps-entertainment', name: 'Apps/Entertainment', type: 'expense' },
    { id: 'exp-education', name: 'Education', type: 'expense' },
    { id: 'exp-medical', name: 'Medical', type: 'expense' },
    { id: 'exp-donation', name: 'Donation', type: 'expense' },
    { id: 'exp-electronics', name: 'Electronics', type: 'expense' },
    { id: 'exp-flexible', name: 'Flexible', type: 'expense' },
    { id: 'exp-other', name: 'Others', type: 'expense' },
    // Income
    { id: 'inc-salary', name: 'Salary', type: 'income' },
    { id: 'inc-other', name: 'Other', type: 'income' },
    // Transfers (deduct Balance, not counted as expenses)
    { id: 'trf-investment', name: 'Investment', type: 'transfer' },
    { id: 'trf-card-payment', name: 'Card Payment', type: 'transfer' },
  ];

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

  return {
    uid,
    getCategories,
    getEntries, saveEntries, getEntriesForDate, getEntriesForMonth,
    upsertEntry, deleteEntry,
  };
})();
