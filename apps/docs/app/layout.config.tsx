import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export const baseOptions: BaseLayoutProps = {
  githubUrl: 'https://github.com/anti-work/helper',
  nav: {
    title: (
      <>
        <Image src="/logo-white.svg" alt="Helper" width={90} height={22} className="" />
      </>
    ),
  },
  links: [
    {
      text: 'Documentation',
      url: '/',
      active: 'nested-url',
    },
  ],
};
