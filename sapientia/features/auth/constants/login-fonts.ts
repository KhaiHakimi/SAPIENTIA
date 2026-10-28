import { Cinzel, Inter } from 'next/font/google';

// The login keeps the prototype's institutional look (Cinzel headings, Inter body); the student board stays on VT323.
export const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel' });
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
