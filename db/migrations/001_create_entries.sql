CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC, created_at DESC);
