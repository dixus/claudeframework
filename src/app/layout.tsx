import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-end gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-blue-600">
            Home
          </a>
          <a
            href="/glossary"
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            Glossary
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
