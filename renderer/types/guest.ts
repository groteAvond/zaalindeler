export interface Guest {
  voornaam: string;
  achternaam: string;
  isErelid: boolean;
  speeltMee: boolean;
  isDocent: boolean;
  aantalKaarten: string;
  voorkeurDag1: string;
  voorkeurDag2: string;
  voorkeurPersoonen: string;
  email: string;
  id: number;
  leerlingnummer: number;
  IoVivat: boolean;
  ioVivatMembers: string; // Add this new property to store additional IoVivat member numbers
  voorkeurEmail?: string; // Add new field for teacher email preferences
  datumAanmelding: string,
}
