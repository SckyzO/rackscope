const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const CardBase = ({ children }: { children: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800">
    {children}
  </div>
);

const CardContent = ({ title }: { title: string }) => (
  <div className="mt-4">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  </div>
);

export const RibbonsPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ribbons</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Corner and edge label decorations</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Pill Ribbon (Top Left)" desc="Rounded pill-style corner label">
        <CardBase>
          <span className="absolute left-3 top-3 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-medium text-white">New</span>
          <CardContent title="Featured Product" />
        </CardBase>
      </SectionCard>
      <SectionCard title="Pill Ribbon (Top Right)" desc="Right-aligned pill label">
        <CardBase>
          <span className="absolute right-3 top-3 rounded-full bg-success-500 px-2.5 py-1 text-xs font-medium text-white">Popular</span>
          <CardContent title="Top Seller" />
        </CardBase>
      </SectionCard>
      <SectionCard title="Tag Ribbon (Top Left)" desc="Rectangle tag ribbon">
        <CardBase>
          <div className="absolute left-0 top-0 bg-warning-500 px-4 py-1.5">
            <span className="text-xs font-bold text-white">HOT</span>
            <div className="absolute right-0 top-0 h-0 w-0 border-b-[30px] border-r-[12px] border-b-transparent border-r-white/20" />
          </div>
          <CardContent title="Hot Deal" />
        </CardBase>
      </SectionCard>
      <SectionCard title="Diagonal Ribbon (Top Right)" desc="Angled corner banner">
        <CardBase>
          <div className="absolute -right-8 top-4 w-28 rotate-45 bg-error-500 py-1 text-center shadow">
            <span className="text-xs font-bold text-white">SALE</span>
          </div>
          <CardContent title="Limited Offer" />
        </CardBase>
      </SectionCard>
      <SectionCard title="Triangle Ribbon" desc="Folded triangle corner">
        <CardBase>
          <div className="absolute right-0 top-0 h-0 w-0 border-b-[40px] border-l-[40px] border-b-transparent border-l-brand-500">
            <span className="absolute -left-[28px] -top-0 text-[9px] font-bold rotate-[-45deg] text-white">NEW</span>
          </div>
          <CardContent title="Latest Release" />
        </CardBase>
      </SectionCard>
      <SectionCard title="Multiple Ribbons" desc="Card with stacked ribbon labels">
        <CardBase>
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-medium text-white">New</span>
            <span className="rounded-full bg-success-500 px-2.5 py-0.5 text-xs font-medium text-white">Popular</span>
          </div>
          <div className="mt-12">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Premium Package</h4>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Lorem ipsum dolor sit amet consectetur.</p>
          </div>
        </CardBase>
      </SectionCard>
    </div>
  </div>
);
