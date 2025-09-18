import React, { useState, useEffect } from "react";
import { Nav } from "../components/nav";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import { SeatingPreview } from "../components/seating-preview";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { BlockedSeat } from "../types/shared";
import { zaalIndeling } from "../../main/helpers/zaalIndeling";

interface Settings {
  idealRowStart: number;
  idealRowEnd: number;
  useBalconyThreshold: number;
  maxVIPRowDeviation: number;
  preferCenterSeats: boolean;
  prioritizePreferences: boolean;
  maxMovesForPreference: number;
  balconyPenalty: number;
  ereleden: string[];
  meespelend: string[];
  meespelendLeerlingen: string[];
  allowRegularToVIPPreference: boolean; // New setting
  requireMutualPreference: boolean; // New setting
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    idealRowStart: 4,
    idealRowEnd: 7,
    useBalconyThreshold: 70,
    maxVIPRowDeviation: 2,
    preferCenterSeats: true,
    prioritizePreferences: true,
    maxMovesForPreference: 3,
    balconyPenalty: 20,
    ereleden: [],
    meespelend: [],
    meespelendLeerlingen: [],
    allowRegularToVIPPreference: false,
    requireMutualPreference: false
  });

  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingList, setEditingList] = useState<'ereleden' | 'meespelend' | 'meespelendLeerlingen' | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Added state for blocked seats functionality
  const [blockedSeats, setBlockedSeats] = useState<BlockedSeat[]>([]);
  const [blockedSeatDay, setBlockedSeatDay] = useState<string>("woensdag");
  const [blockedSeatRow, setBlockedSeatRow] = useState<string>("1");
  const [blockedSeatNumber, setBlockedSeatNumber] = useState<string>("1");
  const [blockedSeatReason, setBlockedSeatReason] = useState<string>("");
  const [blockedSeatLoading, setBlockedSeatLoading] = useState(false);
  const [blockedSeatError, setBlockedSeatError] = useState<string | null>(null);
  const [blockedSeatSuccess, setBlockedSeatSuccess] = useState<string | null>(null);
  const [confirmDeleteAllBlockedSeats, setConfirmDeleteAllBlockedSeats] = useState(false);

  useEffect(() => {
    loadSettings();
    loadBlockedSeats();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI.getSettings();
      if (savedSettings) {
        setSettings({
          ...settings,
          ...savedSettings,
          idealRowStart: (savedSettings.idealRowStart ?? 3) + 1,
          idealRowEnd: (savedSettings.idealRowEnd ?? 6) + 1,
          useBalconyThreshold: savedSettings.useBalconyThreshold ?? 10,
          ereleden: savedSettings.ereleden || [],
          meespelend: savedSettings.meespelend || [],
          meespelendLeerlingen: savedSettings.meespelendLeerlingen || [],
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadBlockedSeats = async () => {
    try {
      setBlockedSeatLoading(true);
      const seats = await window.electronAPI.getBlockedSeats();
      setBlockedSeats(seats);
    } catch (err) {
      setBlockedSeatError("Failed to load blocked seats. Please try again.");
      console.error(err);
    } finally {
      setBlockedSeatLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const backendSettings = {
        ...settings,
        idealRowStart: settings.idealRowStart - 1,
        idealRowEnd: settings.idealRowEnd - 1,
      };
      await window.electronAPI.updateSettings(backendSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValueChange = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Block seat function
  const handleBlockSeat = async () => {
    try {
      setBlockedSeatLoading(true);
      setBlockedSeatError(null);
      setBlockedSeatSuccess(null);

      const newBlockedSeat: BlockedSeat = {
        day: blockedSeatDay,
        row: parseInt(blockedSeatRow),
        seatNumber: parseInt(blockedSeatNumber),
        reason: blockedSeatReason.trim() || undefined,
      };

      // Check if seat is already blocked
      const isAlreadyBlocked = blockedSeats.some(
        (s) =>
          s.day === newBlockedSeat.day &&
          s.row === newBlockedSeat.row &&
          s.seatNumber === newBlockedSeat.seatNumber
      );

      const success = await window.electronAPI.blockSeat(newBlockedSeat);

      if (success) {
        await loadBlockedSeats(); // Reload the list
        setBlockedSeatSuccess(
          isAlreadyBlocked
            ? `Updated blocked seat: Rij ${blockedSeatRow}, Stoel ${blockedSeatNumber} op ${blockedSeatDay}`
            : `Stoel geblokkeerd: Rij ${blockedSeatRow}, Stoel ${blockedSeatNumber} op ${blockedSeatDay}`
        );
        
        // Clear form if it was a new seat
        if (!isAlreadyBlocked) {
          setBlockedSeatReason("");
        }
      } else {
        setBlockedSeatError("Failed to block seat. Please try again.");
      }
    } catch (err) {
      setBlockedSeatError("An error occurred while blocking the seat.");
      console.error(err);
    } finally {
      setBlockedSeatLoading(false);
    }
  };

  // Unblock seat function
  const handleUnblockSeat = async (
    day: string,
    row: number,
    seatNumber: number
  ) => {
    try {
      setBlockedSeatLoading(true);
      setBlockedSeatError(null);
      setBlockedSeatSuccess(null);

      const success = await window.electronAPI.unblockSeat(day, row, seatNumber);

      if (success) {
        await loadBlockedSeats(); // Reload the list
        setBlockedSeatSuccess(`Stoel vrijgegeven: Rij ${row}, Stoel ${seatNumber} op ${day}`);
      } else {
        setBlockedSeatError("Failed to unblock seat. Please try again.");
      }
    } catch (err) {
      setBlockedSeatError("An error occurred while unblocking the seat.");
      console.error(err);
    } finally {
      setBlockedSeatLoading(false);
    }
  };

  // Unblock all seats function
  const handleUnblockAllSeats = async () => {
    try {
      setBlockedSeatLoading(true);
      setBlockedSeatError(null);
      setBlockedSeatSuccess(null);

      const success = await window.electronAPI.unblockAllSeats();

      if (success) {
        await loadBlockedSeats(); // Reload the list
        setBlockedSeatSuccess("Alle geblokkeerde stoelen vrijgegeven");
        setConfirmDeleteAllBlockedSeats(false);
      } else {
        setBlockedSeatError("Failed to unblock all seats. Please try again.");
      }
    } catch (err) {
      setBlockedSeatError("An error occurred while unblocking all seats.");
      console.error(err);
    } finally {
      setBlockedSeatLoading(false);
    }
  };

  const listManagementContent = (
    <TabsContent value="lists" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Speciale Gasten Beheer</CardTitle>
          <CardDescription>
            Beheer de lijsten van ereleden, meespelenden en leerlingnummers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ereleden Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Ereleden Emails</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingList('ereleden');
                  setEditValue(settings.ereleden.join('\n'));
                }}
              >
                Bewerk Lijst
              </Button>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <code className="text-sm">
                {settings.ereleden.length} emails geconfigureerd
              </code>
            </div>
          </div>

          {/* Meespelend Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Meespelend Emails</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingList('meespelend');
                  setEditValue(settings.meespelend.join('\n'));
                }}
              >
                Bewerk Lijst
              </Button>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <code className="text-sm">
                {settings.meespelend.length} emails geconfigureerd
              </code>
            </div>
          </div>

          {/* Meespelend Leerlingnummers Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Meespelend Leerlingnummers</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingList('meespelendLeerlingen');
                  setEditValue(settings.meespelendLeerlingen.join('\n'));
                }}
              >
                Bewerk Lijst
              </Button>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <code className="text-sm">
                {settings.meespelendLeerlingen.length} leerlingnummers geconfigureerd
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingList !== null} onOpenChange={() => setEditingList(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {editingList === 'ereleden' ? 'Bewerk Ereleden Emails' :
               editingList === 'meespelend' ? 'Bewerk Meespelend Emails' :
               'Bewerk Meespelend Leerlingnummers'}
            </DialogTitle>
            <DialogDescription>
              Één item per regel. Leeg regels worden genegeerd.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <textarea
              className="min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={editingList === 'ereleden' ? 'email@voorbeeld.nl' :
                          editingList === 'meespelend' ? 'abc@gsr.nl' :
                          'L123456'}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingList(null)}
            >
              Annuleren
            </Button>
            <Button
              onClick={() => {
                if (editingList) {
                  const newList = editValue.split('\n')
                    .map(item => item.trim())
                    .filter(Boolean);
                  
                  setSettings(prev => ({
                    ...prev,
                    [editingList]: newList
                  }));
                  setEditingList(null);
                }
              }}
            >
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
  
  // Blocked seats tab content
  const blockedSeatsContent = (
    <TabsContent value="blockedSeats" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stoel blokkeren</CardTitle>
          <CardDescription>
            Selecteer een stoel om deze te blokkeren voor gebruik
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blockedDay">Dag</Label>
                <Select
                  value={blockedSeatDay}
                  onValueChange={setBlockedSeatDay}
                >
                  <SelectTrigger id="blockedDay">
                    <SelectValue placeholder="Selecteer dag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="woensdag">Woensdag</SelectItem>
                    <SelectItem value="donderdag">Donderdag</SelectItem>
                    <SelectItem value="vrijdag">Vrijdag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockedRow">Rij</Label>
                <Select
                  value={blockedSeatRow}
                  onValueChange={setBlockedSeatRow}
                >
                  <SelectTrigger id="blockedRow">
                    <SelectValue placeholder="Selecteer rij" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Use Object.keys to get the actual row count from zaalIndeling */}
                    {Object.keys(zaalIndeling.rijen).map((rowIdx) => {
                      const rowNum = parseInt(rowIdx) + 1; // Row numbers are 1-indexed in the UI
                      return (
                        <SelectItem key={rowNum} value={rowNum.toString()}>
                          Rij {rowNum}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockedSeat">Stoel</Label>
                <Select
                  value={blockedSeatNumber}
                  onValueChange={setBlockedSeatNumber}
                >
                  <SelectTrigger id="blockedSeat">
                    <SelectValue placeholder="Selecteer stoel" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Use the selected row's maxStoelen value for seat selection */}
                    {blockedSeatRow && 
                      Array.from(
                        { length: zaalIndeling.rijen[parseInt(blockedSeatRow) - 1]?.maxStoelen || 0 }, 
                        (_, i) => i + 1
                      ).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          Stoel {num}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockedReason">Reden (optioneel)</Label>
              <Input
                id="blockedReason"
                placeholder="Bijv. Defecte stoel, gereserveerd voor techniek"
                value={blockedSeatReason}
                onChange={(e) => setBlockedSeatReason(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setBlockedSeatReason("")}>
            Reset
          </Button>
          <Button disabled={blockedSeatLoading} onClick={handleBlockSeat}>
            {blockedSeatLoading ? "Verwerken..." : "Blokkeer Stoel"}
          </Button>
        </CardFooter>
      </Card>

      {/* Display success/error messages */}
      {blockedSeatSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <InfoCircledIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            {blockedSeatSuccess}
          </AlertDescription>
        </Alert>
      )}
      
      {blockedSeatError && (
        <Alert variant="destructive">
          <InfoCircledIcon className="h-4 w-4" />
          <AlertDescription>{blockedSeatError}</AlertDescription>
        </Alert>
      )}

      {/* Blocked Seats List */}
      <Card>
        <CardHeader>
          <CardTitle>Geblokkeerde Stoelen</CardTitle>
          <CardDescription>
            Overzicht van alle momenteel geblokkeerde stoelen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dag</TableHead>
                <TableHead>Rij</TableHead>
                <TableHead>Stoel</TableHead>
                <TableHead>Reden</TableHead>
                <TableHead className="text-right">Actie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockedSeats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Geen geblokkeerde stoelen gevonden.
                  </TableCell>
                </TableRow>
              ) : (
                blockedSeats.map((blockedSeat, index) => (
                  <TableRow key={index}>
                    <TableCell className="capitalize">
                      {blockedSeat.day}
                    </TableCell>
                    <TableCell>{blockedSeat.row}</TableCell>
                    <TableCell>{blockedSeat.seatNumber}</TableCell>
                    <TableCell>{blockedSeat.reason || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          handleUnblockSeat(
                            blockedSeat.day,
                            blockedSeat.row,
                            blockedSeat.seatNumber
                          )
                        }
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setConfirmDeleteAllBlockedSeats(true)}
            disabled={blockedSeats.length === 0 || blockedSeatLoading}
          >
            Verwijder alle blokkades
          </Button>
        </CardFooter>
      </Card>
    </TabsContent>
  );

  return (
    <div className="container mx-auto p-4">
      <Nav />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Algoritme Instellingen</h1>

        <Tabs defaultValue="seating" className="space-y-4">
          <TabsList>
            <TabsTrigger value="seating">VIP Plaatsing</TabsTrigger>
            <TabsTrigger value="balcony">Balkon</TabsTrigger>
            <TabsTrigger value="advanced">Geavanceerd</TabsTrigger>
            <TabsTrigger value="lists">Speciale Gasten</TabsTrigger>
            <TabsTrigger value="blockedSeats">Stoelen Blokkeren</TabsTrigger>
          </TabsList>

          <TabsContent value="seating" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>VIP Plaatsing Configuratie</CardTitle>
                <CardDescription>
                  Bepaal waar Ereleden, Docenten en Spelers bij voorkeur worden geplaatst
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Ideale VIP Rijen</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Kies de beste rijen voor VIP gasten (Ereleden, Docenten, Spelers). 
                    Rij 1 is direct voor het podium. Het algoritme zal eerst proberen VIP gasten
                    in deze rijen te plaatsen voor optimaal zicht.
                  </p>
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <label>Start Rij</label>
                      <Select 
                        value={settings.idealRowStart.toString()}
                        onValueChange={(v) => handleValueChange('idealRowStart', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Start rij" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              Rij {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <label>Eind Rij</label>
                      <Select 
                        value={settings.idealRowEnd.toString()}
                        onValueChange={(v) => handleValueChange('idealRowEnd', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Eind rij" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + settings.idealRowStart).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              Rij {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Aanbevolen: Start rij 3-4, Eind rij 7-8 voor optimale kijkhoek
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium mb-2">Maximale Afwijking voor VIP Plaatsing</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Hoeveel rijen mag een VIP gast maximaal afwijken van de ideale rijen als er geen plaats meer is?
                    Een lagere waarde geeft sterkere prioriteit aan de ideale rijen, maar kan leiden tot meer spreiding
                    van gekoppelde gasten.
                  </p>
                  <Select 
                    value={settings.maxVIPRowDeviation.toString()}
                    onValueChange={(v) => handleValueChange('maxVIPRowDeviation', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer afwijking" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num === 0 ? 'Geen afwijking toegestaan' : 
                           num === 1 ? '1 rij (strikt)' :
                           `${num} rijen (flexibel)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balcony" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Balkon Gebruik</CardTitle>
                <CardDescription>
                  Configureer wanneer en hoe het balkon wordt gebruikt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Balkon Drempelwaarde ({settings.useBalconyThreshold}%)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bij welke bezettingsgraad van de begane grond moet het balkon worden gebruikt?
                    Een hogere waarde betekent dat het balkon later wordt gebruikt.
                  </p>
                  <Slider
                    value={[settings.useBalconyThreshold]}
                    onValueChange={([value]) => handleValueChange('useBalconyThreshold', value)}
                    min={50}
                    max={95}
                    step={5}
                    className="mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {settings.useBalconyThreshold < 65 ? 'Balkon wordt vroeg gebruikt (meer spreiding)' : 
                     settings.useBalconyThreshold < 80 ? 'Gebalanceerd balkon gebruik' : 
                     'Balkon alleen bij hoge bezetting (compacte indeling)'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium mb-2">Balkon Prioriteit ({settings.balconyPenalty})</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Hoe sterk moet het algoritme proberen gasten op de begane grond te plaatsen?
                    Een hogere waarde betekent dat het balkon alleen wordt gebruikt als het echt nodig is.
                  </p>
                  <Slider
                    value={[settings.balconyPenalty]}
                    onValueChange={([value]) => handleValueChange('balconyPenalty', value)}
                    min={5}
                    max={40}
                    step={5}
                    className="mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {settings.balconyPenalty < 15 ? 'Balkon wordt makkelijk gebruikt' : 
                     settings.balconyPenalty < 30 ? 'Normale voorkeur voor begane grond' : 
                     'Sterke voorkeur voor begane grond'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Geavanceerde Algoritme Instellingen</CardTitle>
                <CardDescription>
                  Verfijn het gedrag van het plaatsingsalgoritme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Plaatsingsvoorkeuren</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Centrale Plaatsing</label>
                        <p className="text-sm text-muted-foreground">
                          Geef prioriteit aan plaatsen in het midden van de rij.
                          Dit zorgt voor een betere verdeling maar kan het moeilijker maken
                          om groepen bij elkaar te plaatsen.
                        </p>
                      </div>
                      <Switch
                        checked={settings.preferCenterSeats}
                        onCheckedChange={(checked) => handleValueChange('preferCenterSeats', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium mb-2">Maximale Verplaatsingen voor Voorkeuren</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Hoeveel gasten mogen maximaal verplaatst worden om aan
                      </p>
                      <Select 
                        value={settings.maxMovesForPreference.toString()}
                        onValueChange={(v) => handleValueChange('maxMovesForPreference', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer maximum" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} verplaatsingen
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => setShowPreview(true)} className="w-full">
              Bekijk Zaalindeling
            </Button>
          </TabsContent>

          {listManagementContent}
          
          {blockedSeatsContent}

          <TabsContent value="algorithm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voorkeursinstellingen</CardTitle>
                <CardDescription>Beheer hoe het algoritme omgaat met zitplekken en voorkeuren</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* ...existing settings... */}
                
                {/* Add new settings for preferences */}
                <div className="space-y-4">
                  <h3 className="font-medium">Voorkeursinstellingen</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium" htmlFor="allowRegularToVIPPreference">
                          Reguliere gasten kunnen VIPs selecteren
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Indien ingeschakeld kunnen reguliere gasten VIP gasten (ereleden) selecteren als voorkeurspersoon.
                        </p>
                      </div>
                      <Switch
                        id="allowRegularToVIPPreference"
                        checked={settings.allowRegularToVIPPreference}
                        onCheckedChange={(checked) => handleValueChange('allowRegularToVIPPreference', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium" htmlFor="requireMutualPreference">
                          Vereist wederzijdse voorkeur
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Indien ingeschakeld worden gasten alleen naast elkaar geplaatst als beiden elkaar hebben geselecteerd.
                        </p>
                      </div>
                      <Switch
                        id="requireMutualPreference"
                        checked={settings.requireMutualPreference}
                        onCheckedChange={(checked) => handleValueChange('requireMutualPreference', checked)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* ...existing settings... */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {saveSuccess && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <InfoCircledIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Instellingen succesvol opgeslagen
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSaveSettings} 
          className="mt-6 w-full"
          disabled={isSaving}
        >
          {isSaving ? 'Bezig met opslaan...' : 'Instellingen Opslaan'}
        </Button>
      </div>

      {/* Confirm Delete All Blocked Seats Dialog */}
      <AlertDialog 
        open={confirmDeleteAllBlockedSeats} 
        onOpenChange={setConfirmDeleteAllBlockedSeats}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie zal alle geblokkeerde stoelen vrijgeven. Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockAllSeats}>
              Doorgaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showPreview && (
        <SeatingPreview
          idealRowStart={settings.idealRowStart}
          idealRowEnd={settings.idealRowEnd}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
