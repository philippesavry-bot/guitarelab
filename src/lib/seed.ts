import { Library, Song, SongVersion } from './types';

export const SEED_DATA: Library = {
  schemaVersion: 1,
  songs: [
    {
      id: '1',
      title: 'Stand By Me',
      artist: 'Ben E. King',
      language: 'EN',
      type: 'chanté',
      technique: 'fingerstyle',
      style: 'Soul',
      difficulty: 'medium',
      tags: ['Classique', 'Ambiance'],
      classifications: ['À travailler'],
      favorite: true,
      inSetlist: true,
      progress: 45,
      progressHistory: [
        { date: '2026-01-01', value: 10 },
        { date: '2026-02-01', value: 45 },
      ],
      lastPracticedAt: new Date().toISOString(),
      totalPracticeTime: 3600,
      coverImage: '',
      identityStatus: 'confirmée',
      versions: [
        {
          id: 'v1',
          name: 'Originale',
          bpm: 120,
          capo: 0,
          key: 'A',
          structure: [],
          chordGrid: {},
          rhythm: [],
          notes: 'Focus on the bass line.',
          images: [],
          videoLinks: [],
          metronomeSettings: {},
        }
      ]
    },
    {
      id: '2',
      title: 'Blackbird',
      artist: 'The Beatles',
      language: 'EN',
      type: 'instrumental',
      technique: 'fingerstyle',
      style: 'Folk',
      difficulty: 'hard',
      tags: ['Accoustique'],
      classifications: ['Maîtrisé'],
      favorite: true,
      inSetlist: false,
      progress: 90,
      progressHistory: [],
      lastPracticedAt: new Date().toISOString(),
      totalPracticeTime: 10800,
      coverImage: '',
      identityStatus: 'confirmée',
      versions: [
        {
          id: 'v1',
          name: 'Originale',
          bpm: 110,
          capo: 0,
          key: 'G',
          structure: [],
          chordGrid: {},
          rhythm: [],
          notes: 'Tough fingering on the chords.',
          images: [],
          videoLinks: [],
          metronomeSettings: {},
        }
      ]
    }
  ],
  practiceSessions: [],
  goals: {
    weeklyGoal: 300,
    currentProgress: 0,
  },
  roadmap: ['1', '2'],
  preferences: {
    theme: 'dark',
    metronomeDefaultBpm: 120,
    autoScrollSpeed: 2,
  }
};
