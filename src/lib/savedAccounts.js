import storage from "@/services/storage";

export const SAVED_ACCOUNTS_KEY = "scada_saved_accounts";
const MAX_SAVED_ACCOUNTS = 5;

export const getSavedAccounts = () => {
  try {
    const raw = storage.get(SAVED_ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveAccount = (username, password) => {
  if (!username || !password) return getSavedAccounts();

  const existing = getSavedAccounts().filter(
    (account) => account.username !== username,
  );
  const updated = [{ username, password }, ...existing].slice(
    0,
    MAX_SAVED_ACCOUNTS,
  );

  storage.set(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
};

export const removeSavedAccount = (username) => {
  const updated = getSavedAccounts().filter(
    (account) => account.username !== username,
  );
  storage.set(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  return updated;
};
