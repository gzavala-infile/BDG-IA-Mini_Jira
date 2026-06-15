import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagInput({ value, onChange, disabled }: Props) {
  const [input, setInput] = useState('');

  function addTag() {
    const tag = input.trim().toLowerCase();
    if (!tag || value.includes(tag) || value.length >= 5) return;
    onChange([...value, tag]);
    setInput('');
  }

  function removeTag(tag: string) { onChange(value.filter((t) => t !== tag)); }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-error">
                <X size={10} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && value.length < 5 && (
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addTag}
          placeholder="Escribe y presiona Enter (máx. 5)"
          className="text-body-md"
        />
      )}
      {value.length >= 5 && <p className="text-label-md text-on-surface-variant">Máximo 5 etiquetas alcanzado</p>}
    </div>
  );
}
