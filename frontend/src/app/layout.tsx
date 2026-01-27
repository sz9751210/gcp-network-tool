import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from "@/components/Sidebar";
import { ScanProvider } from "@/contexts/ScanContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'GCP Network Planner',
    description: 'Visualize and plan GCP network topology',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <LanguageProvider>
                    <ScanProvider>
                        <div className="flex h-screen overflow-hidden">
                            <Sidebar />
                            <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
                                {children}
                            </main>
                        </div>
                    </ScanProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
