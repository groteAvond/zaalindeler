import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from 'react';
import { MyProvider } from '../components/MyContext'; // Adjust the import path accordingly
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from "next-themes";

function MyApp({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Render nothing on the server
  }

  return (
    <MyProvider>
      <BrowserRouter>
        <ThemeProvider attribute="class">
          <Component {...pageProps} />
        </ThemeProvider>
      </BrowserRouter>
    </MyProvider>
  );
}

export default MyApp;