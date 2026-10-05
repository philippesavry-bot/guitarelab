import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { Song, SongVersion, VideoLink } from '../lib/types';
import { Button } from './ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { LeftPanel } from './LeftPanel';
import { CenterPanel } from './CenterPanel';
import { RightPanel } from './RightPanel';
import { YoutubeMiniPlayer } from './YoutubeMiniPlayer';

export function SongDetail({ songId }: { songId: string }) {
  const { library, updateSong } = useLibrary();
  const navigate = useNavigate();
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [activeVideoLink, setActiveVideoLink] = useState<VideoLink | null>(null);

  const song = library?.songs.find(s => s.id === songId);

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Morceau introuvable</h2>
        <Button onClick={() => navigate({ to: '/' })} className="bg-amber-600 hover:bg-amber-700 text-white">
          Retour à la bibliothèque
        </Button>
      </div>
    );
  }

  React.useEffect(() => {
    if (song.versions.length > 0 && !activeVersionId) {
      setActiveVersionId(song.versions[0].id);
    }
  }, [song, activeVersionId]);

  const activeVersion = song.versions.find(v => v.id === activeVersionId);

  const handleUpdateVersion = (updates: Partial<SongVersion>) => {
    if (!activeVersionId) return;
    const updatedSong = {
      ...song,
      versions: song.versions.map(v => v.id === activeVersionId ? { ...v, ...updates } : v),
    };
    updateSong(song.id, updatedSong);
  };

  const handleSaveBookmark = (linkId: string, update: { seconds: number; name: string } | { delete: string }) => {
    const updatedSong = {
      ...song,
      versions: song.versions.map(v => {
        if (!v.videoLinks) return v;
        const updatedLinks = v.videoLinks.map(link => {
          if (link.id !== linkId) return link;
          if ('delete' in update) {
            return { ...link, bookmarks: link.bookmarks.filter(bm => bm.id !== update.delete) };
          }
          return {
            ...link,
            bookmarks: [...link.bookmarks, { id: Date.now().toString(), time: update.seconds, name: update.name }]
          };
        });
        return { ...v, videoLinks: updatedLinks };
      })
    };
    updateSong(song.id, updatedSong);
  };

  const handleAddImages = (blobs: string[]) => {
    if (!activeVersionId) return;
    const newImages = blobs.map(blob => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      blob,
      profile: 'document',
    }));
    handleUpdateVersion({
      images: [...(activeVersion?.images || []), ...newImages],
    });
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/' })}
            className="text-slate-400 hover:text-white -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Retour
          </Button>

          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Progression</div>
            <div className="font-bold text-amber-500">{song.progress}%</div>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-white leading-tight">{song.title}</h1>
          <p className="text-slate-400 text-lg">{song.artist}</p>
        </div>
      </header>

      {/* Versions Tabs */}
      <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 border-b border-slate-800 overflow-x-auto flex-shrink-0">
        {song.versions.map(version => (
          <Button
            key={version.id}
            variant={activeVersionId === version.id ? 'default' : 'outline'}
            className={`rounded-full px-4 ${activeVersionId === version.id ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-700 text-slate-400 hover:text-white'}`}
            onClick={() => setActiveVersionId(version.id)}
          >
            {version.name}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="rounded-full text-slate-500 hover:text-white">
          + Nouvelle version
        </Button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {activeVersion ? (
          <>
            <LeftPanel
              version={activeVersion}
              updateVersion={handleUpdateVersion}
            />
            <CenterPanel
              version={activeVersion}
              updateVersion={handleUpdateVersion}
            />
            <RightPanel
              song={song}
              version={activeVersion}
              updateVersion={handleUpdateVersion}
              onPlayVideo={(link) => setActiveVideoLink(link)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Veuillez sélectionner une version du morceau.
          </div>
        )}
      </div>
      {activeVideoLink && (
        <YoutubeMiniPlayer
          link={activeVideoLink}
          onClose={() => setActiveVideoLink(null)}
          onSaveBookmark={handleSaveBookmark}
          onAddImages={handleAddImages}
        />
      )}
    </div>
  );
}
