import { Nav } from '../components/nav';
import Head from 'next/head';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Input } from "../components/ui/input";
import { useState } from 'react';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');

  const faqCategories = [
    {
      category: "Algemeen",
      items: [
        {
          question: "Wat is de Grote Avond?",
          answer: "De Grote Avond is het jaarlijkse muzikale evenement waar leerlingen en docenten hun muzikale talent kunnen tonen aan familie en vrienden."
        },
        {
          question: "Wanneer vindt de Grote Avond plaats?",
          answer: "De Grote Avond wordt op drie avonden gehouden: woensdag, donderdag en vrijdag."
        },
        {
          question: "Hoe laat begint het programma?",
          answer: "De deuren openen om 19:00 uur. Het programma start om 19:30 uur."
        }
      ]
    },
    {
      category: "Zaalindeling Algoritme",
      items: [
        {
          question: "Hoe worden gasten geplaatst?",
          answer: "Het algoritme plaatst gasten op basis van meerdere factoren: VIP status (Erelid, Docent, Speler), dag voorkeur, gekoppelde gasten, en optimale rijverdeling. VIP gasten krijgen voorrang en worden bij voorkeur in de ideale rijen geplaatst."
        },
        {
          question: "Wanneer wordt het balkon gebruikt?",
          answer: "Het balkon wordt gebruikt wanneer de bezettingsgraad van de begane grond een bepaald percentage bereikt (instelbaar via instellingen). VIP gasten worden nooit op het balkon geplaatst."
        },
        {
          question: "Hoe werkt het koppelen van gasten?",
          answer: "Gasten kunnen gekoppeld worden door hun leerlingnummers op te geven bij de voorkeurpersonen. Het systeem probeert gekoppelde gasten naast elkaar te plaatsen, mits ze dezelfde dagvoorkeur hebben."
        }
      ]
    },
    {
      category: "Zaalindeling",
      items: [
        {
          question: "Hoe werkt de zaalindeling?",
          answer: "De zaalindeling wordt automatisch gegenereerd op basis van verschillende factoren zoals voorkeuren, groepen en type gast (erelid, docent, speler, gast)."
        },
        {
          question: "Kan ik mijn zitplaats wijzigen?",
          answer: "Nee, de zitplaatsen worden automatisch toegewezen om de beste indeling voor iedereen te garanderen."
        },
        {
          question: "Wat betekenen de verschillende kleuren?",
          answer: "Groen = Erelid, Blauw = Docent, Geel = Speler, Grijs = Gast"
        },
        {
          question: "Waarom zit ik niet op mijn voorkeursdag?",
          answer: "Het systeem probeert iedereen op hun voorkeursdag te plaatsen, maar dit is niet altijd mogelijk vanwege capaciteit en andere beperkingen."
        }
      ]
    },
    {
      category: "Applicatie Gebruik",
      items: [
        {
          question: "Hoe kan ik zoeken naar een specifieke gast?",
          answer: "Gebruik de zoekfunctie in de rechterbovenhoek. Je kunt zoeken op naam, email of leerlingnummer."
        },
        {
          question: "Wat betekent het paperclip icoontje?",
          answer: "Het paperclip icoontje geeft aan dat deze gast gekoppeld is aan andere gasten en bij elkaar geplaatst moet worden."
        },
        {
          question: "Hoe kan ik de zaalindeling exporteren?",
          answer: "Via het instellingen menu (tandwiel icoon) kun je de complete zaalindeling exporteren naar Excel."
        },
        {
          question: "Kan ik wisselen tussen licht en donker thema?",
          answer: "Ja, via het instellingen menu kun je wisselen tussen licht en donker thema."
        }
      ]
    },
    {
      category: "Import & Beheer",
      items: [
        {
          question: "Welke bestandsformaten kan ik importeren?",
          answer: "De applicatie ondersteunt Excel (.xlsx) en CSV bestanden. Emailadressen worden gebruikt om leerlingnummers te detecteren."
        },
        {
          question: "Kan ik gegevens bewerken na import?",
          answer: "Ja, via de Control pagina kun je alle gastgegevens bewerken. Wijzigingen leiden automatisch tot een herberekening van de zaalindeling."
        },
        {
          question: "Hoe werkt de bulk-import?",
          answer: "Upload je bestand, controleer de gegevens in het preview scherm, pas rollen aan indien nodig, en bevestig de import. Het systeem zal automatisch de zaalindeling optimaliseren."
        }
      ]
    },
    {
      category: "Instellingen & Configuratie",
      items: [
        {
          question: "Welke instellingen kan ik aanpassen?",
          answer: "Je kunt de balkon-drempel, ideale rijen voor VIP's, technische box zichtbaarheid en algoritme prioriteiten aanpassen via de instellingen pagina."
        },
        {
          question: "Wanneer moet ik de zaalindeling herladen?",
          answer: "Herlaad de zaalindeling als je belangrijke instellingen hebt aangepast of als er onverwachte plaatsingen zijn. Dit zorgt voor een complete herberekening."
        }
      ]
    },
    {
      category: "Technische Vragen",
      items: [
        {
          question: "De applicatie laadt niet, wat nu?",
          answer: "Probeer eerst de pagina te verversen. Als het probleem aanhoudt, neem dan contact op met de technische ondersteuning."
        },
        {
          question: "Kan ik de applicatie offline gebruiken?",
          answer: "Ja, de applicatie werkt ook offline. Wijzigingen worden gesynchroniseerd zodra er weer verbinding is."
        },
        {
          question: "Hoe vaak wordt de zaalindeling bijgewerkt?",
          answer: "De zaalindeling wordt realtime bijgewerkt wanneer er wijzigingen worden aangebracht."
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>FAQ - Grote Avond Zaalindeling</title>
      </Head>
      <Nav />
      
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Veelgestelde Vragen</h1>
          <Input 
            className="max-w-md"
            placeholder="Zoek in veelgestelde vragen..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="space-y-8">
          {filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-card rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">{category.category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {category.items.map((item, itemIndex) => (
                  <AccordionItem 
                    key={itemIndex} 
                    value={`${categoryIndex}-${itemIndex}`}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Geen resultaten gevonden voor "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
