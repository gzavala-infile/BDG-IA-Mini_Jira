import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm max-w-none text-on-surface', className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
