import React, { useState } from 'react';
import { Button } from './ui/button';
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { SongVersion } from '../lib/types';

interface LeftPanelProps {
  version: SongVersion;
  updateVersion: (updates: Partial<SongVersion>) => void;
}

export function LeftPanel({ version, updateVersion }: LeftPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addSection = () => {
    const newSection = {
      id: Date.now().toString(),
      section: 'Nouvelle section',
      cols: 4,
      rows: 1,
      cells: Array.from({ length: 4 }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        split: false,
        chord: '',
        top: '',
        bottom: '',
      })),
    };
    updateVersion({
      structure: [...version.structure, newSection],
    });
  };

  const removeSection = (id: string) => {
    updateVersion({
      structure: version.structure.filter(s => s.id !== id),
    });
  };

  const updateSection = (id: string, updates: any) => {
    updateVersion({
      structure: version.structure.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-amber-500 text-sm">📋 Structure</h3>
        <Button size="sm" onClick={addSection} className="h-7 w-7 p-0 bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {version.structure.map((section, index) => (
          <div key={section.id} className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
            <div
              className="p-2 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {expandedSections[section.id] ? <ChevronDown className="h-3 w-3 text-slate-500" /> : <ChevronRight className="h-3 w-3 text-slate-500" />}
                <input
                  className="bg-transparent border-none p-0 text-xs font-semibold focus:ring-0 w-full"
                  value={section.section}
                  onChange={(e) => updateSection(section.id, { section: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="h-6 w-6 p-0 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {expandedSections[section.id] && (
              <div className="p-3 border-t border-slate-700 space-y-3">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Cols:</span>
                    <input
                      type="number"
                      className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                      value={section.cols}
                      onChange={(e) => updateSection(section.id, { cols: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Rows:</span>
                    <input
                      type="number"
                      className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                      value={section.rows}
                      onChange={(e) => updateSection(section.id, { rows: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${section.cols}, minmax(0, 1fr))` }}>
                  {section.cells.map((cell, i) => (
                    <input
                      key={cell.id}
                      className="bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs text-amber-400 font-bold focus:border-amber-500 outline-none"
                      value={cell.chord}
                      onChange={(e) => {
                        const newCells = [...section.cells];
                        newCells[i] = { ...cell, chord: e.target.value };
                        updateSection(section.id, { cells: newCells });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
