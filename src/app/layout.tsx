import './globals.css';

export const metadata = {
  title: 'Stripe Klaviyo Dunning Dashboard',
  description: 'Dunning workflow monitoring and recovery analytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

