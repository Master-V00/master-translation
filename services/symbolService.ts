
import { SymbolSet } from "../types";

const STORAGE_PREFIX = "manga_translator_symbols_";

export const getSymbolSets = (userId: string): SymbolSet[] => {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading symbol sets:", error);
    return [];
  }
};

export const saveSymbolSets = (userId: string, sets: SymbolSet[]): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(sets));
  } catch (error) {
    console.error("Error saving symbol sets:", error);
  }
};

export const addSymbolSet = (userId: string, set: SymbolSet): SymbolSet[] => {
    const current = getSymbolSets(userId);
    const updated = [...current, set];
    saveSymbolSets(userId, updated);
    return updated;
};

export const updateSymbolSet = (userId: string, set: SymbolSet): SymbolSet[] => {
    const current = getSymbolSets(userId);
    const updated = current.map(s => s.id === set.id ? set : s);
    saveSymbolSets(userId, updated);
    return updated;
};

export const deleteSymbolSet = (userId: string, setId: string): SymbolSet[] => {
    const current = getSymbolSets(userId);
    const updated = current.filter(s => s.id !== setId);
    saveSymbolSets(userId, updated);
    return updated;
};
