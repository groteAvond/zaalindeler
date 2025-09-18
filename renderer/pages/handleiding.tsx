import { Nav } from '../components/nav';
import Head from 'next/head';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function Handleiding() {
  const sections = [
    {
      title: "1. Navigatie",
      content: [
        "Gebruik de navigatiebalk bovenaan om tussen verschillende pagina's te schakelen",
        "De actieve pagina wordt gemarkeerd in de navigatiebalk"
      ]
    },
    {
      title: "2. Zaalindeling Bekijken",
      content: [
        "Selecteer een dag (Woensdag, Donderdag, Vrijdag) om de indeling te zien",
        "De kleurcodering helpt verschillende types gasten te identificeren",
        "Hover of klik op een stoel voor meer details over de gast",
        "Paperclip icoon geeft aan dat gasten aan elkaar gekoppeld zijn",
        "Techniekbox kan worden verborgen via instellingen"
      ]
    },
    {
      title: "3. Zoeken",
      content: [
        "Gebruik de zoekfunctie rechtsboven om gasten te vinden",
        "Zoek op naam, email of leerlingnummer",
        "De gevonden gast wordt tijdelijk gemarkeerd op de plattegrond"
      ]
    },
    {
      title: "3. Gasten Beheren",
      content: [
        "Gebruik de 'Control' pagina om alle gasten te beheren",
        "Filter en sorteer gasten op verschillende eigenschappen",
        "Bewerk gastgegevens door op een rij te klikken",
        "Bulk-acties mogelijk voor meerdere geselecteerde gasten"
      ]
    },
    {
      title: "4. Importeren",
      content: [
        "Upload Excel bestanden via de 'Import' pagina",
        "Bekijk vooraf de geïmporteerde data",
        "Pas rollen aan (Erelid, Docent, Speler) voor import",
        "Automatische detectie van leerlingnummers uit emailadressen"
      ]
    },
    {
      title: "5. Instellingen Configureren",
      content: [
        "Pas algoritme-instellingen aan voor optimale plaatsing",
        "Configureer wanneer het balkon gebruikt wordt",
        "Stel ideale rijen in voor VIP gasten",
        "Beheer technische box zichtbaarheid",
        "Reset en herlaad zaalindeling indien nodig"
      ]
    },
    {
      title: "6. Automatische Plaatsing",
      content: [
        "Het systeem plaatst gasten op basis van voorkeuren en prioriteit",
        "VIP gasten (Ereleden, Docenten, Spelers) krijgen voorrang",
        "Gekoppelde gasten worden waar mogelijk naast elkaar geplaatst",
        "Balkonplaatsing gebeurt op basis van bezettingsgraad"
      ]
    }
  ];

  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>Handleiding - Grote Avond Zaalindeling</title>
      </Head>
      <Nav />
      
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Handleiding</h1>
        
        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index} className="p-6">
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              <ul className="list-disc pl-6 space-y-2">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            </Card>
          ))}

          <Card className="p-6 bg-primary/5">
            <h2 className="text-xl font-semibold mb-4">Hulp Nodig?</h2>
            <p className="mb-4">
              Bekijk de FAQ voor veelgestelde vragen of neem contact met ons op als je er niet uitkomt.
            </p>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/faq'}>
                Bekijk FAQ
              </Button>
              <Button onClick={() => window.location.href = '/contact'}>
                Contact Opnemen
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
