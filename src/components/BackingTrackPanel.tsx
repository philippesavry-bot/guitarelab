import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Song, SongVersion } from '../lib/types';
import { Button } from './ui/button';
import { BackingTrackGenerator } from './BackingTrackGenerator';
import { extractYoutubeId } from '../lib/youtube';

interface BackingTrackPanelProps {
  song: Song;
  version: SongVersion;
  onUpdateSong: (song: Song) => void;
  onPlayVideo: (link: any) => void;
}

function BackingTrackYoutube({ song, onUpdateSong, onPlayVideo }: { song: Song; onUpdateSong: (song: Song) => void; onPlayVideo: (link: any) => void }) {
  const url = (song as any).backingTrackUrl || '';
  const videoId = extractYoutubeId(url);
  const searchQuery = encodeURIComponent(`${song.artist} ${song.title} backing track`.trim());
  const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="Colle ici l'URL YouTube du backing track..."
          value={url}
          onChange={e => onUpdateSong({ ...song, backingTrackUrl: e.target.value })}
          className="flex-1 min-w-0 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs focus:outline-none focus:border-amber-500 text-white"
        />
        {videoId && (
          <Button
            onClick={() => onPlayVideo({ id: 'backing-track', url, videoId, bookmarks: [] })}
            className="flex-shrink-0 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs transition"
            title="Lire le backing track"
          >
            ▶️
          </Button>
        )}
      </div >
      <a
        href={searchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-xs transition text-slate-300"
        title="Ouvre une recherche YouTube pré-remplie pour ce morceau"
      >
        <Search className="w-3 h-3" /> Chercher sur YouTube
      </a>
      <p className="text-[10px] text-slate-500">
        Trouve une vidéo, copie son URL, colle-la ci-dessus. Elle se relit ensuite comme tes vidéos habituelles (repères inclus).
      </p>
    </div>
  );
}

export function BackingTrackPanel({ song, version, onUpdateSong, onPlayVideo }: BackingTrackPanelProps) {
  const [tab, setTab] = useState<'youtube' | 'generate'>('youtube');

  return (
    <div className="p-3 border-b border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-amber-500 text-sm">🎧 Backing Track</h3>
        <div className="flex bg-slate-900 rounded p-0.5 border border-slate-700">
          <Button
            onClick={() => setTab('youtube')}
            variant="ghost" size="sm" className={`px-2 py-1 rounded text-[10px] font-semibold transition ${tab === 'youtube' ? 'bg-amber-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
          >
            📺 Vidéo
          </Button>
          <Button
            onClick={() => setTab('generate')}
            variant="ghost" size="sm" className={`px-2 py-1 rounded text-[10px] font-semibold transition ${tab === 'generate' ? 'bg-amber-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
          >
            🎛️ Générer
          </Button>
        </div >
      </div >
      {tab === 'youtube' ? (
        <BackingTrackYoutube song={song} onUpdateSong={onUpdateSong} onPlayVideo={onPlayVideo} />
      ) : (
        <BackingTrackGenerator version={version} bpm={version.bpm || 120} />
      )}
    </div>
  );
}
