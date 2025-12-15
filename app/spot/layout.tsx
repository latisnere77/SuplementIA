import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Panel',
    robots: 'noindex, nofollow',
};

export default function SpotLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
