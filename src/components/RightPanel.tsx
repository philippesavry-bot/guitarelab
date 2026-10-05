import React from 'react';
import { Button } from './ui/button';
import { Info, Music, Youtube } from 'lucide-react';
import { Song, SongVersion } from '../lib/types';
import { BackingTrackPanel } from './BackingTrackPanel';

interface RightPanelProps {
  song: Song;
  version: SongVersion;
  updateVersion: (updates: Partial<SongVersion>) => void;
  onPlayVideo: (link: any) => void;
}

export function RightPanel({ song, version, updateVersion, onPlayVideo }: RightPanelProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 overflow-hidden">
      <BackingTrackPanel
        song={song}
        version={version}
        onUpdateSong={() => {}}
        onPlayVideo={onPlayVideo}
      />

      <div className="flex-1 flex flex-col p-4">
        <h3 className="font-bold text-amber-500 text-sm mb-3 flex items-center gap-2">
          <Info className="h-4 w-4" /> Notes personnelles
        </h3>
        <textarea
          className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
          placeholder="Notez ici vos remarques sur le rythme, les doigtés ou les pièges du morceau..."
          value={version.notes}
          onChange={(e) => updateVersion({ notes: e.target.value })}
        />
      </div >
    </div >
  );
}
