# Grote Avond Zaalindeling - Documentatie

## Inhoudsopgave
- [Algemene Informatie](#algemene-informatie)
- [Functionaliteiten](#functionaliteiten)
- [Algoritme Details](#algoritme-details)
- [Handleiding](#handleiding)
- [FAQ](#faq)
- [Technische Specificaties](#technische-specificaties)
- [Contact](#contact)

## Algemene Informatie

De Grote Avond Zaalindeling applicatie is ontwikkeld om het plaatsingsproces van gasten tijdens de Grote Avond te automatiseren. Het programma houdt rekening met verschillende factoren zoals VIP status, voorkeuren en relaties tussen gasten.

### Kernfunctionaliteiten
- Automatische zaalindeling voor drie avonden
- Slimme plaatsing van VIP gasten (Ereleden, Docenten, Spelers)
- Koppeling van gasten die bij elkaar willen zitten
- Import/export functionaliteit
- Real-time visualisatie van de zaalindeling

## Functionaliteiten

### Zaalindeling
- **VIP Plaatsing**: Automatische prioriteit voor ereleden, docenten en spelers
- **Gekoppelde Plaatsing**: Mogelijkheid om gasten aan elkaar te koppelen
- **Balkon Management**: Slim gebruik van balkonplaatsen
- **Visualisatie**: Kleurcodering voor verschillende types gasten
  - Groen: Ereleden
  - Blauw: Docenten
  - Geel: Spelers
  - Grijs: Reguliere gasten

### Import & Export
- Excel/CSV import ondersteuning
- Automatische detectie van gasttype
- Export naar Excel met gedetailleerde plaatsingsinformatie
- Bulk import mogelijkheden

### Zoekfunctionaliteit
- Zoeken op naam, email of leerlingnummer
- Real-time highlight van gevonden gasten
- Gedetailleerde gastinformatie in tooltips

## Algoritme Details

Het zitplaatsalgoritme is recent verbeterd met een aantal nieuwe functionaliteiten:

### Kernprincipes
- **Hiërarchische Prioriteit**: De plaatsing volgt een strikte volgorde: Ereleden > Spelers > Docenten > Reguliere gasten
- **Voorkeursafhandeling**: Gasten met gekoppelde voorkeuren worden eerst geplaatst
- **Dag-Optimalisatie**: Het algoritme respecteert de voorkeursdagen van gasten

### Nieuwe Verbeteringen
- **Meervoudige Oplossingsstrategieën**:
  1. Knapsack-achtig algoritme voor optimale groepsverplaatsingen
  2. Greedy multi-subset benadering voor alternatieve combinaties
  3. Subset-som benadering voor exacte matches

- **Verbeterde Foutafhandeling**:
  - Robuuste dialoogvensters die niet crashen bij vensterfouten
  - Recursieve dialoogafhandeling die terugkeert naar het hoofdmenu bij falen
  - Uitgebreide context en opties bij stoelconflicten

- **Docent Koppeling Verbetering**:
  - Betere validatie voor docent-paren om duplicatie te voorkomen
  - Normalisatie van e-mailadressen voor consistente vergelijking
  - Verbeterde logica voor "samen zitten" markering

- **Ruimte-Efficiëntie Focus**:
  - Meer nadruk op efficiënte stoelbenutting
  - Dynamische prioriteitsaanpassingen voor betere verdeling
  - Verbeterde balkonplaatsingslogica

### Plaatsingsprioriteiten
1. **VIP Gasten**
   - Plaatsing in ideale rijen (instelbaar)
   - Maximale afwijking instelbaar
   - Centrale plaatsing in rijen

2. **Gekoppelde Gasten**
   - Docenten met wederzijdse voorkeur
   - Leerlingen met gekoppelde leerlingnummers
   - IoVivat groepen

3. **Algemene Gasten**
   - Voorkeursdag als primair criterium
   - Optimale verdeling over beschikbare plaatsen
   - Balkongebruik op basis van bezettingsgraad

### Optimalisatie Parameters
- Balkon drempelwaarde (%)
- Ideale rij bereik
- VIP afwijkingstolerantie
- Centrale plaatsing voorkeur

## Handleiding

### Dagelijks Gebruik
1. **Hoofdscherm**
   - Selecteer dag via kaarten bovenaan
   - Gebruik zoekfunctie voor specifieke gasten
   - Hover/klik op stoelen voor details

2. **Gasten Toevoegen**
   - Ga naar Import pagina
   - Upload Excel bestand
   - Controleer en bevestig import
   - Systeem herberekent indeling automatisch

3. **Instellingen Aanpassen**
   - Configureer VIP rijen
   - Stel balkon parameters in
   - Beheer speciale gastenlijsten
   - Pas algoritme voorkeuren aan

### Nieuwe Features Gebruiken
1. **Verbeterde Stoelconflictafhandeling**
   - Bij conflicten met geblokkeerde stoelen worden meerdere opties geboden
   - Kies "Kleine groepen verplaatsen" om het algoritme meerdere verplaatsingsopties te laten proberen
   - Bij falen worden meer pogingen gedaan met alternatieve strategieën

2. **Docent Koppeling**
   - Docenten kunnen elkaar selecteren via e-mailadressen
   - Docent-paren worden automatisch geplaatst met verbeterde validatie
   - Dubbele docenten worden nu correct voorkomen

### Tips & Tricks
- Gebruik Control pagina voor individuele aanpassingen
- Export regelmatig voor backup
- Herlaad indeling bij onverwacht gedrag
- Monitor bezettingsgraad per avond

## FAQ

### Algemene Vragen
- **Q: Hoe werkt de plaatsing?**  
  A: Het algoritme plaatst eerst VIP gasten, dan gekoppelde gasten, en ten slotte reguliere gasten.

- **Q: Wanneer wordt het balkon gebruikt?**  
  A: Het balkon wordt gebruikt wanneer de bezettingsgraad van de begane grond de ingestelde drempelwaarde overschrijdt.

### Technische Vragen
- **Q: Kan ik offline werken?**  
  A: Ja, de applicatie werkt volledig offline.

- **Q: Hoe vaak wordt de indeling bijgewerkt?**  
  A: De indeling wordt real-time bijgewerkt bij elke wijziging.

## Technische Specificaties

### Systeemvereisten
- Windows 10 of hoger / macOS 10.14 of hoger
- Minimaal 4GB RAM
- 500MB vrije schijfruimte

### Database Details
- Redis voor gegevensopslag
- Automatische backup functionaliteit
- Versiebeheer van indelingen

## Contact

### Support
- **Technische Vragen**  
  Email: matsdenhoed@gmail.com / nicosuurmond@gmail.com

### Ontwikkelaars
- **Mats den Hoed**
  - Email: matsdenhoed@gmail.com
- **Nico Suurmond**
  - Email: nicosuurmond@gmail.com
  - Tel: +31 6 12033021

### Locatie
GSR Rotterdam  
Almeria-Erf 8  
3067 WX Rotterdam
