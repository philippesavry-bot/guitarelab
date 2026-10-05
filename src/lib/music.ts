export const CHORD_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#'
};

export interface ParsedChord {
  root: number;
  intervals: number[];
  isMinor: boolean;
  label: string;
}

export function parseChordSymbol(symbol: string | null): ParsedChord | null {
  if (!symbol) return null;
  const clean = symbol.trim().split('/')[0];
  const m = clean.match(/^([A-Ga-g])([#b]?)(.*)$/);
  if (!m) return null;
  let root = m[1].toUpperCase() + (m[2] || '');
  if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
  const rootIdx = CHORD_NOTE_NAMES.indexOf(root);
  if (rootIdx === -1) return null;
  const rest = (m[3] || '').toLowerCase();
  let intervals = [0, 4, 7];
  let isMinor = false;
  if (rest.includes('dim')) intervals = [0, 3, 6];
  else if (rest.includes('aug')) intervals = [0, 4, 8];
  else if (rest.includes('maj7')) intervals = [0, 4, 7, 11];
  else if (rest.includes('m7') || rest.includes('min7')) {
    intervals = [0, 3, 7, 10];
    isMinor = true;
  } else if (rest.includes('sus4')) intervals = [0, 5, 7];
  else if (rest.includes('sus2')) intervals = [0, 2, 7];
  else if (rest.includes('7')) intervals = [0, 4, 7, 10];
  else if (rest.startsWith('m') && !rest.startsWith('maj')) {
    intervals = [0, 3, 7];
    isMinor = true;
  }
  return { root: rootIdx, intervals, isMinor, label: symbol.trim() };
}

export function flattenChordProgression(structure: any[]) {
  const out: string[] = [];
  (structure || []).forEach(section => {
    const repeat = section.repeat || 1;
    for (let r = 0; r < repeat; r++) {
      (section.cells || []).forEach((cell: any) => {
        const symbol = cell.split ? cell.top || cell.bottom : cell.chord;
        if (symbol && symbol.trim()) out.push(symbol.trim());
      });
    }
  });
  return out;
}
