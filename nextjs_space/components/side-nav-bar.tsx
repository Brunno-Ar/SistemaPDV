import Link from 'next/link';
import { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  icon: string;
  label: string;
  isActive?: boolean;
  isFilled?: boolean;
}

const NavLink = ({ href, icon, label, isActive, isFilled }: NavLinkProps) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-primary/20 text-primary'
        : 'text-text-light dark:text-text-dark hover:bg-primary/10'
    }`}
  >
    <span
      className="material-symbols-outlined"
      style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "" }}
    >
      {icon}
    </span>
    <p className={`text-sm leading-normal ${isActive ? 'font-bold' : 'font-medium'}`}>
      {label}
    </p>
  </Link>
);

interface SideNavBarProps {
  logo?: ReactNode;
  topLinks: NavLinkProps[];
  bottomLinks: NavLinkProps[];
}

const SideNavBar = ({ logo, topLinks, bottomLinks }: SideNavBarProps) => {
  return (
    <aside className="flex flex-col w-64 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark">
      <div className="flex flex-col justify-between flex-1 p-4">
        <div className="flex flex-col gap-4">
          {logo}
          <nav className="flex flex-col gap-2 mt-4">
            {topLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-1">
          {bottomLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SideNavBar;

export const Logo = () => (
    <div className="flex items-center gap-3 px-2">
        <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
            data-alt="Logotipo do sistema de varejo"
            style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDuGQ8u6XbigGI-OTEI9cipLvFlbPmlRKudZM1KzUa6PX4GVbPUjfW4Vvc3hxwpsda57Lxkz5ZTUGGmehW_1tcPdBisGlSMWZ77LY7aDNs0ssF7UaKRcLJmG2TWryQq2_XFyp4XcDAH94BKPdHGWXXwdPHQVUM51-du5Vcw7IPdRyB8jZ1KpB5SUac9FoCUB1I3-7ZILIkcd-ropPZIBE_7mH2uWGJRBnEvqvuV0cKMShHLj8zY4SYXpy37qw5ofclLcV6b-vcH_48e")'}}
        ></div>
        <div className="flex flex-col">
            <h1 className="text-text-light dark:text-text-dark text-base font-bold leading-normal">Sistema de Varejo</h1>
            <p className="text-primary text-sm font-medium leading-normal">Nível Master</p>
        </div>
    </div>
);
