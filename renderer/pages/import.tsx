import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { getStudentInfo } from "../../main/helpers/getStudentInfo";
import { Checkbox } from "../components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { CaretSortIcon, CaretUpIcon, CaretDownIcon } from "@radix-ui/react-icons";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
  DialogHeader
} from "../components/ui/dialog";

interface Guest {
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
  datumAanmelding: string;
  ioVivatMembers: string;
}

const Home = () => {
  const [data, setData] = useState<Guest[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' }>({ text: '', type: 'info' });
  const [showPreview, setShowPreview] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Guest | '';
    direction: 'asc' | 'desc';
  }>({ key: '', direction: 'asc' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [specialLists, setSpecialLists] = useState<{
    ereleden: string[];
    meespelend: string[];
    meespelendLeerlingen: string[];
  }>({
    ereleden: [],
    meespelend: [],
    meespelendLeerlingen: []
  });

  useEffect(() => {
    const loadSpecialLists = async () => {
      const settings = await window.electronAPI.getSettings();
      if (settings) {
        setSpecialLists({
          ereleden: settings.ereleden || [],
          meespelend: settings.meespelend || [],
          meespelendLeerlingen: settings.meespelendLeerlingen || []
        });
      }
    };
    loadSpecialLists();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) {
        setMessage({ text: "Selecteer een bestand", type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target?.result;
        if (file.type === "text/csv") {
          Papa.parse(binaryStr as string, {
            complete: (result) => {
              console.log(result.data);
              setData(result.data as Guest[]);
            },
            header: true,
          });
        } else {
          const workbook = XLSX.read(binaryStr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

          // Check if this is a teacher sheet
          const isTeacherSheet = jsonData[0] && (
            jsonData[0]["E-mail"]?.toString().match(/^[a-zA-Z]{2,3}@gsr\.nl$/i) || // Check email format
            jsonData[0]["Naast wie wil je zitten, vul het mailadres in"] !== undefined || // Check for teacher-specific columns
            jsonData.some((row: any) => row["E-mail"]?.toString().match(/^[a-zA-Z]{2,3}@gsr\.nl$/i)) // Check if any row has teacher email
          );
          
          // Check if this is a student sheet (new format)
          const isNewStudentFormat = jsonData[0] && (
            jsonData[0]["Ben je lid van IO VIVAT?"] !== undefined ||
            jsonData[0]["totaal aantal tickets, vul een cijfer in"] !== undefined
          );

          const formattedData: Guest[] = jsonData.map((row, index) => {
            // Common processing for email and name
            const email = row["E-mail"] || "";
            const fullName = row["Naam"] || "";
            const nameParts = fullName.split(" ");
            const voornaam = nameParts[0] || "";
            const achternaam = nameParts.slice(1).join(" ") || "";
            
            // Improve leerlingnummer extraction
            const leerlingnummerMatch = email.match(/L?(\d+)@/i);
            const leerlingnummer = leerlingnummerMatch ? `L${leerlingnummerMatch[1]}` : ''; // Ensure 'L' prefix
            
            // Check if this person is an erelid or meespelend
            const isErelid = specialLists.ereleden.includes(email.toLowerCase());
            const isMeespelend = specialLists.meespelend.includes(email.toLowerCase()) || 
                                specialLists.meespelendLeerlingen.includes(leerlingnummer.toUpperCase()); // Add toUpperCase()

            if (isTeacherSheet || email.match(/^[a-zA-Z]{2,3}@gsr\.nl$/i)) {
              // Process teacher-specific format
              const voorkeurDag2 = row["tweede keuze "] || row["tweede keuze 2"] || row["tweede keuze 3"] || "";
              const teacherEmails = row["Wilt u uw bestelling koppelen aan de bestelling van een collega? Daarmee proberen we om plaatsen naast elkaar in de zaal te realiseren. Vul het mailadres in."] || "";
              const emailList = teacherEmails
                .split(',')
                .map((email: string) => email.trim().toLowerCase())
                .filter(Boolean); // Remove empty strings
              
              return {
                id: index,
                email: email,
                voornaam: voornaam,
                achternaam: achternaam,
                isErelid: isErelid,
                speeltMee: isMeespelend,
                isDocent: true, // Always true for teacher sheet
                IoVivat: false, // Teachers typically aren't IoVivat members
                aantalKaarten: row["Aantal tickets, vul een cijfer in"]?.toString() || "0",
                voorkeurDag1: row["eerste keuze"] || "",
                voorkeurDag2: voorkeurDag2,
                voorkeurPersoonen: "",
                leerlingnummer: 0, // Teachers don't have student numbers
                voorkeurEmail: teacherEmails,
                ioVivatMembers: "",
                datumAanmelding: row["Tijd van voltooien"] || "",
              };
            } else if (isNewStudentFormat) {
              // Process new student format
              const voorkeurDag2 = row["tweede keuze "] || row["tweede keuze 2"] || row["tweede keuze 3"] || "";
              const voorkeurPersoonen = row["Wil je jouw bestelling koppelen met een andere bestelling?  Daarmee proberen we om plaatsen naast elkaar in de zaal te realiseren. Vul het leerlingnummer in. "] || "";
              const leerlingnummerMatch = email.match(/L?(\d+)@/i);
              const leerlingnummer = leerlingnummerMatch ? parseInt(leerlingnummerMatch[1]) : 0;
              const ioVivatMembers = row["Bestel je ook voor (mede)leerlingen kaartjes? Vul dan hier de leerlingnummers in zodat wij kunnen controleren of zij ook lid zijn van IO VIVAT."]?.toString() || "";

              return {
                id: index,
                leerlingnummer: parseInt(leerlingnummerMatch?.[1] || '0'),
                email: email,
                voornaam: voornaam,
                achternaam: achternaam,
                isErelid: isErelid,
                speeltMee: isMeespelend,
                isDocent: false,
                IoVivat: row["Ben je lid van IO VIVAT?"]?.toLowerCase() === "ja",
                aantalKaarten: row["totaal aantal tickets, vul een cijfer in"]?.toString() || "0",
                voorkeurDag1: row["eerste keuze"] || "",
                voorkeurDag2: voorkeurDag2,
                voorkeurPersoonen: voorkeurPersoonen,
                ioVivatMembers: ioVivatMembers,
                datumAanmelding: row["Tijd van voltooien"] || "",
              };
            } else {
              // Existing student format processing
              return {
                id: index,
                leerlingnummer: email.match(/\d+/g)?.join('') || '',
                email: email,
                voornaam: voornaam,
                achternaam: achternaam,
                isErelid: isErelid,
                speeltMee: isMeespelend,
                isDocent: email.match(/^[a-zA-Z]{3}@/) ? true : false,
                IoVivat: row["ben je lid van iovivat "]?.toLowerCase() === "ja",
                aantalKaarten: row["Aantal tickets, vul een cijfer in"]?.toString() || "0",
                voorkeurDag1: row["eerste keuze"] || "",
                voorkeurDag2: row["2de keuze "] || row["2de keuze 2"] || row["2de keuze 3"] || "",
                voorkeurPersoonen: row["naast wie wil je zitten, vul het leerlingnummer in"]?.toString() || "",
                ioVivatMembers: "",
                datumAanmelding: row["Tijd van voltooien"] || "",
              };
            }
          });

          console.log("Formatted data:", formattedData);
          setShowPreview(true);
          setData(formattedData);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      setMessage({ text: `Fout bij lezen bestand: ${(error as Error).message}`, type: 'error' });
      console.error("File reading error:", error);
    }
  };

  const toggleUserRole = (index: number, role: 'isDocent' | 'isErelid' | 'speeltMee') => {
    setData(prevData => 
      prevData.map((guest, i) => 
        i === index ? { ...guest, [role]: !guest[role] } : guest
      )
    );
  };

  const sortData = (key: keyof Guest) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));

    setData(current => {
      const sorted = [...current].sort((a, b) => {
        if (key === 'aantalKaarten') {
          return sortConfig.direction === 'asc' 
            ? parseInt(a[key]) - parseInt(b[key])
            : parseInt(b[key]) - parseInt(a[key]);
        }
        
        if (key === 'isDocent' || key === 'isErelid' || key === 'speeltMee') {
          return sortConfig.direction === 'asc'
            ? Number(a[key]) - Number(b[key])
            : Number(b[key]) - Number(a[key]);
        }

        return 0;
      });
      return sorted;
    });
  };

  const SortableHeader = ({ children, sortKey }: { children: React.ReactNode; sortKey: keyof Guest }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => sortData(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortConfig.key === sortKey ? (
          sortConfig.direction === 'asc' ? (
            <CaretUpIcon className="h-4 w-4" />
          ) : (
            <CaretDownIcon className="h-4 w-4" />
          )
        ) : (
          <CaretSortIcon className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  const handleSubmit = async () => {
    if (data.length === 0) {
      setMessage({ text: "Geen data om te importeren", type: 'error' });
      return;
    }

    setImporting(true);
    setProgress(0);
    setMessage({ text: "Import gestart...", type: 'info' });

    try {
      const totalGuests = data.length;
      const batchSize = 50; // Process in batches of 50
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await window.electronAPI.addGuestsBulk(batch);
        
        // Calculate progress percentage
        const currentProgress = Math.min(((i + batchSize) / totalGuests) * 100, 100);
        setProgress(currentProgress);
        setMessage({ 
          text: `Importeren: ${i + batch.length} van ${totalGuests} gasten...`, 
          type: 'info' 
        });
      }

      setProgress(100);
      setMessage({ text: "Import succesvol afgerond!", type: 'success' });
      
      // Reset the form and close preview after successful import
      setShowPreview(false);
      setData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setMessage({ 
        text: `Import mislukt: ${(error as Error).message}`, 
        type: 'error' 
      });
      console.error("Import error:", error);
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = (index: number) => {
    setData(prevData => prevData.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setShowPreview(false);
    setData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Nav />
      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Importeer Gasten</h1>
            <p className="text-gray-500 mt-2">
              Upload een Excel bestand met de gegevens van alle gasten.
            </p>
          </div>

          <div className="p-8 border-2 border-dashed rounded-xl hover:border-gray-400 transition-colors">
            <Input
              ref={fileInputRef}
              id="excel"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {!importing && message.text && (
            <div className={`p-4 rounded-lg ${
              message.type === 'error' ? 'bg-red-100 text-red-700' : 
              message.type === 'success' ? 'bg-green-100 text-green-700' : 
              'bg-blue-100 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          {importing && (
            <Dialog open={true}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Gasten Importeren</DialogTitle>
                  <DialogDescription>
                    Even geduld tijdens het importeren van de gasten...
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 space-y-4">
                  <Progress value={progress} className="w-full h-2" />
                  <p className="text-sm text-gray-500">
                    {message.text} ({Math.round(progress)}%)
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {showPreview && data.length > 0 && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Bekijk Import Data</h2>
                    <p className="text-sm text-gray-500">{data.length} gasten gevonden</p>
                  </div>
                </div>

                <div className="overflow-auto flex-1 p-6">
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHeader sortKey="achternaam">Naam</SortableHeader>
                          <TableHead>Email</TableHead>
                          <SortableHeader sortKey="isDocent">Docent</SortableHeader>
                          <SortableHeader sortKey="isErelid">Erelid</SortableHeader>
                          <SortableHeader sortKey="speeltMee">Speelt Mee</SortableHeader>
                          <SortableHeader sortKey="aantalKaarten">Aantal Kaarten</SortableHeader>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((guest, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{`${guest.voornaam} ${guest.achternaam}`}</TableCell>
                            <TableCell className="text-sm text-gray-500">{guest.email}</TableCell>
                            <TableCell>
                              <Checkbox 
                                checked={guest.isDocent}
                                onCheckedChange={() => toggleUserRole(index, 'isDocent')}
                                className="data-[state=checked]:bg-blue-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox 
                                checked={guest.isErelid}
                                onCheckedChange={() => toggleUserRole(index, 'isErelid')}
                                className="data-[state=checked]:bg-green-500"
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox 
                                checked={guest.speeltMee}
                                onCheckedChange={() => toggleUserRole(index, 'speeltMee')}
                                className="data-[state=checked]:bg-yellow-500"
                              />
                            </TableCell>
                            <TableCell>{guest.aantalKaarten}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(index)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="p-6 border-t bg-gray-50 rounded-b-xl">
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={importing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {importing ? "Importeren..." : `Importeer ${data.length} Gasten`}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
