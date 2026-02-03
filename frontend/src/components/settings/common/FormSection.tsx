import React from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
        {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};
