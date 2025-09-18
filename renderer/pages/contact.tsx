import { Nav } from '../components/nav';
import Head from 'next/head';

export default function Contact() {
  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>Contact - Grote Avond Zaalindeling</title>
      </Head>
      <Nav />
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Contact</h1>
        
        <div className="space-y-6">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Technische Ondersteuning</h2>
            <p className="mb-2">Voor technische vragen of problemen met de applicatie:</p>
            <ul className="space-y-2">
              <li>Email Mats: <a href="matsdenhoed@gmail.com" className="text-primary hover:underline">Mats: matsdenhoed@gmail.com </a></li>
              <li>Email Nico: <a href="nicosuurmond@gmail.com" className="text-primary hover:underline">Nico: nicosuurmond@gmail.com </a></li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Algemene Vragen</h2>
            <p className="mb-2">Voor algemene vragen over de Grote Avond:</p>
            <ul className="space-y-2">
              <li>Email Mats: <a href="matsdenhoed@gmail.com" className="text-primary hover:underline">Mats: matsdenhoed@gmail.com </a></li>
              <li>Email Nico: <a href="nicosuurmond@gmail.com" className="text-primary hover:underline">Nico: nicosuurmond@gmail.com </a></li>
              <li>Telefoon Nico: <a href="tel:+31612033021" className="text-primary hover:underline">+31 6 12033021</a></li>
            </ul>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Locatie</h2>
            <p>GSR Rotterdam</p>
            <p>Almeria-Erf 8</p>
            <p>3067 WX Rotterdam</p>
          </div>
        </div>
      </div>
    </div>
  );
}
