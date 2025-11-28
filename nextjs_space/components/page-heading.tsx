import { ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  children?: ReactNode;
}

const PageHeading = ({ title, children }: PageHeadingProps) => (
  <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
    <h1 className="text-text-light dark:text-text-dark text-4xl font-black leading-tight tracking-[-0.033em]">
      {title}
    </h1>
    {children}
  </header>
);

export default PageHeading;
