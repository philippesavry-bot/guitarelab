// Suggestions de noms de section (structure du morceau)
const SECTION_NAME_SUGGESTIONS = ['Intro', 'Couplet', 'Refrain', 'Pont', 'Outro'];

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

// Difficulté du morceau, matérialisée par un médiator coloré (vert / orange / rouge)
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];
const DIFFICULTY_META = {
  easy: { label: 'Facile', color: '#22c55e', group: '🟢 Facile' },
  medium: { label: 'Moyen', color: '#f59e0b', group: '🟠 Moyen' },
  hard: { label: 'Difficile', color: '#ef4444', group: '🔴 Difficile' },
};
function getDifficulty(song) {
  return DIFFICULTY_ORDER.includes(song?.difficulty) ? song.difficulty : 'medium';
}
function nextDifficulty(current) {
  const i = DIFFICULTY_ORDER.indexOf(getDifficulty({ difficulty: current }));
  return DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length];
}

// Révision espacée : intervalle de rappel selon le niveau de maîtrise (progress)
const DEFAULT_REVIEW_INTERVALS = { low: 2, mid: 5, high: 12 };
function reviewIntervalDays(progress, intervals = DEFAULT_REVIEW_INTERVALS) {
  if (progress >= 71) return intervals.high;
  if (progress >= 34) return intervals.mid;
  return intervals.low;
}

// Calcule les morceaux "à revoir" aujourd'hui : jamais pratiqués, ou dont l'intervalle est dépassé.
// Trie par retard décroissant (le plus en retard d'abord) et retourne les `limit` premiers.
function computeReviewQueue(songs, limit = 3, intervals = DEFAULT_REVIEW_INTERVALS) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const withDelay = songs.map(s => {
    const last = s.lastPracticedAt ? new Date(s.lastPracticedAt).getTime() : null;
    const interval = reviewIntervalDays(s.progress || 0, intervals) * DAY;
    const overdueMs = last === null ? Infinity : (now - last - interval);
    return { song: s, overdueMs };
  }).filter(x => x.overdueMs > 0);
  withDelay.sort((a, b) => b.overdueMs - a.overdueMs);
  return withDelay.slice(0, limit).map(x => x.song);
}

// Extrait l'identifiant d'une vidéo YouTube depuis différents formats d'URL
function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// Charge une seule fois l'API YouTube IFrame (nécessaire pour lire/contrôler la position de lecture)
let _ytApiPromise = null;
function loadYoutubeIframeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (_ytApiPromise) return _ytApiPromise;
  _ytApiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('YouTube API timeout')), 6000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); resolve(window.YT); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => { clearTimeout(timeout); reject(new Error('YouTube API load error')); };
    document.head.appendChild(tag);
  });
  return _ytApiPromise;
}

function formatBookmarkTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Petite fenêtre flottante de visionnage YouTube, superposée à l'écran de travail.
// Si un repère existe pour ce lien, propose de reprendre à cet instant ou de repartir du début.
function YoutubeMiniPlayer({ link, onClose, onSaveBookmark, onAddImages }) {
  const videoId = link?.videoId;
  const bookmarks = link?.bookmarks || []; // Liste de { id, seconds, name }
  const firstBookmark = bookmarks.length > 0 ? bookmarks[0].seconds : 0;
  const [resumeChoice, setResumeChoice] = useState(bookmarks.length > 0 ? null : 'start');
  const [apiReady, setApiReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [newBookmarkMode, setNewBookmarkMode] = useState(false); // true = en train de créer un nouveau
  const [bookmarkName, setBookmarkName] = useState('');
  const [savedFlash, setSavedFlash] = useState(null); // null | 'save' | 'delete'
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  // --- Fenêtre redimensionnable (glisser le coin haut-gauche) ---
  const YT_SIZE_KEY = 'guitar-lab:yt-player-size';
  const DEFAULT_PLAYER_SIZE = { width: 420, height: 560 };
  const [playerSize, setPlayerSize] = useState(DEFAULT_PLAYER_SIZE);
  const resizeStartRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(YT_SIZE_KEY, false);
        if (result?.value) {
          const p = JSON.parse(result.value);
          if (p?.width && p?.height) setPlayerSize(p);
        }
      } catch (err) { /* taille par défaut */ }
    })();
  }, []);

  const startPlayerResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pointer = e.touches ? e.touches[0] : e;
    const startX = pointer.clientX, startY = pointer.clientY;
    const orig = { ...playerSize };
    const minW = 280, minH = 320;

    const onMove = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const dx = startX - p.clientX; // on tire vers la gauche → agrandit
      const dy = startY - p.clientY; // on tire vers le haut → agrandit
      const maxW = window.innerWidth - 32;
      const maxH = window.innerHeight - 32;
      const width = Math.max(minW, Math.min(maxW, orig.width + dx));
      const height = Math.max(minH, Math.min(maxH, orig.height + dy));
      setPlayerSize({ width, height });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      setPlayerSize(current => {
        window.storage.set(YT_SIZE_KEY, JSON.stringify(current), false).catch(() => {});
        return current;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const resetPlayerSize = () => {
    setPlayerSize(DEFAULT_PLAYER_SIZE);
    window.storage.set(YT_SIZE_KEY, JSON.stringify(DEFAULT_PLAYER_SIZE), false).catch(() => {});
  };

  // --- Mode plein écran "propre" : n'affiche QUE la vidéo, aucun bouton de l'app par-dessus (idéal pour capture d'écran) ---
  // Priorité à l'API Fullscreen native du navigateur (rien d'autre à l'écran que la vidéo) ;
  // repli sur un simple fond noir si l'API est indisponible (ex. certains contextes PWA installés).
  const videoWrapperRef = useRef(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [focusBackdrop, setFocusBackdrop] = useState(false);

  const enterCleanFullscreen = async () => {
    const el = videoWrapperRef.current;
    const request = el && (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
    if (!request) {
      setFocusBackdrop(true);
      setPlayerSize({ width: Math.min(window.innerWidth - 32, 820), height: Math.min(window.innerHeight - 32, 760) });
      glLog('📸 Plein écran natif indisponible — repli sur le mode fond noir', 'warning');
      return;
    }
    try {
      await request.call(el);
    } catch (err) {
      setFocusBackdrop(true);
      glLog('📸 Échec du plein écran natif — repli sur le mode fond noir : ' + (err?.message || err), 'warning');
    }
  };

  const exitCleanFullscreen = () => {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) exit?.call(document);
    setFocusBackdrop(false);
  };

  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setNativeFullscreen(!!fsEl && fsEl === videoWrapperRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // --- Capture d'accords depuis une capture d'écran de la vidéo (cadre verrouillable) ---
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capImgSrc, setCapImgSrc] = useState(null);
  const [capHasImage, setCapHasImage] = useState(false);
  const [capFrameLocked, setCapFrameLocked] = useState(false);
  const [capNormSel, setCapNormSel] = useState({ x: 0.12, y: 0.72, w: 0.76, h: 0.2 });
  const [capCaptures, setCapCaptures] = useState([]); // [{ id, src }]
  const [capMessage, setCapMessage] = useState('');
  const capStageRef = useRef(null);
  const capImgElRef = useRef(null);
  const capFileInputRef = useRef(null);

  const showCapMessage = (msg) => {
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

  useEffect(() => {
    setResumeChoice(bookmarks.length > 0 ? null : 'start');
    setApiReady(false);
    setApiFailed(false);
    setNewBookmarkMode(false);
    setCaptureOpen(false);
    resetCapture();
  }, [videoId]);

  useEffect(() => {
    if (resumeChoice === null || !videoId) return;
    let cancelled = false;
    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { rel: 0, playsinline: 1, modestbranding: 1, start: resumeChoice === 'resume' ? firstBookmark : 0 },
          events: { onReady: () => !cancelled && setApiReady(true) },
        });
      })
      .catch(() => !cancelled && setApiFailed(true));
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [videoId, resumeChoice]);

  if (!videoId) return null;

  const markPositionNamed = () => {
    const t = playerRef.current?.getCurrentTime?.();
    if (typeof t === 'number' && t > 0) {
      const seconds = Math.floor(t);
      const name = bookmarkName.trim() || `Point ${bookmarks.length + 1}`;
      onSaveBookmark?.(link.id, { seconds, name });
      setBookmarkName('');
      setNewBookmarkMode(false);
      setSavedFlash('save');
      setTimeout(() => setSavedFlash(null), 1500);
    }
  };

  const deleteBookmark = (bookmarkId) => {
    onSaveBookmark?.(link.id, { delete: bookmarkId });
    setSavedFlash('delete');
    setTimeout(() => setSavedFlash(null), 1500);
  };

  const jumpToBookmark = (seconds) => {
    if (playerRef.current?.seekTo) playerRef.current.seekTo(seconds);
  };

  // Découpe l'image collée selon le cadre normalisé (0..1) et ajoute la capture à la liste
  const doCapture = (imgEl, normSel) => {
    if (!imgEl || !imgEl.naturalWidth) return;
    const nw = imgEl.naturalWidth, nh = imgEl.naturalHeight;
    const sx = Math.round(normSel.x * nw);
    const sy = Math.round(normSel.y * nh);
    const sw = Math.max(1, Math.round(normSel.w * nw));
    const sh = Math.max(1, Math.round(normSel.h * nh));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d').drawImage(imgEl, sx, sy, sw, sh, 0, 0, sw, sh);
    const src = c.toDataURL('image/jpeg', 0.88);
    setCapCaptures(prev => [...prev, { id: newId(), src }]);
    setCapFrameLocked(true);
    showCapMessage('Capture ajoutée — colle la suivante, ou ajuste le cadre');
  };

  const loadCaptureFile = (file, wasLocked) => {
    if (!file || !file.type?.startsWith('image/')) {
      showCapMessage('Fichier non reconnu comme image');
      glLog('📸 Capture: fichier reçu non-image (' + (file?.type || 'type inconnu') + ')', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapImgSrc(ev.target.result);
      setCapHasImage(true);
      if (!wasLocked) showCapMessage('Image chargée — ajuste le cadre puis tape « Capturer »');
      glLog('📸 Capture: image chargée (' + file.type + ', ' + Math.round(file.size / 1024) + ' Ko)', 'success');
    };
    reader.onerror = () => {
      showCapMessage('Image illisible — réessaie');
      glLog('📸 Capture: FileReader erreur au chargement', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Une fois l'image (re)chargée dans le <img>, si le cadre est verrouillé on capture aussitôt
  const handleCapImgLoad = (e) => {
    if (capFrameLocked) doCapture(e.target, capNormSel);
  };

  // Extrait un fichier image d'un événement paste, quelle que soit sa provenance (items ou files)
  const extractImageFromClipboardEvent = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = Array.from(e.clipboardData?.files || []);
    glLog(`📸 Capture: événement paste reçu — items: [${items.map(i => i.type).join(', ') || 'aucun'}], files: [${files.map(f => f.type).join(', ') || 'aucun'}]`, 'info');
    const item = items.find(i => i.type?.startsWith('image/'));
    if (item) return item.getAsFile();
    return files.find(f => f.type?.startsWith('image/')) || null;
  };

  const handleCapturePasteEvent = (e) => {
    const file = extractImageFromClipboardEvent(e);
    if (!file) {
      showCapMessage('Aucune image détectée dans le collage — essaie « 📁 Importer »');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    loadCaptureFile(file, capFrameLocked);
  };

  // ⚠️ Important : tant que ce panneau de capture est ouvert, on intercepte le collage en PHASE DE CAPTURE
  // au niveau du document, avant qu'il n'atteigne l'écouteur de la galerie principale (CenterPanel).
  // Sans ça, coller une image ici l'envoyait directement dans la galerie du morceau au lieu d'apparaître
  // dans l'aperçu de cadrage ci-dessous — c'est ce qui rendait le cadre de sélection invisible.
  useEffect(() => {
    if (!captureOpen) return;
    const onGlobalCapturePaste = (e) => {
      const file = extractImageFromClipboardEvent(e);
      if (!file) return; // pas d'image : on laisse le collage suivre son cours normal ailleurs dans l'app
      e.preventDefault();
      e.stopPropagation();
      loadCaptureFile(file, capFrameLocked);
    };
    document.addEventListener('paste', onGlobalCapturePaste, true);
    return () => document.removeEventListener('paste', onGlobalCapturePaste, true);
  }, [captureOpen, capFrameLocked]);

  // Bouton "Coller" explicite : lit directement le presse-papiers.
  // ⚠️ Sur iPad, en app installée depuis l'écran d'accueil, iOS bloque parfois cette lecture directe :
  // dans ce cas utilise le geste natif juste en dessous, ou « 📁 Importer » (toujours fiable).
  const captureFromClipboardButton = async () => {
    if (!navigator.clipboard?.read) {
      showCapMessage("Collage direct indisponible ici (app installée) — utilise « Importer »");
      glLog('📸 Capture: navigator.clipboard.read absent', 'warning');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      glLog(`📸 Capture: clipboard.read() → ${items.length} élément(s)`, 'info');
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          loadCaptureFile(new File([blob], `collé.${imgType.split('/')[1] || 'png'}`, { type: imgType }), capFrameLocked);
          return;
        }
      }
      showCapMessage('Aucune image dans le presse-papiers — essaie « 📁 Importer »');
    } catch (err) {
      showCapMessage("Collage indisponible ici — utilise « Importer » (photo prise juste avant)");
      glLog('📸 Capture: clipboard.read() a échoué — ' + (err?.name || '') + ': ' + (err?.message || err), 'error');
    }
  };

  const handleCaptureFileInput = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) loadCaptureFile(f, capFrameLocked);
  };

  // Glisser pour déplacer ou redimensionner (coins) le cadre de sélection, souris et tactile
  const startCaptureDrag = (kind, corner) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = capStageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointer = e.touches ? e.touches[0] : e;
    const startX = pointer.clientX, startY = pointer.clientY;
    const orig = { ...capNormSel };
    const rw = rect.width, rh = rect.height;
    const MIN = 0.04;

    const onMove = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const dx = (p.clientX - startX) / rw;
      const dy = (p.clientY - startY) / rh;
      let next = { ...orig };
      if (kind === 'move') {
        next.x = orig.x + dx;
        next.y = orig.y + dy;
      } else {
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

  const unlockCaptureFrame = () => {
    setCapFrameLocked(false);
    showCapMessage('Ajuste le cadre puis tape « Capturer »');
  };

  const removeCapture = (id) => setCapCaptures(prev => prev.filter(c => c.id !== id));

  const applyCaptures = () => {
    if (capCaptures.length === 0) {
      showCapMessage('Aucune capture à ajouter');
      return;
    }
    onAddImages?.(capCaptures.map(c => c.src));
    showCapMessage(`${capCaptures.length} image(s) ajoutée(s) à la fiche`);
    resetCapture();
    setCaptureOpen(false);
  };

  return (
    <>
      {focusBackdrop && (
        <div className="fixed inset-0 bg-black z-40" onClick={() => setFocusBackdrop(false)} />
      )}
    <div
      className="fixed bottom-4 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{ width: playerSize.width, height: playerSize.height, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)' }}
    >
      <div
        onMouseDown={startPlayerResize}
        onTouchStart={startPlayerResize}
        onDoubleClick={resetPlayerSize}
        className="absolute top-0 left-0 w-6 h-6 z-10 flex items-center justify-center"
        style={{ cursor: 'nwse-resize', touchAction: 'none' }}
        title="Glisser pour redimensionner — double-tap pour réinitialiser"
      >
        <span className="block w-2.5 h-2.5 border-t-2 border-l-2 border-gray-500 rounded-tl-sm" />
      </div>

      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-900 border-b border-gray-700 flex-shrink-0 flex-wrap gap-1 pl-6">
        <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">▶️ Vidéo</span>
        <div className="flex items-center gap-1">
          <button
            onClick={enterCleanFullscreen}
            className={`text-[10px] px-1.5 py-0.5 rounded transition ${(nativeFullscreen || focusBackdrop) ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            title="Plein écran SANS aucun bouton par-dessus — pour une capture d'écran bien nette"
          >
            ⛶ Plein écran net
          </button>
          <button
            onClick={() => {
              const next = !captureOpen;
              setCaptureOpen(next);
              if (next) glLog(`📸 Capture: panneau ouvert (clipboard.read ${navigator.clipboard?.read ? 'disponible' : 'ABSENT'}, contexte sécurisé: ${window.isSecureContext})`, 'info');
            }}
            className={`text-[10px] px-1.5 py-0.5 rounded transition ${captureOpen ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            title="Capturer un accord affiché à l'écran (via capture d'écran iPad)"
          >
            📸 Capture
          </button>
          {apiReady && (
            <button
              onClick={() => setNewBookmarkMode(!newBookmarkMode)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition ${newBookmarkMode ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
              title="Créer un point de repère nommé"
            >
              📌 Point
            </button>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition text-gray-300"
            title="Ouvrir sur YouTube si la vidéo ne s'affiche pas"
          >
            Ouvrir sur YouTube ↗
          </a>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition" title="Fermer">
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {captureOpen && (
          <div className="p-3 bg-gray-850 border-b border-gray-700 space-y-2">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              1. Tape « ⛶ Plein écran net » puis mets la vidéo en pause sur l'accord voulu &nbsp;•&nbsp;
              2. Capture d'écran iPad &nbsp;•&nbsp; 3. Colle-la ci-dessous (n'importe où sur cet écran)
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-[10px] font-semibold cursor-pointer flex items-center gap-1">
                📁 Importer la capture
                <input ref={capFileInputRef} type="file" accept="image/*" onChange={handleCaptureFileInput} className="hidden" />
              </label>
              <button
                onClick={captureFromClipboardButton}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-[10px] font-semibold"
              >
                📋 Coller depuis le presse-papiers
              </button>
              {capHasImage && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${capFrameLocked ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {capFrameLocked ? '🔒 verrouillé — coller/importer = capture auto' : '🔓 ajuste le cadre'}
                </span>
              )}
            </div>

            {/* Zone de collage tactile — contentEditable pour que le geste natif "Coller" d'iOS apparaisse.
                Le collage fonctionne en réalité n'importe où sur cet écran tant que ce panneau est ouvert
                (voir l'écouteur global plus haut) : cette zone sert surtout à faire apparaître le bouton
                natif "Coller" d'iOS au appui long. */}
            <div
              contentEditable
              suppressContentEditableWarning
              inputMode="none"
              onPaste={handleCapturePasteEvent}
              onInput={(e) => { e.currentTarget.textContent = ''; }}
              className="w-full px-2 py-3 bg-gray-900 border border-dashed border-gray-600 rounded text-center text-[10px] text-gray-500 focus:outline-none focus:border-purple-500"
            >
              Appuie ici puis « Coller », ou colle directement où tu veux sur cet écran
            </div>

            {capHasImage && (
              <div ref={capStageRef} className="relative w-full bg-black rounded border border-gray-600 overflow-hidden">
                <img
                  ref={capImgElRef}
                  src={capImgSrc}
                  alt="Capture d'écran collée"
                  onLoad={handleCapImgLoad}
                  draggable={false}
                  className="w-full h-auto select-none pointer-events-none"
                />
                <div
                  onMouseDown={startCaptureDrag('move')}
                  onTouchStart={startCaptureDrag('move')}
                  className="absolute border-2 border-purple-400 bg-purple-400/10"
                  style={{
                    left: `${capNormSel.x * 100}%`,
                    top: `${capNormSel.y * 100}%`,
                    width: `${capNormSel.w * 100}%`,
                    height: `${capNormSel.h * 100}%`,
                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)',
                    cursor: 'move',
                  }}
                >
                  <span className="absolute -top-5 left-0 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                    {capImgElRef.current ? `${Math.round(capNormSel.w * capImgElRef.current.naturalWidth)} × ${Math.round(capNormSel.h * capImgElRef.current.naturalHeight)} px` : '…'}
                  </span>
                  {['tl', 'tr', 'bl', 'br'].map(corner => (
                    <div
                      key={corner}
                      onMouseDown={startCaptureDrag('resize', corner)}
                      onTouchStart={startCaptureDrag('resize', corner)}
                      className="absolute w-5 h-5 bg-purple-400 border border-white rounded-full"
                      style={{
                        top: corner.startsWith('t') ? -10 : undefined,
                        bottom: corner.startsWith('b') ? -10 : undefined,
                        left: corner.endsWith('l') ? -10 : undefined,
                        right: corner.endsWith('r') ? -10 : undefined,
                        cursor: (corner === 'tl' || corner === 'br') ? 'nwse-resize' : 'nesw-resize',
                        touchAction: 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {capHasImage && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => doCapture(capImgElRef.current, capNormSel)}
                  className="flex-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-[10px] font-semibold"
                >
                  📷 Capturer
                </button>
                {capFrameLocked && (
                  <button onClick={unlockCaptureFrame} className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-semibold">
                    🔓 Réajuster
                  </button>
                )}
              </div>
            )}

            {capCaptures.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {capCaptures.map((c, i) => (
                  <div key={c.id} className="relative flex-shrink-0">
                    <img src={c.src} alt="" className="h-14 rounded border border-gray-600 bg-black" />
                    <button
                      onClick={() => removeCapture(c.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-700 hover:bg-red-600 rounded-full flex items-center justify-center text-[9px] leading-none"
                      title="Retirer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {capMessage && <p className="text-center text-[10px] text-green-400 font-semibold">{capMessage}</p>}

            <button
              onClick={applyCaptures}
              disabled={capCaptures.length === 0}
              className="w-full px-2 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 rounded text-[10px] font-semibold"
            >
              ✓ Ajouter {capCaptures.length > 0 ? `(${capCaptures.length})` : ''} à la fiche
            </button>
          </div>
        )}

        {resumeChoice === null && bookmarks.length > 0 ? (
          <div className="p-4 flex flex-col items-center gap-2 text-center bg-gray-900 border-b border-gray-700">
            <p className="text-xs text-gray-300">
              📍 Tu t'étais arrêté à <span className="text-amber-400 font-semibold">{formatBookmarkTime(firstBookmark)}</span>
            </p>
            <div className="flex gap-2 w-full">
              <button onClick={() => setResumeChoice('resume')} className="flex-1 px-2 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold transition">
                Reprendre là
              </button>
              <button onClick={() => setResumeChoice('start')} className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold transition">
                Depuis le début
              </button>
            </div>
          </div>
        ) : null}

        {newBookmarkMode && apiReady && (
          <div className="p-3 bg-gray-750 border-b border-gray-700">
            <p className="text-[10px] text-gray-400 mb-1.5">Nom du point :</p>
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                value={bookmarkName}
                onChange={(e) => setBookmarkName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') markPositionNamed(); }}
                placeholder="ex: Intro, Couplet 1..."
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-amber-500"
              />
              <button onClick={markPositionNamed} className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-[10px] font-semibold transition">Créer</button>
              <button onClick={() => { setNewBookmarkMode(false); setBookmarkName(''); }} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] font-semibold transition">✕</button>
            </div>
          </div>
        )}

        {bookmarks.length > 0 && (
          <div className="p-2 space-y-1 bg-gray-750">
            {bookmarks.map((bm, i) => (
              <div key={bm.id} className="flex items-center gap-1 bg-gray-700 rounded p-1.5">
                <button
                  onClick={() => jumpToBookmark(bm.seconds)}
                  className="flex-1 text-left px-1.5 py-0.5 hover:bg-gray-600 rounded transition text-[10px]"
                  title="Cliquer pour aller à cette position"
                >
                  <span className="text-amber-400 font-semibold">{formatBookmarkTime(bm.seconds)}</span>
                  <span className="text-gray-300 ml-1">{bm.name}</span>
                </button>
                <button
                  onClick={() => deleteBookmark(bm.id)}
                  className="p-0.5 hover:bg-red-700/50 rounded transition text-gray-400 hover:text-red-400"
                  title="Supprimer ce point"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {savedFlash && (
          <div className={`p-2 text-center text-[10px] font-semibold ${savedFlash === 'save' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
            {savedFlash === 'save' ? '✓ Point créé' : '✓ Point supprimé'}
          </div>
        )}
      </div>

      <div
        ref={videoWrapperRef}
        className={nativeFullscreen ? 'fixed inset-0 z-[9999] bg-black flex items-center justify-center' : 'flex-shrink-0'}
      >
        {apiFailed ? (
          <div className={nativeFullscreen ? 'relative w-full h-full' : 'relative w-full bg-black'} style={nativeFullscreen ? undefined : { paddingTop: '56.25%' }}>
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&modestbranding=1&start=${resumeChoice === 'resume' ? firstBookmark : 0}`}
              title="YouTube video player"
              className="absolute inset-0 w-full h-full"
              style={{ border: 0 }}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className={nativeFullscreen ? 'relative w-full h-full' : 'relative w-full bg-black'} style={nativeFullscreen ? undefined : { paddingTop: '56.25%' }}>
            <div ref={containerRef} className="absolute inset-0 w-full h-full" />
          </div>
        )}
        {nativeFullscreen && (
          <button
            onClick={exitCleanFullscreen}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-base"
            title="Quitter le plein écran"
          >
            ✕
          </button>
        )}
      </div>
    </div>
    </>
  );
}

// Médiator de guitare : triangle arrondi, pointe vers le bas
function PickIcon({ difficulty = 'medium', size = 14, className = '' }) {
  const meta = DIFFICULTY_META[getDifficulty({ difficulty })];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-label={meta.label} role="img">
      <path
        d="M12 22.5c-3.2-2-8.5-7.4-8.5-13C3.5 6 7.3 3.5 12 3.5S20.5 6 20.5 9.5c0 5.6-5.3 11-8.5 13z"
        fill={meta.color}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
    </svg>
  );
}

// Bouton médiator : clic = rotation Facile → Moyen → Difficile
function DifficultyPick({ difficulty, onChange, size = 14, className = '' }) {
  const d = getDifficulty({ difficulty });
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange && onChange(nextDifficulty(d)); }}
      className={`flex-shrink-0 hover:opacity-75 transition ${className}`}
      title={`Difficulté : ${DIFFICULTY_META[d].label} (cliquer pour changer)`}
    >
      <PickIcon difficulty={d} size={size} />
    </button>
  );
}


// Étiquettes de classement (facile, fingerstyle, chant, anglais...), modifiables à choix multiples par morceau
const DEFAULT_CLASSIFICATIONS = ['Française facile', 'Anglaise facile', 'À travailler', 'À chanter', 'Fingerstyle'];

const REPERTOIRE = [
  {
    "id": "93",
    "title": "Fix you",
    "artist": "Coldplay",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "https://share.google/26yeCP5O7uUvj286G",
    "youtubeUrls": [
      {
        "id": "93-y0",
        "url": "https://youtu.be/QvYNn-FCb4Q?is=cCXpr7c8IeHObGWi"
      }
    ],
    "versions": [
      {
        "id": "93-v",
        "label": "Facile",
        "bpm": 0,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "92",
    "title": "Risk It All",
    "artist": "Bruno Mars",
    "language": "EN",
    "songType": "instrumental",
    "technique": "les deux",
    "style": "",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "92-y0",
        "url": "https://youtu.be/DCFTYzwq564?is=K3aibrTx1hGm89de"
      }
    ],
    "versions": [
      {
        "id": "92-v",
        "label": "Facile",
        "bpm": 0,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "91",
    "title": "Redemption Song",
    "artist": "Bob Marley",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "",
    "difficulty": "easy",
    "progress": 5,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "91-y0",
        "url": "https://youtu.be/v1epaVLbxlw?is=c7j5CKnaK4LVa3iM"
      }
    ],
    "versions": [
      {
        "id": "91-v",
        "label": "Facile",
        "bpm": 0,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "90",
    "title": "L’aventurier",
    "artist": "Indochine",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "",
    "difficulty": "easy",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "90-y0",
        "url": "https://youtu.be/O2MS37yoU6U?is=oVeUPEpMa-7IaTrw"
      }
    ],
    "versions": [
      {
        "id": "90-v",
        "label": "Facile",
        "bpm": 0,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "89",
    "title": "Shallow",
    "artist": "Lady gaga & Bradley Cooper",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop",
    "difficulty": "medium",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "89-y0",
        "url": "https://youtu.be/0TDHbiWQFkM?is=okoBuiLSSFYe_aUD"
      },
      {
        "id": "89-y1",
        "url": "https://youtu.be/11plqWEM8cc?is=maz10JhK-zznRXuH"
      }
    ],
    "versions": [
      {
        "id": "89-v",
        "label": "Facile",
        "bpm": 0,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "1",
    "title": "Cendrillon",
    "artist": "Téléphone",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock français",
    "difficulty": "medium",
    "progress": 45,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "rock",
      "80s"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "1-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "1-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "2",
    "title": "Still Loving You",
    "artist": "Scorpions",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Power ballad",
    "difficulty": "medium",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "ballade",
      "rock"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "2-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "2-v",
        "label": "Facile",
        "bpm": 72,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "3",
    "title": "Mistral gagnant",
    "artist": "Renaud",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Chanson française",
    "difficulty": "easy",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "nostalgie"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "3-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "3-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "4",
    "title": "Stairway to Heaven",
    "artist": "Led Zeppelin",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock progressif",
    "difficulty": "hard",
    "progress": 45,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique rock",
      "tempo variable"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "4-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "4-v",
        "label": "Facile",
        "bpm": 72,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "5",
    "title": "Bonne idée",
    "artist": "Jean-Jacques Goldman",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop rock",
    "difficulty": "medium",
    "progress": 25,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "5-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "5-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "6",
    "title": "Hey Jude",
    "artist": "The Beatles",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop rock",
    "difficulty": "easy",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "6-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "6-v",
        "label": "Facile",
        "bpm": 72,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "7",
    "title": "Let It Be",
    "artist": "The Beatles",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop",
    "difficulty": "easy",
    "progress": 90,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "7-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "7-v",
        "label": "Facile",
        "bpm": 72,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "8",
    "title": "Brothers in Arms",
    "artist": "Dire Straits",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Rock atmosphérique",
    "difficulty": "hard",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "lent",
      "ambiance"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "8-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "8-v",
        "label": "Facile",
        "bpm": 60,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "9",
    "title": "Dans les yeux d'Émilie",
    "artist": "Joe Dassin",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Variété française",
    "difficulty": "medium",
    "progress": 55,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "9-y0",
        "url": "https://youtu.be/6FjzAQwO6SQ?is=ZKJuLsU1swh8f0XS"
      }
    ],
    "versions": [
      {
        "id": "9-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "10",
    "title": "Je te promets",
    "artist": "Johnny Hallyday",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock variété",
    "difficulty": "medium",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "10-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "10-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "11",
    "title": "Diego (libre dans sa tête)",
    "artist": "Michel Berger / France Gall",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Variété",
    "difficulty": "medium",
    "progress": 80,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "à vérifier artiste"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "11-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "11-v",
        "label": "Facile",
        "bpm": 95,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "12",
    "title": "Rosie",
    "artist": "Francis Cabrel",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk chanson",
    "difficulty": "medium",
    "progress": 55,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "12-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "12-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "13",
    "title": "Space Oddity",
    "artist": "David Bowie",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock/Folk",
    "difficulty": "medium",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "tempo variable"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "13-y0",
        "url": "https://youtu.be/TLjOWk2ryBc?is=XEuC6N7MQL3B0TOS"
      }
    ],
    "versions": [
      {
        "id": "13-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "14",
    "title": "Ces idées-là",
    "artist": "Louis Bertignac (Detroit)",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock français",
    "difficulty": "medium",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "14-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "14-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "15",
    "title": "Puisque tu pars",
    "artist": "Jean-Jacques Goldman",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop rock",
    "difficulty": "medium",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "15-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "15-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "16",
    "title": "Knockin' on Heaven's Door",
    "artist": "Guns N' Roses",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock",
    "difficulty": "easy",
    "progress": 95,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "reprise"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "16-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "16-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "17",
    "title": "Creep",
    "artist": "Radiohead",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Alternative rock",
    "difficulty": "easy",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "17-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "17-v",
        "label": "Facile",
        "bpm": 92,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "18",
    "title": "Killing Me Softly",
    "artist": "Roberta Flack",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Soul",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "18-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "18-v",
        "label": "Facile",
        "bpm": 80,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "19",
    "title": "Comme toi",
    "artist": "Jean-Jacques Goldman",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop",
    "difficulty": "easy",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "19-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "19-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "20",
    "title": "Pas toi",
    "artist": "Jean-Jacques Goldman",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Pop rock",
    "difficulty": "medium",
    "progress": 15,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "20-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "20-v",
        "label": "Facile",
        "bpm": 130,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "21",
    "title": "Mrs. Robinson",
    "artist": "Simon & Garfunkel",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Folk rock",
    "difficulty": "medium",
    "progress": 15,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "21-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "21-v",
        "label": "Facile",
        "bpm": 95,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "22",
    "title": "The Sound of Silence",
    "artist": "Simon & Garfunkel",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Folk",
    "difficulty": "medium",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "22-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "22-v",
        "label": "Facile",
        "bpm": 106,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "23",
    "title": "Toute la musique que j'aime",
    "artist": "Johnny Hallyday",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Rock variété",
    "difficulty": "medium",
    "progress": 40,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "23-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "23-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "24",
    "title": "Gabrielle",
    "artist": "Johnny Hallyday",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock",
    "difficulty": "hard",
    "progress": 25,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "à vérifier titre exact"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "24-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "24-v",
        "label": "Facile",
        "bpm": 130,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "25",
    "title": "Que je t'aime",
    "artist": "Johnny Hallyday",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Ballade rock",
    "difficulty": "medium",
    "progress": 60,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "25-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "25-v",
        "label": "Facile",
        "bpm": 75,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "26",
    "title": "I Wish It Would Rain",
    "artist": "The Temptations",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Motown soul",
    "difficulty": "medium",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "à vérifier artiste"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "26-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "26-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "27",
    "title": "Diamonds & Rust",
    "artist": "Joan Baez",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Folk",
    "difficulty": "hard",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "27-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "27-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "28",
    "title": "Dust in the Wind",
    "artist": "Kansas",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Folk rock",
    "difficulty": "medium",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "arpèges"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "28-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "28-v",
        "label": "Facile",
        "bpm": 78,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "29",
    "title": "Your Song",
    "artist": "Elton John",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop ballad",
    "difficulty": "medium",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "29-y0",
        "url": "https://youtu.be/tM5f62IwMYY?is=iRu3xhbXVbljwsd4"
      }
    ],
    "versions": [
      {
        "id": "29-v",
        "label": "Facile",
        "bpm": 80,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "30",
    "title": "No Woman No Cry",
    "artist": "Bob Marley",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Reggae",
    "difficulty": "easy",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "30-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "30-v",
        "label": "Facile",
        "bpm": 78,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "31",
    "title": "Blowin' in the Wind",
    "artist": "Bob Dylan",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk",
    "difficulty": "easy",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "31-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "31-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "32",
    "title": "Wish You Were Here",
    "artist": "Pink Floyd",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Rock",
    "difficulty": "medium",
    "progress": 15,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "32-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "32-v",
        "label": "Facile",
        "bpm": 65,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "33",
    "title": "Je marche seul",
    "artist": "Jean-Jacques Goldman",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock",
    "difficulty": "medium",
    "progress": 10,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "33-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "33-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "34",
    "title": "Wonderful Tonight",
    "artist": "Eric Clapton",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Ballade rock",
    "difficulty": "medium",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "34-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "34-v",
        "label": "Facile",
        "bpm": 72,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "35",
    "title": "La cabane du pêcheur",
    "artist": "Francis Cabrel",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Chanson folk",
    "difficulty": "medium",
    "progress": 10,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "35-y0",
        "url": "https://youtu.be/6yEmNkyM_qA?is=NHoiFG7G7ToUT4cs"
      }
    ],
    "versions": [
      {
        "id": "35-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "36",
    "title": "Sarbacane",
    "artist": "Francis Cabrel",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Chanson",
    "difficulty": "medium",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "https://m.media-amazon.com/images/I/81euA6pgv3L.jpg",
    "youtubeUrls": [
      {
        "id": "36-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "36-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "37",
    "title": "Wild World",
    "artist": "Cat Stevens",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk pop",
    "difficulty": "easy",
    "progress": 10,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "37-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "37-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "38",
    "title": "Father and Son",
    "artist": "Cat Stevens",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk",
    "difficulty": "easy",
    "progress": 60,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "38-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "38-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "39",
    "title": "Words",
    "artist": "F.R. David",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop 80s",
    "difficulty": "easy",
    "progress": 60,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "à vérifier artiste - ambigu"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "39-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "39-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "40",
    "title": "What a Feeling (Flashdance)",
    "artist": "Irene Cara",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop 80s",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "40-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "40-v",
        "label": "Facile",
        "bpm": 130,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "41",
    "title": "I Just Called to Say I Love You",
    "artist": "Stevie Wonder",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop soul",
    "difficulty": "easy",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "41-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "41-v",
        "label": "Facile",
        "bpm": 85,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "42",
    "title": "Seras-tu là ?",
    "artist": "Michel Berger",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Chanson",
    "difficulty": "medium",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "à vérifier"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "42-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "42-v",
        "label": "Facile",
        "bpm": 80,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "43",
    "title": "House of the Rising Sun",
    "artist": "The Animals",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk rock",
    "difficulty": "medium",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique",
      "arpèges possibles"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "43-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "43-v",
        "label": "Facile",
        "bpm": 115,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "44",
    "title": "Fly Me to the Moon",
    "artist": "Frank Sinatra",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Jazz standard",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "swing"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "44-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "44-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "45",
    "title": "We Are the World",
    "artist": "USA for Africa",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop",
    "difficulty": "easy",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "45-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "45-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "46",
    "title": "Stand by Me",
    "artist": "Ben E. King",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Soul",
    "difficulty": "easy",
    "progress": 90,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "46-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "46-v",
        "label": "Facile",
        "bpm": 118,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "47",
    "title": "Every Breath You Take",
    "artist": "The Police",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Rock pop",
    "difficulty": "medium",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "47-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "47-v",
        "label": "Facile",
        "bpm": 117,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "48",
    "title": "Hallelujah",
    "artist": "Leonard Cohen",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk ballad",
    "difficulty": "easy",
    "progress": 90,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique",
      "à confirmer si Alleluia = Hallelujah"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "48-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "48-v",
        "label": "Facile",
        "bpm": 76,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "49",
    "title": "Forever Young",
    "artist": "Alphaville",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Synth pop",
    "difficulty": "easy",
    "progress": 90,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "49-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "49-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "50",
    "title": "Canon in D",
    "artist": "Pachelbel",
    "language": "Autre",
    "songType": "instrumental",
    "technique": "fingerstyle",
    "style": "Classique",
    "difficulty": "hard",
    "progress": 40,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "arpèges",
      "progression harmonique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "50-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "50-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "51",
    "title": "Can't Help Falling in Love",
    "artist": "Elvis Presley",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Ballade",
    "difficulty": "easy",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "51-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "51-v",
        "label": "Facile",
        "bpm": 85,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "52",
    "title": "A Whiter Shade of Pale",
    "artist": "Procol Harum",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock/baroque pop",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "52-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "52-v",
        "label": "Facile",
        "bpm": 74,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "53",
    "title": "Perfect",
    "artist": "Ed Sheeran",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop ballad",
    "difficulty": "medium",
    "progress": 80,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "53-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "53-v",
        "label": "Facile",
        "bpm": 63,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "54",
    "title": "La corrida",
    "artist": "Francis Cabrel",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Chanson",
    "difficulty": "medium",
    "progress": 65,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "54-y0",
        "url": "https://youtu.be/fJ7xz0QydCY?is=cFJhfUoIG552Clem"
      }
    ],
    "versions": [
      {
        "id": "54-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "55",
    "title": "It's a Heartache",
    "artist": "Bonnie Tyler",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop rock",
    "difficulty": "easy",
    "progress": 95,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "55-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "55-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "56",
    "title": "Nothing Else Matters",
    "artist": "Metallica",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Metal ballad",
    "difficulty": "hard",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "intro arpégée"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "56-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "56-v",
        "label": "Facile",
        "bpm": 60,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "57",
    "title": "Hélène",
    "artist": "Roch Voisine",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop variété",
    "difficulty": "medium",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "57-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "57-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "58",
    "title": "Tous les cris les S.O.S.",
    "artist": "Daniel Balavoine",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock variété",
    "difficulty": "medium",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "58-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "58-v",
        "label": "Facile",
        "bpm": 130,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "59",
    "title": "J'ai demandé à la lune",
    "artist": "Indochine",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock pop",
    "difficulty": "medium",
    "progress": 55,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "59-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "59-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "60",
    "title": "Station 13",
    "artist": "Indochine",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock",
    "difficulty": "medium",
    "progress": 20,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "à vérifier bpm"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "60-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "60-v",
        "label": "Facile",
        "bpm": 130,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "61",
    "title": "The Winner Takes It All",
    "artist": "ABBA",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Pop ballad",
    "difficulty": "medium",
    "progress": 65,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "61-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "61-v",
        "label": "Facile",
        "bpm": 80,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "62",
    "title": "Le Sud",
    "artist": "Nino Ferrer",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Chanson pop",
    "difficulty": "easy",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "62-y0",
        "url": "https://youtu.be/PZ-esSyDoxk?is=dpxaaRC1CHKtk56s"
      },
      {
        "id": "62-y1",
        "url": "https://youtu.be/QbytkMuYmF8?is=_B1ASHIK4-1eGJXi"
      },
      {
        "id": "62-y2",
        "url": "https://youtu.be/-PN8WGimr6o?is=ISWKEZpVuGXI5Cvm"
      }
    ],
    "versions": [
      {
        "id": "62-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "63",
    "title": "Losing My Religion",
    "artist": "R.E.M.",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Alternative rock",
    "difficulty": "medium",
    "progress": 55,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "riff mandoline original"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "63-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "63-v",
        "label": "Facile",
        "bpm": 124,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "64",
    "title": "Tears in Heaven",
    "artist": "Eric Clapton",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Ballade folk",
    "difficulty": "medium",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "64-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "64-v",
        "label": "Facile",
        "bpm": 80,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "65",
    "title": "Quelque chose de Tennessee",
    "artist": "Johnny Hallyday",
    "language": "FR",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Ballade rock",
    "difficulty": "medium",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "https://share.google/Hy00IN4A99ifdCYsk",
    "youtubeUrls": [
      {
        "id": "65-y0",
        "url": "https://youtu.be/Yo8rSAHyMro?is=0soonEtd2D-afPeK"
      }
    ],
    "versions": [
      {
        "id": "65-v",
        "label": "Facile",
        "bpm": 75,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "66",
    "title": "Don't Cry",
    "artist": "Guns N' Roses",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock ballad",
    "difficulty": "medium",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "66-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "66-v",
        "label": "Facile",
        "bpm": 70,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "67",
    "title": "Je te donne",
    "artist": "Jean-Jacques Goldman",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop rock",
    "difficulty": "medium",
    "progress": 55,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "67-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "67-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "68",
    "title": "Nos célébrations",
    "artist": "Indochine",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Rock pop",
    "difficulty": "medium",
    "progress": 80,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "68-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "68-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "69",
    "title": "L'amour ou la tendresse",
    "artist": "Eddy de Pretto",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop urbain",
    "difficulty": "medium",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "titre à confirmer"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "69-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "69-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "70",
    "title": "Mon fils ma bataille",
    "artist": "Daniel Balavoine",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Variété rock",
    "difficulty": "medium",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "70-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "70-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "71",
    "title": "Couleur menthe à l'eau",
    "artist": "Eddy Mitchell",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Variété rock'n'roll",
    "difficulty": "easy",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "71-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "71-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "72",
    "title": "La route de Memphis",
    "artist": "Eddy Mitchell",
    "language": "FR",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock'n'roll",
    "difficulty": "easy",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "72-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "72-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "73",
    "title": "La dernière séance",
    "artist": "Eddy Mitchell",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Variété",
    "difficulty": "easy",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "73-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "73-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "74",
    "title": "Mad World",
    "artist": "Gary Jules",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Ballade synth pop (reprise)",
    "difficulty": "easy",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "74-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "74-v",
        "label": "Facile",
        "bpm": 85,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "75",
    "title": "Wonderwall",
    "artist": "Oasis",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Britpop",
    "difficulty": "easy",
    "progress": 90,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "75-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "75-v",
        "label": "Facile",
        "bpm": 87,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "76",
    "title": "Prayer in C",
    "artist": "Lilly Wood & The Prick",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Folk pop",
    "difficulty": "easy",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "76-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "76-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "77",
    "title": "Against All Odds",
    "artist": "Phil Collins",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop ballad",
    "difficulty": "medium",
    "progress": 80,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "77-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "77-v",
        "label": "Facile",
        "bpm": 65,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "78",
    "title": "Unchained Melody",
    "artist": "The Righteous Brothers",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Ballade soul",
    "difficulty": "medium",
    "progress": 70,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "78-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "78-v",
        "label": "Facile",
        "bpm": 104,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "79",
    "title": "Bad Habits",
    "artist": "Ed Sheeran",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Pop dance",
    "difficulty": "medium",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "79-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "79-v",
        "label": "Facile",
        "bpm": 126,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "80",
    "title": "La Isla Bonita",
    "artist": "Madonna",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Pop latin",
    "difficulty": "hard",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "80-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "80-v",
        "label": "Facile",
        "bpm": 100,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "81",
    "title": "Unintended",
    "artist": "Muse",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Rock alternatif ballade",
    "difficulty": "medium",
    "progress": 55,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "arpèges classiques"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "81-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "81-v",
        "label": "Facile",
        "bpm": 140,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "82",
    "title": "Chi Mai",
    "artist": "Ennio Morricone",
    "language": "Autre",
    "songType": "instrumental",
    "technique": "fingerstyle",
    "style": "Classique cinéma",
    "difficulty": "hard",
    "progress": 65,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "bande originale"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "82-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "82-v",
        "label": "Facile",
        "bpm": 90,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "83",
    "title": "Layla (version acoustique)",
    "artist": "Eric Clapton",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Blues rock unplugged",
    "difficulty": "hard",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "83-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "83-v",
        "label": "Facile",
        "bpm": 110,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "84",
    "title": "Enjoy the Silence",
    "artist": "Depeche Mode",
    "language": "EN",
    "songType": "chanté",
    "technique": "les deux",
    "style": "Synth pop (reprise acoustique)",
    "difficulty": "medium",
    "progress": 50,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "84-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "84-v",
        "label": "Facile",
        "bpm": 120,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "85",
    "title": "Photograph",
    "artist": "Ed Sheeran",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Pop ballad",
    "difficulty": "medium",
    "progress": 35,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "85-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "85-v",
        "label": "Facile",
        "bpm": 108,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "86",
    "title": "Let Her Go",
    "artist": "Passenger",
    "language": "EN",
    "songType": "chanté",
    "technique": "fingerstyle",
    "style": "Folk pop",
    "difficulty": "medium",
    "progress": 30,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "86-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "86-v",
        "label": "Facile",
        "bpm": 75,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "87",
    "title": "Emmenez-moi",
    "artist": "Charles Aznavour",
    "language": "FR",
    "songType": "chanté",
    "technique": "battement",
    "style": "Chanson française",
    "difficulty": "medium",
    "progress": 75,
    "classifications": [],
    "isFavorite": false,
    "tags": [
      "classique"
    ],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "87-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "87-v",
        "label": "Facile",
        "bpm": 130,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  },
  {
    "id": "88",
    "title": "The Drugs Don't Work",
    "artist": "The Verve",
    "language": "EN",
    "songType": "chanté",
    "technique": "battement",
    "style": "Britpop ballade",
    "difficulty": "easy",
    "progress": 85,
    "classifications": [],
    "isFavorite": false,
    "tags": [],
    "imageUrl": "",
    "youtubeUrls": [
      {
        "id": "88-y",
        "url": ""
      }
    ],
    "versions": [
      {
        "id": "88-v",
        "label": "Facile",
        "bpm": 75,
        "capo": 0,
        "key": "",
        "structure": [],
        "images": [],
        "notes": ""
      }
    ]
  }
];

const LIBRARY_SEED_DATE = new Date('2026-08-13T06:00:00.000Z').toISOString();
const DEFAULT_SONGS = REPERTOIRE.map(s => ({ ...s, createdAt: LIBRARY_SEED_DATE, updatedAt: LIBRARY_SEED_DATE }));

const SONGS_STORAGE_KEY = 'guitar-lab:songs:v2';
const CLASSIFICATIONS_STORAGE_KEY = 'guitar-lab:classifications';
const PREFS_STORAGE_KEY = 'guitar-lab:display-prefs';
const TILE_GRID_CLASSES = {
  small: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
  medium: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

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

function SaveStatusBadge({ status, onForceSave }) {
  const [flashing, setFlashing] = useState(false);
  if (status === 'idle') return null;
  const config = {
    saving: { label: 'Enregistrement...', className: 'text-gray-400' },
    saved: { label: 'Enregistré', className: 'text-green-400' },
    error: { label: 'Non enregistré', className: 'text-red-400' },
  }[status];
  if (!config) return null;

  const handleForce = async () => {
    setFlashing(true);
    await onForceSave?.();
    setTimeout(() => setFlashing(false), 1400);
  };

  return (
    <span className="ml-auto flex items-center gap-1.5">
      <span className={`text-[10px] font-normal transition-colors ${flashing ? 'text-green-400' : config.className}`} title={status === 'error' ? "La sauvegarde a échoué, tes changements restent visibles ici mais ne seront pas conservés après rechargement." : undefined}>
        {flashing ? '✓ Enregistré !' : config.label}
      </span>
      <button
        onClick={handleForce}
        className={`min-w-[28px] min-h-[28px] flex items-center justify-center text-sm rounded transition ${flashing ? 'bg-green-700' : 'bg-gray-700 hover:bg-gray-600 active:bg-amber-600'}`}
        title="Forcer l'enregistrement maintenant"
      >
        💾
      </button>
    </span>
  );
}

// Panneau de debug intégré à l'écran (sans F12 sur iPad)
// Petit pont global vers le DebugPanel : n'importe quel composant peut logger un message visible dans 🐛
function glLog(msg, type = 'info') {
  try {
    window.dispatchEvent(new CustomEvent('gl-debug-log', { detail: { msg, type } }));
  } catch (err) { /* ignore */ }
}

function DebugPanel() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState("non enregistré");

  useEffect(() => {
    const addLog = (msg, type = "info") => {
      setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }].slice(-20));
    };

    const onCustomLog = (e) => addLog(e.detail?.msg, e.detail?.type);
    window.addEventListener("gl-debug-log", onCustomLog);

    window.addEventListener("error", e => {
      addLog(`❌ ${e.message}`, "error");
    });

    window.addEventListener("unhandledrejection", e => {
      addLog(`⚠️ ${e.reason}`, "error");
    });

    window.addEventListener("online", () => {
      setIsOnline(true);
      addLog("🟢 Connexion rétablie", "success");
    });

    window.addEventListener("offline", () => {
      setIsOnline(false);
      addLog("🔴 Offline mode", "warning");
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        setSwStatus("✅ Actif");
        addLog("Service Worker enregistré", "success");
      }).catch(err => {
        setSwStatus("❌ Erreur");
        addLog(`SW error: ${err.message}`, "error");
      });
    }

    addLog("🎸 Guitar Lab démarré", "info");
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button onClick={() => setDebugOpen(!debugOpen)} className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 border-2 border-amber-500 flex items-center justify-center font-bold text-amber-400 shadow-lg" title="Ouvrir le panneau de debug">🐛</button>
      {debugOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-96">
          <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-amber-400 text-sm">🐛 Debug Panel</h3>
            <button onClick={() => setDebugOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="p-3 space-y-2 border-b border-gray-700 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Connexion :</span>
              <span className={isOnline ? "text-green-400" : "text-red-400"}>{isOnline ? "🟢 Online" : "🔴 Offline"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Service Worker :</span>
              <span className={swStatus.includes("✅") ? "text-green-400" : "text-red-400"}>{swStatus}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-950 p-2">
            {logs.length === 0 ? <p className="text-gray-600 text-xs">Aucun log</p> : logs.map((log, i) => <div key={i} className="text-[9px] font-mono mb-1"><span className="text-gray-500">[{log.time}]</span> <span className={log.type === "error" ? "text-red-400" : log.type === "warning" ? "text-yellow-400" : log.type === "success" ? "text-green-400" : "text-gray-300"}>{log.msg}</span></div>)}
          </div>
          <div className="p-2 border-t border-gray-700 flex gap-1">
            <button onClick={() => setLogs([])} className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold">Effacer</button>
            <button onClick={() => window.location.reload()} className="flex-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold">Rafraîchir</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Bloc repliable de la barre latérale bibliothèque (Trier, Filtres, Affichage...)
function SidebarSection({ title, icon, isOpen, onToggle, badge, children }) {
  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-750 hover:text-amber-300 transition"
      >
        <span className="flex items-center gap-1.5">
          {icon} {title}
          {badge ? <span className="text-[10px] font-normal text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{badge}</span> : null}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition ${isOpen ? '' : '-rotate-90'}`} />
      </button>
      {isOpen && <div className="px-4 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

function GuitarApp() {
  const [appMode, setAppMode] = useState('library');
  const [songs, setSongs] = useState(DEFAULT_SONGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const songsRef = useRef(songs);
  useEffect(() => { songsRef.current = songs; }, [songs]);

  // Enregistrement immédiat (annule le minuteur en cours), utilisable manuellement ou en filet de sécurité
  const flushSongsSave = async () => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    setSaveStatus('saving');
    try {
      const result = await window.storage.set(SONGS_STORAGE_KEY, JSON.stringify(songsRef.current), false);
      setSaveStatus(result ? 'saved' : 'error');
    } catch (err) {
      setSaveStatus('error');
    }
  };

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
    saveTimerRef.current = setTimeout(flushSongsSave, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [songs, isLoaded]);

  // Filet de sécurité : si l'app passe en arrière-plan (changement d'appli, verrouillage...) ou se ferme
  // pendant qu'un enregistrement est en attente, on le force immédiatement plutôt que d'attendre le minuteur.
  useEffect(() => {
    const forceIfPending = () => { if (saveTimerRef.current) flushSongsSave(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') forceIfPending(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', forceIfPending);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', forceIfPending);
    };
  }, []);

  // Liste maîtresse des étiquettes de classement, modifiable et partagée entre la bibliothèque et l'écran de travail
  const [classificationOptions, setClassificationOptions] = useState(DEFAULT_CLASSIFICATIONS);
  const [draftSong, setDraftSong] = useState(null);
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
  const [setlistOnly, setSetlistOnly] = useState(false);
  const [groupBy, setGroupBy] = useState('none');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [viewMode, setViewMode] = useState('tiles');
  const [tileSize, setTileSize] = useState('medium');
  const [sortBy, setSortBy] = useState('favorite');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const DEFAULT_SIDEBAR_SECTIONS = { sort: true, filters: false, display: false, roadmap: false, storage: false };
  const [sidebarSections, setSidebarSections] = useState(DEFAULT_SIDEBAR_SECTIONS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const toggleSidebarSection = (key) => {
    setSidebarSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Chargement des préférences d'affichage enregistrées
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(PREFS_STORAGE_KEY, false);
        if (!cancelled && result?.value) {
          const p = JSON.parse(result.value) || {};
          if (p.viewMode) setViewMode(p.viewMode);
          if (p.tileSize) setTileSize(p.tileSize);
          if (p.sortBy) setSortBy(p.sortBy);
          if (p.groupBy) setGroupBy(p.groupBy);
          if (p.classificationFilter) setClassificationFilter(p.classificationFilter);
          if (typeof p.sidebarCollapsed === 'boolean') setSidebarCollapsed(p.sidebarCollapsed);
          if (p.sidebarSections && typeof p.sidebarSections === 'object') {
            setSidebarSections({ ...DEFAULT_SIDEBAR_SECTIONS, ...p.sidebarSections });
          }
        }
      } catch (err) {
        // Aucune préférence enregistrée
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveDisplayPrefs = async () => {
    try {
      await window.storage.set(PREFS_STORAGE_KEY, JSON.stringify({
        viewMode, tileSize, sortBy, groupBy, classificationFilter, sidebarCollapsed, sidebarSections,
      }), false);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch (err) {
      setPrefsSaved(false);
    }
  };

  // Mémorisation automatique de l'affichage choisi
  useEffect(() => {
    if (!prefsLoaded) return;
    const t = setTimeout(() => {
      window.storage.set(PREFS_STORAGE_KEY, JSON.stringify({
        viewMode, tileSize, sortBy, groupBy, classificationFilter, sidebarCollapsed, sidebarSections,
      }), false).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [viewMode, tileSize, sortBy, groupBy, classificationFilter, sidebarCollapsed, sidebarSections, prefsLoaded]);

  const selectedSong = songs.find(s => s.id === selectedSongId);
  const selectedVersion = selectedSong?.versions.find(v => v.id === selectedVersionId) || selectedSong?.versions[0];

  const filteredSongs = songs.filter(song => {
    const matchesSearch =
      song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClassification = classificationFilter === 'all' || (song.classifications || []).includes(classificationFilter);
    const matchesSetlist = !setlistOnly || song.isSetlist;
    return matchesSearch && matchesClassification && matchesSetlist;
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
    if (sortBy === 'created-desc') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'created-asc') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'alpha-asc') return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
    if (sortBy === 'alpha-desc') return b.title.localeCompare(a.title, 'fr', { sensitivity: 'base' });
    if (sortBy === 'artist-asc') return a.artist.localeCompare(b.artist, 'fr', { sensitivity: 'base' });
    if (sortBy === 'difficulty-asc' || sortBy === 'difficulty-desc') {
      const da = DIFFICULTY_ORDER.indexOf(getDifficulty(a));
      const db = DIFFICULTY_ORDER.indexOf(getDifficulty(b));
      if (da !== db) return sortBy === 'difficulty-asc' ? da - db : db - da;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
    return 0;
  });

  const stats = {
    total: songs.length,
    avgProgress: Math.round(songs.reduce((sum, s) => sum + s.progress, 0) / songs.length || 0),
    mastered: songs.filter(s => s.progress >= 70).length,
    lastModified: songs.length > 0 ? new Date(Math.max(...songs.map(s => new Date(s.updatedAt)))).toLocaleDateString('fr-FR') : '-',
  };

  const makeNewSong = () => {
    const now = Date.now().toString();
    return {
      id: now,
      artist: '',
      title: '',
      classifications: ['À travailler'],
      difficulty: 'medium',
      language: 'FR',
      songType: 'chanté',
      technique: 'les deux',
      style: '',
      imageUrl: '',
      progress: 0,
      isFavorite: false,
      isSetlist: false,
      lastPracticedAt: null,
      tags: [],
      youtubeUrls: [{ id: now + '-y', url: '' }],
      versions: [{
        id: now + '-v',
        label: 'Facile',
        bpm: 120,
        capo: 0,
        key: 'Em',
        structure: [{
          id: now + '-s',
          section: 'Intro',
          cols: 4,
          rows: 1,
          rhythm: [],
          cells: Array.from({ length: 4 }, (_, i) => ({ id: `${now}-${i}`, split: false, chord: '', top: '', bottom: '' })),
        }],
        images: [],
        notes: '',
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const addSong = () => setDraftSong(makeNewSong());

  const confirmAddSong = () => {
    if (!draftSong) return;
    setSongs([...songs, { ...draftSong, updatedAt: new Date().toISOString() }]);
    setDraftSong(null);
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

  const toggleSetlist = (id) => {
    setSongs(songs.map(s => s.id === id ? { ...s, isSetlist: !s.isSetlist } : s));
  };

  const markPracticed = (id) => {
    setSongs(songs.map(s => s.id === id ? { ...s, lastPracticedAt: new Date().toISOString() } : s));
  };

  const [reviewIntervals, setReviewIntervals] = useState(DEFAULT_REVIEW_INTERVALS);
  const [reviewSettingsOpen, setReviewSettingsOpen] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get('guitar-lab:review-intervals', false);
        if (result?.value) setReviewIntervals(JSON.parse(result.value));
      } catch (err) { /* pas de préférence enregistrée */ }
    })();
  }, []);
  const updateReviewIntervals = (next) => {
    setReviewIntervals(next);
    window.storage.set('guitar-lab:review-intervals', JSON.stringify(next), false).catch(() => {});
  };

  const reviewQueue = useMemo(() => computeReviewQueue(songs, 3, reviewIntervals), [songs, reviewIntervals]);
  const fullReviewQueue = useMemo(() => computeReviewQueue(songs, songs.length, reviewIntervals), [songs, reviewIntervals]);

  // Session du jour : enchaîne automatiquement les morceaux à revoir, avec chrono auto-démarré
  const [sessionSetupOpen, setSessionSetupOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [sessionQueue, setSessionQueue] = useState(null); // tableau d'ids, ou null si aucune session en cours
  const [sessionIndex, setSessionIndex] = useState(0);

  const startSession = (orderedIds) => {
    if (!orderedIds.length) return;
    setSessionQueue(orderedIds);
    setSessionIndex(0);
    setSelectedSongId(orderedIds[0]);
    const firstSong = songs.find(s => s.id === orderedIds[0]);
    setSelectedVersionId(firstSong?.versions[0]?.id);
    setAppMode('editor');
    setSessionSetupOpen(false);
  };

  const goToNextSessionSong = () => {
    const nextIndex = sessionIndex + 1;
    if (!sessionQueue || nextIndex >= sessionQueue.length) {
      setSessionQueue(null);
      setAppMode('library');
      return;
    }
    setSessionIndex(nextIndex);
    setSelectedSongId(sessionQueue[nextIndex]);
    const nextSong = songs.find(s => s.id === sessionQueue[nextIndex]);
    setSelectedVersionId(nextSong?.versions[0]?.id);
  };

  const endSession = () => setSessionQueue(null);

  // Journal de pratique : sessions chronométrées (toutes chansons confondues) + objectif hebdomadaire
  const [practiceSessions, setPracticeSessions] = useState([]);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(120);
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get('guitar-lab:practice-sessions', false);
        if (result?.value) setPracticeSessions(JSON.parse(result.value));
      } catch (err) { /* pas de session enregistrée */ }
      try {
        const goalResult = await window.storage.get('guitar-lab:weekly-goal', false);
        if (goalResult?.value) setWeeklyGoalMinutes(JSON.parse(goalResult.value));
      } catch (err) { /* objectif par défaut */ }
    })();
  }, []);

  const logPracticeSession = (songId, songTitle, durationSec) => {
    if (durationSec < 5) return; // ignore les sessions trop courtes (déclenchement accidentel)
    const entry = { id: newId(), songId, title: songTitle, date: new Date().toISOString(), durationSec };
    setPracticeSessions(prev => {
      const next = [...prev, entry].slice(-500); // on garde un historique raisonnable
      window.storage.set('guitar-lab:practice-sessions', JSON.stringify(next), false).catch(() => {});
      return next;
    });
    markPracticed(songId);
  };

  const updateWeeklyGoal = (minutes) => {
    setWeeklyGoalMinutes(minutes);
    window.storage.set('guitar-lab:weekly-goal', JSON.stringify(minutes), false).catch(() => {});
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
      } else if (groupBy === 'difficulty') {
        pushTo(DIFFICULTY_META[getDifficulty(song)].group, song);
      }
    });
    return groups;
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      {appMode === 'library' ? (
        <>
          {/* SIDEBAR */}
          <div className={`${sidebarCollapsed ? 'w-8' : 'w-72'} bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 overflow-hidden transition-all`}>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-gray-700 flex items-center justify-center border-b border-gray-700">
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {!sidebarCollapsed && (
              <>
                {/* En-tête fixe : toujours visible, jamais dans le scroll */}
                <div className="p-4 border-b border-gray-700 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Music className="w-5 h-5 text-amber-500" />
                    <h1 className="text-lg font-bold">Guitar Lab</h1>
                    <SaveStatusBadge status={saveStatus} onForceSave={flushSongsSave} />
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
                </div>

                {/* Corps défilant : sections repliables (Trier ouvert par défaut) */}
                <div className="flex-1 overflow-y-auto">
                  <SidebarSection
                    title="Trier"
                    icon="🔃"
                    isOpen={sidebarSections.sort}
                    onToggle={() => toggleSidebarSection('sort')}
                  >
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
                        <option value="difficulty">🎸 Difficulté</option>
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
                        <option value="difficulty-asc">🟢 Difficulté (facile→difficile)</option>
                        <option value="difficulty-desc">🔴 Difficulté (difficile→facile)</option>
                        <option value="created-desc">🆕 Date d'ajout (récent→ancien)</option>
                        <option value="created-asc">🆕 Date d'ajout (ancien→récent)</option>
                        <option value="alpha-asc">🔤 Titre (A→Z)</option>
                        <option value="alpha-desc">🔤 Titre (Z→A)</option>
                        <option value="artist-asc">🎤 Artiste (A→Z)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Tris rapides :</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setSortBy('created-desc')}
                          className={`px-2 py-2 rounded text-xs font-semibold transition text-left ${sortBy === 'created-desc' || sortBy === 'created-asc' ? 'bg-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.3)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title="Trier par date d'ajout"
                        >
                          🆕 Ajout
                        </button>
                        <button
                          onClick={() => setSortBy(sortBy === 'recent' ? 'old' : 'recent')}
                          className={`px-2 py-2 rounded text-xs font-semibold transition text-left ${sortBy === 'recent' || sortBy === 'old' ? 'bg-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.3)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title="Trier par date de modification"
                        >
                          📅 Modif
                        </button>
                        <button
                          onClick={() => setSortBy(sortBy === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc')}
                          className={`px-2 py-2 rounded text-xs font-semibold transition text-left ${sortBy === 'alpha-asc' || sortBy === 'alpha-desc' ? 'bg-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.3)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title="Trier par titre"
                        >
                          🔤 Titre
                        </button>
                        <button
                          onClick={() => setSortBy('artist-asc')}
                          className={`px-2 py-2 rounded text-xs font-semibold transition text-left ${sortBy === 'artist-asc' ? 'bg-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.3)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title="Trier par artiste"
                        >
                          🎤 Artiste
                        </button>
                      </div>
                    </div>
                  </SidebarSection>

                  <SidebarSection
                    title="Filtres"
                    icon="🎯"
                    isOpen={sidebarSections.filters}
                    onToggle={() => toggleSidebarSection('filters')}
                    badge={setlistOnly ? '🎉' : null}
                  >
                    <button
                      onClick={() => setSetlistOnly(!setlistOnly)}
                      className={`w-full px-2 py-2 rounded text-xs font-semibold transition text-left flex items-center gap-1.5 ${setlistOnly ? 'bg-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.3)]' : 'bg-gray-700 hover:bg-gray-600'}`}
                      title="N'afficher que les titres sélectionnés pour une soirée"
                    >
                      🎉 Soirée uniquement
                    </button>
                  </SidebarSection>

                  <SidebarSection
                    title="Affichage"
                    icon="🖼️"
                    isOpen={sidebarSections.display}
                    onToggle={() => toggleSidebarSection('display')}
                  >
                    <div>
                      <label className="text-xs text-gray-500 block mb-2">Mode :</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setViewMode('detailed')}
                          className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${viewMode === 'detailed' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                          📇
                        </button>
                        <button
                          onClick={() => setViewMode('compact')}
                          className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${viewMode === 'compact' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                          📋
                        </button>
                        <button
                          onClick={() => setViewMode('tiles')}
                          className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${viewMode === 'tiles' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                          title="Petites tuiles"
                        >
                          🀫
                        </button>
                      </div>
                    </div>
                    {viewMode === 'tiles' && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-2">Taille des tuiles :</label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setTileSize('small')}
                            className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${tileSize === 'small' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            title="Petites tuiles"
                          >
                            S
                          </button>
                          <button
                            onClick={() => setTileSize('medium')}
                            className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${tileSize === 'medium' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            title="Tuiles moyennes"
                          >
                            M
                          </button>
                          <button
                            onClick={() => setTileSize('large')}
                            className={`flex-1 px-2 py-2 rounded text-xs font-semibold transition ${tileSize === 'large' ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            title="Grandes tuiles"
                          >
                            L
                          </button>
                        </div>
                      </div>
                    )}
                  </SidebarSection>

                  <ClassificationManager
                    options={classificationOptions}
                    onAdd={addClassificationOption}
                    onRemove={removeClassificationOption}
                  />

                  <SidebarSection
                    title="Feuille de route"
                    icon="🗺️"
                    isOpen={sidebarSections.roadmap}
                    onToggle={() => toggleSidebarSection('roadmap')}
                  >
                    <p className="text-xs text-gray-400">Objectifs en cours, morceaux maîtrisés et prochains défis.</p>
                    <button
                      onClick={() => setRoadmapOpen(true)}
                      className="w-full px-2 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold transition"
                      title="Ouvrir la feuille de route en grand"
                    >
                      Voir en grand →
                    </button>
                  </SidebarSection>

                  <SidebarSection
                    title="Stockage"
                    icon="💾"
                    isOpen={sidebarSections.storage}
                    onToggle={() => toggleSidebarSection('storage')}
                  >
                    <StorageManager />
                  </SidebarSection>
                </div>
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
              <div className="m-4 mb-0 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    📅 {reviewQueue.length > 0 ? "À revoir aujourd'hui" : 'Révision espacée : tout est à jour ✅'}
                  </h3>
                  <div className="flex items-center gap-1">
                    {fullReviewQueue.length > 0 && (
                      <button
                        onClick={() => setSessionSetupOpen(true)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold transition flex items-center gap-1"
                        title="Enchaîner les morceaux à revoir, avec chrono automatique"
                      >
                        🎯 Démarrer ma session
                      </button>
                    )}
                    <button
                      onClick={() => setReviewSettingsOpen(!reviewSettingsOpen)}
                      className="p-1 hover:bg-gray-700 rounded transition"
                      title="Régler les intervalles de révision"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>

                {reviewSettingsOpen && (
                    <div className="mb-3 p-2 bg-gray-800 border border-gray-600 rounded-lg space-y-2">
                      <p className="text-[11px] text-gray-400">Revoir un morceau tous les... (en jours)</p>
                      {[
                        { key: 'low', label: 'Peu maîtrisé (< 34%)' },
                        { key: 'mid', label: 'Intermédiaire (34-70%)' },
                        { key: 'high', label: 'Bien acquis (≥ 71%)' },
                      ].map(row => (
                        <div key={row.key} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-300">{row.label}</span>
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={reviewIntervals[row.key]}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 1));
                              updateReviewIntervals({ ...reviewIntervals, [row.key]: v });
                            }}
                            className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-right focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {reviewQueue.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {reviewQueue.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-gray-800 border border-gray-600 rounded-lg pl-2 pr-1 py-1">
                          <button
                            onClick={() => {
                              setSelectedSongId(s.id);
                              setSelectedVersionId(s.versions[0]?.id);
                              setAppMode('editor');
                            }}
                            className="text-xs font-semibold hover:text-amber-400 transition text-left"
                            title={s.artist}
                          >
                            {s.title}
                          </button>
                          <button
                            onClick={() => markPracticed(s.id)}
                            className="p-1 hover:bg-green-700 rounded transition"
                            title="Marquer comme pratiqué aujourd'hui"
                          >
                            ✓
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              {sortedSongs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Music className="w-12 h-12 mx-auto text-gray-600 mb-3 opacity-50" />
                    <p className="text-gray-400">Aucun morceau ne correspond</p>
                  </div>
                </div>
              ) : groupBy === 'none' ? (
                <div className={`p-4 ${viewMode === 'detailed' ? 'grid grid-cols-1 gap-3' : viewMode === 'tiles' ? `grid ${TILE_GRID_CLASSES[tileSize]} gap-2` : 'space-y-1'}`}>
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
                      onToggleSetlist={() => toggleSetlist(song.id)}
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
                        <div className={`bg-gray-800 border border-t-0 border-gray-600 rounded-b-lg overflow-hidden ${viewMode === 'detailed' ? 'grid grid-cols-1 gap-2 p-3' : viewMode === 'tiles' ? `grid ${TILE_GRID_CLASSES[tileSize]} gap-2 p-2` : 'space-y-0.5 p-2'}`}>
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
                              onToggleSetlist={() => toggleSetlist(song.id)}
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
            practiceSessions={practiceSessions}
            onLogPracticeSession={logPracticeSession}
            weeklyGoalMinutes={weeklyGoalMinutes}
            onUpdateWeeklyGoal={updateWeeklyGoal}
            sessionInfo={sessionQueue ? { position: sessionIndex + 1, total: sessionQueue.length } : null}
            onSessionNext={goToNextSessionSong}
            onSessionEnd={endSession}
          />
        )
      )}
      {draftSong && (
        <SongEditModal
          song={draftSong}
          onChange={setDraftSong}
          onSave={confirmAddSong}
          onCancel={() => setDraftSong(null)}
          classificationOptions={classificationOptions}
          onAddClassificationOption={addClassificationOption}
          title="➕ Nouveau morceau"
        />
      )}
      {sessionSetupOpen && (
        <SessionSetupModal
          songs={fullReviewQueue}
          onStart={startSession}
          onCancel={() => setSessionSetupOpen(false)}
        />
      )}
      {roadmapOpen && (
        <RoadmapModal
          songs={songs}
          onSelectSong={setSelectedSongId}
          onClose={() => setRoadmapOpen(false)}
        />
      )}
    </div>
  );
}

// Version modale/plein-écran de la roadmap, pour une meilleure visibilité sur petit écran
function RoadmapModal({ songs, onSelectSong, onClose }) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const inProgress = songs.filter(s => {
    if (!s.lastPracticedAt) return false;
    const lastDate = new Date(s.lastPracticedAt);
    const isRecent = lastDate >= sevenDaysAgo;
    const notMastered = getDifficulty(s) !== 'hard';
    return isRecent && notMastered;
  });

  const mastered = songs.filter(s => {
    if (!s.lastPracticedAt) return false;
    const diff = getDifficulty(s);
    const sessionCount = (s.practiceSessions || []).length;
    return diff === 'hard' || sessionCount >= 5;
  });

  const inProgressIds = new Set(inProgress.map(s => s.id));
  const masteredIds = new Set(mastered.map(s => s.id));
  const nextChallenges = songs
    .filter(s => !inProgressIds.has(s.id) && !masteredIds.has(s.id))
    .sort((a, b) => {
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      const da = diffOrder[getDifficulty(a)] || 0;
      const db = diffOrder[getDifficulty(b)] || 0;
      return da - db;
    });

  const diffColor = (diff) => {
    const colors = { easy: 'text-green-400', medium: 'text-amber-400', hard: 'text-red-400' };
    return colors[diff] || 'text-gray-400';
  };

  const SongRow = ({ song, section }) => (
    <button
      onClick={() => { onSelectSong?.(song.id); onClose?.(); }}
      className="w-full text-left p-3 bg-gray-750 hover:bg-gray-700 rounded transition border-l-4 flex items-center justify-between"
      style={{
        borderColor: section === 'progress' ? '#b45309' : section === 'mastered' ? '#22c55e' : '#9ca3af'
      }}
    >
      <div>
        <p className="font-semibold text-sm">{song.title}</p>
        <p className="text-xs text-gray-400">{song.artist}</p>
      </div>
      {section === 'challenges' && (
        <span className={`text-xs font-bold ${diffColor(getDifficulty(song))}`}>
          {getDifficulty(song)[0].toUpperCase()}
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-800 flex justify-between items-center">
          <h2 className="font-bold text-amber-400 text-lg">🗺️ Feuille de route</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {inProgress.length > 0 && (
            <section>
              <h3 className="font-semibold text-amber-400 mb-2">📌 En cours</h3>
              <div className="space-y-2">
                {inProgress.map(s => <SongRow key={s.id} song={s} section="progress" />)}
              </div>
            </section>
          )}

          {mastered.length > 0 && (
            <section>
              <h3 className="font-semibold text-green-400 mb-2">✓ Maîtrisés</h3>
              <div className="space-y-2">
                {mastered.map(s => <SongRow key={s.id} song={s} section="mastered" />)}
              </div>
            </section>
          )}

          {nextChallenges.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-400 mb-2">🎯 Prochains défis</h3>
              <div className="space-y-2">
                {nextChallenges.map(s => <SongRow key={s.id} song={s} section="challenges" />)}
              </div>
            </section>
          )}

          {inProgress.length === 0 && mastered.length === 0 && nextChallenges.length === 0 && (
            <p className="text-center text-gray-500 py-8">Ajoute des morceaux pour voir ta feuille de route</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de préparation de la session du jour : reprend la file de révision, réordonnable avant de lancer
function SessionSetupModal({ songs, onStart, onCancel }) {
  const [order, setOrder] = useState(() => songs.map(s => s.id));
  const orderedSongs = order.map(id => songs.find(s => s.id === id)).filter(Boolean);

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-sm w-full max-h-[80vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-amber-400 text-sm">🎯 Session du jour</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-3">Réordonne si besoin, puis lance : chaque morceau démarre son chrono automatiquement.</p>
          <div className="space-y-1.5">
            {orderedSongs.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 bg-gray-750 border border-gray-600 rounded px-2 py-1.5">
                <span className="text-xs text-gray-500 w-4 text-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{s.title}</div>
                  <div className="text-[10px] text-gray-400 truncate">{s.artist}</div>
                </div>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 flex-shrink-0" title="Monter">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 flex-shrink-0" title="Descendre">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex gap-2 sticky bottom-0 bg-gray-800">
          <button onClick={() => onStart(order)} className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-semibold transition text-sm">
            ▶️ Commencer
          </button>
          <button onClick={onCancel} className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded font-semibold transition text-sm">
            ✕ Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// Feuille de route visible : montre où tu en es et où tu vas (en cours / maîtrisés / prochains défis)
function Roadmap({ songs, onSelectSong }) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Morceaux en cours : pratiqués récemment, pas encore maîtrisés
  const inProgress = songs.filter(s => {
    if (!s.lastPracticedAt) return false;
    const lastDate = new Date(s.lastPracticedAt);
    const isRecent = lastDate >= sevenDaysAgo;
    const notMastered = getDifficulty(s) !== 'hard'; // Simplifié : hard = maîtrisé
    return isRecent && notMastered;
  }).slice(0, 3);

  // Morceaux maîtrisés : difficulty hard OU beaucoup de sessions
  const mastered = songs.filter(s => {
    if (!s.lastPracticedAt) return false;
    const diff = getDifficulty(s);
    const sessionCount = (s.practiceSessions || []).length;
    return diff === 'hard' || sessionCount >= 5;
  }).slice(0, 3);

  // Prochains défis : non-maîtrisés, non-en-cours, triés par difficulté croissante
  const inProgressIds = new Set(inProgress.map(s => s.id));
  const masteredIds = new Set(mastered.map(s => s.id));
  const nextChallenges = songs
    .filter(s => !inProgressIds.has(s.id) && !masteredIds.has(s.id))
    .sort((a, b) => {
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      const da = diffOrder[getDifficulty(a)] || 0;
      const db = diffOrder[getDifficulty(b)] || 0;
      return da - db;
    })
    .slice(0, 5);

  const diffColor = (diff) => {
    const colors = { easy: 'text-green-400', medium: 'text-amber-400', hard: 'text-red-400' };
    return colors[diff] || 'text-gray-400';
  };

  return (
    <div className="p-4 border-t border-gray-700">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">🗺️ Feuille de route</p>

      {inProgress.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400 mb-1">En cours</p>
          <div className="space-y-0.5">
            {inProgress.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSong?.(s.id)}
                className="w-full text-left px-2 py-1 bg-amber-900/30 hover:bg-amber-900/50 rounded text-xs truncate transition"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {mastered.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400 mb-1">Maîtrisés ✓</p>
          <div className="space-y-0.5">
            {mastered.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSong?.(s.id)}
                className="w-full text-left px-2 py-1 bg-green-900/30 hover:bg-green-900/50 rounded text-xs truncate transition text-green-300"
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {nextChallenges.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">Prochains défis</p>
          <div className="space-y-0.5">
            {nextChallenges.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSong?.(s.id)}
                className="w-full text-left px-2 py-1 bg-gray-750 hover:bg-gray-700 rounded text-xs truncate transition flex items-center justify-between"
              >
                <span>{s.title}</span>
                <span className={`text-[9px] font-semibold ml-1 flex-shrink-0 ${diffColor(getDifficulty(s))}`}>
                  {getDifficulty(s)[0].toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {inProgress.length === 0 && mastered.length === 0 && nextChallenges.length === 0 && (
        <p className="text-[10px] text-gray-500 italic">Ajoute des morceaux pour voir ta feuille de route</p>
      )}
    </div>
  );
}

function StorageManager() {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  const refreshEstimate = async () => {
    setLoading(true);
    try {
      const est = await window.storage.estimate?.();
      setEstimate(est);
    } catch (e) {
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshEstimate(); }, []);

  const formatSize = (bytes) => {
    if (bytes == null) return '?';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const pct = estimate?.quota ? Math.min(100, Math.round((estimate.usage / estimate.quota) * 100)) : null;
  const barColor = pct === null ? 'bg-gray-500' : pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';

  const handleExport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await window.storage.exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `guitar-lab-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setMessage({ type: 'ok', text: 'Exporté — choisis « Enregistrer dans Fichiers » → iCloud Drive' });
    } catch (e) {
      setMessage({ type: 'error', text: "Échec de l'export : " + (e.message || e) });
    } finally {
      setBusy(false);
      refreshEstimate();
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm("Importer ce fichier remplacera tes données actuelles (morceaux, préférences...) par celles du fichier. Continuer ?")) return;
    setBusy(true);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const payload = JSON.parse(ev.target.result);
        await window.storage.importBackup(payload);
        setMessage({ type: 'ok', text: 'Données importées, rechargement…' });
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        setMessage({ type: 'error', text: 'Fichier illisible : ' + (err.message || err) });
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Impossible de lire ce fichier.' });
      setBusy(false);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Espace utilisé</span>
        <button onClick={refreshEstimate} className="text-[10px] text-gray-500 hover:text-gray-300 px-1" title="Actualiser">↻</button>
      </div>

      {loading ? (
        <p className="text-[11px] text-gray-500 mb-2">Calcul en cours…</p>
      ) : estimate?.quota ? (
        <>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-1">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 mb-2">{formatSize(estimate.usage)} / {formatSize(estimate.quota)} ({pct}%)</p>
        </>
      ) : (
        <p className="text-[11px] text-gray-500 mb-2">Estimation indisponible sur ce navigateur.</p>
      )}

      <div className="flex gap-1">
        <button onClick={handleExport} disabled={busy} className="flex-1 px-2 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded text-xs font-semibold transition">
          ☁️ Exporter
        </button>
        <label className={`flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold transition text-center cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          📂 Importer
          <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
        </label>
      </div>

      {message && (
        <p className={`text-[10px] mt-2 ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>
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

function SongItem({ song, isSelected, onSelect, onDelete, onToggleFavorite, onToggleSetlist, onUpdate, viewMode, classificationOptions = [], onAddClassificationOption }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(song);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => { setCoverError(false); }, [song.imageUrl]);

  const saveEdit = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const CoverThumb = ({ size }) => {
    const dim = size === 'sm' ? 'w-9 h-9' : size === 'md' ? 'w-full aspect-square' : 'w-14 h-14';
    if (song.imageUrl && !coverError) {
      return (
        <img
          src={song.imageUrl}
          alt=""
          onError={() => setCoverError(true)}
          className={`${dim} object-cover rounded-md border border-gray-600 bg-gray-800 flex-shrink-0`}
        />
      );
    }
    return (
      <div className={`${dim} rounded-md border border-gray-600 bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-600`}>
        <Music className={size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
      </div>
    );
  };

  if (viewMode === 'tiles') {
    return (
      <>
        <div
          onClick={onSelect}
          className={`relative p-2 rounded-lg border transition cursor-pointer overflow-hidden ${
            isSelected ? 'border-amber-500 bg-amber-500/15' : 'border-gray-600 bg-gray-750 hover:bg-gray-700'
          }`}
        >
          <div className="mb-1.5">
            <CoverThumb size="md" />
          </div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="hover:opacity-75 transition flex-shrink-0"
            >
              <Star className={`w-3.5 h-3.5 ${song.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSetlist(); }}
              className="hover:opacity-75 transition flex-shrink-0"
              title="Sélectionner pour une soirée"
            >
              <span className={song.isSetlist ? 'opacity-100' : 'opacity-30 grayscale'}>🎉</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-0.5 hover:bg-gray-600 rounded transition flex-shrink-0"
            >
              <Edit2 className="w-3 h-3 text-amber-400" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-0.5 hover:bg-red-900 rounded transition flex-shrink-0"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
          <div className="flex items-start gap-1 mb-0.5 min-h-[2rem]">
            <DifficultyPick difficulty={song.difficulty} size={12} className="mt-0.5" onChange={(d) => onUpdate({ ...song, difficulty: d })} />
            <h3 className="font-bold text-xs leading-tight line-clamp-2 flex-1">{song.title}</h3>
          </div>
          <p className="text-[10px] text-gray-400 truncate mb-1.5">{song.artist}</p>
          <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${song.progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{song.progress}%</span>
            <span>{new Date(song.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
          </div>
        </div>
        {isEditing && (
          <SongEditModal
            song={editData}
            onChange={setEditData}
            onSave={saveEdit}
            onCancel={() => { setEditData(song); setIsEditing(false); }}
            classificationOptions={classificationOptions}
            onAddClassificationOption={onAddClassificationOption}
          />
        )}
      </>
    );
  }

  if (viewMode === 'compact') {
    return (
      <>
      <div className={`flex items-center gap-2 px-3 py-2 rounded transition ${isSelected ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-650 text-gray-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="hover:opacity-75">
          <Star className={`w-4 h-4 ${song.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleSetlist(); }} className="hover:opacity-75" title="Sélectionner pour une soirée">
          <span className={song.isSetlist ? 'opacity-100' : 'opacity-30 grayscale'}>🎉</span>
        </button>
        <CoverThumb size="sm" />
        <DifficultyPick difficulty={song.difficulty} size={14} onChange={(d) => onUpdate({ ...song, difficulty: d })} />
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
      {isEditing && (
        <SongEditModal
          song={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onCancel={() => { setEditData(song); setIsEditing(false); }}
          classificationOptions={classificationOptions}
          onAddClassificationOption={onAddClassificationOption}
        />
      )}
      </>
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
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <CoverThumb size="lg" />
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
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSetlist(); }}
                  className="hover:opacity-75 transition flex-shrink-0"
                  title="Sélectionner pour une soirée"
                >
                  <span className={song.isSetlist ? 'opacity-100' : 'opacity-30 grayscale'}>🎉</span>
                </button>
                <DifficultyPick difficulty={song.difficulty} size={15} onChange={(d) => onUpdate({ ...song, difficulty: d })} />
                <h3 className="font-bold truncate text-sm">{song.title}</h3>
              </div>
              <p className="text-xs text-gray-400 truncate">{song.artist}</p>
            </div>
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
          {song.songType && <span className="px-2 py-1 bg-gray-600 rounded">{song.songType === 'instrumental' ? '🎸 Instrumental' : '🎤 Chanté'}</span>}
          {song.technique && <span className="px-2 py-1 bg-gray-600 rounded">✋ {song.technique}</span>}
          {song.language && <span className="px-2 py-1 bg-gray-600 rounded">🌍 {song.language}</span>}
          {song.style && <span className="px-2 py-1 bg-gray-600 rounded">🎵 {song.style}</span>}
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
          classificationOptions={classificationOptions}
          onAddClassificationOption={onAddClassificationOption}
        />
      )}
    </>
  );
}

// Suggère des mots-clés à partir des informations du morceau (aide "IA" locale, sans réseau)
function suggestKeywords(song) {
  const out = [];
  const push = (t) => { const c = (t || '').trim(); if (c && !out.includes(c)) out.push(c); };
  const d = getDifficulty(song);
  push(d === 'easy' ? 'facile' : d === 'hard' ? 'difficile' : 'intermédiaire');
  if (song.technique === 'fingerstyle') { push('fingerstyle'); push('arpèges'); }
  if (song.technique === 'rythmique') { push('rythmique'); push('accords ouverts'); }
  if (song.technique === 'les deux') { push('picking'); push('rythmique'); }
  if (song.songType === 'instrumental') push('instrumental'); else push('chant + guitare');
  if (song.language) push(song.language.toLowerCase());
  (song.style || '').split(/[,/]+/).forEach(s => push(s.toLowerCase()));
  const capo = song.versions?.[0]?.capo;
  if (capo) push(`capo ${capo}`);
  const bpm = song.versions?.[0]?.bpm;
  if (bpm) push(bpm < 80 ? 'tempo lent' : bpm > 130 ? 'tempo rapide' : 'tempo moyen');
  (song.artist || '').split(/[,&]+/).forEach(a => push(a.trim().toLowerCase()));
  if (song.progress >= 70) push('à entretenir'); else if (song.progress > 0) push('en cours');
  else push('à démarrer');
  return out.filter(t => !(song.tags || []).includes(t)).slice(0, 8);
}

function SongEditModal({ song, onChange, onSave, onCancel, classificationOptions = [], onAddClassificationOption, title = '✏️ Éditer' }) {
  const [newTag, setNewTag] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [newClassification, setNewClassification] = useState('');

  const tags = song.tags || [];
  const classifications = song.classifications || [];
  const links = song.youtubeUrls || [];
  const firstVersion = song.versions?.[0];

  const addTag = (value) => {
    const clean = (value ?? newTag).trim();
    if (!clean || tags.includes(clean)) return;
    onChange({ ...song, tags: [...tags, clean] });
    setNewTag('');
    setSuggestions(s => s.filter(t => t !== clean));
  };

  const removeTag = (tag) => onChange({ ...song, tags: tags.filter(t => t !== tag) });

  const toggleClassification = (label) => {
    if (!label) return;
    const next = classifications.includes(label)
      ? classifications.filter(c => c !== label)
      : [...classifications, label];
    onChange({ ...song, classifications: next });
  };

  const createClassification = () => {
    const clean = newClassification.trim();
    if (!clean) return;
    onAddClassificationOption?.(clean);
    if (!classifications.includes(clean)) onChange({ ...song, classifications: [...classifications, clean] });
    setNewClassification('');
  };

  const setCapo = (value) => {
    if (!firstVersion) return;
    const capo = Math.max(0, Math.min(12, parseInt(value) || 0));
    onChange({ ...song, versions: song.versions.map((v, i) => (i === 0 ? { ...v, capo } : v)) });
  };

  const updateLink = (id, url) => onChange({ ...song, youtubeUrls: links.map(l => (l.id === id ? { ...l, url } : l)) });
  const addLink = () => onChange({ ...song, youtubeUrls: [...links, { id: newId(), url: '' }] });
  const removeLink = (id) => onChange({ ...song, youtubeUrls: links.filter(l => l.id !== id) });

  const inputCls = 'w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-amber-500';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-amber-400">{title}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Difficulté</label>
            <div className="flex gap-2">
              {DIFFICULTY_ORDER.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ ...song, difficulty: d })}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded text-xs font-semibold transition border ${getDifficulty(song) === d ? 'bg-gray-600 border-amber-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                >
                  <PickIcon difficulty={d} size={14} />
                  {DIFFICULTY_META[d].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Titre</label>
            <input type="text" value={song.title} onChange={(e) => onChange({ ...song, title: e.target.value })} className={inputCls} />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Artiste</label>
            <input type="text" value={song.artist} onChange={(e) => onChange({ ...song, artist: e.target.value })} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <select value={song.songType || ''} onChange={(e) => onChange({ ...song, songType: e.target.value })} className={inputCls}>
                <option value="chanté">🎤 Chanté</option>
                <option value="instrumental">🎸 Instrumental</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Technique</label>
              <select value={song.technique || ''} onChange={(e) => onChange({ ...song, technique: e.target.value })} className={inputCls}>
                <option value="">—</option>
                <option value="fingerstyle">Fingerstyle</option>
                <option value="rythmique">Rythmique</option>
                <option value="les deux">Les deux</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Langue</label>
              <select value={song.language || ''} onChange={(e) => onChange({ ...song, language: e.target.value })} className={inputCls}>
                <option value="">—</option>
                <option value="FR">FR</option>
                <option value="EN">EN</option>
                <option value="ES">ES</option>
                <option value="Instrumental">Instrumental</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Style</label>
              <input
                type="text"
                value={song.style || ''}
                placeholder="Rock français, Pop, Blues…"
                onChange={(e) => onChange({ ...song, style: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Progression : curseur + valeur */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400">Progression</label>
              <span className="text-xs font-bold text-amber-400">{song.progress || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={song.progress || 0}
                onChange={(e) => onChange({ ...song, progress: parseInt(e.target.value) || 0 })}
                className="flex-1 accent-amber-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={song.progress || 0}
                onChange={(e) => onChange({ ...song, progress: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-center focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Capodastre */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Capodastre (case)</label>
              <input
                type="number"
                min="0"
                max="12"
                value={firstVersion?.capo ?? 0}
                onChange={(e) => setCapo(e.target.value)}
                className={inputCls}
                disabled={!firstVersion}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Tonalité</label>
              <input
                type="text"
                value={firstVersion?.key || ''}
                placeholder="Em, G…"
                onChange={(e) => firstVersion && onChange({ ...song, versions: song.versions.map((v, i) => (i === 0 ? { ...v, key: e.target.value } : v)) })}
                className={inputCls}
                disabled={!firstVersion}
              />
            </div>
          </div>

          {/* Classement */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Classement</label>
            <select
              value=""
              onChange={(e) => { toggleClassification(e.target.value); e.target.value = ''; }}
              className={inputCls}
            >
              <option value="">+ Ajouter / retirer un classement…</option>
              {classificationOptions.map(label => (
                <option key={label} value={label}>{classifications.includes(label) ? `✓ ${label}` : label}</option>
              ))}
            </select>
            <div className="flex gap-1 mt-2">
              <input
                type="text"
                placeholder="Nouveau classement…"
                value={newClassification}
                onChange={(e) => setNewClassification(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createClassification()}
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
              />
              <button onClick={createClassification} className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold transition">+</button>
            </div>
            {classifications.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {classifications.map(label => (
                  <div key={label} className="px-2 py-1 bg-amber-600/30 text-amber-200 rounded text-xs flex items-center gap-1">
                    🏷️ {label}
                    <button onClick={() => toggleClassification(label)} className="hover:opacity-75"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pochette */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Pochette (URL de l'image)</label>
            <div className="flex gap-2 items-start">
              <input
                type="url"
                value={song.imageUrl || ''}
                placeholder="https://…/pochette.jpg"
                onChange={(e) => onChange({ ...song, imageUrl: e.target.value })}
                className={inputCls}
              />
              {song.imageUrl ? (
                <img src={song.imageUrl} alt="Pochette" className="w-12 h-12 object-cover rounded border border-gray-600 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded border border-gray-600 bg-gray-700 flex items-center justify-center text-gray-500 text-lg flex-shrink-0">♪</div>
              )}
            </div>
          </div>

          {/* Liens */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400">Liens (vidéo, tablature, paroles…)</label>
              <button onClick={addLink} className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded">+ Lien</button>
            </div>
            <div className="space-y-1">
              {links.length === 0 && <p className="text-xs text-gray-500">Aucun lien.</p>}
              {links.map(link => (
                <div key={link.id} className="flex gap-1 items-center">
                  <input
                    type="url"
                    value={link.url || ''}
                    placeholder="https://…"
                    onChange={(e) => updateLink(link.id, e.target.value)}
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
                  />
                  {link.url ? (
                    <a href={link.url} target="_blank" rel="noreferrer" className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs hover:bg-gray-600">↗</a>
                  ) : null}
                  <button onClick={() => removeLink(link.id)} className="px-2 py-1 hover:bg-red-900 rounded text-xs text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Mots-clés + aide IA */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400">Mots-clés</label>
              <button onClick={() => onChange({ ...song, isFavorite: !song.isFavorite })} className="text-xs hover:opacity-75">
                {song.isFavorite ? '⭐ Favori' : '☆ Ajouter aux favoris'}
              </button>
            </div>
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                placeholder="Nouveau mot-clé…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
              />
              <button onClick={() => addTag()} className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold transition">+</button>
              <button
                onClick={() => setSuggestions(suggestKeywords(song))}
                title="Proposer des mots-clés à partir de la fiche"
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold transition"
              >
                ✨ IA
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => addTag(s)} className="px-2 py-1 bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 rounded text-xs hover:bg-indigo-600/40">
                    + {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1 flex-wrap">
              {tags.map(tag => (
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

// Sélecteur visuel du capodastre : grille de 0 (sans capo) à 12, en popover pour rester utilisable directement dans l'écran de travail
function CapoPicker({ capo, onChange }) {
  const [open, setOpen] = useState(false);
  const value = capo || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:text-amber-400 transition"
        title="Régler le capodastre"
      >
        <span>Capo:</span>
        <span className="font-bold text-amber-400">{value === 0 ? 'Aucun' : value}</span>
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5 text-center">Position du capo</p>
            <div className="grid grid-cols-4 gap-1.5" style={{ width: 176 }}>
              {Array.from({ length: 13 }, (_, i) => i).map(n => (
                <button
                  key={n}
                  onClick={() => { onChange(n); setOpen(false); }}
                  className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition ${
                    value === n ? 'bg-amber-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                  title={n === 0 ? 'Sans capo' : `Capo case ${n}`}
                >
                  {n === 0 ? '—' : n}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WorkScreen({ song, version, allSongs, onBack, onSelectSong, onSelectVersion, onUpdateSong, classificationOptions = [], onAddClassificationOption, onRemoveClassificationOption, practiceSessions = [], onLogPracticeSession, weeklyGoalMinutes = 120, onUpdateWeeklyGoal, sessionInfo = null, onSessionNext, onSessionEnd }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false); // Masque les panneaux pour une concentration maximale
  const [performance, setPerformance] = useState(false);
  const [videoMenuOpen, setVideoMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(null);
  const validYoutubeLinks = (song.youtubeUrls || [])
    .map(l => ({ ...l, videoId: extractYoutubeId(l.url) }))
    .filter(l => l.videoId);
  const isSessionActive = !!sessionInfo;

  const saveBookmark = (linkId, bookmarkData) => {
    // bookmarkData peut être :
    // - { seconds, name } : ajouter/créer un nouveau bookmark
    // - { delete: bookmarkId } : supprimer un bookmark
    onUpdateSong({
      ...song,
      youtubeUrls: (song.youtubeUrls || []).map(u => {
        if (u.id !== linkId) return u;
        const bookmarks = u.bookmarks || [];
        if (bookmarkData.delete) {
          return { ...u, bookmarks: bookmarks.filter(bm => bm.id !== bookmarkData.delete) };
        } else {
          // Ajouter ou remplacer un bookmark
          const newBookmark = { id: newId(), seconds: bookmarkData.seconds, name: bookmarkData.name };
          return { ...u, bookmarks: [newBookmark, ...bookmarks] };
        }
      }),
    });
  };

  // Minuteur de pratique : chronomètre la session en cours sur ce morceau
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);
  // Arrête et remet à zéro le chrono si on change de morceau (démarre automatiquement en mode session)
  useEffect(() => {
    setTimerRunning(isSessionActive);
    setTimerSeconds(0);
  }, [song.id, isSessionActive]);
  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const stopAndLogTimer = () => {
    setTimerRunning(false);
    if (timerSeconds > 0) onLogPracticeSession?.(song.id, song.title, timerSeconds);
    setTimerSeconds(0);
  };

  const goToNextInSession = () => {
    stopAndLogTimer();
    onSessionNext?.();
  };

  const endSession = () => {
    stopAndLogTimer();
    onSessionEnd?.();
  };

  // Largeurs des bandeaux latéraux, réglables par glisser, mémorisées d'une session à l'autre
  const [leftPanelWidth, setLeftPanelWidth] = useState(224);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get('guitar-lab:panel-widths', false);
        if (result?.value) {
          const p = JSON.parse(result.value);
          if (p.left) setLeftPanelWidth(p.left);
          if (p.right) setRightPanelWidth(p.right);
        }
      } catch (err) { /* pas de préférence enregistrée */ }
    })();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      window.storage.set('guitar-lab:panel-widths', JSON.stringify({ left: leftPanelWidth, right: rightPanelWidth }), false).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [leftPanelWidth, rightPanelWidth]);

  const startResize = (side) => (e) => {
    e.preventDefault();
    const pointer = e.touches ? e.touches[0] : e;
    const startX = pointer.clientX;
    const startWidth = side === 'left' ? leftPanelWidth : rightPanelWidth;
    const min = side === 'left' ? 180 : 260;
    const max = side === 'left' ? 460 : 560;

    const onMove = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      const delta = side === 'left' ? (p.clientX - startX) : (startX - p.clientX);
      const next = Math.max(min, Math.min(max, startWidth + delta));
      if (side === 'left') setLeftPanelWidth(next); else setRightPanelWidth(next);
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


  // Mode compact (téléphone) : tous les panneaux en volets superposés
  // Mode étroit (tablette verticale) : la structure reste affichée à gauche des photos, seul le panneau droit passe en volet
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 700);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 1080);
  useEffect(() => {
    const mqC = window.matchMedia('(max-width: 700px)');
    const mqN = window.matchMedia('(max-width: 1080px)');
    const hC = (e) => setIsCompact(e.matches);
    const hN = (e) => setIsNarrow(e.matches);
    hC(mqC); hN(mqN);
    (mqC.addEventListener ? mqC.addEventListener('change', hC) : mqC.addListener(hC));
    (mqN.addEventListener ? mqN.addEventListener('change', hN) : mqN.addListener(hN));
    return () => {
      (mqC.removeEventListener ? mqC.removeEventListener('change', hC) : mqC.removeListener(hC));
      (mqN.removeEventListener ? mqN.removeEventListener('change', hN) : mqN.removeListener(hN));
    };
  }, []);

  // Volets fermés par défaut quand ils sont superposés
  useEffect(() => {
    setLeftCollapsed(isCompact);
  }, [isCompact]);
  useEffect(() => {
    setRightCollapsed(isNarrow);
  }, [isNarrow]);


  // Ferme la vidéo active si on change de morceau
  useEffect(() => {
    setActiveLink(null);
    setVideoMenuOpen(false);
  }, [song.id]);

  // Quitter le mode Focus avec ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    if (focusMode) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [focusMode]);

  // En mode Focus, forcer le collapse des panneaux
  useEffect(() => {
    if (focusMode) {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    }
  }, [focusMode]);

  const updateVersion = (updates) => {
    const updatedSong = {
      ...song,
      versions: song.versions.map(v => v.id === version.id ? { ...v, ...updates } : v),
    };
    onUpdateSong(updatedSong);
  };

  // Ajoute une ou plusieurs images (captures vidéo, imports...) à la galerie de la version en cours
  const addImagesToVersion = (dataUrls) => {
    if (!dataUrls || !dataUrls.length) return;
    const added = dataUrls.map(src => ({ id: newId(), src, x: 0, y: 0, scale: 1 }));
    updateVersion({ images: [...(version?.images || []), ...added] });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-gray-800 to-gray-750 border-b border-gray-700 p-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (isSessionActive) endSession(); onBack(); }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition flex items-center gap-2 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Biblio
            </button>
            {isSessionActive && (
              <span className="px-2 py-1 bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 rounded text-xs font-semibold whitespace-nowrap">
                🎯 Session {sessionInfo.position}/{sessionInfo.total}
              </span>
            )}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`px-3 py-2 rounded transition flex items-center gap-1 text-sm font-medium ${focusMode ? 'bg-purple-600 pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
              title={focusMode ? 'Quitter le mode Focus (ESC)' : 'Mode Focus : masquer tout pour la concentration'}
            >
              {focusMode ? '🎯 Focus' : '◯ Focus'}
            </button>
            {isCompact && !focusMode && (
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
            <h2 className="text-base font-bold truncate flex items-center justify-center gap-1.5">
              <DifficultyPick difficulty={song.difficulty} size={16} onChange={(d) => onUpdateSong({ ...song, difficulty: d })} />
              <span className="truncate">{song.title}</span>
            </h2>
            <p className="text-xs text-gray-400 truncate">{song.artist}</p>
          </div>

          <div className={`flex items-center gap-2 ${focusMode ? 'bg-transparent border-0 p-0' : 'bg-gray-900 rounded p-2 border border-gray-700'} text-xs`}>
            {!focusMode && (
              <>
                <span>♪ {version.bpm} BPM</span>
                <span className="text-gray-500">•</span>
              </>
            )}
            <CapoPicker capo={version.capo} onChange={(n) => updateVersion({ capo: n })} />
            {!focusMode && (
              <>
                <span className="text-gray-500">•</span>
                <span>{version.key}</span>
              </>
            )}
          </div>

          {validYoutubeLinks.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  if (validYoutubeLinks.length === 1) {
                    setActiveLink(activeLink ? null : validYoutubeLinks[0]);
                  } else {
                    setVideoMenuOpen(!videoMenuOpen);
                  }
                }}
                className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded transition text-sm font-semibold flex items-center gap-1"
                title="Voir la vidéo YouTube"
              >
                ▶️ Vidéo{validYoutubeLinks.length > 1 ? ` (${validYoutubeLinks.length})` : ''}
              </button>
              {videoMenuOpen && validYoutubeLinks.length > 1 && (
                <div className="absolute top-full mt-1 right-0 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-30 min-w-[220px] max-w-[320px] overflow-hidden">
                  {validYoutubeLinks.map((l, i) => (
                    <button
                      key={l.id}
                      onClick={() => { setActiveLink(l); setVideoMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition flex items-center gap-2 border-b border-gray-700 last:border-0"
                      title={l.url}
                    >
                      ▶️ <span className="truncate">{l.url}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 bg-gray-900 rounded p-1 border border-gray-700">
            <span className="text-xs font-mono w-12 text-center">{formatTimer(timerSeconds)}</span>
            {!timerRunning ? (
              <button
                onClick={() => setTimerRunning(true)}
                className="p-1.5 bg-green-700 hover:bg-green-600 rounded transition"
                title={timerSeconds > 0 ? 'Reprendre le chrono' : 'Démarrer une session de pratique'}
              >
                ▶️
              </button>
            ) : (
              <button
                onClick={() => setTimerRunning(false)}
                className="p-1.5 bg-amber-700 hover:bg-amber-600 rounded transition"
                title="Mettre en pause"
              >
                ⏸️
              </button>
            )}
            {timerSeconds > 0 && (
              <button
                onClick={stopAndLogTimer}
                className="p-1.5 bg-red-700 hover:bg-red-600 rounded transition"
                title="Arrêter et enregistrer la session"
              >
                ⏹️
              </button>
            )}
          </div>

          {!focusMode && (
            <>
              <button
                onClick={() => setHistoryOpen(true)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition text-sm font-semibold flex items-center gap-1"
                title="Journal de pratique et progression"
              >
                📊 Journal
              </button>

              <button
                onClick={() => onUpdateSong({ ...song, lastPracticedAt: new Date().toISOString() })}
                className={`px-3 py-2 rounded transition text-sm font-semibold flex items-center gap-1 ${
                  song.lastPracticedAt && new Date(song.lastPracticedAt).toDateString() === new Date().toDateString()
                    ? 'bg-green-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="Marquer comme pratiqué aujourd'hui (pour la révision espacée)"
              >
                ✓ Pratiqué
              </button>

              <button
                onClick={() => setPerformance(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded transition text-sm font-semibold flex items-center gap-1"
                title="Mode prestation : plein écran, photos qui défilent"
              >
                🎤 Prestation
              </button>

              <ClassificationPicker
                song={song}
                options={classificationOptions}
                onAddOption={onAddClassificationOption}
                onRemoveOption={onRemoveClassificationOption}
                onUpdateSong={onUpdateSong}
              />

              {isSessionActive && (
                <button
                  onClick={goToNextInSession}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded transition text-sm font-semibold flex items-center gap-1"
                  title={sessionInfo.position < sessionInfo.total ? 'Enregistrer et passer au morceau suivant' : 'Terminer la session'}
                >
                  {sessionInfo.position < sessionInfo.total ? 'Suivant ▶' : '🏁 Terminer'}
                </button>
              )}
            </>
          )}

          {focusMode && (
            <div className="text-center text-xs text-gray-500 px-2 py-1">
              Appuyez sur <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">ESC</kbd> pour quitter le mode Focus
            </div>
          )}

        </div>
      </div>

      {performance && (
        <PerformanceMode song={song} version={version} onClose={() => setPerformance(false)} />
      )}

      {activeLink && (
        <YoutubeMiniPlayer link={activeLink} onSaveBookmark={saveBookmark} onClose={() => setActiveLink(null)} onAddImages={addImagesToVersion} />
      )}

      {historyOpen && (
        <PracticeHistoryModal
          song={song}
          practiceSessions={practiceSessions}
          weeklyGoalMinutes={weeklyGoalMinutes}
          onUpdateWeeklyGoal={onUpdateWeeklyGoal}
          onClose={() => setHistoryOpen(false)}
        />
      )}


      <div className="flex-1 flex overflow-hidden gap-0.5 bg-gray-900 p-0.5 relative">
        {isCompact && !leftCollapsed && (
          <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setLeftCollapsed(true)} />
        )}
        {isNarrow && !rightCollapsed && (
          <div className="fixed inset-0 bg-black/60 z-30" onClick={() => setRightCollapsed(true)} />
        )}

        <div
          className={
            isCompact
              ? `fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden transition-transform duration-200 shadow-2xl ${leftCollapsed ? '-translate-x-full' : 'translate-x-0'}`
              : `bg-gray-800 border border-gray-700 rounded flex flex-col overflow-hidden flex-shrink-0 ${leftCollapsed ? 'w-0 border-0' : ''}`
          }
          style={!isCompact && !leftCollapsed ? { width: leftPanelWidth } : undefined}
        >
          <LeftPanel version={version} updateVersion={updateVersion} />
        </div>

        {!isCompact && (
          <div className="flex-shrink-0 flex items-stretch">
            {!leftCollapsed && (
              <div
                onMouseDown={startResize('left')}
                onTouchStart={startResize('left')}
                className="relative w-3 cursor-col-resize hover:bg-amber-600/40 active:bg-amber-600/60 transition-colors flex-shrink-0 flex items-center justify-center"
                style={{ touchAction: 'none' }}
                title="Glisser pour ajuster la largeur"
              >
                <span className="flex flex-col gap-1 pointer-events-none">
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                </span>
              </div>
            )}
            <button
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              className="flex-shrink-0 w-4 self-stretch bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition flex items-center justify-center group"
              title={leftCollapsed ? 'Afficher le panneau Structure' : 'Masquer le panneau Structure'}
            >
              {leftCollapsed ? <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-amber-400" /> : <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-amber-400" />}
            </button>
          </div>
        )}

        <div className="flex-1 bg-gray-800 border border-gray-700 rounded flex flex-col overflow-hidden min-w-0">
          <CenterPanel version={version} updateVersion={updateVersion} />
        </div>

        {!isNarrow && (
          <div className="flex-shrink-0 flex items-stretch">
            <button
              onClick={() => setRightCollapsed(!rightCollapsed)}
              className="flex-shrink-0 w-4 self-stretch bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 transition flex items-center justify-center group"
              title={rightCollapsed ? 'Afficher le panneau Notes/Galerie' : 'Masquer le panneau Notes/Galerie'}
            >
              {rightCollapsed ? <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-amber-400" /> : <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-amber-400" />}
            </button>
            {!rightCollapsed && (
              <div
                onMouseDown={startResize('right')}
                onTouchStart={startResize('right')}
                className="relative w-3 cursor-col-resize hover:bg-amber-600/40 active:bg-amber-600/60 transition-colors flex-shrink-0 flex items-center justify-center"
                style={{ touchAction: 'none' }}
                title="Glisser pour ajuster la largeur"
              >
                <span className="flex flex-col gap-1 pointer-events-none">
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                  <span className="w-1 h-1 rounded-full bg-gray-400" />
                </span>
              </div>
            )}
          </div>
        )}

        <div
          className={
            isNarrow
              ? `fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden transition-transform duration-200 shadow-2xl ${rightCollapsed ? 'translate-x-full' : 'translate-x-0'}`
              : `bg-gray-800 border border-gray-700 rounded flex flex-col overflow-hidden flex-shrink-0 ${rightCollapsed ? 'w-0 border-0' : ''}`
          }
          style={!isNarrow && !rightCollapsed ? { width: rightPanelWidth } : undefined}
        >
          <RightPanel
            song={song}
            version={version}
            updateVersion={updateVersion}
            onUpdateSong={onUpdateSong}
            onPlayVideo={(link) => setActiveLink(link)}
          />
        </div>
      </div>
    </div>
  );
}

// ============= Mode prestation : plein écran, uniquement les photos qui défilent =============
// Journal de pratique : historique des sessions, objectif hebdo, petit graphe de progression
function PracticeHistoryModal({ song, practiceSessions, weeklyGoalMinutes, onUpdateWeeklyGoal, onClose }) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const songSessions = practiceSessions
    .filter(s => s.songId === song.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const songTotalSec = songSessions.reduce((sum, s) => sum + s.durationSec, 0);

  // Total de la semaine en cours (toutes chansons), et minutes par jour sur les 7 derniers jours
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * DAY);
    return { date: d, key: d.toDateString(), label: d.toLocaleDateString('fr-FR', { weekday: 'short' }) };
  });
  const minutesByDay = last7Days.map(day => {
    const totalSec = practiceSessions
      .filter(s => new Date(s.date).toDateString() === day.key)
      .reduce((sum, s) => sum + s.durationSec, 0);
    return { ...day, minutes: Math.round(totalSec / 60) };
  });
  const weekTotalMinutes = minutesByDay.reduce((sum, d) => sum + d.minutes, 0);
  const maxMinutes = Math.max(...minutesByDay.map(d => d.minutes), 1);
  const goalPct = Math.min(100, Math.round((weekTotalMinutes / Math.max(1, weeklyGoalMinutes)) * 100));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-md w-full max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-amber-400 text-sm">📊 Journal de pratique</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Objectif hebdomadaire</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={2000}
                value={weeklyGoalMinutes}
                onChange={(e) => onUpdateWeeklyGoal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-right focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-gray-400">min</span>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{weekTotalMinutes} / {weeklyGoalMinutes} min cette semaine (toutes chansons)</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Minutes par jour (7 derniers jours)</p>
          <div className="flex items-end gap-1.5 h-20">
            {minutesByDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full bg-amber-600 rounded-t"
                  style={{ height: `${Math.max(2, (d.minutes / maxMinutes) * 100)}%` }}
                  title={`${d.minutes} min`}
                />
                <span className="text-[9px] text-gray-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">
            « {song.title} » — {Math.round(songTotalSec / 60)} min au total, {songSessions.length} session{songSessions.length > 1 ? 's' : ''}
          </p>
          {songSessions.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Aucune session chronométrée pour ce morceau pour l'instant.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {songSessions.slice(0, 20).map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-gray-700/50 rounded px-2 py-1">
                  <span className="text-gray-300">{new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-mono text-amber-400">{Math.floor(s.durationSec / 60)}:{(s.durationSec % 60).toString().padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function PerformanceMode({ song, version, onClose }) {
  const images = version?.images || [];
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [speed, setSpeed] = useState(20); // pixels / seconde
  const [zoom, setZoom] = useState(100);  // largeur des photos en %

  // Défilement automatique fluide
  useEffect(() => {
    if (!autoScroll) return;
    let raf, last = performance.now();
    const step = (now) => {
      const el = scrollRef.current;
      const dt = (now - last) / 1000;
      last = now;
      if (el) {
        el.scrollTop += speed * dt;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setAutoScroll(false);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [autoScroll, speed]);

  // Garder l'écran allumé si le navigateur le permet
  useEffect(() => {
    let lock = null;
    if (navigator.wakeLock?.request) {
      navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {});
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      try { lock?.release(); } catch (_) {}
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-black/80 border-b border-gray-800 text-xs">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate text-amber-400">{song.title}</div>
          <div className="text-gray-400 truncate">{song.artist} • {version.bpm} BPM • Capo {version.capo} • {version.key}</div>
        </div>
        <button
          onClick={() => setAutoScroll(a => !a)}
          className={`px-3 py-2 rounded font-semibold ${autoScroll ? 'bg-amber-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          title="Défilement automatique"
        >
          {autoScroll ? '⏸' : '▶'}
        </button>
        <input
          type="range" min="5" max="120" step="5" value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-24 accent-amber-500" title="Vitesse de défilement"
        />
        <div className="flex items-center gap-1">
          {[60, 80, 100].map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2 py-1 rounded ${zoom === z ? 'bg-amber-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              title="Taille des photos"
            >
              {z}%
            </button>
          ))}
        </div>
        <button onClick={onClose} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded font-semibold" title="Quitter (Échap)">
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {images.length > 0 ? (
          <div className="flex flex-col items-center gap-4 py-4">
            {images.map((img) => (
              <img
                key={img.id}
                src={img.src}
                alt=""
                style={{ width: `${zoom}%` }}
                className="rounded bg-white"
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Aucune photo dans cette version
          </div>
        )}
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

  const duplicateSection = () => {
    const stamp = Date.now().toString();
    const copy = {
      ...section,
      id: stamp,
      rhythm: (section.rhythm || []).map((r, i) => ({ ...r, id: `${stamp}-r${i}` })),
      cells: (section.cells || []).map((c, i) => ({ ...c, id: `${stamp}-c${i}` })),
    };
    const next = [...version.structure];
    next.splice(index + 1, 0, copy);
    updateVersion({ structure: next });
  };

  const moveSection = (dir) => {
    const target = index + dir;
    if (target < 0 || target >= version.structure.length) return;
    const next = [...version.structure];
    [next[index], next[target]] = [next[target], next[index]];
    updateVersion({ structure: next });
  };

  const removeSection = () => {
    updateVersion({ structure: version.structure.filter(s => s.id !== section.id) });
  };

  const style = getSectionStyle(section.section);
  const collapsed = !!section.collapsed;
  const rowCount = section.rows || Math.max(1, Math.round(section.cells.length / (section.cols || 1)));

  return (
    <div className={`rounded border-l-4 ${style.border} ${style.tint} border border-gray-600 text-xs overflow-hidden`}>
      <div className="flex items-center gap-1 flex-wrap px-2 py-0.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
        <button
          onClick={toggleCollapsed}
          className="flex-shrink-0 text-gray-400 hover:text-amber-400 transition"
          title={collapsed ? 'Déplier la section' : 'Replier la section'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <select
          value={section.section}
          onChange={(e) => updateSection({ section: e.target.value })}
          className={`w-[4.75rem] bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-[11px] font-semibold focus:outline-none focus:border-amber-500 ${style.text}`}
        >
          {SECTION_NAME_SUGGESTIONS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <div className="flex items-center gap-0.5">
          <span className="text-gray-400 text-[9px] font-semibold">L</span>
          <button
            onClick={() => {
              const rows = Math.max(1, rowCount - 1);
              resizeGrid(section.cols || 4, rows);
            }}
            className="w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold transition flex items-center justify-center"
            title="Réduire les lignes"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={rowCount}
            onChange={(e) => {
              const rows = parseInt(e.target.value, 10) || 1;
              resizeGrid(section.cols || 4, rows);
            }}
            onDoubleClick={(e) => e.target.select()}
            className="w-6 bg-gray-800 border border-gray-600 rounded px-0.5 py-0.5 text-center text-[10px] focus:outline-none focus:border-amber-500 cursor-pointer"
            title="Double-cliquer pour éditer, ou utiliser les boutons +/−"
          />
          <button
            onClick={() => {
              const rows = rowCount + 1;
              resizeGrid(section.cols || 4, rows);
            }}
            className="w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold transition flex items-center justify-center"
            title="Augmenter les lignes"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-gray-400 text-[9px] font-semibold">C</span>
          <input
            type="number"
            min={1}
            value={section.cols || 4}
            onChange={(e) => {
              const cols = parseInt(e.target.value, 10) || 1;
              resizeGrid(cols, rowCount);
            }}
            className="w-6 bg-gray-800 border border-gray-600 rounded px-0.5 py-0.5 text-center text-[10px] focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-gray-400 text-[9px] font-semibold">×</span>
          <button
            onClick={() => updateSection({ repeat: Math.max(1, (section.repeat || 1) - 1) })}
            className="w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold transition flex items-center justify-center"
            title="Réduire les répétitions"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={section.repeat || 1}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              updateSection({ repeat: Math.max(1, val) });
            }}
            onDoubleClick={(e) => e.target.select()}
            className="w-6 bg-gray-800 border border-gray-600 rounded px-0.5 py-0.5 text-center text-[10px] font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            title="Double-cliquer pour éditer, ou utiliser les boutons +/−"
          />
          <button
            onClick={() => updateSection({ repeat: (section.repeat || 1) + 1 })}
            className="w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold transition flex items-center justify-center"
            title="Augmenter les répétitions"
          >
            +
          </button>
        </div>
        {collapsed && (
          <span className="flex-shrink-0 text-gray-400 text-[10px] whitespace-nowrap">
            {section.cols}×{rowCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => moveSection(-1)} disabled={index === 0} title="Déplacer le bloc vers le haut"
            className="w-4 h-4 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-[9px] leading-none flex items-center justify-center">↑</button>
          <button onClick={() => moveSection(1)} disabled={index === version.structure.length - 1} title="Déplacer le bloc vers le bas"
            className="w-4 h-4 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-[9px] leading-none flex items-center justify-center">↓</button>
          <button onClick={duplicateSection} title="Dupliquer le bloc"
            className="w-4 h-4 rounded bg-gray-700 hover:bg-amber-600 text-[9px] leading-none flex items-center justify-center">⧉</button>
          <button onClick={removeSection} title="Supprimer le bloc"
            className="w-4 h-4 rounded bg-gray-700 hover:bg-red-600 text-[9px] leading-none flex items-center justify-center">×</button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-2 pb-1.5">
          {/* Barre de rythme sans libellé */}
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <button onClick={() => addRhythm('down')} title="Ajouter coup vers le bas" className="w-6 h-5 bg-blue-700 hover:bg-blue-600 rounded flex items-center justify-center"><ArrowDown className="w-3 h-3" /></button>
            <button onClick={() => addRhythm('up')} title="Ajouter coup vers le haut" className="w-6 h-5 bg-green-700 hover:bg-green-600 rounded flex items-center justify-center"><ArrowUp className="w-3 h-3" /></button>
            <button onClick={() => addRhythm('mute')} title="Ajouter mute" className="w-6 h-5 bg-gray-600 hover:bg-gray-500 rounded flex items-center justify-center"><X className="w-3 h-3" /></button>
          </div>

          {section.rhythm.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-1">
              {section.rhythm.map(r => (
                <div key={r.id} className={`px-1 h-5 rounded text-white font-semibold flex items-center gap-1 ${r.type === 'down' ? 'bg-blue-600' : r.type === 'up' ? 'bg-green-600' : 'bg-gray-600'}`}>
                  {r.type === 'down' ? <ArrowDown className="w-3 h-3" /> : r.type === 'up' ? <ArrowUp className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <button onClick={() => removeRhythm(r.id)} className="hover:opacity-50 leading-none text-[10px]">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="flex gap-2">
              {/* Colonne des numéros de ligne */}
              <div className="flex flex-col gap-0.5 justify-start pt-0.5">
                {Array.from({ length: Math.ceil(section.cells.length / section.cols) }).map((_, rowIdx) => (
                  <div key={`row-${rowIdx}`} className="h-10 flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newRepeats = [...(section.rowRepeats || Array(Math.ceil(section.cells.length / section.cols)).fill(1))];
                        newRepeats[rowIdx] = Math.max(1, (newRepeats[rowIdx] || 1) - 1);
                        updateSection({ rowRepeats: newRepeats });
                      }}
                      className="w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold transition flex items-center justify-center"
                      title="Réduire les répétitions"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={section.rowRepeats?.[rowIdx] || 1}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        const newRepeats = [...(section.rowRepeats || Array(Math.ceil(section.cells.length / section.cols)).fill(1))];
                        newRepeats[rowIdx] = val;
                        updateSection({ rowRepeats: newRepeats });
                      }}
                      onDoubleClick={(e) => e.target.select()}
                      className="w-6 text-center bg-gray-800 border border-gray-600 rounded px-0.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                      title={`Répétitions ligne ${rowIdx + 1}`}
                    />
                    <button
                      onClick={() => {
                        const newRepeats = [...(section.rowRepeats || Array(Math.ceil(section.cells.length / section.cols)).fill(1))];
                        newRepeats[rowIdx] = (newRepeats[rowIdx] || 1) + 1;
                        updateSection({ rowRepeats: newRepeats });
                      }}
                      className="w-5 h-5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] font-bold transition flex items-center justify-center"
                      title="Augmenter les répétitions"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Grille d'accords */}
              <div className="grid w-max gap-0.5" style={{ gridTemplateColumns: `repeat(${section.cols}, 2.5rem)` }}>
                {section.cells.map(cell => (
                  <ChordCell key={cell.id} cell={cell} onUpdate={(c) => updateCell(cell.id, c)} onToggleSplit={() => toggleSplit(cell.id)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Réduit la police quand le texte dépasse la largeur de la case
function fitFontSize(text, base, min, perChar, maxChars) {
  const len = (text || '').length;
  if (len <= maxChars) return base;
  return Math.max(min, base - (len - maxChars) * perChar);
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
          <input value={cell.top} onChange={(e) => onUpdate({ top: e.target.value })} style={{ fontSize: `${fitFontSize(cell.top, 9, 5.5, 1.2, 3)}px` }} className="absolute top-0.5 right-0.5 w-4.5 bg-transparent text-right text-yellow-300 font-bold leading-none focus:outline-none" />
          <input value={cell.bottom} onChange={(e) => onUpdate({ bottom: e.target.value })} style={{ fontSize: `${fitFontSize(cell.bottom, 9, 5.5, 1.2, 3)}px` }} className="absolute bottom-0.5 left-0.5 w-4.5 bg-transparent text-left text-yellow-300 font-bold leading-none focus:outline-none" />
        </>
      ) : (
        <input value={cell.chord} onChange={(e) => onUpdate({ chord: e.target.value })} style={{ fontSize: `${fitFontSize(cell.chord, 14, 7, 1.6, 3)}px` }} className="absolute inset-0 w-full h-full bg-transparent text-center text-yellow-300 font-bold leading-none focus:outline-none" />
      )}
    </div>
  );
}

const METRONOME_PREFS_KEY = 'guitar-lab:metronome-prefs';
const TIME_SIGNATURES = [
  { label: '4/4', beats: 4 },
  { label: '3/4', beats: 3 },
  { label: '2/4', beats: 2 },
  { label: '6/8', beats: 2, defaultSubdivision: 3 },
];

// Métronome enrichi : accent sur le 1, mesures, subdivisions, tap-tempo, pré-compte visuel
function Metronome({ bpm, onBpmChange }) {
  const [isActive, setIsActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeSigIndex, setTimeSigIndex] = useState(0);
  const [subdivision, setSubdivision] = useState(1);
  const [accentFirstBeat, setAccentFirstBeat] = useState(true);
  const [preCountEnabled, setPreCountEnabled] = useState(true);
  const [uiBeat, setUiBeat] = useState({ beat: 0, isFirst: false, isMainBeat: false });
  const [showCountIn, setShowCountIn] = useState(false);

  const audioCtxRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const stepRef = useRef(0);
  const stepsSinceStartRef = useRef(0);
  const timerRef = useRef(null);
  const tapTimesRef = useRef([]);

  const timeSig = TIME_SIGNATURES[timeSigIndex];
  const beatsPerMeasure = timeSig.beats;

  // Chargement / sauvegarde des préférences (mesure, subdivision, accent, pré-compte)
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(METRONOME_PREFS_KEY, false);
        if (result?.value) {
          const p = JSON.parse(result.value);
          if (typeof p.timeSigIndex === 'number') setTimeSigIndex(p.timeSigIndex);
          if (typeof p.subdivision === 'number') setSubdivision(p.subdivision);
          if (typeof p.accentFirstBeat === 'boolean') setAccentFirstBeat(p.accentFirstBeat);
          if (typeof p.preCountEnabled === 'boolean') setPreCountEnabled(p.preCountEnabled);
        }
      } catch (err) { /* préférences par défaut */ }
    })();
  }, []);
  useEffect(() => {
    window.storage.set(METRONOME_PREFS_KEY, JSON.stringify({ timeSigIndex, subdivision, accentFirstBeat, preCountEnabled }), false).catch(() => {});
  }, [timeSigIndex, subdivision, accentFirstBeat, preCountEnabled]);

  const scheduleClick = (time, isAccent, isSub) => {
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = isAccent ? 1300 : (isSub ? 650 : 950);
    const vol = isAccent ? 0.22 : (isSub ? 0.05 : 0.13);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.07);
  };

  useEffect(() => {
    if (!isActive) {
      setShowCountIn(false);
      return;
    }
    audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    stepRef.current = 0;
    stepsSinceStartRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    setShowCountIn(preCountEnabled);

    const totalSteps = beatsPerMeasure * subdivision;
    const secPerStep = 60 / bpm / subdivision;
    const SCHEDULE_AHEAD = 0.12;

    timerRef.current = setInterval(() => {
      while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
        const step = stepRef.current;
        const beatIdx = Math.floor(step / subdivision);
        const subIdx = step % subdivision;
        const isMainBeat = subIdx === 0;
        const isFirst = beatIdx === 0 && isMainBeat;
        const isAccent = isFirst && accentFirstBeat;
        scheduleClick(nextNoteTimeRef.current, isAccent, !isMainBeat);

        const delayMs = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000);
        const stepsElapsed = stepsSinceStartRef.current;
        setTimeout(() => {
          setUiBeat({ beat: beatIdx + 1, isFirst, isMainBeat });
          if (stepsElapsed >= totalSteps - 1) setShowCountIn(false);
        }, delayMs);

        nextNoteTimeRef.current += secPerStep;
        stepRef.current = (step + 1) % totalSteps;
        stepsSinceStartRef.current += 1;
      }
    }, 25);

    return () => clearInterval(timerRef.current);
  }, [isActive, bpm, beatsPerMeasure, subdivision, accentFirstBeat]);

  const handleTap = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter(t => now - t < 2000);
    taps.push(now);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals = taps.slice(1).map((t, i) => t - taps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(Math.min(240, Math.max(20, 60000 / avg)));
      onBpmChange(newBpm);
    }
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={() => setIsActive(!isActive)}
        className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${isActive ? 'bg-red-600' : 'bg-gray-700'}`}
      >
        {isActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
      </button>

      <input
        type="number"
        value={bpm}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onBpmChange(Number.isNaN(val) ? 0 : val);
        }}
        onBlur={(e) => onBpmChange(Math.min(240, Math.max(20, parseInt(e.target.value, 10) || 20)))}
        min="20" max="240" className="w-12 px-1 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-center focus:outline-none text-amber-400 font-bold"
      />
      <span className="text-xs text-gray-400">BPM</span>

      <button
        onClick={handleTap}
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold"
        title="Tapote au tempo souhaité (2 fois ou plus)"
      >
        TAP
      </button>

      {isActive && (
        <span className="flex items-center gap-0.5 ml-0.5">
          {Array.from({ length: beatsPerMeasure }, (_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                uiBeat.beat === i + 1 ? (i === 0 ? 'bg-amber-400' : 'bg-amber-600') : 'bg-gray-600'
              }`}
            />
          ))}
        </span>
      )}

      <button
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="p-1 hover:bg-gray-700 rounded transition"
        title="Réglages du métronome"
      >
        ⚙️
      </button>

      {settingsOpen && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-56 space-y-3">
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Mesure</label>
            <div className="flex gap-1">
              {TIME_SIGNATURES.map((ts, i) => (
                <button
                  key={ts.label}
                  onClick={() => {
                    setTimeSigIndex(i);
                    if (ts.defaultSubdivision) setSubdivision(ts.defaultSubdivision);
                  }}
                  className={`flex-1 px-2 py-1 rounded text-xs font-semibold ${timeSigIndex === i ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                  {ts.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Subdivision</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setSubdivision(n)}
                  className={`flex-1 px-2 py-1 rounded text-xs font-semibold ${subdivision === n ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={n === 1 ? 'Noires' : n === 2 ? 'Croches' : n === 3 ? 'Triolets' : 'Doubles-croches'}
                >
                  ×{n}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={accentFirstBeat} onChange={(e) => setAccentFirstBeat(e.target.checked)} className="accent-amber-500" />
            Accent sur le temps 1
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={preCountEnabled} onChange={(e) => setPreCountEnabled(e.target.checked)} className="accent-amber-500" />
            Pré-compte visuel au démarrage
          </label>
        </div>
      )}

      {showCountIn && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center pointer-events-none">
          <span className={`font-bold ${uiBeat.isFirst ? 'text-amber-400 text-9xl' : 'text-white text-8xl'}`}>
            {uiBeat.beat || beatsPerMeasure}
          </span>
        </div>
      )}
      <DebugPanel />
    </div>
  );
}

function CenterPanel({ version, updateVersion }) {
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [bpm, setBpm] = useState(version.bpm || 120);
  const galleryRef = useRef(null);
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

  // Bouton "Coller" explicite : lit directement le presse-papiers (plus fiable que l'événement paste sur iPad)
  const [pasteStatus, setPasteStatus] = useState(null); // null | 'empty' | 'error'
  const pasteFromClipboardButton = async () => {
    setPasteStatus(null);
    try {
      if (!navigator.clipboard?.read) {
        setPasteStatus('error');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      for (const item of clipboardItems) {
        const imgType = item.types.find(t => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          files.push(new File([blob], `collé.${imgType.split('/')[1] || 'png'}`, { type: imgType }));
        }
      }
      if (!files.length) {
        setPasteStatus('empty');
        return;
      }
      const dataUrls = await readFilesAsDataUrls(files);
      addImages(dataUrls);
    } catch (err) {
      setPasteStatus('error');
    }
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
        <label className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold cursor-pointer flex items-center gap-1" title="Importer plusieurs photos à la fois (bibliothèque photo, fichiers ou appareil photo)">
          📁 Importer
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
        </label>

        <button
          onClick={pasteFromClipboardButton}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs font-semibold flex items-center gap-1"
          title="Coller une image copiée (Photos, capture d'écran…)"
        >
          📋 Coller
        </button>

        {pasteStatus === 'empty' && (
          <span className="text-[10px] text-gray-400">Aucune image dans le presse-papiers</span>
        )}
        {pasteStatus === 'error' && (
          <span className="text-[10px] text-red-400">Collage indisponible ici — utilise Ctrl+V / le geste coller, ou « Importer »</span>
        )}

        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-400">Taille:</span>
          {[['sm', 'S'], ['md', 'M'], ['full', '100%']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setImgHeight(key)}
              className={`px-1.5 py-1 rounded font-semibold ${imgHeight === key ? 'bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Hauteur des photos empilées"
            >
              {label}
            </button>
          ))}
        </div>

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

        <Metronome bpm={bpm} onBpmChange={(v) => { setBpm(v); updateVersion({ bpm: v }); }} />
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
  const [currentSize, setCurrentSize] = useState(null); // Taille actuelle en octets
  const [showCompressionMenu, setShowCompressionMenu] = useState(false);

  const updateSize = (dataUrl) => {
    const sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    setCurrentSize(sizeBytes);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
  };

  const compressImage = (quality) => {
    // quality: 0.3 à 0.9 (30% à 90%)
    if (!canvasRef.current) return;
    const jpegDataUrl = canvasRef.current.toDataURL('image/jpeg', quality);
    updateSize(jpegDataUrl);
    // Remplace le contenu du canvas avec l'image JPEG comprimée pour la prévisualisation
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = jpegDataUrl;
  };

  const compressionLevels = [
    { label: '🐢 Très comprimée (30%)', quality: 0.3, hint: 'Pour économiser au max' },
    { label: '⭐ Économe (50%)', quality: 0.5, hint: 'Bon compromis' },
    { label: '✓ Normale (70%)', quality: 0.7, hint: 'Défaut recommandé' },
    { label: '📷 Haute (85%)', quality: 0.85, hint: 'Meilleure qualité' },
  ];

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
      // Calculer la taille initiale (PNG par défaut)
      const pngUrl = canvasRef.current.toDataURL('image/png');
      updateSize(pngUrl);
      setReady(true);
    };
    img.src = src;
  }, [src]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const point = (e.touches && e.touches[0]) ? e.touches[0] : ((e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e);
    return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
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
    e.preventDefault?.();
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
      e.preventDefault?.();
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
      e.preventDefault?.();
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

  const handlePointerUp = (e) => {
    e.preventDefault?.();
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

  const supportsPointer = typeof window !== 'undefined' && !!window.PointerEvent;

  const canvasEventProps = supportsPointer
    ? {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerLeave: handlePointerUp,
      }
    : {
        onMouseDown: handlePointerDown,
        onMouseMove: handlePointerMove,
        onMouseUp: handlePointerUp,
        onMouseLeave: handlePointerUp,
        onTouchStart: handlePointerDown,
        onTouchMove: handlePointerMove,
        onTouchEnd: handlePointerUp,
        onTouchCancel: handlePointerUp,
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
          <div className="relative">
            <button onClick={() => setShowCompressionMenu(!showCompressionMenu)} className="px-2 py-1 rounded font-semibold bg-purple-700 hover:bg-purple-600" title="Compresser l'image">📦 {currentSize ? formatSize(currentSize) : '?'}</button>
            {showCompressionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCompressionMenu(false)} />
                <div className="absolute top-full left-0 z-50 bg-gray-800 border border-gray-600 rounded mt-1 shadow-lg p-2 flex flex-col gap-1 min-w-[200px]">
                  {compressionLevels.map((level, i) => (
                    <button key={i} onClick={() => { compressImage(level.quality); setShowCompressionMenu(false); }} className="text-left px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition">
                      <div className="font-semibold">{level.label}</div>
                      <div className="text-[10px] text-gray-400">{level.hint}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={resetImage} className="px-2 py-1 rounded font-semibold bg-gray-700 hover:bg-gray-600 ml-auto">↺ Recommencer</button>
        </div>

        <div ref={containerRef} className="relative bg-black/30 rounded overflow-hidden self-center flex items-center justify-center" style={{ touchAction: 'none', minWidth: 120, minHeight: 120 }}>
          {!ready && <span className="text-gray-500 text-xs p-8">Chargement de l'image...</span>}
          <canvas
            ref={canvasRef}
            className="block"
            style={{ display: ready ? 'block' : 'none', cursor: mode === 'crop' ? 'crosshair' : mode === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
            {...canvasEventProps}
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
          <button onClick={() => onSave(canvasRef.current.toDataURL('image/jpeg', 0.7))} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-xs font-semibold">💾 Enregistrer (JPEG 70%)</button>
        </div>
      </div>
    </div>
  );
}

function ChordThumbnailsPanel({ version, updateVersion }) {
  const thumbnails = version.chordThumbnails || [];
  const canAddMore = thumbnails.length < 5;
  const [editingId, setEditingId] = useState(null);

  const addThumbnails = (dataUrls) => {
    const current = version.chordThumbnails || [];
    const room = 5 - current.length;
    if (room <= 0 || !dataUrls.length) return;
    const added = dataUrls.slice(0, room).map(src => ({ id: newId(), src }));
    updateVersion({ chordThumbnails: [...current, ...added] });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    readFilesAsDataUrls(files).then(addThumbnails);
  };

  const handlePaste = (e) => {
    if (!canAddMore) return;
    const files = Array.from(e.clipboardData?.items || [])
      .filter(i => i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    readFilesAsDataUrls(files).then(addThumbnails);
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
          <div key={t.id} className="relative h-32 bg-gray-900 rounded border border-gray-600 overflow-hidden group flex-shrink-0 flex items-center justify-center" style={{ minWidth: 80, maxWidth: 220 }}>
            <img src={t.src} alt="Accord" className="max-w-full max-h-full object-contain" />
            <button
              onClick={() => setEditingId(t.id)}
              className="absolute bottom-0 left-0 bg-black/70 hover:bg-amber-600 text-white w-7 h-6 flex items-center justify-center text-xs leading-none rounded-tr"
              title="Éditer cette image"
            >
              ✏️
            </button>
            <button
              onClick={() => removeThumbnail(t.id)}
              className="absolute top-0 right-0 bg-black/70 hover:bg-red-600 text-white w-6 h-6 flex items-center justify-center text-sm leading-none rounded-bl"
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
            className="w-32 h-32 rounded border border-dashed border-gray-500 hover:border-amber-500 flex-shrink-0 flex flex-col items-center justify-center text-gray-400 hover:text-amber-400 cursor-pointer text-xs text-center leading-tight transition"
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

// ============================================================================
// MODULE BACKING TRACK
// ============================================================================

// ---------- Partie A : parsing d'accords (Am, F, C7, Gmaj7, Dsus4...) ----------
const CHORD_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

// Convertit un symbole d'accord texte en { root, intervals, isMinor }
// root = index 0-11 (C=0), intervals = liste de demi-tons depuis la fondamentale
function parseChordSymbol(symbol) {
  if (!symbol) return null;
  const clean = symbol.trim().split('/')[0]; // ignore la basse alternative type "C/E" pour l'instant
  const m = clean.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return null;
  let root = m[1].toUpperCase() + (m[2] || '');
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  const rootIdx = CHORD_NOTE_NAMES.indexOf(root);
  if (rootIdx === -1) return null;

  const rest = (m[3] || '').toLowerCase();
  let intervals = [0, 4, 7]; // majeur par défaut
  let isMinor = false;

  if (rest.includes('dim')) intervals = [0, 3, 6];
  else if (rest.includes('aug')) intervals = [0, 4, 8];
  else if (rest.includes('maj7')) intervals = [0, 4, 7, 11];
  else if (rest.includes('m7') || rest.includes('min7')) { intervals = [0, 3, 7, 10]; isMinor = true; }
  else if (rest.includes('sus4')) intervals = [0, 5, 7];
  else if (rest.includes('sus2')) intervals = [0, 2, 7];
  else if (rest.includes('7')) intervals = [0, 4, 7, 10];
  else if (rest.startsWith('m') && !rest.startsWith('maj')) { intervals = [0, 3, 7]; isMinor = true; }

  return { root: rootIdx, intervals, isMinor, label: symbol.trim() };
}

// Aplati la structure du morceau (sections + cellules) en une liste d'accords,
// un accord = une mesure. Respecte les répétitions de section (`section.repeat`).
function flattenChordProgression(structure) {
  const out = [];
  (structure || []).forEach((section) => {
    const repeat = section.repeat || 1;
    for (let r = 0; r < repeat; r++) {
      (section.cells || []).forEach((cell) => {
        const symbol = cell.split ? (cell.top || cell.bottom) : cell.chord;
        if (symbol && symbol.trim()) out.push(symbol.trim());
      });
    }
  });
  return out;
}

// ---------- Partie B : moteur audio (Tone.js) ----------
const BACKING_STYLES = [
  { id: 'pop', label: '🎵 Pop / Variété', hatDensity: 2, useKick: true },
  { id: 'ballad', label: '🎹 Ballade', hatDensity: 0, useKick: false },
  { id: 'rock', label: '🎸 Rock', hatDensity: 4, useKick: true },
  { id: 'blues', label: '🎷 Blues shuffle', hatDensity: 2, useKick: true },
];

function BackingTrackGenerator({ version, bpm }) {
  const [playing, setPlaying] = useState(false);
  const [style, setStyle] = useState('pop');
  const [volume, setVolume] = useState(-10);
  const [currentBar, setCurrentBar] = useState(-1);
  const [ready, setReady] = useState(false);
  const [audioError, setAudioError] = useState(null);

  const synthsRef = useRef(null);
  const loopRef = useRef(null);
  const barIndexRef = useRef(0);
  const styleRef = useRef(style);
  useEffect(() => { styleRef.current = style; }, [style]);

  const chords = useMemo(
    () => flattenChordProgression(version.structure).map(parseChordSymbol).filter(Boolean),
    [version.structure]
  );

  // Initialise les synthés une seule fois (si Tone.js a bien pu se charger)
  useEffect(() => {
    if (typeof Tone === 'undefined') {
      setAudioError("Moteur audio indisponible (Tone.js n'a pas pu se charger — vérifie ta connexion).");
      return;
    }
    synthsRef.current = {
      pad: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.9 },
      }).toDestination(),
      bass: new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
      }).toDestination(),
      kick: new Tone.MembraneSynth({ octaves: 4, pitchDecay: 0.02 }).toDestination(),
      hat: new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.04, sustain: 0 } }).toDestination(),
    };
    setReady(true);
    return () => {
      Object.values(synthsRef.current || {}).forEach((s) => s.dispose());
      if (loopRef.current) loopRef.current.dispose();
    };
  }, []);

  // Volume global (dB)
  useEffect(() => {
    if (!ready) return;
    Object.values(synthsRef.current).forEach((s) => { if (s.volume) s.volume.value = volume; });
  }, [volume, ready]);

  // Tempo synchronisé sur le BPM de la version
  useEffect(() => {
    if (!ready) return;
    Tone.Transport.bpm.value = bpm || 120;
  }, [bpm, ready]);

  const stop = () => {
    if (typeof Tone === 'undefined') return;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (loopRef.current) { loopRef.current.dispose(); loopRef.current = null; }
    setPlaying(false);
    setCurrentBar(-1);
  };

  // Coupe tout si on change de version ou si le composant se démonte
  useEffect(() => () => stop(), [version.id]);

  const start = async () => {
    if (!chords.length || !ready) return;
    await Tone.start(); // débloque l'audio (obligatoire suite à un geste utilisateur)
    barIndexRef.current = 0;
    let beatInBar = 0;
    const s = synthsRef.current;

    loopRef.current = new Tone.Loop((time) => {
      const chord = chords[barIndexRef.current % chords.length];
      const cfg = BACKING_STYLES.find((b) => b.id === styleRef.current) || BACKING_STYLES[0];
      const root = CHORD_NOTE_NAMES[chord.root];
      const fifthIdx = (chord.root + (chord.intervals[2] || 7)) % 12;
      const fifth = CHORD_NOTE_NAMES[fifthIdx];

      if (beatInBar === 0) {
        setCurrentBar(barIndexRef.current % chords.length);
        const padNotes = chord.intervals.map((iv) => `${CHORD_NOTE_NAMES[(chord.root + iv) % 12]}3`);
        s.pad.triggerAttackRelease(padNotes, '2n', time);
        s.bass.triggerAttackRelease(`${root}2`, '4n', time);
        if (cfg.useKick) s.kick.triggerAttackRelease('C1', '8n', time);
      } else if (beatInBar === 2) {
        s.bass.triggerAttackRelease(`${fifth}2`, '4n', time);
        if (cfg.useKick) s.kick.triggerAttackRelease('C1', '8n', time);
      }
      // Charleston : densité variable selon le style (0 = ballade silencieuse, 4 = rock appuyé)
      if (cfg.hatDensity >= 2 && (beatInBar === 1 || beatInBar === 3)) {
        s.hat.triggerAttackRelease('16n', time);
      }
      if (cfg.hatDensity >= 4) {
        s.hat.triggerAttackRelease('16n', time + Tone.Time('8n').toSeconds() / 2);
      }

      beatInBar++;
      if (beatInBar >= 4) { beatInBar = 0; barIndexRef.current++; }
    }, '4n').start(0);

    Tone.Transport.start();
    setPlaying(true);
  };

  const toggle = () => (playing ? stop() : start());

  if (audioError) {
    return <p className="text-xs text-red-400">{audioError}</p>;
  }

  return (
    <div className="space-y-2">
      {chords.length === 0 ? (
        <p className="text-xs text-gray-500 italic">
          Ajoute des accords dans la grille (panneau Structure) pour générer un accompagnement.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggle}
              disabled={!ready}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-50 ${
                playing ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {playing ? '⏹ Stop' : '▶ Jouer'}
            </button>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
            >
              {BACKING_STYLES.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 text-xs">
              <VolumeX className="w-3 h-3 text-gray-500" />
              <input
                type="range" min="-30" max="0" step="1" value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 accent-amber-500"
              />
              <Volume2 className="w-3 h-3 text-gray-500" />
            </div>
          </div>

          {/* Grille des accords, avec surbrillance de la mesure jouée */}
          <div className="flex flex-wrap gap-1">
            {chords.map((c, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  currentBar === i
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Partie C : recherche + lecture d'un backing track YouTube ----------
function BackingTrackYoutube({ song, onUpdateSong, onPlayVideo }) {
  const url = song.backingTrackUrl || '';
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
          onChange={(e) => onUpdateSong({ ...song, backingTrackUrl: e.target.value })}
          className="flex-1 min-w-0 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
        />
        {videoId && (
          <button
            onClick={() => onPlayVideo?.({ id: 'backing-track', url, videoId, bookmarks: [] })}
            className="flex-shrink-0 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs transition"
            title="Lire le backing track"
          >
            ▶️
          </button>
        )}
      </div>
      <a
        href={searchUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs transition"
        title="Ouvre une recherche YouTube pré-remplie pour ce morceau"
      >
        <Search className="w-3 h-3" /> Chercher sur YouTube
      </a>
      <p className="text-[10px] text-gray-500">
        Trouve une vidéo, copie son URL, colle-la ci-dessus. Elle se relit ensuite comme tes vidéos habituelles (repères inclus).
      </p>
    </div>
  );
}

// ---------- Partie D : panneau conteneur avec les deux onglets ----------
function BackingTrackPanel({ song, version, onUpdateSong, onPlayVideo }) {
  const [tab, setTab] = useState('youtube'); // 'youtube' | 'generate'

  return (
    <div className="p-3 border-b border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-amber-400 text-sm">🎧 Backing Track</h3>
        <div className="flex bg-gray-900 rounded p-0.5 border border-gray-700">
          <button
            onClick={() => setTab('youtube')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition ${tab === 'youtube' ? 'bg-amber-600' : 'hover:bg-gray-700'}`}
          >
            📺 Vidéo
          </button>
          <button
            onClick={() => setTab('generate')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition ${tab === 'generate' ? 'bg-amber-600' : 'hover:bg-gray-700'}`}
          >
            🎛️ Générer
          </button>
        </div>
      </div>
      {tab === 'youtube' ? (
        <BackingTrackYoutube song={song} onUpdateSong={onUpdateSong} onPlayVideo={onPlayVideo} />
      ) : (
        <BackingTrackGenerator version={version} bpm={version.bpm || 120} />
      )}
    </div>
  );
}

function RightPanel({ song, version, updateVersion, onUpdateSong, onPlayVideo }) {
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <>
      <div className="bg-gray-750 border-b border-gray-700 p-3 flex-shrink-0">
        <h3 className="font-semibold text-amber-400 mb-3 text-sm">🎥 YouTube</h3>
        <div className="space-y-2">
          {song.youtubeUrls?.map(url => {
            const videoId = extractYoutubeId(url.url);
            return (
              <div key={url.id} className="flex items-center gap-1">
                <input
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
                  className="flex-1 min-w-0 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:border-amber-500"
                />
                {videoId && (
                  <button
                    onClick={() => onPlayVideo?.({ id: url.id, url: url.url, videoId, bookmarks: url.bookmarks })}
                    className="flex-shrink-0 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs transition"
                    title="Voir la vidéo"
                  >
                    ▶️
                  </button>
                )}
                {url.url ? (
                  <a
                    href={url.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs hover:bg-gray-600"
                    title="Ouvrir dans YouTube"
                  >
                    ↗
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <ChordThumbnailsPanel version={version} updateVersion={updateVersion} />

      <BackingTrackPanel song={song} version={version} onUpdateSong={onUpdateSong} onPlayVideo={onPlayVideo} />

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

      
