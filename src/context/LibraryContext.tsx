import React, { createContext, useContext, useState, useEffect } from 'react';
import { Library, Song } from '../lib/types';
import { storage } from '../lib/storage';
import { SEED_DATA } from '../lib/seed';

interface LibraryContextType {
  library: Library | null;
  isLoading: boolean;
  updateSong: (songId: string, updates: Partial<Song>) => Promise<void>;
  addSong: (song: Song) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  savePreferences: (prefs: Partial<Library['preferences']>) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await storage.getLibrary();
        if (data) {
          setLibrary(data);
        } else {
          // Seed data if library is empty
          await storage.saveLibrary(SEED_DATA);
          setLibrary(SEED_DATA);
        }
      } catch (e) {
        console.error('Failed to load library', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const updateSong = async (songId: string, updates: Partial<Song>) => {
    if (!library) return;
    const newSongs = library.songs.map(s =>
      s.id === songId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    const newLibrary = { ...library, songs: newSongs };
    await storage.saveLibrary(newLibrary);
    setLibrary(newLibrary);
  };

  const addSong = async (song: Song) => {
    if (!library) return;
    const newLibrary = { ...library, songs: [...library.songs, song] };
    await storage.saveLibrary(newLibrary);
    setLibrary(newLibrary);
  };

  const deleteSong = async (songId: string) => {
    if (!library) return;
    const newLibrary = { ...library, songs: library.songs.filter(s => s.id !== songId) };
    await storage.saveLibrary(newLibrary);
    setLibrary(newLibrary);
  };

  const savePreferences = async (prefs: Partial<Library['preferences']>) => {
    if (!library) return;
    const newLibrary = {
      ...library,
      preferences: { ...library.preferences, ...prefs }
    };
    await storage.saveLibrary(newLibrary);
    setLibrary(newLibrary);
  };

  return (
    <LibraryContext.Provider value={{ library, isLoading, updateSong, addSong, deleteSong, savePreferences }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
