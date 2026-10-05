import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Image as ImageIcon, Play, Pause, Upload } from 'lucide-react';
import { SongVersion } from '../lib/types';

interface CenterPanelProps {
  version: SongVersion;
  updateVersion: (updates: Partial<SongVersion>) => void;
}

export function CenterPanel({ version, updateVersion }: CenterPanelProps) {
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(20);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAutoScrolling || !galleryRef.current) return;

    const interval = setInterval(() => {
      if (galleryRef.current) {
        galleryRef.current.scrollBy({ top: scrollSpeed / 10, behavior: 'smooth' });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isAutoScrolling, scrollSpeed]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const dataUrls = await Promise.all(
      files.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      }))
    );

    const newImages = dataUrls.map(src => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      blob: src,
      profile: 'document',
    }));

    updateVersion({
      images: [...version.images, ...newImages],
    });
  };

  const removeImage = (id: string) => {
    updateVersion({
      images: version.images.filter(img => img.id !== id),
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-slate-300 border-slate-700 hover:bg-slate-800"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" /> Ajouter photo
          </Button>
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="flex items-center gap-3 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <Button
            size="sm"
            variant="ghost"
            className={`h-8 w-8 p-0 ${isAutoScrolling ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          >
            {isAutoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] text-slate-500 font-medium">Vitesse</span>
            <input
              type="range"
              min="1"
              max="100"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
              className="w-20 accent-amber-500"
            />
          </div>
        </div>
      </div>

      <div
        ref={galleryRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {version.images.length > 0 ? (
          version.images.map((img, idx) => (
            <div key={img.id} className="relative group">
              <div className="absolute -left-8 top-0 text-slate-600 font-mono text-xs pt-2">
                {idx + 1}
              </div>
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
                <img src={img.blob} alt={`Page ${idx + 1}`} className="w-full h-auto block" />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 rounded-full"
                onClick={() => removeImage(img.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-12">
            <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucune tablature</p>
            <p className="text-sm opacity-60">Importez vos photos pour commencer à travailler.</p>
          </div>
        )}
      </div>
    </div>
  );
}
