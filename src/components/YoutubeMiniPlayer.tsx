import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Play, Pause, Upload, Trash2 } from 'lucide-react';
import { VideoLink, Bookmark } from '../lib/types';
import { loadYoutubeIframeApi, extractYoutubeId, formatBookmarkTime } from '../lib/youtube';
import { Button } from './ui/button';

interface YoutubeMiniPlayerProps {
  link: VideoLink;
  onClose: () => void;
  onSaveBookmark: (linkId: string, update: { seconds: number; name: string } | { delete: string }) => void;
  onAddImages: (imageBlobs: string[]) => void;
}

const YT_SIZE_KEY = 'guitar-lab:yt-player-size';
const DEFAULT_PLAYER_SIZE = { width: 420, height: 560 };

export function YoutubeMiniPlayer({ link, onClose, onSaveBookmark, onAddImages }: YoutubeMiniPlayerProps) {
  const videoId = extractYoutubeId(link.url);
  const bookmarks = link.bookmarks || [];
  const firstBookmark = bookmarks.length > 0 ? bookmarks[0].time : 0;

  const [resumeChoice, setResumeChoice] = useState< 'start' | 'resume' | null>(bookmarks.length > 0 ? null : 'start');
  const [apiReady, setApiReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [newBookmarkMode, setNewBookmarkMode] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [savedFlash, setSavedFlash] = useState<'save' | 'delete' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Resize logic
  const [playerSize, setPlayerSize] = useState(DEFAULT_PLAYER_SIZE);
  useEffect(() => {
    const saved = localStorage.getItem(YT_SIZE_KEY);
    if (saved) {
      try {
        setPlayerSize(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const startPlayerResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pointer = 'touches' in e ? e.touches[0] : e;
    const startX = pointer.clientX;
    const startY = pointer.clientY;
    const orig = { ...playerSize };
    const minW = 280, minH = 320;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const p = 'touches' in ev ? ev.touches[0] : ev;
      const dx = startX - p.clientX;
      const dy = startY - p.clientY;
      const width = Math.max(minW, Math.min(window.innerWidth - 32, orig.width + dx));
      const height = Math.max(minH, Math.min(window.innerHeight - 32, orig.height + dy));
      setPlayerSize({ width, height });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      localStorage.setItem(YT_SIZE_KEY, JSON.stringify(playerSize));
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  // Fullscreen logic
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [focusBackdrop, setFocusBackdrop] = useState(false);

  const enterCleanFullscreen = async () => {
    const el = videoWrapperRef.current;
    if (!el) return;
    const request = el.requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).msRequestFullscreen;
    if (!request) {
      setFocusBackdrop(true);
      return;
    }
    try {
      await request.call(el);
    } catch (err) {
      setFocusBackdrop(true);
    }
  };

  const exitCleanFullscreen = () => {
    if (document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).msExitFullscreen) {
      (document as any).exitFullscreen?.call(document) || (document as any).webkitExitFullscreen?.call(document);
    }
    setFocusBackdrop(false);
  };

  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setNativeFullscreen(!!fsEl && fsEl === videoWrapperRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Capture logic
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capImgSrc, setCapImgSrc] = useState<string | null>(null);
  const [capHasImage, setCapHasImage] = useState(false);
  const [capFrameLocked, setCapFrameLocked] = useState(false);
  const [capNormSel, setCapNormSel] = useState({ x: 0.12, y: 0.72, w: 0.76, h: 0.2 });
  const [capCaptures, setCapCaptures] = useState<{ id: string; src: string }[]>([]);
  const [capMessage, setCapMessage] = useState('');
  const capStageRef = useRef<HTMLDivElement>(null);
  const capImgElRef = useRef<HTMLImageElement>(null);
  const capFileInputRef = useRef<HTMLInputElement>(null);

  const showCapMessage = (msg: string) => {
    setCapMessage(msg);
    setTimeout(() => setCapMessage(''), 4000);
  };

  const resetCapture = () => {
    setCapImgSrc(null);
    setCapHasImage(false);
    setCapFrameLocked(false);
    setCapCaptures([]);
    setCapNormSel({ x: 0.12, y: 0.72, w: 0.76, h: 0.2 });
    setCapMessage('');
  };

  const doCapture = (imgEl: HTMLImageElement, normSel: typeof capNormSel) => {
    if (!imgEl || !imgEl.naturalWidth) return;
    const nw = imgEl.naturalWidth, nh = imgEl.naturalHeight;
    const sx = Math.round(normSel.x * nw);
    const sy = Math.round(normSel.y * nh);
    const sw = Math.max(1, Math.round(normSel.w * nw));
    const sh = Math.max(1, Math.round(normSel.h * nh));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d')?.drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);
    const src = c.toDataURL('image/jpeg', 0.88);
    setCapCaptures(prev => [...prev, { id: Date.now().toString(), src }]);
    setCapFrameLocked(true);
    showCapMessage('Capture ajoutée — colle la suivante, ou ajuste le cadre');
  };

  const loadCaptureFile = (file: File, wasLocked: boolean) => {
    if (!file || !file.type?.startsWith('image/')) {
      showCapMessage('Fichier non reconnu comme image');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setCapImgSrc(ev.target?.result as string);
      setCapHasImage(true);
      if (!wasLocked) showCapMessage('Image chargée — ajuste le cadre puis tape « Capturer »');
    };
    reader.readAsDataURL(file);
  };

  const handleCapturePasteEvent = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = Array.from(e.clipboardData?.files || []);
    const item = items.find(i => i.type?.startsWith('image/'));
    const file = item ? item.getAsFile() : files.find(f => f.type?.startsWith('image/'));

    if (!file) {
      showCapMessage('Aucune image détectée dans le collage');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    loadCaptureFile(file, capFrameLocked);
  };

  useEffect(() => {
    if (!captureOpen) return;
    const onGlobalCapturePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const files = Array.from(e.clipboardData?.files || []);
      const item = items.find(i => i.type?.startsWith('image/'));
      const file = item ? item.getAsFile() : files.find(f => f.type?.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      e.stopPropagation();
      loadCaptureFile(file, capFrameLocked);
    };
    document.addEventListener('paste', onGlobalCapturePaste, true);
    return () => document.removeEventListener('paste', onGlobalCapturePaste, true);
  }, [captureOpen, capFrameLocked]);

  const captureFromClipboardButton = async () => {
    if (!navigator.clipboard?.read) {
      showCapMessage("Collage direct indisponible — utilise « Importer »");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          loadCaptureFile(new File([blob], 'clipboard.png', { type: imgType }), capFrameLocked);
          return;
        }
      }
      showCapMessage('Aucune image dans le presse-papiers');
    } catch (err) {
      showCapMessage("Erreur de collage");
    }
  };

  const startCaptureDrag = (kind: 'move' | 'resize', corner?: 'tl' | 'tr' | 'bl' | 'br') => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = capStageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointer = 'touches' in e ? e.touches[0] : e;
    const startX = pointer.clientX, startY = pointer.clientY;
    const orig = { ...capNormSel };
    const rw = rect.width, rh = rect.height;
    const MIN = 0.04;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const p = 'touches' in ev ? ev.touches[0] : ev;
      const dx = (p.clientX - startX) / rw;
      const dy = (p.clientY - startY) / rh;
      let next = { ...orig };
      if (kind === 'move') {
        next.x = orig.x + dx;
        next.y = orig.y + dy;
      } else if (corner) {
        if (corner === 'br') { next.w = orig.w + dx; next.h = orig.h + dy; }
        else if (corner === 'bl') { next.x = orig.x + dx; next.w = orig.w - dx; next.h = orig.h + dy; }
        else if (corner === 'tr') { next.y = orig.y + dy; next.w = orig.w + dx; next.h = orig.h - dy; }
        else if (corner === 'tl') { next.x = orig.x + dx; next.y = orig.y + dy; next.w = orig.w - dx; next.h = orig.h - dy; }
      }
      next.w = Math.max(MIN, Math.min(1, next.w));
      next.h = Math.max(MIN, Math.min(1, next.h));
      next.x = Math.max(0, Math.min(1 - next.w, next.x));
      next.y = Math.max(0, Math.min(1 - next.h, next.y));
      setCapNormSel(next);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    loadYoutubeIframeApi().then(YT => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0, playsinline: 1, modestbranding: 1, controls: 0,
          iv_load_policy: 3, fs: 0, disablekb: 1, cc_load_policy: 0,
          start: resumeChoice === 'resume' ? firstBookmark : 0
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setApiReady(true);
            try { setDuration(playerRef.current?.getDuration?.() || 0); } catch (_) {}
          },
          onStateChange: e => {
            if (cancelled) return;
            setIsPlaying(e.data === 1);
            if (e.data === 1 || e.data === 2) {
              try { setDuration(playerRef.current?.getDuration?.() || 0); } catch (_) {}
            }
          }
        }
      });
    }).catch(() => !cancelled && setApiFailed(true));
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [videoId, resumeChoice]);

  useEffect(() => {
    if (!apiReady) return;
    const id = setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime?.();
        if (typeof t === 'number') setCurTime(t);
      } catch (_) {}
    }, 400);
    return () => clearInterval(id);
  }, [apiReady]);

  const markPositionNamed = () => {
    const t = playerRef.current?.getCurrentTime?.();
    if (typeof t === 'number' && t > 0) {
      const seconds = Math.floor(t);
      const name = bookmarkName.trim() || `Point ${bookmarks.length + 1}`;
      onSaveBookmark(link.id, { seconds, name });
      setBookmarkName('');
      setNewBookmarkMode(false);
      setSavedFlash('save');
      setTimeout(() => setSavedFlash(null), 1500);
    }
  };

  const deleteBookmark = (bookmarkId: string) => {
    onSaveBookmark(link.id, { delete: bookmarkId });
    setSavedFlash('delete');
    setTimeout(() => setSavedFlash(null), 1500);
  };

  const jumpToBookmark = (seconds: number) => {
    if (playerRef.current?.seekTo) playerRef.current.seekTo(seconds);
  };

  if (!videoId) return null;

  return (
    <React.Fragment>
      {focusBackdrop && <div className="fixed inset-0 bg-black z-40" onClick={() => setFocusBackdrop(false)} />}
      <div
        className={`fixed bottom-4 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col ${captureOpen ? 'left-4' : 'right-4'}`}
        style={{ width: playerSize.width, height: playerSize.height, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)' }}
      >
        <div
          onMouseDown={startPlayerResize}
          onTouchStart={startPlayerResize}
          className="absolute top-0 left-0 w-6 h-6 z-10 flex items-center justify-center cursor-nwse-resize"
          title="Redimensionner"
        >
          <span className="block w-2 h-2 border-t-2 border-l-2 border-slate-500 rounded-tl-sm" />
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-300">▶️ Vidéo</span>
          <div className="flex items-center gap-1">
            <Button onClick={enterCleanFullscreen} variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600">⛶ Net</Button>
            <Button
              onClick={() => setCaptureOpen(!captureOpen)}
              variant="ghost" size="sm" className={`text-[10px] h-6 px-1.5 ${captureOpen ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >📸 Capture</Button>
            {apiReady && (
              <Button onClick={() => setNewBookmarkMode(!newBookmarkMode)} variant="ghost" size="sm" className={`text-[10px] h-6 px-1.5 ${newBookmarkMode ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>📌 Point</Button>
            )}
            <Button onClick={onClose} variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-700 text-slate-400">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {captureOpen && (
            <div className="p-3 bg-slate-800 border-b border-slate-700 space-y-3">
              <p className="text-[10px] text-slate-400">1. Plein écran net → Pause → Capture iPad • 2. Colle ici</p>
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  {!capHasImage ? (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onPaste={handleCapturePasteEvent}
                      className="w-full h-32 flex items-center justify-center px-3 py-3 bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg text-center text-xs text-slate-500 focus:outline-none focus:border-purple-500"
                    >
                      Colle ta capture ici
                    </div>
                  ) : (
                    <div ref={capStageRef} className="relative w-full bg-black rounded-lg border border-slate-600 overflow-hidden">
                      <img
                        ref={capImgElRef}
                        src={capImgSrc || ''}
                        alt="Capture"
                        onLoad={() => { if (capFrameLocked) doCapture(capImgElRef.current!, capNormSel); }}
                        className="w-full h-auto pointer-events-none"
                      />
                      <div
                        onMouseDown={() => startCaptureDrag('move')}
                        onTouchStart={() => startCaptureDrag('move')}
                        className="absolute border-2 border-purple-400 bg-purple-400/10"
                        style={{
                          left: `${capNormSel.x * 100}%`,
                          top: `${capNormSel.y * 100}%`,
                          width: `${capNormSel.w * 100}%`,
                          height: `${capNormSel.h * 100}%`,
                          boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
                          cursor: 'move'
                        }}
                      />
                      {['tl', 'tr', 'bl', 'br'].map(corner => (
                        <div
                          key={corner}
                          onMouseDown={() => startCaptureDrag('resize', corner)}
                          onTouchStart={() => startCaptureDrag('resize', corner)}
                          className="absolute w-4 h-4 bg-purple-400 rounded-full"
                          style={{
                            top: corner.startsWith('t') ? -8 : undefined,
                            bottom: corner.startsWith('b') ? -8 : undefined,
                            left: corner.endsWith('l') ? -8 : undefined,
                            right: corner.endsWith('r') ? -8 : undefined,
                            cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24 flex flex-col gap-2">
                  <label className="px-2 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1">
                    <Upload className="h-3 w-3" /> Import
                    <input ref={capFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) loadCaptureFile(f, capFrameLocked);
                    }} />
                  </label>
                  <Button onClick={captureFromClipboardButton} variant="outline" size="sm" className="h-7 text-[10px] bg-slate-700 text-slate-300 border-slate-600">📋 Coller</Button>
                  {capHasImage && (
                    <Button onClick={() => doCapture(capImgElRef.current!, capNormSel)} className="h-7 text-[10px] bg-purple-600 hover:bg-purple-500">📷 Capturer</Button>
                  )}
                  {capFrameLocked && (
                    <Button onClick={() => setCapFrameLocked(false)} variant="ghost" size="sm" className="h-7 text-[10px] bg-slate-700 text-slate-300">🔓 Réajuster</Button>
                  )}
                </div>
              </div>
              {capCaptures.length > 0 && (
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                  {capCaptures.map((c, i) => (
                    <div key={c.id} className="relative">
                      <img src={c.src} className="w-full h-10 object-cover rounded border border-slate-600 bg-black" />
                      <button onClick={() => setCapCaptures(prev => prev.filter(x => x.id !== c.id))} className="absolute -top-1 -right-1 w-4 h-4 bg-red-700 rounded-full text-[8px] flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => {
                  if (capCaptures.length === 0) return;
                  onAddImages(capCaptures.map(c => c.src));
                  resetCapture();
                  setCaptureOpen(false);
                }}
                disabled={capCaptures.length === 0}
                className="w-full py-1.5 bg-green-700 hover:bg-green-600 text-xs font-semibold"
              >
                ✓ Ajouter {capCaptures.length} image(s)
              </Button>
            </div>
          )}

          {resumeChoice === null && bookmarks.length > 0 && (
            <div className="p-3 flex flex-col items-center gap-2 text-center bg-slate-800 border-b border-slate-700">
              <p className="text-xs text-slate-300">📍 Arrêt à {formatBookmarkTime(firstBookmark)}</p>
              <div className="flex gap-2 w-full">
                <Button onClick={() => setResumeChoice('resume')} className="flex-1 text-xs bg-amber-600 hover:bg-amber-500">Reprendre</Button>
                <Button onClick={() => setResumeChoice('start')} variant="outline" className="flex-1 text-xs bg-slate-700 text-slate-300">Début</Button>
              </div>
            </div>
          )}

          {newBookmarkMode && apiReady && (
            <div className="p-2 bg-slate-700 border-b border-slate-600 flex gap-1">
              <input
                autoFocus
                type="text"
                value={bookmarkName}
                onChange={e => setBookmarkName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && markPositionNamed()}
                placeholder="ex: Intro, Solo..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-amber-500"
              />
              <Button onClick={markPositionNamed} className="px-2 py-1 bg-green-700 hover:bg-green-600 text-[10px]">Créer</Button>
              <Button onClick={() => { setNewBookmarkMode(false); setBookmarkName(''); }} variant="ghost" className="px-2 py-1 bg-slate-600 text-[10px]">✕</Button>
            </div>
          )}

          {bookmarks.length > 0 && (
            <div className="p-2 space-y-1 bg-slate-800">
              {bookmarks.map(bm => (
                <div key={bm.id} className="flex items-center gap-1 bg-slate-700 rounded p-1">
                  <button onClick={() => jumpToBookmark(bm.time)} className="flex-1 text-left px-1.5 py-0.5 hover:bg-slate-600 rounded text-[10px]">
                    <span className="text-amber-400 font-semibold">{formatBookmarkTime(bm.time)}</span>
                    <span className="text-slate-300 ml-1">{bm.name}</span>
                  </button>
                  <button onClick={() => deleteBookmark(bm.id)} className="p-0.5 hover:bg-red-700/50 rounded text-slate-400 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {savedFlash && (
            <div className={`p-1 text-center text-[10px] font-semibold ${savedFlash === 'save' ? 'bg-green-700' : 'bg-red-700'} text-white`}>
              {savedFlash === 'save' ? '✓ Point créé' : '✓ Point supprimé'}
            </div>
          )}

          <div ref={videoWrapperRef} className={nativeFullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : 'relative w-full'}>
            {apiFailed ? (
              <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1&start=${resumeChoice === 'resume' ? firstBookmark : 0}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative w-full bg-black" style={{ paddingTop: !nativeFullscreen ? '56.25%' : undefined }}>
                <div ref={containerRef} className="absolute inset-0 w-full h-full" />
              </div>
            )}
          </div>

          {apiReady && !apiFailed && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border-t border-slate-700">
              <Button onClick={() => playerRef.current?.seekTo(Math.max(0, curTime - 5), true)} variant="ghost" size="sm" className="h-7 w-7 p-0">⏪</Button>
              <Button
                onClick={() => isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()}
                className="h-7 w-7 p-0 bg-slate-700 hover:bg-slate-600"
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button onClick={() => playerRef.current?.seekTo(Math.min(duration || curTime, curTime + 5), true)} variant="ghost" size="sm" className="h-7 w-7 p-0">⏩</Button>
              <input
                type="range" min="0" max={duration || 0} step="0.1" value={curTime}
                onChange={e => {
                  const t = parseFloat(e.target.value);
                  setCurTime(t);
                  playerRef.current?.seekTo(t, true);
                }}
                className="flex-1 accent-amber-500"
              />
              <span className="text-[10px] text-slate-400 font-mono">{formatBookmarkTime(Math.floor(curTime))} / {formatBookmarkTime(Math.floor(duration))}</span>
            </div>
          )}

          {nativeFullscreen && (
            <button onClick={exitCleanFullscreen} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">✕</button>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}
