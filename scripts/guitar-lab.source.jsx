import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, ChevronLeft, Plus, Music, X, Star, Menu, Edit2,
  Trash2, Play, Pause, BookOpen, Maximize2, Minimize2, ArrowDown, ArrowUp, Volume2, VolumeX,
  TrendingUp, Calendar, Zap, Search
} from 'lucide-react';

// Suggestions de noms de section (structure du morceau)
const SECTION_NAME_SUGGESTIONS = ['Intro', 'Couplet', 'Pré-refrain', 'Refrain', 'Pont', 'Interlude', 'Solo', 'Outro', 'Coda'];

// Couleurs associées aux types de section usuels, pour les distinguer visuellement d'un coup d'œil
const SECTION_COLOR_MAP = {
  intro: { border: 'border-l-sky-500', dot: 'bg-sky-500', text: 'text-sky-300', tint: 'bg-sky-500/5' },
  couplet: { border: 'border-l-slate-400', dot: 'bg-slate-400', text: 'text-slate-300', tint: 'bg-slate-400/5' },
  'pré-refrain': { border: 'border-l-orange-500', dot: 'bg-orange-500', text: 'text-orange-300', tint: 'bg-orange-500/5' },
  refrain: { border: 'border-l-amber-500', dot: 'bg-amber-500', text: 'text-amber-300', tint: 'bg-amber-500/5' },
  pont: { border: 'border-l-purple-500', dot: 'bg-purple-500', text: 'text-purple-300', tint: 'bg-purple-500/5' },
  interlude: { border: 'border-l-cyan-500', dot: 'bg-cyan-500', text: 'text-cyan-300', tint: 'bg-cyan-500/5' },
  solo: { border: 'border-l-fuchsia-500', dot: 'bg-fuchsia-500', text: 'text-fuchsia-300', tint: 'bg-fuchsia-500/5' },
  outro: { border: 'border-l-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-300', tint: 'bg-emerald-500/5' },
  coda: { border: 'border-l-violet-500', dot: 'bg-violet-500', text: 'text-violet-300', tint: 'bg-violet-500/5' },
  finale: { border: 'border-l-red-500', dot: 'bg-red-500', text: 'text-red-300', tint: 'bg-red-500/5' },
};
const SECTION_FALLBACK_COLORS = [
  { border: 'border-l-teal-500', dot: 'bg-teal-500', text: 'text-teal-300', tint: 'bg-teal-500/5' },
  { border: 'border-l-pink-500', dot: 'bg-pink-500', text: 'text-pink-300', tint: 'bg-pink-500/5' },
  { border: 'border-l-indigo-500', dot: 'bg-indigo-500', text: 'text-indigo-300', tint: 'bg-indigo-500/5' },
  { border: 'border-l-lime-500', dot: 'bg-lime-500', text: 'text-lime-300', tint: 'bg-lime-500/5' },
];

// Devine un style de couleur stable à partir du nom de section (reconnaît "Couplet 2", "Refrain final"...)
function getSectionStyle(name) {
  const norm = (name || '').trim().toLowerCase();
  for (const key of Object.keys(SECTION_COLOR_MAP)) {
    if (norm.startsWith(key)) return SECTION_COLOR_MAP[key];
  }
  let hash = 0;
  for (let i = 0; i < norm.length; i++) hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  return SECTION_FALLBACK_COLORS[hash % SECTION_FALLBACK_COLORS.length];
}


// Étiquettes de classement (facile, fingerstyle, chant, anglais...), modifiables à choix multiples par morceau
const DEFAULT_CLASSIFICATIONS = ['Française facile', 'Anglaise facile', 'À travailler', 'À chanter', 'Fingerstyle'];

const DEFAULT_SONGS = [
    {
      id: '1',
      artist: 'Indochine',
      title: "L'Aventurier",
      classifications: ['Française facile', 'À chanter'],
      progress: 75,
      isFavorite: true,
      tags: ['années 80', 'guitare acoustique'],
      youtubeUrls: [{ id: 'y1', url: '' }],
      versions: [{
        id: 'v1', label: 'Facile', bpm: 120, capo: 0, key: 'Em',
        structure: [{
          id: 's1', section: 'Intro', cols: 4, rows: 1,
          rhythm: [{ id: 'r1', type: 'down' }, { id: 'r2', type: 'down' }, { id: 'r3', type: 'up' }, { id: 'r4', type: 'mute' }],
          cells: [
            { id: 'c1', split: false, chord: 'Am', top: '', bottom: '' },
            { id: 'c2', split: false, chord: 'Am', top: '', bottom: '' },
            { id: 'c3', split: false, chord: 'E', top: '', bottom: '' },
            { id: 'c4', split: false, chord: 'E', top: '', bottom: '' },
          ],
        }],
        images: [], notes: 'Bien travailler le rythme',
      }],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      artist: 'Pink Floyd',
      title: 'Comfortably Numb',
      classifications: ['Anglaise facile', 'À chanter'],
      progress: 45,
      isFavorite: false,
      tags: ['rock', 'classique'],
      youtubeUrls: [{ id: 'y2', url: '' }],
      versions: [{
        id: 'v2', label: 'Facile', bpm: 100, capo: 0, key: 'Em',
        structure: [{ id: 's2', section: 'Couplet', cols: 4, rows: 1, rhythm: [], cells: Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, split: false, chord: '', top: '', bottom: '' })) }],
        images: [], notes: '',
      }],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      artist: 'Pink Floyd',
      title: 'Another Brick in the Wall',
      classifications: ['Anglaise facile', 'À chanter'],
      progress: 85,
      isFavorite: true,
      tags: ['rock', 'classique', 'éducation'],
      youtubeUrls: [{ id: 'y3', url: '' }],
      versions: [{
        id: 'v3', label: 'Facile', bpm: 95, capo: 0, key: 'Dm',
        structure: [],
        images: [], notes: '',
      }],
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      artist: 'Ben Harper',
      title: 'Burn One Down',
      classifications: ['À travailler', 'Fingerstyle'],
      progress: 15,
      isFavorite: false,
      tags: ['reggae', 'picking avancé'],
      youtubeUrls: [{ id: 'y4', url: '' }],
      versions: [{
        id: 'v4', label: 'Facile', bpm: 110, capo: 0, key: 'A',
        structure: [],
        images: [], notes: '',
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      artist: 'Indochine',
      title: 'Canción Del Mariachi',
      classifications: ['Française facile', 'Fingerstyle'],
      progress: 30,
      isFavorite: false,
      tags: ['picking', 'difficile'],
      youtubeUrls: [{ id: 'y5', url: '' }],
      versions: [{
        id: 'v5', label: 'Facile', bpm: 90, capo: 0, key: 'G',
        structure: [],
        images: [], notes: '',
      }],
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

const SONGS_STORAGE_KEY = 'guitar-lab:songs';
const CLASSIFICATIONS_STORAGE_KEY = 'guitar-lab:classifications';

// Lit plusieurs fichiers image en parallèle et renvoie leurs data-URL dans l'ordre choisi
function readFilesAsDataUrls(files) {
  return Promise.all(
    Array.from(files).map(
      file =>
        new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        }),
    ),
  ).then(list => list.filter(Boolean));
}

