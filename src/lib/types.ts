/**
 * Guitar Lab v2 - Data Model
 * Based on the specifications in the cahier des charges.
 */

export type SongType = 'chanté' | 'instrumental';
export type GuitarTechnique = 'fingerstyle' | 'autre' | 'les deux';

export interface Bookmark {
  id: string;
  time: number; // seconds
  name: string;
  note?: string;
}

export interface VideoLink {
  id: string;
  url: string;
  customName: string; // e.g., 'Tutoriel', 'Backing track'
  channel: string;
  kind: 'tutoriel' | 'original' | 'backing' | 'démo' | 'perso';
  bookmarks: Bookmark[];
}

export interface Image {
  id: string;
  blob: string; // Base64 or Blob URL
  profile: 'document' | 'pochette';
  source?: {
    videoLinkId: string;
    time: number;
    name: string;
  };
}

export interface SongVersion {
  id: string;
  name: string; // e.g., 'Facile', 'Originale'
  bpm: number;
  capo: number;
  key: string;
  structure: SongSection[];
  chordGrid: any; // Placeholder for the complex grid structure
  rhythm: any;
  notes: string;
  images: Image[];
  videoLinks: VideoLink[];
  metronomeSettings?: any;
}

export interface SongSection {
  id: string;
  section: string; // e.g., 'Intro', 'Refrain'
  cols: number;
  rows: number;
  rhythm: any[];
  cells: SongCell[];
}

export interface SongCell {
  id: string;
  split: boolean;
  chord: string;
  top: string;
  bottom: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  language: string;
  type: SongType;
  technique: GuitarTechnique;
  style: string;
  difficulty: string;
  tags: string[];
  classifications: string[];
  favorite: boolean;
  inSetlist: boolean;
  progress: number; // 0-100
  progressHistory: { date: string; value: number }[];
  lastPracticedAt: string | null;
  totalPracticeTime: number; // seconds
  coverImage: string;
  identityStatus: 'confirmée' | 'à vérifier';
  versions: SongVersion[];
}

export interface PracticeSession {
  id: string;
  date: string;
  duration: number;
  songsPracticed: { songId: string; duration: number }[];
}

export interface Library {
  schemaVersion: number;
  songs: Song[];
  practiceSessions: PracticeSession[];
  goals: {
    weeklyGoal: number; // minutes
    currentProgress: number;
  };
  roadmap: string[]; // array of song IDs in custom order
  preferences: {
    theme: 'dark' | 'light';
    metronomeDefaultBpm: number;
    autoScrollSpeed: number;
  };
}
