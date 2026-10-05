import React from 'react';
import { useLibrary } from '../context/LibraryContext';
import { Song } from '../lib/types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Star, Play, MoreVertical } from 'lucide-react';
import { Link } from '@tanstack/react-router';

function progressToRoadmapRgb(pct: number) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const [lo, hi] = p >= 50
    ? [{ p: 50, c: [245, 158, 11] }, { p: 100, c: [34, 197, 94] }] // Amber to Green
    : [{ p: 0, c: [239, 68, 68] }, { p: 50, c: [245, 158, 11] }]; // Red to Amber
  const t = hi.p === lo.p ? 0 : (p - lo.p) / (hi.p - lo.p);
  return lo.c.map((v, i) => Math.round(v + (hi.c[i] - v) * t));
}

export function SongList() {
  const { library, isLoading } = useLibrary();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement de la bibliothèque...</div>;
  }

  if (!library || library.songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">Aucun morceau pour le moment</h2>
        <p className="text-muted-foreground">Commencez par ajouter vos premiers morceaux de guitare.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {library.songs.map((song) => {
        const [r, g, b] = progressToRoadmapRgb(song.progress);
        const progressColor = `rgb(${r}, ${g}, ${b})`;

        return (
          <Card key={song.id} className="relative overflow-hidden bg-slate-900 border-slate-800 text-white group">
            {/* Progression Fill - Bottom to Top */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-500 ease-out opacity-30"
              style={{
                height: `${song.progress}%`,
                backgroundColor: progressColor
              }}
            />

            <div className="relative p-4 flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded bg-slate-800 overflow-hidden flex-shrink-0">
                    {song.coverImage && <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold truncate leading-tight" title={song.title}>{song.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{song.artist}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-full ${song.favorite ? 'text-amber-500' : 'text-slate-600'}`}
                >
                  <Star className={`h-4 w-4 ${song.favorite ? 'fill-current' : ''}`} />
                </Button>
              </div>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: progressColor,
                      color: progressColor
                    }}
                  >
                    {song.progress}%
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{song.difficulty}</span>
                </div>
                <Link to="/song/$songId" params={{ songId: song.id }}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Play className="h-3 w-3 mr-1" /> Travailler
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