function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

function SaveStatusBadge({ status }) {
  if (status === 'idle') return null;
  const config = {
    saving: { label: 'Enregistrement...', className: 'text-gray-400' },
    saved: { label: 'Enregistré', className: 'text-green-400' },
    error: { label: 'Non enregistré', className: 'text-red-400' },
  }[status];
  if (!config) return null;
  return (
    <span className={`ml-auto text-[10px] font-normal ${config.className}`} title={status === 'error' ? "La sauvegarde a échoué, tes changements restent visibles ici mais ne seront pas conservés après rechargement." : undefined}>
      {config.label}
    </span>
  );
}

export default function GuitarApp() {
  const [appMode, setAppMode] = useState('library');
  const [songs, setSongs] = useState(DEFAULT_SONGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const saveTimerRef = useRef(null);

  // Chargement depuis le stockage persistant au montage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(SONGS_STORAGE_KEY, false);
        if (!cancelled && result?.value) {
          const parsed = JSON.parse(result.value);
          if (Array.isArray(parsed)) setSongs(parsed);
        }
      } catch (err) {
        // Pas de données sauvegardées ou erreur de lecture : on garde les morceaux par défaut
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sauvegarde (avec anti-rebond) à chaque modification, une fois le chargement initial terminé
  useEffect(() => {
    if (!isLoaded) return;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const result = await window.storage.set(SONGS_STORAGE_KEY, JSON.stringify(songs), false);
        setSaveStatus(result ? 'saved' : 'error');
      } catch (err) {
        setSaveStatus('error');
      }
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [songs, isLoaded]);

  // Liste maîtresse des étiquettes de classement, modifiable et partagée entre la bibliothèque et l'écran de travail
  const [classificationOptions, setClassificationOptions] = useState(DEFAULT_CLASSIFICATIONS);
  const [classificationsLoaded, setClassificationsLoaded] = useState(false);
  const classificationsSaveTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(CLASSIFICATIONS_STORAGE_KEY, false);
        if (!cancelled && result?.value) {
          const parsed = JSON.parse(result.value);
          if (Array.isArray(parsed)) setClassificationOptions(parsed);
        }
      } catch (err) {
        // Pas de liste sauvegardée : on garde la liste par défaut
      } finally {
        if (!cancelled) setClassificationsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!classificationsLoaded) return;
    if (classificationsSaveTimerRef.current) clearTimeout(classificationsSaveTimerRef.current);
    classificationsSaveTimerRef.current = setTimeout(() => {
      window.storage.set(CLASSIFICATIONS_STORAGE_KEY, JSON.stringify(classificationOptions), false).catch(() => {});
    }, 600);
    return () => clearTimeout(classificationsSaveTimerRef.current);
  }, [classificationOptions, classificationsLoaded]);

  const addClassificationOption = (label) => {
    const clean = label.trim();
    if (!clean || classificationOptions.includes(clean)) return;
    setClassificationOptions([...classificationOptions, clean]);
  };

  const removeClassificationOption = (label) => {
    setClassificationOptions(classificationOptions.filter(c => c !== label));
  };

  const [selectedSongId, setSelectedSongId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('artist');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [viewMode, setViewMode] = useState('detailed');
  const [sortBy, setSortBy] = useState('favorite');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedSong = songs.find(s => s.id === selectedSongId);
  const selectedVersion = selectedSong?.versions.find(v => v.id === selectedVersionId) || selectedSong?.versions[0];

  const filteredSongs = songs.filter(song => {
    const matchesSearch =
      song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClassification = classificationFilter === 'all' || (song.classifications || []).includes(classificationFilter);
    return matchesSearch && matchesClassification;
  });

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortBy === 'favorite') {
      if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
    if (sortBy === 'progress-asc') return a.progress - b.progress;
    if (sortBy === 'progress-desc') return b.progress - a.progress;
    if (sortBy === 'recent') return new Date(b.updatedAt) - new Date(a.updatedAt);
    if (sortBy === 'old') return new Date(a.updatedAt) - new Date(b.updatedAt);
    return 0;
  });

  const stats = {
    total: songs.length,
    avgProgress: Math.round(songs.reduce((sum, s) => sum + s.progress, 0) / songs.length || 0),
    mastered: songs.filter(s => s.progress >= 70).length,
    lastModified: songs.length > 0 ? new Date(Math.max(...songs.map(s => new Date(s.updatedAt)))).toLocaleDateString('fr-FR') : '-',
  };

  const addSong = () => {
    const newSong = {
      id: Date.now().toString(),
      artist: 'Nouvel artiste',
      title: 'Nouveau morceau',
      classifications: ['À travailler'],
      progress: 0,
      isFavorite: false,
      tags: [],
      youtubeUrls: [{ id: Date.now().toString() + '-y', url: '' }],
      versions: [{
        id: Date.now().toString() + '-v',
        label: 'Facile',
        bpm: 120,
        capo: 0,
        key: 'Em',
        structure: [{
          id: Date.now().toString() + '-s',
          section: 'Section',
          cols: 4,
          rows: 1,
          rhythm: [],
          cells: Array.from({ length: 4 }, (_, i) => ({ id: `${Date.now()}-${i}`, split: false, chord: '', top: '', bottom: '' })),
        }],
        images: [],
        notes: '',
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSongs([...songs, newSong]);
  };

  const deleteSong = (id) => {
    setSongs(songs.filter(s => s.id !== id));
    if (selectedSongId === id) setSelectedSongId(null);
  };

  const updateSong = (updatedSong) => {
    setSongs(songs.map(s => s.id === updatedSong.id ? { ...updatedSong, updatedAt: new Date().toISOString() } : s));
  };

  const toggleFavorite = (id) => {
    setSongs(songs.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const organizeByGroup = () => {
    const groups = {};
    const pushTo = (key, song) => {
      if (!groups[key]) groups[key] = [];
      groups[key].push(song);
    };
    sortedSongs.forEach(song => {
      if (groupBy === 'artist') {
        pushTo(song.artist || 'Sans artiste', song);
      } else if (groupBy === 'classification') {
        // Un morceau porte plusieurs étiquettes : il apparaît dans chacun des groupes correspondants
        if (song.classifications && song.classifications.length > 0) {
          song.classifications.forEach(label => pushTo(`🏷️ ${label}`, song));
        } else {
          pushTo('Sans classement', song);
        }
      } else if (groupBy === 'progress') {
        let key = '';
        if (song.progress >= 70) key = '✓ Maîtrisé (70%+)';
        else if (song.progress >= 30) key = '⏳ En cours (30-70%)';
        else key = '📚 Débutant (0-30%)';
        pushTo(key, song);
      }
    });
    return groups;
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      {appMode === 'library' ? (
        <>
          {/* SIDEBAR */}
          <div className={`${sidebarCollapsed ? 'w-8' : 'w-72'} bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 transition-all`}>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-gray-700 flex items-center justify-center border-b border-gray-700">
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {!sidebarCollapsed && (
              <>
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Music className="w-5 h-5 text-amber-500" />
                    <h1 className="text-lg font-bold">Guitar Lab</h1>
                    <SaveStatusBadge status={saveStatus} />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="mt-3 flex gap-2">
                    <select
                      value={classificationFilter}
                      onChange={(e) => setClassificationFilter(e.target.value)}
                      className="flex-1 px-2 py-2 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">Tous</option>
                      {classificationOptions.map(label => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                    <button onClick={addSong} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-semibold transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Regrouper :</label>
                      <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="artist">🎤 Artiste</option>
                        <option value="classification">🏷️ Classement</option>
                        <option value="progress">📊 Progression</option>
                        <option value="none">Sans regroupement</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Trier :</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="favorite">⭐ Favoris d'abord</option>
                        <option value="recent">📅 Récemment modifié</option>
                        <option value="old">📅 Ancien d'abord</option>
                        <option value="progress-desc">📈 Progression (haut→bas)</option>
                        <option value="progress-asc">📉 Progression (bas→haut)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Affichage :</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewMode('detailed')}
                          className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${viewMode === 'detailed' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                          📇 Détaillé
                        </button>
                        <button
                          onClick={() => setViewMode('compact')}
                          className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${viewMode === 'compact' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                          📋 Compact
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <ClassificationManager
                  options={classificationOptions}
                  onAdd={addClassificationOption}
                  onRemove={removeClassificationOption}
                />
              </>
            )}
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* STATS DASHBOARD */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-750 border-b border-gray-700 p-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">📚 Total</div>
                  <div className="text-2xl font-bold text-amber-400">{stats.total}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">📊 Progrès moyen</div>
                  <div className="text-2xl font-bold text-amber-400">{stats.avgProgress}%</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">✓ Maîtrisés</div>
                  <div className="text-2xl font-bold text-amber-400">{stats.mastered}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">📅 Dernier changement</div>
                  <div className="text-sm font-bold text-amber-400">{stats.lastModified}</div>
                </div>
              </div>
            </div>

            {/* LIBRARY CONTENT */}
            <div className="flex-1 overflow-y-auto">
              {sortedSongs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Music className="w-12 h-12 mx-auto text-gray-600 mb-3 opacity-50" />
                    <p className="text-gray-400">Aucun morceau ne correspond</p>
                  </div>
                </div>
              ) : groupBy === 'none' ? (
                <div className={`p-4 ${viewMode === 'detailed' ? 'grid grid-cols-1 gap-3' : 'space-y-1'}`}>
                  {sortedSongs.map(song => (
                    <SongItem
                      key={song.id}
                      song={song}
                      isSelected={selectedSongId === song.id}
                      onSelect={() => {
                        setSelectedSongId(song.id);
                        setSelectedVersionId(song.versions[0]?.id);
                        setAppMode('editor');
                      }}
                      onDelete={() => deleteSong(song.id)}
                      onToggleFavorite={() => toggleFavorite(song.id)}
                      onUpdate={updateSong}
                      viewMode={viewMode}
                      classificationOptions={classificationOptions}
                      onAddClassificationOption={addClassificationOption}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  {Object.entries(organizeByGroup()).map(([groupKey, groupSongs]) => (
                    <div key={groupKey} className="mb-4">
                      <button
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                        className="w-full px-3 py-2 text-left bg-gray-750 hover:bg-gray-700 transition flex items-center gap-2 text-sm font-semibold text-gray-300 rounded-t-lg border border-gray-600 border-b-0"
                      >
                        <ChevronDown className={`w-4 h-4 transition ${expandedGroups[groupKey] ? '' : '-rotate-90'}`} />
                        {groupKey} <span className="text-xs text-gray-500 ml-1">({groupSongs.length})</span>
                      </button>
                      {expandedGroups[groupKey] && (
                        <div className={`bg-gray-800 border border-t-0 border-gray-600 rounded-b-lg overflow-hidden ${viewMode === 'detailed' ? 'grid grid-cols-1 gap-2 p-3' : 'space-y-0.5 p-2'}`}>
                          {groupSongs.map(song => (
                            <SongItem
                              key={song.id}
                              song={song}
                              isSelected={selectedSongId === song.id}
                              onSelect={() => {
                                setSelectedSongId(song.id);
                                setSelectedVersionId(song.versions[0]?.id);
                                setAppMode('editor');
                              }}
                              onDelete={() => deleteSong(song.id)}
                              onToggleFavorite={() => toggleFavorite(song.id)}
                              onUpdate={updateSong}
                              viewMode={viewMode}
                              classificationOptions={classificationOptions}
                              onAddClassificationOption={addClassificationOption}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        selectedSong && selectedVersion && (
          <WorkScreen
            song={selectedSong}
            version={selectedVersion}
            allSongs={songs}
            onBack={() => setAppMode('library')}
            onSelectSong={(id) => {
              setSelectedSongId(id);
              const song = songs.find(s => s.id === id);
              setSelectedVersionId(song?.versions[0]?.id);
            }}
            onSelectVersion={setSelectedVersionId}
            onUpdateSong={updateSong}
            classificationOptions={classificationOptions}
            onAddClassificationOption={addClassificationOption}
            onRemoveClassificationOption={removeClassificationOption}
          />
        )
      )}
    </div>
  );
}

// Petit gestionnaire de la liste maîtresse d'étiquettes de classement (ajout / suppression), utilisé dans la sidebar
function ClassificationManager({ options, onAdd, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const submit = () => {
    if (newLabel.trim()) {
      onAdd(newLabel);
      setNewLabel('');
    }
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition"
      >
        <span>🏷️ Étiquettes de classement</span>
        <ChevronDown className={`w-3 h-3 transition ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Nouvelle étiquette..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && submit()}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
            />
            <button onClick={submit} className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold transition">
              +
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {options.map(label => (
              <div key={label} className="px-2 py-1 bg-gray-700 rounded text-xs flex items-center gap-1">
                {label}
                <button onClick={() => onRemove(label)} className="hover:opacity-75" title="Retirer de la liste">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SongItem({ song, isSelected, onSelect, onDelete, onToggleFavorite, onUpdate, viewMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(song);

  const saveEdit = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  if (viewMode === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded transition ${isSelected ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-650 text-gray-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="hover:opacity-75">
          <Star className={`w-4 h-4 ${song.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
          <div className="text-sm font-semibold truncate">{song.title}</div>
          <div className="text-xs text-gray-300 truncate">{song.artist}</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-16 bg-gray-600 rounded h-1.5">
            <div className="bg-amber-500 h-full rounded" style={{ width: `${song.progress}%` }} />
          </div>
          <span className="text-xs w-6 text-right font-semibold">{song.progress}%</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 hover:bg-gray-600 rounded text-xs">
          ✏️
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-red-600 rounded text-xs">
          🗑️
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={onSelect}
        className={`p-4 rounded-lg border-2 transition cursor-pointer ${
          isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600 bg-gray-750 hover:bg-gray-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="hover:opacity-75 transition flex-shrink-0"
              >
                <Star className={`w-4 h-4 ${song.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
              </button>
              <h3 className="font-bold truncate text-sm">{song.title}</h3>
            </div>
            <p className="text-xs text-gray-400 truncate">{song.artist}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-2 hover:bg-gray-600 rounded transition"
            >
              <Edit2 className="w-3 h-3 text-amber-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 hover:bg-red-900 rounded transition"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Progression</span>
            <span className="text-xs font-bold text-amber-400">{song.progress}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all" style={{ width: `${song.progress}%` }} />
          </div>
        </div>

        <div className="flex gap-2 text-xs flex-wrap mb-2">
          <span className="px-2 py-1 bg-gray-600 rounded">{song.type === 'fingerstyle' ? '🎸 Fingerstyle' : '🎤 À chanter'}</span>
          <span className="px-2 py-1 bg-gray-600 rounded">{song.family}</span>
        </div>

        {song.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {song.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-amber-600/30 text-amber-300 rounded text-xs">
                🏷️ {tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-600">
          📅 {new Date(song.updatedAt).toLocaleDateString('fr-FR')}
        </div>
      </div>

      {isEditing && (
        <SongEditModal
          song={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onCancel={() => {
            setEditData(song);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
}

function SongEditModal({ song, onChange, onSave, onCancel }) {
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim()) {
      onChange({
        ...song,
        tags: [...song.tags, newTag],
      });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    onChange({
      ...song,
      tags: song.tags.filter(t => t !== tag),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-96 overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-amber-400">✏️ Éditer</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Titre</label>
            <input
              type="text"
              value={song.title}
              onChange={(e) => onChange({ ...song, title: e.target.value })}
              className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Artiste</label>
            <input
              type="text"
              value={song.artist}
              onChange={(e) => onChange({ ...song, artist: e.target.value })}
              className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <select
                value={song.type}
                onChange={(e) => onChange({ ...song, type: e.target.value })}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="à chanter">🎤 À chanter</option>
                <option value="fingerstyle">🎸 Fingerstyle</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Progression</label>
              <input
                type="number"
                min="0"
                max="100"
                value={song.progress}
                onChange={(e) => onChange({ ...song, progress: parseInt(e.target.value) })}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Catégorie</label>
            <select
              value={song.family}
              onChange={(e) => onChange({ ...song, family: e.target.value })}
              className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="à travailler">À travailler</option>
              <option value="française facile">Française facile</option>
              <option value="anglaise facile">Anglaise facile</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400">Tags</label>
              <button onClick={() => onChange({ ...song, isFavorite: !song.isFavorite })} className="text-xs hover:opacity-75">
                {song.isFavorite ? '⭐ Favori' : '☆ Ajouter aux favoris'}
              </button>
            </div>
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                placeholder="Nouveau tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={addTag}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold transition"
              >
                +
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {song.tags.map(tag => (
                <div key={tag} className="px-2 py-1 bg-amber-600 text-white rounded text-xs flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex gap-2 sticky bottom-0 bg-gray-800">
          <button onClick={onSave} className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded font-semibold transition text-sm">
            ✓ Valider
          </button>
          <button onClick={onCancel} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded font-semibold transition text-sm">
            ✕ Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function ClassificationPicker({ song, options, onAddOption, onRemoveOption, onUpdateSong }) {
  const [open, setOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const selected = song.classifications || [];

  const toggle = (label) => {
    const next = selected.includes(label)
      ? selected.filter(c => c !== label)
      : [...selected, label];
    onUpdateSong({ ...song, classifications: next });
  };

  const submitNew = () => {
    const clean = newLabel.trim();
    if (!clean) return;
    if (!options.includes(clean)) onAddOption?.(clean);
    if (!selected.includes(clean)) onUpdateSong({ ...song, classifications: [...selected, clean] });
    setNewLabel('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs flex items-center gap-1 max-w-[220px]"
        title="Type et catégories de classement (défini en bibliothèque)"
      >
        <span className="truncate">
          🏷️ {selected.length > 0 ? selected.join(' · ') : 'Classement…'}
        </span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-64 bg-gray-800 border border-gray-600 rounded shadow-2xl p-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Classement du morceau</p>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {options.length === 0 && (
                <p className="text-xs text-gray-500 px-1 py-2">Aucune étiquette. Ajoute la première ci-dessous.</p>
              )}
              {options.map(label => (
                <div key={label} className="flex items-center gap-1 group">
                  <button
                    onClick={() => toggle(label)}
                    className={`flex-1 text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 ${selected.includes(label) ? 'bg-amber-600/25 text-amber-300' : 'hover:bg-gray-700 text-gray-200'}`}
                  >
                    <span className="w-3 text-center">{selected.includes(label) ? '✓' : ''}</span>
                    <span className="truncate">{label}</span>
                  </button>
                  {onRemoveOption && (
                    <button
                      onClick={() => onRemoveOption(label)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 px-1 text-xs"
                      title="Supprimer cette étiquette de la liste"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-2 pt-2 border-t border-gray-700">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitNew()}
                placeholder="Nouvelle étiquette…"
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
              />
              <button onClick={submitNew} className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold">+</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorkScreen({ song, version, allSongs, onBack, onSelectSong, onSelectVersion, onUpdateSong, classificationOptions = [], onAddClassificationOption, onRemoveClassificationOption }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Mode compact (tablette/écran étroit) : les bandeaux passent en volets superposés au lieu d'être côte à côte
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 1080);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1080px)');
    const handler = (e) => setIsCompact(e.matches);
    handler(mq);
    (mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler));
    return () => (mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler));
  }, []);

  // À l'entrée en mode compact, les volets se ferment par défaut ; en sortie, ils reviennent ouverts côte à côte
  useEffect(() => {
    setLeftCollapsed(isCompact);
    setRightCollapsed(isCompact);
  }, [isCompact]);

  const updateVersion = (updates) => {
    const updatedSong = {
      ...song,
      versions: song.versions.map(v => v.id === version.id ? { ...v, ...updates } : v),
    };
    onUpdateSong(updatedSong);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-gray-800 to-gray-750 border-b border-gray-700 p-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition flex items-center gap-2 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Biblio
            </button>
            {isCompact && (
              <>
                <button
                  onClick={() => setLeftCollapsed(!leftCollapsed)}
                  className={`px-3 py-2 rounded transition flex items-center gap-1 text-sm font-medium ${!leftCollapsed ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title="Structure"
                >
                  📋
                </button>
                <button
                  onClick={() => setRightCollapsed(!rightCollapsed)}
                  className={`px-3 py-2 rounded transition flex items-center gap-1 text-sm font-medium ${!rightCollapsed ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title="Accords / Notes"
                >
                  🎼
                </button>
              </>
            )}
          </div>

          <div className="text-center flex-1 min-w-0">
            <h2 className="text-base font-bold truncate">{song.title}</h2>
            <p className="text-xs text-gray-400 truncate">{song.artist}</p>
          </div>

          <div className="flex items-center gap-2 bg-gray-900 rounded p-2 border border-gray-700 text-xs">
            <span>♪ {version.bpm} BPM</span>
            <span className="text-gray-500">•</span>
            <span>Capo: {version.capo}</span>
            <span className="text-gray-500">•</span>
            <span>{version.key}</span>
          </div>

          <ClassificationPicker
            song={song}
            options={classificationOptions}
            onAddOption={onAddClassificationOption}
            onRemoveOption={onRemoveClassificationOption}
            onUpdateSong={onUpdateSong}
          />

          <select
            value={version.id}
            onChange={(e) => onSelectVersion(e.target.value)}
            className="px-2 py-2 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
          >
            {song.versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden gap-0.5 bg-gray-900 p-0.5 relative">
        {isCompact && !leftCollapsed && (
          <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setLeftCollapsed(true)} />
        )}
        {isCompact && !rightCollapsed && (
          <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setRightCollapsed(true)} />
        )}

        <div
          className={
            isCompact
              ? `fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden transition-transform duration-200 shadow-2xl ${leftCollapsed ? '-translate-x-full' : 'translate-x-0'}`
              : `bg-gray-800 border border-gray-700 rounded flex flex-col overflow-hidden transition-all duration-200 flex-shrink-0 ${leftCollapsed ? 'w-0 border-0' : 'w-56'}`
          }
        >
          <LeftPanel version={version} updateVersion={updateVersion} />
        </div>

        {!isCompact && (
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="flex-shrink-0 w-4 self-stretch bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition flex items-center justify-center group"
            title={leftCollapsed ? 'Afficher le panneau Structure' : 'Masquer le panneau Structure'}
          >
            {leftCollapsed ? <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-amber-400" /> : <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-amber-400" />}
          </button>
        )}

        <div className="flex-1 bg-gray-800 border border-gray-700 rounded flex flex-col overflow-hidden min-w-0">
          <CenterPanel version={version} updateVersion={updateVersion} />
        </div>

        {!isCompact && (
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="flex-shrink-0 w-4 self-stretch bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition flex items-center justify-center group"
            title={rightCollapsed ? 'Afficher le panneau Notes/Galerie' : 'Masquer le panneau Notes/Galerie'}
          >
            {rightCollapsed ? <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-amber-400" /> : <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-amber-400" />}
          </button>
        )}

        <div
          className={
            isCompact
              ? `fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden transition-transform duration-200 shadow-2xl ${rightCollapsed ? 'translate-x-full' : 'translate-x-0'}`
              : `bg-gray-800 border border-gray-700 rounded flex flex-col overflow-hidden transition-all duration-200 flex-shrink-0 ${rightCollapsed ? 'w-0 border-0' : 'w-80'}`
          }
        >
          <RightPanel song={song} version={version} updateVersion={updateVersion} onUpdateSong={onUpdateSong} />
        </div>
      </div>
    </div>
  );
}

function LeftPanel({ version, updateVersion }) {
  const addSection = () => {
    const newSection = {
      id: Date.now().toString(),
      section: 'Nouvelle section',
      cols: 4,
      rows: 1,
      collapsed: false,
      rhythm: [],
      cells: Array.from({ length: 4 }, (_, i) => ({ id: `${Date.now()}-${i}`, split: false, chord: '', top: '', bottom: '' })),
    };
    updateVersion({ structure: [...version.structure, newSection] });
  };

  const setAllCollapsed = (collapsed) => {
    updateVersion({ structure: version.structure.map(s => ({ ...s, collapsed })) });
  };

  return (
    <>
      <datalist id="section-name-suggestions">
        {SECTION_NAME_SUGGESTIONS.map(s => <option key={s} value={s} />)}
      </datalist>

      <div className="bg-gray-750 border-b border-gray-700 p-3 flex-shrink-0">
        <h3 className="font-semibold text-amber-400 text-sm mb-2">📋 Structure</h3>
        <button onClick={addSection} className="w-full px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold transition mb-2">
          + Section
        </button>
        {version.structure.length > 1 && (
          <div className="flex gap-1">
            <button onClick={() => setAllCollapsed(false)} className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[11px] transition">
              Tout déplier
            </button>
            <button onClick={() => setAllCollapsed(true)} className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[11px] transition">
              Tout replier
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {version.structure.map((section, idx) => (
          <SectionBuilder key={section.id} section={section} index={idx} version={version} updateVersion={updateVersion} />
        ))}
      </div>
    </>
  );
}

function SectionBuilder({ section, index, version, updateVersion }) {
  const updateSection = (updates) => {
    updateVersion({
      structure: version.structure.map(s => s.id === section.id ? { ...s, ...updates } : s),
    });
  };

  const updateCell = (cellId, updates) => {
    updateSection({
      cells: section.cells.map(c => c.id === cellId ? { ...c, ...updates } : c),
    });
  };

  const addRhythm = (type) => {
    updateSection({
      rhythm: [...section.rhythm, { id: Date.now().toString(), type }],
    });
  };

  const removeRhythm = (id) => {
    updateSection({
      rhythm: section.rhythm.filter(r => r.id !== id),
    });
  };

  const resizeGrid = (cols, rows) => {
    if (cols < 1 || rows < 1) return;
    const newCellCount = cols * rows;
    const oldCells = section.cells;
    const newCells = Array.from({ length: newCellCount }, (_, i) => oldCells[i] || { id: Date.now().toString() + '-' + i, split: false, chord: '', top: '', bottom: '' });
    updateSection({ cols, rows, cells: newCells });
  };

  const toggleSplit = (cellId) => {
    updateCell(cellId, { split: !section.cells.find(c => c.id === cellId).split });
  };

  const toggleCollapsed = () => updateSection({ collapsed: !section.collapsed });

  const style = getSectionStyle(section.section);
  const collapsed = !!section.collapsed;
  const rowCount = section.rows || Math.max(1, Math.round(section.cells.length / (section.cols || 1)));

  return (
    <div className={`rounded border-l-4 ${style.border} ${style.tint} border border-gray-600 text-xs overflow-hidden`}>
      <div className="flex items-center gap-2 p-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
        <button
          onClick={toggleCollapsed}
          className="flex-shrink-0 text-gray-400 hover:text-amber-400 transition"
          title={collapsed ? 'Déplier la section' : 'Replier la section'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <input
          type="text"
          list="section-name-suggestions"
          value={section.section}
          onChange={(e) => updateSection({ section: e.target.value })}
          placeholder="Intro, Couplet, Refrain..."
          className={`flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-2 py-1 font-semibold focus:outline-none focus:border-amber-500 ${style.text}`}
        />
        {collapsed && (
          <span className="flex-shrink-0 text-gray-400 text-[10px] whitespace-nowrap">
            {section.cols}×{rowCount}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="px-2 pb-2">
          <div className="mb-2 pb-2 border-b border-gray-600">
            <div className="text-gray-400 mb-1 font-semibold">Rythme:</div>
            <div className="flex gap-1 flex-wrap mb-2">
              {section.rhythm.map(r => (
                <div key={r.id} className={`px-2 py-1 rounded text-white font-semibold flex items-center gap-1 ${r.type === 'down' ? 'bg-blue-600' : r.type === 'up' ? 'bg-green-600' : 'bg-gray-600'}`}>
                  {r.type === 'down' ? <ArrowDown className="w-3 h-3" /> : r.type === 'up' ? <ArrowUp className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <button onClick={() => removeRhythm(r.id)} className="hover:opacity-50">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => addRhythm('down')} className="flex-1 p-1 bg-blue-700 hover:bg-blue-600 rounded flex items-center justify-center gap-1 text-xs"><ArrowDown className="w-3 h-3" /></button>
              <button onClick={() => addRhythm('up')} className="flex-1 p-1 bg-green-700 hover:bg-green-600 rounded flex items-center justify-center gap-1 text-xs"><ArrowUp className="w-3 h-3" /></button>
              <button onClick={() => addRhythm('mute')} className="flex-1 p-1 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center gap-1 text-xs"><X className="w-3 h-3" /></button>
            </div>
          </div>

          <div className="flex gap-3 mb-2 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <span>Cases:</span>
              <button onClick={() => resizeGrid(section.cols - 1, rowCount)} className="w-5 h-5 bg-gray-600 hover:bg-gray-500 rounded text-xs">−</button>
              <span className="w-4 text-center">{section.cols}</span>
              <button onClick={() => resizeGrid(section.cols + 1, rowCount)} className="w-5 h-5 bg-gray-600 hover:bg-gray-500 rounded text-xs">+</button>
            </div>
            <div className="flex items-center gap-1">
              <span>Lignes:</span>
              <button onClick={() => resizeGrid(section.cols, rowCount - 1)} className="w-5 h-5 bg-gray-600 hover:bg-gray-500 rounded text-xs">−</button>
              <span className="w-4 text-center">{rowCount}</span>
              <button onClick={() => resizeGrid(section.cols, rowCount + 1)} className="w-5 h-5 bg-gray-600 hover:bg-gray-500 rounded text-xs">+</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid w-max gap-0.5" style={{ gridTemplateColumns: `repeat(${section.cols}, 2.5rem)` }}>
              {section.cells.map(cell => (
                <ChordCell key={cell.id} cell={cell} onUpdate={(c) => updateCell(cell.id, c)} onToggleSplit={() => toggleSplit(cell.id)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChordCell({ cell, onUpdate, onToggleSplit }) {
  return (
    <div className="relative w-10 h-10 bg-gray-900 border border-gray-600 text-xs">
      <button onClick={onToggleSplit} className="absolute top-0 left-0 z-10 w-3 h-3 bg-gray-700 hover:bg-amber-600 rounded-br text-[8px] flex items-center justify-center leading-none pb-0.5">
        ⟋
      </button>
      {cell.split ? (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top right, transparent calc(50% - 1px), #4b5563 calc(50% - 1px), #4b5563 calc(50% + 1px), transparent calc(50% + 1px))' }} />
          <input value={cell.top} onChange={(e) => onUpdate({ top: e.target.value })} className="absolute top-0.5 right-0.5 w-4 bg-transparent text-right text-yellow-300 font-bold text-[9px] focus:outline-none" />
          <input value={cell.bottom} onChange={(e) => onUpdate({ bottom: e.target.value })} className="absolute bottom-0.5 left-0.5 w-4 bg-transparent text-left text-yellow-300 font-bold text-[9px] focus:outline-none" />
        </>
      ) : (
        <input value={cell.chord} onChange={(e) => onUpdate({ chord: e.target.value })} className="absolute inset-0 w-full h-full bg-transparent text-center text-yellow-300 font-bold text-sm focus:outline-none" />
      )}
    </div>
  );
}

function CenterPanel({ version, updateVersion }) {
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(version.bpm || 120);
  const galleryRef = useRef(null);
  const audioContextRef = useRef(null);
  const images = version?.images || [];

  useEffect(() => {
    setBpm(version.bpm || 120);
  }, [version.id]);

  useEffect(() => {
    if (!isAutoScrolling || !galleryRef.current) return;
    const interval = setInterval(() => {
      galleryRef.current.scrollBy({ top: scrollSpeed, behavior: 'smooth' });
    }, 100);
    return () => clearInterval(interval);
  }, [isAutoScrolling, scrollSpeed]);

  const playMetronomeClick = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    if (!metronomeActive) return;
    const interval = (60 / bpm) * 1000;
    const timer = setInterval(playMetronomeClick, interval);
    return () => clearInterval(timer);
  }, [metronomeActive, bpm]);

  // Hauteur d'affichage des photos empilées : compact / moyen / entier
  const [imgHeight, setImgHeight] = useState('md');
  const HEIGHTS = { sm: 'max-h-64', md: 'max-h-96', full: 'max-h-none' };

  const addImages = (dataUrls) => {
    if (!dataUrls.length) return;
    const added = dataUrls.map(src => ({ id: newId(), src, x: 0, y: 0, scale: 1 }));
    updateVersion({ images: [...(version?.images || []), ...added] });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    readFilesAsDataUrls(files).then(addImages);
  };

  // Coller depuis le presse-papiers : accepte plusieurs images d'un coup
  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items.filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
    if (!files.length) return;
    e.preventDefault();
    readFilesAsDataUrls(files).then(addImages);
  };

  useEffect(() => {
    const onDocPaste = (e) => handlePaste(e);
    document.addEventListener('paste', onDocPaste);
    return () => document.removeEventListener('paste', onDocPaste);
  }, [version?.id, version?.images]);

  const moveImage = (id, dir) => {
    const list = [...(version?.images || [])];
    const i = list.findIndex(img => img.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    updateVersion({ images: list });
  };


  const deleteImage = (id) => {
    updateVersion({ images: images.filter(i => i.id !== id) });
  };

  const [editingImageId, setEditingImageId] = useState(null);
  const editingImage = images.find(i => i.id === editingImageId);

  const saveEditedGalleryImage = (dataUrl) => {
    updateVersion({ images: images.map(i => i.id === editingImageId ? { ...i, src: dataUrl } : i) });
    setEditingImageId(null);
  };

  return (
    <>
      <div className="bg-gray-750 border-b border-gray-700 p-2 flex-shrink-0 flex-wrap flex items-center gap-2">
        <label className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold cursor-pointer flex items-center gap-1">
          📁 Importer
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
        </label>

        <button
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${isAutoScrolling ? 'bg-amber-600 text-white' : 'bg-gray-700'}`}
        >
          {isAutoScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>

        <div className="flex items-center gap-1 text-xs">
          <span>Vitesse:</span>
          <input type="range" min="0.5" max="10" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} className="w-12 accent-amber-500" />
        </div>

        <button
          onClick={() => setMetronomeActive(!metronomeActive)}
          className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${metronomeActive ? 'bg-red-600' : 'bg-gray-700'}`}
        >
          {metronomeActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
        </button>

        <input
          type="number"
          value={bpm}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setBpm(Number.isNaN(val) ? 0 : val);
          }}
          onBlur={() => {
            const clamped = Math.min(240, Math.max(20, bpm || 20));
            setBpm(clamped);
            updateVersion({ bpm: clamped });
          }}
          min="20" max="240" className="w-12 px-1 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-center focus:outline-none text-amber-400 font-bold" />
        <span className="text-xs text-gray-400">BPM</span>
      </div>

      <div ref={galleryRef} className="flex-1 overflow-y-auto bg-gray-900 p-4 space-y-4" style={{ touchAction: 'pan-y' }} onPaste={handlePaste}>
        {images.length > 0 ? (
          images.map((img, idx) => (
            <div key={img.id} className="relative group" style={{ touchAction: 'pan-y' }}>
              <img
                src={img.src}
                alt={`Tablature ${idx + 1}`}
                draggable={false}
                className={`w-full ${HEIGHTS[imgHeight]} object-contain bg-black rounded border border-gray-700 select-none`}
                style={{ touchAction: 'pan-y' }}
              />
              <span className="absolute top-2 left-2 bg-black/70 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
                {idx + 1}/{images.length}
              </span>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition">
                <button onClick={() => moveImage(img.id, -1)} disabled={idx === 0} className="bg-gray-800/90 hover:bg-gray-700 disabled:opacity-30 rounded-full p-2" title="Monter">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => moveImage(img.id, 1)} disabled={idx === images.length - 1} className="bg-gray-800/90 hover:bg-gray-700 disabled:opacity-30 rounded-full p-2" title="Descendre">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button onClick={() => setEditingImageId(img.id)} className="bg-amber-700 hover:bg-amber-600 rounded-full p-2" title="Éditer cette image">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteImage(img.id)} className="bg-red-900 hover:bg-red-800 rounded-full p-2" title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Importe ou colle une ou plusieurs images de tablature</p>
              <p className="text-xs mt-1 opacity-70">Elles s'affichent empilées, l'une sous l'autre</p>
            </div>
          </div>
        )}
      </div>

      {editingImage && (
        <ImageEditorModal
          src={editingImage.src}
          onSave={saveEditedGalleryImage}
          onClose={() => setEditingImageId(null)}
        />
      )}
    </>
  );
}

// Éditeur d'image simple : rognage, dessin libre, texte — appliqué sur canvas
function ImageEditorModal({ src, onSave, onClose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const originalImgRef = useRef(null);
  const snapshotRef = useRef(null); // ImageData pris avant un rognage, pour prévisualiser sans altérer
  const [mode, setMode] = useState('draw'); // 'draw' | 'crop' | 'text'
  const [color, setColor] = useState('#f59e0b');
  const [brushSize, setBrushSize] = useState(4);
  const [ready, setReady] = useState(false);
  const drawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const cropStartRef = useRef(null);
  const [cropRect, setCropRect] = useState(null);
  const [textInput, setTextInput] = useState(null); // { x, y, value }

  const fitToCanvas = (img) => {
    const maxDim = 460;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  };

  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.onload = () => {
      originalImgRef.current = img;
      fitToCanvas(img);
      setReady(true);
    };
    img.src = src;
  }, [src]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const drawCropOverlay = (rect) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (snapshotRef.current) ctx.putImageData(snapshotRef.current, 0, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0, rect.x, rect.y, rect.w, rect.h);
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  };

  const handlePointerDown = (e) => {
    e.target.setPointerCapture?.(e.pointerId);
    const pos = getPos(e);
    if (mode === 'draw') {
      drawingRef.current = true;
      lastPosRef.current = pos;
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (mode === 'crop') {
      snapshotRef.current = canvasRef.current.getContext('2d').getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      cropStartRef.current = pos;
      setCropRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    } else if (mode === 'text') {
      setTextInput({ x: pos.x, y: pos.y, value: '' });
    }
  };

  const handlePointerMove = (e) => {
    if (mode === 'draw' && drawingRef.current) {
      const pos = getPos(e);
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
    } else if (mode === 'crop' && cropStartRef.current) {
      const pos = getPos(e);
      const start = cropStartRef.current;
      const canvas = canvasRef.current;
      const rect = {
        x: Math.max(0, Math.min(start.x, pos.x)),
        y: Math.max(0, Math.min(start.y, pos.y)),
        w: Math.min(canvas.width, Math.abs(pos.x - start.x)),
        h: Math.min(canvas.height, Math.abs(pos.y - start.y)),
      };
      setCropRect(rect);
      drawCropOverlay(rect);
    }
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    cropStartRef.current = null;
  };

  const applyCrop = () => {
    if (!cropRect || cropRect.w < 4 || cropRect.h < 4 || !snapshotRef.current) return;
    const canvas = canvasRef.current;
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    temp.getContext('2d').putImageData(snapshotRef.current, 0, 0);

    const cropped = document.createElement('canvas');
    cropped.width = cropRect.w;
    cropped.height = cropRect.h;
    cropped.getContext('2d').drawImage(temp, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);

    canvas.width = cropRect.w;
    canvas.height = cropRect.h;
    canvas.style.width = cropRect.w + 'px';
    canvas.style.height = cropRect.h + 'px';
    canvas.getContext('2d').drawImage(cropped, 0, 0);

    snapshotRef.current = null;
    setCropRect(null);
  };

  const cancelCropPreview = () => {
    if (snapshotRef.current) {
      canvasRef.current.getContext('2d').putImageData(snapshotRef.current, 0, 0);
    }
    snapshotRef.current = null;
    setCropRect(null);
  };

  const confirmText = () => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = `${16 + brushSize * 2}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(textInput.value, textInput.x, textInput.y);
    setTextInput(null);
  };

  const resetImage = () => {
    const img = originalImgRef.current;
    if (!img) return;
    snapshotRef.current = null;
    setCropRect(null);
    setTextInput(null);
    fitToCanvas(img);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-full max-h-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-amber-400 text-sm">✏️ Éditer l'image</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button onClick={() => { cancelCropPreview(); setMode('draw'); }} className={`px-2 py-1 rounded font-semibold ${mode === 'draw' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>✏️ Dessiner</button>
          <button onClick={() => { cancelCropPreview(); setMode('text'); }} className={`px-2 py-1 rounded font-semibold ${mode === 'text' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>🔤 Texte</button>
          <button onClick={() => { cancelCropPreview(); setMode('crop'); }} className={`px-2 py-1 rounded font-semibold ${mode === 'crop' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}>✂️ Rogner</button>
          {mode === 'crop' && cropRect && cropRect.w > 4 && cropRect.h > 4 && (
            <>
              <button onClick={applyCrop} className="px-2 py-1 rounded font-semibold bg-green-700 hover:bg-green-600">Appliquer</button>
              <button onClick={cancelCropPreview} className="px-2 py-1 rounded font-semibold bg-gray-700 hover:bg-gray-600">Annuler la sélection</button>
            </>
          )}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 bg-transparent border-0 cursor-pointer" title="Couleur" />
          {mode === 'draw' && (
            <div className="flex items-center gap-1">
              <span>Épaisseur:</span>
              <input type="range" min="1" max="12" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-16 accent-amber-500" />
            </div>
          )}
          <button onClick={resetImage} className="px-2 py-1 rounded font-semibold bg-gray-700 hover:bg-gray-600 ml-auto">↺ Recommencer</button>
        </div>

        <div ref={containerRef} className="relative bg-black/30 rounded overflow-hidden self-center flex items-center justify-center" style={{ touchAction: 'none', minWidth: 120, minHeight: 120 }}>
          {!ready && <span className="text-gray-500 text-xs p-8">Chargement de l'image...</span>}
          <canvas
            ref={canvasRef}
            className="block"
            style={{ display: ready ? 'block' : 'none', cursor: mode === 'crop' ? 'crosshair' : mode === 'text' ? 'text' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {textInput && (
            <input
              autoFocus
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') setTextInput(null); }}
              onBlur={confirmText}
              placeholder="Texte..."
              className="absolute bg-gray-900/90 border border-amber-500 rounded px-1 text-xs text-white outline-none"
              style={{ left: textInput.x, top: textInput.y, width: 110 }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold">Annuler</button>
          <button onClick={() => onSave(canvasRef.current.toDataURL('image/png'))} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function ChordThumbnailsPanel({ version, updateVersion }) {
  const thumbnails = version.chordThumbnails || [];
  const canAddMore = thumbnails.length < 5;
  const [editingId, setEditingId] = useState(null);

  const addThumbnail = (dataUrl) => {
    updateVersion({ chordThumbnails: [...(version.chordThumbnails || []), { id: Date.now().toString() + Math.random().toString(36).slice(2), src: dataUrl }] });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 5 - thumbnails.length;
    files.slice(0, remainingSlots).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => addThumbnail(event.target.result);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handlePaste = (e) => {
    if (!canAddMore) return;
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (event) => addThumbnail(event.target.result);
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  };

  const removeThumbnail = (id) => {
    updateVersion({ chordThumbnails: thumbnails.filter(t => t.id !== id) });
  };

  const saveEditedImage = (dataUrl) => {
    updateVersion({ chordThumbnails: thumbnails.map(t => t.id === editingId ? { ...t, src: dataUrl } : t) });
    setEditingId(null);
  };

  const editingThumbnail = thumbnails.find(t => t.id === editingId);

  return (
    <div className="bg-gray-750 border-b border-gray-700 p-3 flex-shrink-0">
      <h3 className="font-semibold text-amber-400 mb-2 text-sm">🎼 Accords ({thumbnails.length}/5)</h3>
      <div className="flex flex-wrap gap-2">
        {thumbnails.map(t => (
          <div key={t.id} className="relative h-16 bg-gray-900 rounded border border-gray-600 overflow-hidden group flex-shrink-0 flex items-center justify-center" style={{ minWidth: 40, maxWidth: 112 }}>
            <img src={t.src} alt="Accord" className="max-w-full max-h-full object-contain" />
            <button
              onClick={() => setEditingId(t.id)}
              className="absolute bottom-0 left-0 bg-black/70 hover:bg-amber-600 text-white w-5 h-4 flex items-center justify-center text-[9px] leading-none rounded-tr"
              title="Éditer cette image"
            >
              ✏️
            </button>
            <button
              onClick={() => removeThumbnail(t.id)}
              className="absolute top-0 right-0 bg-black/70 hover:bg-red-600 text-white w-4 h-4 flex items-center justify-center text-[10px] leading-none rounded-bl"
              title="Retirer cette image"
            >
              ×
            </button>
          </div>
        ))}
        {canAddMore && (
          <label
            onPaste={handlePaste}
            tabIndex={0}
            className="w-16 h-16 rounded border border-dashed border-gray-500 hover:border-amber-500 flex-shrink-0 flex flex-col items-center justify-center text-gray-400 hover:text-amber-400 cursor-pointer text-[9px] text-center leading-tight transition"
            title="Cliquer pour importer (plusieurs possibles), ou coller (Ctrl+V) une image d'accord"
          >
            + / Coller
            <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      {editingThumbnail && (
        <ImageEditorModal
          src={editingThumbnail.src}
          onSave={saveEditedImage}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function RightPanel({ song, version, updateVersion, onUpdateSong }) {
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <>
      <div className="bg-gray-750 border-b border-gray-700 p-3 flex-shrink-0">
        <h3 className="font-semibold text-amber-400 mb-3 text-sm">🎥 YouTube</h3>
        <div className="space-y-2">
          {song.youtubeUrls?.map(url => (
            <input
              key={url.id}
              type="text"
              placeholder="URL YouTube..."
              value={url.url}
              onChange={(e) => {
                const updated = {
                  ...song,
                  youtubeUrls: song.youtubeUrls.map(u => u.id === url.id ? { ...u, url: e.target.value } : u),
                };
                onUpdateSong(updated);
              }}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
            />
          ))}
        </div>
      </div>

      <ChordThumbnailsPanel version={version} updateVersion={updateVersion} />

      <div className={notesOpen ? 'flex-1 flex flex-col overflow-hidden p-3' : 'flex-shrink-0 p-3'}>
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="w-full flex items-center justify-between font-semibold text-amber-400 text-sm mb-2"
        >
          <span>📝 Notes</span>
          {notesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {notesOpen && (
          <textarea
            value={version.notes || ''}
            onChange={(e) => updateVersion({ notes: e.target.value })}
            className="flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            placeholder="Ajoute tes notes..."
            autoFocus
          />
        )}
      </div>
    </>
  );
}
