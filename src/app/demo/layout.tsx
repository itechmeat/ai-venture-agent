import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Venture Agent - Demo',
  description: 'Autonomous investment decisions for venture funds',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
