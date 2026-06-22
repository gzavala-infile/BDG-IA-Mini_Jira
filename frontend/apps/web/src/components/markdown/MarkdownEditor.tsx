import MDEditor from '@uiw/react-md-editor';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function MarkdownEditor({ value, onChange, disabled }: Props) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        preview={disabled ? 'preview' : 'live'}
        hideToolbar={disabled}
        height={200}
      />
    </div>
  );
}
