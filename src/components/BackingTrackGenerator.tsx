import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { SongVersion } from '../lib/types';
import { flattenChordProgression, parseChordSymbol, CHORD_NOTE_NAMES } from '../lib/music';
import { Button } from './ui/button';

export interface BackingStyle {
  id: string;
  label: string;
  hatDensity: number;
  useKick: boolean;
}

export const BACKING_STYLES: BackingStyle[] = [
  { id: 'pop', label: '🎵 Pop / Variété', hatDensity: 2, useKick: true },
  { id: 'ballad', label: '🎹 Ballade', hatDensity: 0, useKick: false },
  { id: 'rock', label: '🎸 Rock', hatDensity: 4, useKick: true },
  { id: 'blues', label: '🎷 Blues shuffle', hatDensity: 2, useKick: true },
];

interface BackingTrackGeneratorProps {
  version: SongVersion;
  bpm: number;
}

export function BackingTrackGenerator({ version, bpm }: BackingTrackGeneratorProps) {
  const [playing, setPlaying] = useState(false);
  const [style, setStyle] = useState('pop');
  const [volume, setVolume] = useState(-10);
  const [currentBar, setCurrentBar] = useState(-1);
  const [ready, setReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const synthsRef = useRef<any>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const barIndexRef = useRef(0);
  const styleRef = useRef(style);

  useEffect(() => {
    styleRef.current = style;
  }, [style]);

  const chords = useMemo(() =>
    flattenChordProgression(version.structure).map(parseChordSymbol).filter((c): c is NonNullable<ReturnType<typeof parseChordSymbol>> => c !== null),
    [version.structure]
  );

  useEffect(() => {
    try {
      synthsRef.current = {
        pad: new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.9 }
        }).toDestination(),
        bass: new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 }
        }).toDestination(),
        kick: new Tone.MembraneSynth({
          octaves: 4, pitchDecay: 0.02
        }).toDestination(),
        hat: new Tone.NoiseSynth({
          envelope: { attack: 0.001, decay: 0.04, sustain: 0 }
        }).toDestination()
      };
      setReady(true);
    } catch (e) {
      setAudioError("Erreur d'initialisation audio.");
    }
    return () => {
      if (synthsRef.current) {
        Object.values(synthsRef.current).forEach((s: any) => s.dispose());
      }
      if (loopRef.current) loopRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (!ready || !synthsRef.current) return;
    Object.values(synthsRef.current).forEach((s: any) => {
      if (s.volume) s.volume.value = volume;
    });
  }, [volume, ready]);

  useEffect(() => {
    if (!ready) return;
    Tone.Transport.bpm.value = bpm || 120;
  }, [bpm, ready]);

  const stop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (loopRef.current) {
      loopRef.current.dispose();
      loopRef.current = null;
    }
    setPlaying(false);
    setCurrentBar(-1);
  };

  useEffect(() => () => stop(), [version.id]);

  const start = async () => {
    if (!chords.length || !ready) return;
    await Tone.start();
    barIndexRef.current = 0;
    let beatInBar = 0;
    const s = synthsRef.current;

    loopRef.current = new Tone.Loop(time => {
      const chord = chords[barIndexRef.current % chords.length];
      const cfg = BACKING_STYLES.find(b => b.id === styleRef.current) || BACKING_STYLES[0];
      const root = CHORD_NOTE_NAMES[chord.root];
      const fifthIdx = (chord.root + (chord.intervals[2] || 7)) % 12;
      const fifth = CHORD_NOTE_NAMES[fifthIdx];

      if (beatInBar === 0) {
        setCurrentBar(barIndexRef.current % chords.length);
        const padNotes = chord.intervals.map(iv => `${CHORD_NOTE_NAMES[(chord.root + iv) % 12]}3`);
        s.pad.triggerAttackRelease(padNotes, '2n', time);
        s.bass.triggerAttackRelease(`${root}2`, '4n', time);
        if (cfg.useKick) s.kick.triggerAttackRelease('C1', '8n', time);
      } else if (beatInBar === 2) {
        s.bass.triggerAttackRelease(`${fifth}2`, '4n', time);
        if (cfg.useKick) s.kick.triggerAttackRelease('C1', '8n', time);
      }

      if (cfg.hatDensity >= 2 && (beatInBar === 1 || beatInBar === 3)) {
        s.hat.triggerAttackRelease('16n', time);
      }
      if (cfg.hatDensity >= 4) {
        s.hat.triggerAttackRelease('16n', time + Tone.Time('8n').toSeconds() / 2);
      }

      beatInBar++;
      if (beatInBar >= 4) {
        beatInBar = 0;
        barIndexRef.current++;
      }
    }, '4n').start(0);

    Tone.Transport.start();
    setPlaying(true);
  };

  const toggle = () => playing ? stop() : start();

  if (audioError) return <p className="text-xs text-red-400">{audioError}</p>;

  return (
    <div className="space-y-2">
      {chords.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Ajoute des accords dans la grille pour générer un accompagnement.</p>
      ) : (
        <React.Fragment>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={toggle}
              disabled={!ready}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 ${playing ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}
            >
              {playing ? '⏹ Stop' : '▶ Jouer'}
            </Button>
            <select
              value={style}
              onChange={e => setStyle(e.target.value)}
              className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs focus:outline-none focus:border-amber-500 text-white"
            >
              {BACKING_STYLES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <div className="flex items-center gap-1 text-xs">
              <VolumeX className="w-3 h-3 text-slate-500" />
              <input
                type="range" min="-30" max="0" step="1" value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-16 accent-amber-500"
              />
              <Volume2 className="w-3 h-3 text-slate-500" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {chords.map((c, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${currentBar === i ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
