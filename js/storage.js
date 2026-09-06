// Simple localStorage-backed data layer for the ledger app.
const Storage = (() => {
  const KEYS = {
    entries: 'ledger.entries',
    categories: 'ledger.categories',
  };

  const DEFAULT_CATEGORIES = [
    { id: 'exp-food', name: 'Food', type: 'expense' },
    { id: 'exp-transport', name: 'Transport', type: 'expense' },
    { id: 'exp-shopping', name: 'Shopping', type: 'expense' },
    { id: 'exp-bills', name: 'Bills', type: 'expense' },
    { id: 'exp-health', name: 'Health', type: 'expense' },
    { id: 'exp-other', name: 'Other', type: 'expense' },
    { id: 'inc-salary', name: 'Salary', type: 'income' },
    { id: 'inc-other', name: 'Other', type: 'income' },
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
    return read(KEYS.categories, DEFAULT_CATEGORIES);
  }

  function saveCategories(categories) {
    write(KEYS.categories, categories);
  }

  function addCategory(name, type) {
    const categories = getCategories();
    categories.push({ id: uid(), name, type });
    saveCategories(categories);
    return categories;
  }

  function deleteCategory(id) {
    const categories = getCategories().filter(c => c.id !== id);
    saveCategories(categories);
    return categories;
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

  function exportAll() {
    return JSON.stringify({
      entries: getEntries(),
      categories: getCategories(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  function importAll(json) {
    const data = JSON.parse(json);
    if (!Array.isArray(data.entries) || !Array.isArray(data.categories)) {
      throw new Error('Invalid backup file');
    }
    saveEntries(data.entries);
    saveCategories(data.categories);
  }

  return {
    uid,
    getCategories, saveCategories, addCategory, deleteCategory,
    getEntries, saveEntries, getEntriesForDate, getEntriesForMonth,
    upsertEntry, deleteEntry,
    exportAll, importAll,
  };
})();
