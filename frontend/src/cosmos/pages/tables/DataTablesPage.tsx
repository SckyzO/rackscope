import { useState, useMemo } from 'react';
import { Search, Download, Eye, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const employees = [
  { name: 'Alex Johnson', email: 'alex@example.com', position: 'Software Engineer', office: 'New York', age: 28, startDate: '2022-03-15', salary: '$95,000', status: 'Hired' },
  { name: 'Sarah Williams', email: 'sarah@example.com', position: 'Product Manager', office: 'San Francisco', age: 32, startDate: '2021-06-01', salary: '$110,000', status: 'Hired' },
  { name: 'Michael Chen', email: 'michael@example.com', position: 'UX Designer', office: 'Austin', age: 26, startDate: '2023-01-10', salary: '$85,000', status: 'In Progress' },
  { name: 'Emily Davis', email: 'emily@example.com', position: 'Data Analyst', office: 'Chicago', age: 29, startDate: '2022-08-20', salary: '$80,000', status: 'Hired' },
  { name: 'James Wilson', email: 'james@example.com', position: 'DevOps Engineer', office: 'Seattle', age: 31, startDate: '2021-11-15', salary: '$105,000', status: 'Hired' },
  { name: 'Lisa Anderson', email: 'lisa@example.com', position: 'Marketing Manager', office: 'Boston', age: 35, startDate: '2020-04-01', salary: '$98,000', status: 'Pending' },
  { name: 'David Martinez', email: 'david@example.com', position: 'Sales Director', office: 'Miami', age: 38, startDate: '2019-09-10', salary: '$125,000', status: 'Hired' },
  { name: 'Jennifer Lee', email: 'jennifer@example.com', position: 'HR Specialist', office: 'Denver', age: 27, startDate: '2022-12-01', salary: '$75,000', status: 'In Progress' },
  { name: 'Robert Taylor', email: 'robert@example.com', position: 'Backend Developer', office: 'Portland', age: 30, startDate: '2021-07-20', salary: '$92,000', status: 'Hired' },
  { name: 'Amanda Brown', email: 'amanda@example.com', position: 'QA Engineer', office: 'Phoenix', age: 25, startDate: '2023-02-15', salary: '$78,000', status: 'Pending' },
];

const TH = ({ label, col, sortBy, sortDir, onSort }: { label: string; col: string; sortBy: string; sortDir: 'asc' | 'desc'; onSort: (c: string) => void }) => (
  <th onClick={() => onSort(col)} className="cursor-pointer bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-300">
    <div className="flex items-center gap-1">
      {label}
      {sortBy === col && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </div>
  </th>
);

const TD = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3.5 text-sm text-gray-600 dark:text-gray-300 ${className}`}>{children}</td>
);

const statusCls: Record<string, string> = {
  'Hired': 'bg-success-50 text-success-500 dark:bg-success-500/10',
  'In Progress': 'bg-warning-50 text-warning-500 dark:bg-warning-500/10',
  'Pending': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function useTable(perPageDefault = 5) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [perPage] = useState(perPageDefault);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = employees.filter(e =>
      e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.office.toLowerCase().includes(q)
    );
    rows = [...rows].sort((a, b) => {
      const av = a[sortBy as keyof typeof a] ?? '';
      const bv = b[sortBy as keyof typeof b] ?? '';
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return rows;
  }, [search, sortBy, sortDir]);

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  return { search, setSearch, sortBy, sortDir, handleSort, page, setPage, paginated, filtered, totalPages, perPage };
}

const Footer = ({ page, setPage, filtered, perPage, totalPages }: ReturnType<typeof useTable>) => (
  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Showing <b className="text-gray-700 dark:text-gray-200">{page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)}</b> of <b className="text-gray-700 dark:text-gray-200">{filtered.length}</b> entries
    </p>
    <div className="flex gap-2">
      <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">Previous</button>
      <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">Next</button>
    </div>
  </div>
);

export const DataTablesPage = () => {
  const t1 = useTable();
  const t2 = useTable();
  const t3 = useTable();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Data Tables</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Advanced tables with search, sort, and pagination</p>
      </div>

      {/* Table 1 */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-700 dark:text-gray-200">Basic Table</h3>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4 p-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={t1.search} onChange={e => t1.setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['name', 'position', 'office', 'age', 'startDate', 'salary'].map(c => <TH key={c} label={c === 'startDate' ? 'Start Date' : c.charAt(0).toUpperCase() + c.slice(1)} col={c} sortBy={t1.sortBy} sortDir={t1.sortDir} onSort={t1.handleSort} />)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {t1.paginated.map((e, i) => <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5"><TD>{e.name}</TD><TD>{e.position}</TD><TD>{e.office}</TD><TD>{e.age}</TD><TD>{e.startDate}</TD><TD>{e.salary}</TD></tr>)}
              </tbody>
            </table>
          </div>
          <Footer {...t1} />
        </div>
      </div>

      {/* Table 2 */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-700 dark:text-gray-200">Table with Actions</h3>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={t2.search} onChange={e => t2.setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><TH label="Name" col="name" sortBy={t2.sortBy} sortDir={t2.sortDir} onSort={t2.handleSort} /><TH label="Position" col="position" sortBy={t2.sortBy} sortDir={t2.sortDir} onSort={t2.handleSort} /><TH label="Office" col="office" sortBy={t2.sortBy} sortDir={t2.sortDir} onSort={t2.handleSort} /><TH label="Salary" col="salary" sortBy={t2.sortBy} sortDir={t2.sortDir} onSort={t2.handleSort} /><th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {t2.paginated.map((e, i) => <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5"><TD>{e.name}</TD><TD>{e.position}</TD><TD>{e.office}</TD><TD>{e.salary}</TD><td className="px-4 py-3.5"><div className="flex gap-2"><button className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600">Edit</button><button className="rounded-lg border border-error-200 bg-error-50 px-3 py-1 text-xs font-medium text-error-500 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10">Delete</button></div></td></tr>)}
              </tbody>
            </table>
          </div>
          <Footer {...t2} />
        </div>
      </div>

      {/* Table 3 */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-700 dark:text-gray-200">Table with Status Badges</h3>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4 p-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={t3.search} onChange={e => t3.setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></div>
            <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"><Download className="h-4 w-4" />Export</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">Name / Email</th>
                <TH label="Position" col="position" sortBy={t3.sortBy} sortDir={t3.sortDir} onSort={t3.handleSort} />
                <TH label="Salary" col="salary" sortBy={t3.sortBy} sortDir={t3.sortDir} onSort={t3.handleSort} />
                <TH label="Office" col="office" sortBy={t3.sortBy} sortDir={t3.sortDir} onSort={t3.handleSort} />
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">Status</th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {t3.paginated.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3.5"><div className="text-sm font-medium text-gray-900 dark:text-white">{e.name}</div><div className="text-xs text-gray-400">{e.email}</div></td>
                    <TD>{e.position}</TD><TD>{e.salary}</TD><TD>{e.office}</TD>
                    <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls[e.status]}`}>{e.status}</span></td>
                    <td className="px-4 py-3.5"><div className="flex gap-3"><button className="text-gray-400 hover:text-brand-500"><Eye className="h-4 w-4" /></button><button className="text-gray-400 hover:text-error-500"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Footer {...t3} />
        </div>
      </div>
    </div>
  );
};
