import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Manga-Mon | Autonomous sports Simulation dNFTs on Monad',
  description: 'Manage AI Persona Agents minted as dynamic NFTs on Monad. Watch 5v5 matches simulate in real-time with dramatic manga breakouts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
