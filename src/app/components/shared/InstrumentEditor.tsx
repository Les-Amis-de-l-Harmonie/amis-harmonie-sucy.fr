"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export interface Instrument {
  instrument_name: string;
  start_date?: string | null | undefined;
  level?: string | null | undefined;
}

export interface InstrumentEditorProps {
  instruments: Instrument[];
  onChange: (instruments: Instrument[]) => void;
  showLabels?: boolean;
  className?: string;
}

export function InstrumentEditor({
  instruments,
  onChange,
  showLabels = true,
  className = "",
}: InstrumentEditorProps) {
  const addInstrument = () => {
    onChange([...instruments, { instrument_name: "", start_date: "", level: "" }]);
  };

  const removeInstrument = (index: number) => {
    const newInstruments = [...instruments];
    newInstruments.splice(index, 1);
    if (newInstruments.length === 0) {
      newInstruments.push({ instrument_name: "", start_date: "", level: "" });
    }
    onChange(newInstruments);
  };

  const updateInstrument = (index: number, field: keyof Instrument, value: string) => {
    const newInstruments = [...instruments];
    newInstruments[index] = { ...newInstruments[index], [field]: value };
    onChange(newInstruments);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showLabels && <Label>Instruments</Label>}
      {instruments.map((instrument, index) => (
        <div key={index} className="p-4 border border-border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Instrument {index + 1}</span>
            {instruments.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeInstrument(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Instrument</Label>
              <Input
                value={instrument.instrument_name || ""}
                onChange={(e) => updateInstrument(index, "instrument_name", e.target.value)}
                placeholder="Ex: Clarinette"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Date de début</Label>
              <Input
                type="date"
                value={instrument.start_date || ""}
                onChange={(e) => updateInstrument(index, "start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Niveau conservatoire</Label>
              <Input
                value={instrument.level || ""}
                onChange={(e) => updateInstrument(index, "level", e.target.value)}
                placeholder="Ex: Cycle 3"
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={addInstrument} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Ajouter un instrument
      </Button>
    </div>
  );
}
