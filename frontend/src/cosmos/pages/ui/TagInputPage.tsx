import { useState, useRef, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5"><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}</div>
    {children}
  </div>
);

const TAG_COLORS = ['bg-brand-50 text-brand-500 dark:bg-brand-500/15','bg-success-50 text-success-500 dark:bg-success-500/15','bg-warning-50 text-warning-500 dark:bg-warning-500/15','bg-error-50 text-error-500 dark:bg-error-500/15'];

export const TagInputPage = () => {
  const [basic, setBasic] = useState(['React', 'TypeScript']);
  const [input1, setInput1] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sInput, setSInput] = useState('');
  const [sTags, setSTags] = useState(['JavaScript']);
  const [colored, setColored] = useState([{ text: 'Design', color: 0 }, { text: 'Development', color: 1 }]);
  const [cInput, setCInput] = useState('');
  const [maxTags, setMaxTags] = useState(['React', 'TypeScript', 'Tailwind']);
  const [mInput, setMInput] = useState('');
  const MAX = 5;
  const allSugg = ['JavaScript','Python','Java','Go','Rust','PHP','Ruby','Swift'];
  const ref1 = useRef<HTMLInputElement>(null);
  const refS = useRef<HTMLInputElement>(null);
  const refC = useRef<HTMLInputElement>(null);
  const refM = useRef<HTMLInputElement>(null);

  const mkHandler = (tags: string[], setTags: (t: string[]) => void, input: string, setInput: (v: string) => void, max?: number) =>
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        if (!tags.includes(input.trim()) && (!max || tags.length < max)) setTags([...tags, input.trim()]);
        setInput('');
      } else if (e.key === 'Backspace' && !input && tags.length > 0) setTags(tags.slice(0, -1));
    };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">Tag Input</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tag and chip input components</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Basic Tag Input" desc="Press Enter to add, × to remove">
          <div onClick={() => ref1.current?.focus()} className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-brand-500 dark:border-gray-700">
            {basic.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-500 dark:bg-brand-500/15">
                {tag}<button onClick={() => setBasic(basic.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </span>
            ))}
            <input ref={ref1} value={input1} onChange={(e) => setInput1(e.target.value)} onKeyDown={mkHandler(basic, setBasic, input1, setInput1)} className="min-w-[100px] flex-1 border-none bg-transparent text-sm outline-none dark:text-white" placeholder={basic.length === 0 ? 'Type and press Enter' : ''} />
          </div>
        </SectionCard>
        <SectionCard title="With Suggestions" desc="Dropdown suggestions while typing">
          <div className="relative">
            <div onClick={() => refS.current?.focus()} className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-brand-500 dark:border-gray-700">
              {sTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-500 dark:bg-brand-500/15">
                  {tag}<button onClick={() => setSTags(sTags.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input ref={refS} value={sInput} onChange={(e) => { setSInput(e.target.value); setSuggestions(e.target.value ? allSugg.filter((s) => s.toLowerCase().includes(e.target.value.toLowerCase()) && !sTags.includes(s)) : []); }}
                onKeyDown={mkHandler(sTags, setSTags, sInput, setSInput)} onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                className="min-w-[100px] flex-1 border-none bg-transparent text-sm outline-none dark:text-white" placeholder="Type to search" />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-theme-md dark:border-gray-700 dark:bg-gray-800">
                {suggestions.map((s) => <button key={s} onClick={() => { setSTags([...sTags, s]); setSInput(''); setSuggestions([]); }} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">{s}</button>)}
              </div>
            )}
          </div>
        </SectionCard>
        <SectionCard title="Colored Tags" desc="Random color assigned per tag">
          <div onClick={() => refC.current?.focus()} className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-brand-500 dark:border-gray-700">
            {colored.map((tag, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TAG_COLORS[tag.color]}`}>
                {tag.text}<button onClick={() => setColored(colored.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </span>
            ))}
            <input ref={refC} value={cInput} onChange={(e) => setCInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && cInput.trim()) { e.preventDefault(); setColored([...colored, { text: cInput.trim(), color: Math.floor(Math.random() * 4) }]); setCInput(''); } else if (e.key === 'Backspace' && !cInput && colored.length > 0) setColored(colored.slice(0, -1)); }}
              className="min-w-[100px] flex-1 border-none bg-transparent text-sm outline-none dark:text-white" placeholder="Add tag" />
          </div>
        </SectionCard>
        <SectionCard title="Max Tags (5)" desc="Shows limit counter">
          <div onClick={() => refM.current?.focus()} className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-brand-500 dark:border-gray-700">
            {maxTags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-500 dark:bg-brand-500/15">
                {tag}<button onClick={() => setMaxTags(maxTags.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </span>
            ))}
            {maxTags.length < MAX && <input ref={refM} value={mInput} onChange={(e) => setMInput(e.target.value)} onKeyDown={mkHandler(maxTags, setMaxTags, mInput, setMInput, MAX)} className="min-w-[100px] flex-1 border-none bg-transparent text-sm outline-none dark:text-white" placeholder="Add tag" />}
          </div>
          <p className="mt-2 text-xs text-gray-400">{maxTags.length}/{MAX} tags</p>
        </SectionCard>
        <SectionCard title="Disabled Tags" desc="Read-only display">
          <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            {['React','TypeScript','Tailwind CSS','Node.js'].map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">{tag}</span>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
