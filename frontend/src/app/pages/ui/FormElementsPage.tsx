import { useState } from 'react';
import { Eye, EyeOff, Mail, Phone, Link as LinkIcon, Upload } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
    {children}
    {required && <span className="text-error-500 ml-0.5">*</span>}
  </label>
);

const inputBase =
  'w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors focus:outline-none';
const inputNormal = `${inputBase} border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500`;
const inputError = `${inputBase} border-error-500 bg-white text-gray-900 placeholder-gray-400 focus:border-error-500 dark:bg-gray-800 dark:text-white`;
const inputSuccess = `${inputBase} border-success-500 bg-white text-gray-900 placeholder-gray-400 focus:border-success-500 dark:bg-gray-800 dark:text-white`;

export const FormElementsPage = () => {
  usePageTitle('Form Elements');
  const [showPass, setShowPass] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({ a: true, b: false, c: false });
  const [radio, setRadio] = useState('opt1');
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Form Elements"
        description="Input components for data collection"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Form Elements' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Text Inputs" desc="Basic input field variations">
          <div className="space-y-4">
            <div>
              <Label>Default input</Label>
              <input type="text" placeholder="Enter text..." className={inputNormal} />
            </div>
            <div>
              <Label>Disabled</Label>
              <input
                type="text"
                placeholder="Disabled field"
                disabled
                className={`${inputNormal} cursor-not-allowed opacity-60`}
              />
            </div>
            <div>
              <Label>With placeholder</Label>
              <input type="text" placeholder="e.g. John Doe" className={inputNormal} />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Validation States" desc="Error, success, and default states">
          <div className="space-y-4">
            <div>
              <Label>Error state</Label>
              <input type="email" defaultValue="invalid-email" className={inputError} />
              <p className="text-error-500 mt-1 text-xs">Please enter a valid email address.</p>
            </div>
            <div>
              <Label>Success state</Label>
              <input type="text" defaultValue="John Doe" className={inputSuccess} />
              <p className="text-success-500 mt-1 text-xs">Looks good!</p>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Input with Icons" desc="Prefixed/suffixed icon inputs">
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`${inputNormal} pl-10`}
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <div className="relative">
                <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={`${inputNormal} pl-10`}
                />
              </div>
            </div>
            <div>
              <Label>URL</Label>
              <div className="relative">
                <LinkIcon className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://example.com"
                  className={`${inputNormal} pl-10`}
                />
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Password Field" desc="Password with show/hide toggle">
          <div>
            <Label required>Password</Label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                className={`${inputNormal} pr-10`}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Select & Textarea" desc="Dropdown and multi-line inputs">
          <div className="space-y-4">
            <div>
              <Label>Select</Label>
              <select className={inputNormal}>
                <option value="">Choose option...</option>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <Label>Textarea</Label>
              <textarea rows={3} placeholder="Write your message..." className={inputNormal} />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Checkboxes & Radios" desc="Selection controls">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Checkboxes
              </p>
              {['Option A', 'Option B', 'Option C'].map((opt, i) => {
                const key = ['a', 'b', 'c'][i];
                return (
                  <label key={opt} className="mb-2 flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checks[key]}
                      onChange={() => setChecks({ ...checks, [key]: !checks[key] })}
                      className="accent-brand-500 h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Radio buttons
              </p>
              {['Option 1', 'Option 2', 'Option 3'].map((opt, i) => (
                <label key={opt} className="mb-2 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="demo-radio"
                    value={`opt${i + 1}`}
                    checked={radio === `opt${i + 1}`}
                    onChange={() => setRadio(`opt${i + 1}`)}
                    className="accent-brand-500 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Toggle Switches" desc="On/off boolean toggles">
          <div className="space-y-4">
            {[
              { label: 'Notifications enabled', val: toggle1, set: setToggle1 },
              { label: 'Dark mode', val: toggle2, set: setToggle2 },
            ].map(({ label, val, set }) => (
              <label key={label} className="flex cursor-pointer items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  onClick={() => set(!val)}
                  className={`relative h-6 w-11 rounded-full p-0 transition-colors ${val ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <span
                    className={`absolute top-1 left-0 h-4 w-4 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </label>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="File Upload" desc="File input with drag and drop style">
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
            <Upload className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Drag & drop files here
            </p>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p>
            <label className="bg-brand-500 hover:bg-brand-600 mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white">
              <Upload className="h-4 w-4" /> Browse Files
              <input type="file" className="sr-only" />
            </label>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
