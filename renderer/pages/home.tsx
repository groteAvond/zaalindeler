import React, { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import Head from "next/head";
import { Nav } from "../components/nav";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Command, CommandInput, CommandList, CommandItem } from "../components/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "../components/ui/dialog";
import { Paperclip, Fingerprint, Calendar, Ban } from 'lucide-react'; // Add this import
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Settings, Moon, Sun, Download, RotateCcw, Monitor, MousePointer2, Trash2 } from 'lucide-react';
import { useTheme } from "next-themes";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
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
import { Progress } from "../components/ui/progress";
import * as XLSX from 'xlsx';
import { ErrorDialog } from '../components/ui/error-dialog';

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
}


// Add new interface for search results that extends Guest
interface SearchResult extends Guest {
  rowNumber: number;
  seatNumber: number;
}

interface Seat {
  stoel: number;
  guest: Guest | null;
  priority: number;
  together?: boolean;
}

// Update the Row type to be a simple array
type Row = Seat[];

// Add type-safe helper functions above the PairedRows component
function organizeSeats(row: Row): Seat[] {
  const isInTechnicalBox = (idx: number) => idx >= 6 && idx <= 18;
  
  const leftSeats = row.filter((_, idx: number) => idx < 6);
  const middleSeats = row.filter((_, idx: number) => isInTechnicalBox(idx));
  const rightSeats = row.filter((_, idx: number) => idx > 18);

  const middleLength = middleSeats.length;
  const leftHalf = middleSeats.slice(0, Math.ceil(middleLength / 2));
  const rightHalf = middleSeats.slice(Math.ceil(middleLength / 2));

  return [...leftSeats, ...leftHalf, ...rightHalf, ...rightSeats];
}

const PairedRows = ({
  rows,
  startIndex,
  handleDelete,
  highlightedId,
  showTechnicalBox,
  tooltipMode,  // Add this prop
  currentDay, // Add this prop
}: {
  rows: Row[];
  startIndex: number;
  handleDelete: (guestID: number) => void;
  highlightedId: number | null;
  showTechnicalBox: boolean;
  tooltipMode: 'hover' | 'click';  // Add this type
  currentDay: string; // Add this type
}) => {
  // Add hook to get blocked seats
  const [rowBlockedSeats, setRowBlockedSeats] = useState<BlockedSeat[]>([]);

  // Add useEffect to load blocked seats for these specific rows
  useEffect(() => {
    const loadBlockedSeatsForRows = async () => {
      try {
        const seats = await window.electronAPI.getBlockedSeats(currentDay.toLowerCase());
        // Filter seats for rows 11-16 only
        const relevantSeats = seats.filter(
          seat => seat.row >= startIndex + 1 && seat.row <= startIndex + 6
        );
        setRowBlockedSeats(relevantSeats);
      } catch (err) {
        console.error('Error loading blocked seats for paired rows:', err);
      }
    };
    
    loadBlockedSeatsForRows();
  }, [currentDay, startIndex]);

  // Add function to check if a seat is blocked
  const isSeatBlocked = (rowNumber: number, seatNumber: number) => {
    return rowBlockedSeats.some(
      blockedSeat => 
        blockedSeat.row === rowNumber && 
        blockedSeat.seatNumber === seatNumber
    );
  };

  return (
    <div className="relative flex flex-col">
      {showTechnicalBox && (
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 bg-gray-300 rounded-lg flex items-center justify-center"
          style={{
            width: "208px",
            height: "100%",
            zIndex: 0, // Changed from 10 to 0 to ensure it stays behind tooltips
          }}
        >
          <span className="text-sm text-gray-600">Techniek</span>
        </div>
      )}
      {[0, 1, 2].map((pairIndex) => {
        const firstRow = rows[startIndex + pairIndex * 2];
        const secondRow = rows[startIndex + pairIndex * 2 + 1];
        const organizedFirstRow = organizeSeats(firstRow);
        const organizedSecondRow = organizeSeats(secondRow);

        return (
          <div
            key={pairIndex}
            className="flex justify-center items-center mb-2"
          >
            <div className="flex items-center">
              <span className="mr-2 text-sm font-semibold">
                Rij {startIndex + pairIndex * 2 + 1}
              </span>
              <div className="seats flex flex-nowrap">
                {organizedFirstRow.map((seat, idx) => (
                  <SeatComponent
                    key={idx}
                    seat={seat}
                    onDelete={handleDelete}
                    isHighlighted={seat.guest?.id === highlightedId}
                    tooltipMode={tooltipMode}  // Pass tooltipMode here
                    currentDay={currentDay} // Add this prop
                    isBlocked={isSeatBlocked(startIndex + pairIndex * 2 + 1, seat.stoel)}
                  />
                ))}
              </div>
            </div>
            <div
              className="technical-box mx-4 bg-gray-300 rounded-lg flex items-center justify-center"
              style={{
                width: "208px",
                height: "32px",
                zIndex: 0,
              }}
            >
              {pairIndex === 1 && (
                <span className="text-sm text-gray-600">Techniek</span>
              )}
            </div>
            <div className="flex items-center">
              <div className="seats flex flex-nowrap">
                {organizedSecondRow.map((seat, idx) => (
                  <SeatComponent
                    key={idx}
                    seat={seat}
                    onDelete={handleDelete}
                    isHighlighted={seat.guest?.id === highlightedId}
                    tooltipMode={tooltipMode}  // Pass tooltipMode here
                    currentDay={currentDay} // Add this prop
                    isBlocked={isSeatBlocked(startIndex + pairIndex * 2 + 2, seat.stoel)}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm font-semibold">
                Rij {startIndex + pairIndex * 2 + 2}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Add or update the type for DaySeating if it doesn't exist
interface DaySeating {
  [key: string]: {
    seats: any[];
    capacity: number;
    assigned: number;
  };
}

// Update the day card component to be clickable and remove the select
const DayCard = ({ day, data, isSelected, onClick }: {
  day: string;
  data: { assigned: number; capacity: number };
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
      isSelected ? 'bg-primary/10 border-primary' : ''
    }`}
  >
    <h3 className="font-semibold capitalize">{day}</h3>
    <p className="text-sm">
      Stoelen aangewezen: {data.assigned} / {data.capacity}
    </p>
    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
      <div
        className="h-full bg-primary rounded-full"
        style={{
          width: `${(data.assigned / data.capacity) * 100}%`
        }}
      />
    </div>
  </div>
);

const funnyMessages = [
  "Even kijken hoelang dit gaat duren...",
  "Even de stoeltjes aan het herschikken...",
  "De puzzel van mensen en stoelen aan het oplossen...",
  "Zoeken naar de perfecte plek voor iedereen...",
  "Piano's en mensen aan het verhuizen...",
  "Berekenen van de optimale zitplaats configuratie...",
  "Rekening houden met alle voorkeuren...",
  "Ervoor zorgen dat niemand in de techniek valt...",
  "Even checken of iedereen het podium kan zien...",
  "De wiskundige formules kloppen bijna...",
  "Nog heel even geduld..."
];

interface SeatingStatus {
  isDone: boolean;
  lastUpdated: string;
  estimatedTimeMs?: number;
  startTime?: string;
  guestsToProcess?: number;
  processedGuests?: number;
}

interface BlockedSeat {
  day: string;
  row: number;
  seatNumber: number;
}

const Home = () => {
  const [seating, setSeating] = useState<Row[] | null>(null);
  const [error, setError] = useState<{
    message: string;
    code: string;
    severity: 'warning' | 'error';
    solution?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true); // Loading state
  const isEmpty = seating === null || seating.length === 0;
  const [dag, setDag] = useState("Woensdag");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedGuestId, setHighlightedGuestId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showTechnicalBox, setShowTechnicalBox] = useState(true);
  const [tooltipMode, setTooltipMode] = useState<'hover' | 'click'>('hover');
  const { theme, setTheme } = useTheme();
  const [dayAssignments, setDayAssignments] = useState<DaySeating | null>(null);
  const [initProgress, setInitProgress] = useState(0);
  const [seatingStatus, setSeatingStatus] = useState<SeatingStatus>({ 
    isDone: false, 
    lastUpdated: '' 
  });
  const [message, setMessage] = useState(funnyMessages[0]);
  const [progress, setProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const [dbError, setDbError] = useState<{message: string; warning: string} | null>(null);
  const [blockedSeats, setBlockedSeats] = useState<BlockedSeat[]>([]);

  // Add function to check if a seat is blocked
  const isSeatBlocked = (rowIndex: number, seatNumber: number) => {
    // Add debug logging to help troubleshoot
    
    return blockedSeats.some(
      blockedSeat => {
        // Log each checked blocked seat for debugging
       
        
        // Make case insensitive comparison for day
        const dayMatches = blockedSeat.day.toLowerCase() === dag.toLowerCase();
        // Use actual row number (rowIndex + 1) since UI rows are 1-indexed
        const rowMatches = blockedSeat.row === rowIndex + 1;
        // Compare seat numbers directly
        const seatMatches = blockedSeat.seatNumber === seatNumber;
        
        // Debug detailed match results
        if (dayMatches && (rowMatches || seatMatches)) {
          console.log(`Partial match: day=${dayMatches}, row=${rowMatches}, seat=${seatMatches}`);
        }
        
        return dayMatches && rowMatches && seatMatches;
      }
    );
  };

  // Add this function before other function declarations
  const handleError = (err: any) => {
    if (err?.code && err?.message) {
      // Handle custom algorithm errors
      setError({
        message: err.message,
        code: err.code,
        severity: err.severity || 'error',
        solution: err.solution
      });
    } else if (err instanceof Error) {
      // Handle standard JS errors
      setError({
        message: err.message,
        code: 'UNKNOWN_ERROR',
        severity: 'error',
        solution: 'Probeer de actie opnieuw uit te voeren of neem contact op met de beheerder'
      });
    } else {
      // Handle unknown errors
      setError({
        message: 'Er is een onverwachte fout opgetreden',
        code: 'UNKNOWN_ERROR',
        severity: 'error',
        solution: 'Probeer de applicatie opnieuw op te starten of neem contact op met de beheerder'
      });
    }
  };

  const fetchSeatingData = async () => {
    setLoading(true);
    try {
      const seatingData = await window.electronAPI.getSeatsForDay(dag.toLowerCase());
      const assignments = await window.electronAPI.getDayAssignments();
      
      setSeating(seatingData as Row[]);
      setDayAssignments(assignments as DaySeating);
    } catch (err) {
      handleError(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guestID: number) => {
    try {
      await window.electronAPI.deleteGuest(guestID);
      // Reload both seating data and day assignments
      const [newSeating, newAssignments] = await Promise.all([
        window.electronAPI.getSeatsForDay(dag.toLowerCase()),
        window.electronAPI.getDayAssignments()
      ]);
      setSeating(newSeating);
      setDayAssignments(newAssignments);
    } catch (err) {
      handleError(err);
      console.error(err);
    }
  };

  const handleDeleteAllUsers = async () => {
    try {
      setLoading(true);
      await window.electronAPI.deleteAllUsers();
      // Force reload all data
      const [newSeating, newAssignments] = await Promise.all([
        window.electronAPI.getSeatsForDay(dag.toLowerCase()),
        window.electronAPI.getDayAssignments()
      ]);
      setSeating(newSeating);
      setDayAssignments(newAssignments);
      console.log('New data after delete:', {
        seating: newSeating,
        assignments: newAssignments
      });
    } catch (err) {
      handleError(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (!seating) return;

    const resultsMap = new Map<number, { guest: Guest, rowIndex: number, seatNumber: number }>();
    const searchTerm = value.toLowerCase().trim();

    seating.forEach((row, rowIndex) => {
      row.forEach((seat) => {
        if (seat.guest) {
          const matchesSearch = 
            (seat.guest.voornaam?.toLowerCase() || '').includes(searchTerm) ||
            (seat.guest.achternaam?.toLowerCase() || '').includes(searchTerm) ||
            (seat.guest.email?.toLowerCase() || '').includes(searchTerm) ||
            (seat.guest.leerlingnummer?.toString() || '').includes(searchTerm);

          if (matchesSearch) {
            if (!resultsMap.has(seat.guest.id)) {
              resultsMap.set(seat.guest.id, {
                guest: seat.guest,
                rowIndex: rowIndex,
                seatNumber: seat.stoel
              });
            }
          }
        }
      });
    });

    // Convert map to array of SearchResults and sort by relevance
    const sortedResults = Array.from(resultsMap.values())
      .map(result => ({
        ...result.guest,
        rowNumber: result.rowIndex + 1,
        seatNumber: result.seatNumber
      }))
      .sort((a, b) => {
        // Exact matches first
        const aExact = 
          a.leerlingnummer?.toString() === searchTerm ||
          a.email?.toLowerCase() === searchTerm;
        const bExact = 
          b.leerlingnummer?.toString() === searchTerm ||
          b.email?.toLowerCase() === searchTerm;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then sort by name
        return `${a.voornaam} ${a.achternaam}`.localeCompare(`${b.voornaam} ${b.achternaam}`);
      });

    setSearchResults(sortedResults);

    // After finding results, update the UI to show the day
    if (sortedResults.length > 0) {
      const firstResult = sortedResults[0];
      // Find which day this guest is assigned to
      const foundDay = Object.entries(dayAssignments || {}).find(([_, data]) => 
        data.seats.some(seat => seat.guestId === firstResult.id)
      );
      
      if (foundDay) {
        setDag(foundDay[0]);
      }
    }
  };

  const handleSelectSearchResult = (guest: Guest) => {
    setHighlightedGuestId(guest.id);
    setSearchOpen(false);
    setTimeout(() => setHighlightedGuestId(null), 3000); // Remove highlight after 3 seconds
  };

  const handleExportUsers = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const days = ['woensdag', 'donderdag', 'vrijdag'];
      
      for (const day of days) {
        const seatingData = await window.electronAPI.getSeatsForDay(day);
        
        const excelData = seatingData.flatMap((row: Row, rowIndex: number) =>
          row
            .filter((seat: Seat): seat is Seat & { guest: Guest } => seat.guest !== null)
            .map(seat => ({
              'Naam': `${seat.guest.voornaam} ${seat.guest.achternaam}`,
              'Email': seat.guest.email,
              'leerlingnummer': seat.guest.leerlingnummer,
              'Aantal Kaarten': seat.guest.aantalKaarten,
              'Rij': rowIndex + 1,
              'Stoel': seat.stoel,
              'Dag': day.charAt(0).toUpperCase() + day.slice(1),
              'Type': seat.guest.isErelid ? 'Erelid' : 
                     seat.guest.isDocent ? 'Docent' : 
                     seat.guest.speeltMee ? 'Speler' : 'Gast',
              'IoVivat': seat.guest.IoVivat ? 'Ja' : 'Nee',
              'ÍoVivat Leden': seat.guest.ioVivatMembers || '',
              'Voorkeur Persoon': seat.guest.voorkeurPersoonen || seat.guest.voorkeurEmail || '',
              'voorkeur Dagen': `${seat.guest.voorkeurDag1}, ${seat.guest.voorkeurDag2}`,
              'id': seat.guest.id,
            }))
        );

        // Create worksheet and add to workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const columnWidths = {
          'A': 25, // Naam
          'B': 30, // Email
          'C': 15, // leerlingnummer
          'D': 15, // Aantal Kaarten
          'E': 10, // Rij
          'F': 10, // Stoel
          'G': 15, // Dag
          'H': 15, // Type
          'I': 10,  // IoVivat
          'J': 25, // IoVivat Leden
          'K': 25, // Voorkeur Persoon
          'L': 25, // Voorkeur Dagen
          'M': 10  // ID

        };
        
        ws['!cols'] = Object.values(columnWidths).map(width => ({ width }));
        
        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, day.charAt(0).toUpperCase() + day.slice(1));
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `zaalindeling-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err);
      console.error(err);
    }
  };

  const handleResetSeating = async () => {
    try {
      setLoading(true); // Add loading state
      await window.electronAPI.resetSeating();
      await fetchSeatingData(); // Refetch data after reset
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Add this new function to handle bulk imports
  const handleBulkImport = async (guests: any[]) => {
    try {
      setLoading(true);
      await window.electronAPI.addGuestsBulk(guests);
      await fetchSeatingData(); // Refetch data after import
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Listen for initialization progress
    const removeProgressListener = window.electronAPI.onInitProgress((progress) => {
      setInitProgress(progress);
    });

    // Listen for seating ready event
    const removeSeatingListener = window.electronAPI.onSeatingReady(() => {
      fetchSeatingData();
    });

    // Initial data fetch
    fetchSeatingData();

    return () => {
      removeProgressListener();
      removeSeatingListener();
    };
  }, []);

  useEffect(() => {
    fetchSeatingData();
  }, [dag]); // Re-fetch when day changes

  useEffect(() => {
    const initializeSeating = async () => {
      try {
        setLoading(true);
        await window.electronAPI.resetSeating(); // This will rerun the seating algorithm
        await fetchSeatingData();
      } catch (err) {
        handleError(err);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initializeSeating();
  }, []); // Run once when component mounts

  // Add status check to your loading state
  useEffect(() => {
    const checkStatus = async () => {
      const status = await window.electronAPI.getSeatingStatus();
      setSeatingStatus(status);
    };
    
    const interval = setInterval(checkStatus, 1000); // Check every second while loading
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setShowLoading(true);
    // set 0
    setProgress(0);
    setMessage("Even kijken hoelang dit gaat duren...");
    
    const checkStatus = async () => {
      const status = await window.electronAPI.getSeatingStatus();
      if (!status.isDone) {
        if (!status.estimatedTimeMs) {
    
        
          setProgress(0);
          setMessage("Even kijken hoelang dit gaat duren...");
        } else {
          setShowLoading(true);
          const startTime = new Date(status.startTime!).getTime();
          const currentTime = new Date().getTime();
          const elapsedTime = currentTime - startTime;
          const progressPercent = Math.min((elapsedTime / status.estimatedTimeMs) * 100, 99);
          
          const messageIndex = Math.floor((progressPercent / 100) * funnyMessages.length);
          setMessage(funnyMessages[messageIndex] || funnyMessages[funnyMessages.length - 1]);
          
          setProgress(progressPercent);
        }
      } else {
        setShowLoading(false);
      }
      setSeatingStatus(status);
    };
    
    const interval = setInterval(checkStatus, 100);
    return () => clearInterval(interval);
  }, []);

  // Add this useEffect to load blocked seats when day changes
  useEffect(() => {
    const loadBlockedSeatsForDay = async () => {
      try {
        // Normalize the day to lowercase when fetching
        const seats = await window.electronAPI.getBlockedSeats(dag.toLowerCase());
        console.log(`Loaded blocked seats for ${dag.toLowerCase()}:`, seats);
        setBlockedSeats(seats);
      } catch (err) {
        console.error('Error loading blocked seats:', err);
      }
    };
    
    loadBlockedSeatsForDay();
  }, [dag]); // This will run when the component mounts and when the day changes

  // Update getTotalSeats and getAvailableSeats functions
  const getTotalSeats = () => {
    if (!seating || !Array.isArray(seating)) return 0;
    return seating.reduce((acc, row) => acc + row.length, 0);
  };

  const getAvailableSeats = () => {
    if (!seating || !Array.isArray(seating)) return 0;
    return seating.reduce((acc, row) => 
      acc + row.filter(seat => !seat.guest).length, 0
    );
  };

  const defaultDayAssignments: DaySeating = {
    woensdag: { seats: [], capacity: 0, assigned: 0 },
    donderdag: { seats: [], capacity: 0, assigned: 0 },
    vrijdag: { seats: [], capacity: 0, assigned: 0 }
  };

  // Update renderRow function
  const renderRow = (row: Row, rowIndex: number) => {
    if (!Array.isArray(row)) {
      console.error(`Invalid row data at index ${rowIndex}:`, row);
      return null;
    }

    return (
      <div key={rowIndex} className="row mb-2 flex justify-center items-center">
        <span className="mr-2 text-sm font-semibold">
          Rij {rowIndex + 1}
        </span>
        <div className="seats flex flex-nowrap">
          {row.map((seat, seatIndex) => (
            <SeatComponent
              key={seatIndex}
              seat={seat}
              onDelete={handleDelete}
              isHighlighted={highlightedGuestId === seat.guest?.id}
              tooltipMode={tooltipMode}
              currentDay={dag}
              isBlocked={isSeatBlocked(rowIndex, seat.stoel)}
            />
          ))}
        </div>
        <span className="ml-2 text-sm font-semibold">
          Rij {rowIndex + 1}
        </span>
      </div>
    );
  };

  // Replace the Select component with the day cards grid
  const daySelectionSection = (
    <div className="mb-4 grid grid-cols-3 gap-4">
      {Object.entries(dayAssignments || defaultDayAssignments).map(([day, data]) => (
        <DayCard
          key={day}
          day={day}
          data={data}
          isSelected={day.toLowerCase() === dag.toLowerCase()}
          onClick={() => setDag(day)}
        />
      ))}
    </div>
  );

  // Update the theme styles to prevent transparency
  if (!seatingStatus.isDone && showLoading) {
    return (
      <div className="container mx-auto p-4">
        <Nav />
        <div className="mt-8 flex flex-col items-center justify-center space-y-4">
          <div className="w-[60%] max-w-md space-y-4">
            <Progress value={progress} />
            <div className="text-center">
              <p className="text-lg font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                {Math.round(progress)}% voltooid
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-background">
      <Nav />
      {dbError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{dbError.message}</AlertTitle>
          <AlertDescription>
            {dbError.warning}
            <Button 
              variant="outline" 
              className="mt-2 w-full"
              onClick={handleExportUsers}
            >
              Exporteer Data
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <ErrorDialog
          open={!!error}
          onClose={() => setError(null)}
          error={error}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Home</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setSearchOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Zoek Gast
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Thema Aanpassen</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportUsers}>
                <Download className="mr-2 h-4 w-4" />
                <span>Exporteer Gasten</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleResetSeating}>
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>Herlaad Zitplaatsen</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTechnicalBox(!showTechnicalBox)}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>Techniek Box {showTechnicalBox ? 'Verbergen' : 'Tonen'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTooltipMode(tooltipMode === 'hover' ? 'click' : 'hover')}>
                <MousePointer2 className="mr-2 h-4 w-4" />
                <span>Tooltip: {tooltipMode === 'hover' ? 'Zweven' : 'Klikken'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Verwijder Alle Gasten</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>{error.severity === 'error' ? 'Fout' : 'Waarschuwing'}</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            {error.solution && (
              <p className="mt-2 text-sm opacity-90">
                Oplossing: {error.solution}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {daySelectionSection}

      

      <div className="flex justify-between items-center mb-4">
        
      </div>
      <div className="mt-8 text-center text-sm text-gray-500">
        <div className="flex justify-center space-x-4">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>
            <span>Erelid</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
            <span>Docent</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
            <span>Speler</span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-gray-400 mr-2"></span>
            <span>Gast</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Progress value={initProgress} className="w-[60%]" />
          <span className="text-lg">
            {initProgress < 100 ? 'Initializing...' : 'Loading...'}
          </span>
        </div>
      ) : isEmpty ? (
        <p className="text-center text-lg">No guests found.</p>
      ) : (
        <div className="cinema max-w-[1200px] mx-auto">
          <div className="stage mb-8 bg-gray-800 text-white p-4 text-center rounded-t-lg">
            <span>Podium</span>
          </div>
          {seating && seating.map((row, rowIndex) => {
            if (rowIndex === 10) {
              return (
                <PairedRows
                  key={rowIndex}
                  rows={seating}
                  startIndex={10}
                  handleDelete={handleDelete}
                  highlightedId={highlightedGuestId}
                  showTechnicalBox={showTechnicalBox}
                  tooltipMode={tooltipMode}
                  currentDay={dag}
                />
              );
            }
            if (rowIndex > 10 && rowIndex < 16) return null;
            return renderRow(row, rowIndex);
          })}
        </div>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Zoek Gasten</DialogTitle>
            <DialogDescription>
              Zoek op naam, email of leerlingnummer
            </DialogDescription>
          </DialogHeader>
          <Command className="rounded-lg border shadow-md">
            <CommandInput
              placeholder="Zoek op naam, email of leerlingnummer..."
              value={searchQuery}
              onValueChange={handleSearch}
            />
            <CommandList>
              {searchResults.map((guest) => (
                <CommandItem
                  key={guest.id}
                  onSelect={() => handleSelectSearchResult(guest)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    guest.isErelid ? "bg-green-400" :
                    guest.isDocent ? "bg-blue-400" :
                    guest.speeltMee ? "bg-yellow-400" :
                    "bg-gray-400"
                  }`} />
                  <div className="flex-1">
                    <div>{guest.voornaam} {guest.achternaam}</div>
                    <div className="text-xs text-gray-500">
                      {guest.leerlingnummer ? `#${guest.leerlingnummer} • ` : ''}{guest.email}
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">
                    Row {guest.rowNumber}, Seat {guest.seatNumber}
                  </span>
                </CommandItem>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="p-2 text-sm text-gray-500">
                  Geen gasten gevonden
                </p>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <div className="text-lg font-semibold">
                Weet je het zeker?
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                Deze actie kan niet ongedaan worden gemaakt. Dit zal alle gasten
                en hun zitplaatsreserveringen permanent verwijderen.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Annuleren</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllUsers}
              >
                Verwijder Alle Gasten
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Helper function to determine seat color based on priority
const getSeatColor = (guest: Guest | null): string => {
  if (guest) {
    if (guest.isErelid) return "bg-green-400 hover:bg-green-500";
    if (guest.isDocent) return "bg-blue-400 hover:bg-blue-500";
    if (guest.speeltMee) return "bg-yellow-400 hover:bg-yellow-500";
    return "bg-gray-400 hover:bg-gray-500";
  }
  return "bg-gray-200 hover:bg-gray-300";
};

// Add this helper function before export default
const getGuestType = (guest: Guest): string => {
  if (guest.isErelid) return "Erelid";
  if (guest.isDocent) return "Docent";
  if (guest.speeltMee) return "Speler";
  return "Gast";
};

const SeatComponent = ({
  seat,
  onDelete,
  isHighlighted,
  tooltipMode,
  currentDay,
  isBlocked = false
}: {
  seat: Seat;
  onDelete: (guestID: number) => void;
  isHighlighted: boolean;
  tooltipMode: 'hover' | 'click';
  currentDay: string;
  isBlocked?: boolean;
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const tooltipTriggerProps = tooltipMode === 'click' 
    ? { 
        onClick: () => setIsTooltipOpen(!isTooltipOpen),
        className: `${isTooltipOpen ? 'tooltip-visible' : ''}`
      }
    : {};

  // Add day preference indicator in tooltip
  const getDayPreferenceIndicator = (guest: Guest) => {
    if (guest.voorkeurDag1.toLowerCase() === currentDay.toLowerCase()) {
      return <span className="text-green-500">Eerste Voorkeur</span>;
    }
    if (guest.voorkeurDag2.toLowerCase() === currentDay.toLowerCase()) {
      return <span className="text-yellow-500">Tweede Voorkeur</span>;
    }
    return <span className="text-red-500">Alternatieve Dag</span>;
  };

  return (
    <div className="relative group">
      <div
        {...tooltipTriggerProps}
        className={`seat relative m-0.5 w-8 h-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm ${
          isBlocked ? "bg-red-400 hover:bg-red-500" : getSeatColor(seat?.guest)
        } ${
          isHighlighted
            ? "ring-4 ring-blue-500 ring-opacity-75 animate-pulse"
            : ""
        }`}
      >
        <span className="seat-number">{seat.stoel}</span>
        
        {/* Add Ban icon for blocked seats */}
        {isBlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-60 rounded-lg">
            <Ban className="h-5 w-5 text-white" />
          </div>
        )}
        
        {seat.together && (
          <div className="absolute -right-1.5 -top-1.5 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center">
            <Paperclip className="h-3 w-3 text-blue-500 rotate-45" />
          </div>
        )}
        
        {/* Add tooltip for blocked seats */}
        {isBlocked && (
          <div className={`tooltip ${
            tooltipMode === 'hover'
              ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
              : isTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          } transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-xl z-50 p-3 border border-gray-200 dark:border-gray-700`}>
            <div className="text-center">
              <h4 className="font-bold">Geblokkeerde Stoel</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deze stoel is niet beschikbaar voor toewijzing.
              </p>
            </div>
          </div>
        )}
        
        {seat.guest && (
          <div className={`tooltip ${
            tooltipMode === 'hover'
              ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
              : isTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          } transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-white dark:bg-gray-800 shadow-xl rounded-xl z-50 p-0 border border-gray-200 dark:border-gray-700`}>
            <div className="relative">
              <div className="absolute w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-2 border-b border-r border-gray-200 dark:border-gray-700" />
              <div className="relative z-10 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center space-x-3 pb-2 border-b dark:border-gray-700">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                      seat.guest.isErelid
                        ? "bg-green-500"
                        : seat.guest.isDocent
                        ? "bg-blue-500"
                        : seat.guest.speeltMee
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`}>
                      {seat.guest.voornaam[0]}
                      {seat.guest.achternaam[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">
                        {seat.guest.voornaam} {seat.guest.achternaam}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getGuestType(seat.guest)}
                      </p>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Stoel: {seat.stoel}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <span>Kaarten: {seat.guest.aantalKaarten}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Fingerprint className="w-4 h-4 text-gray-500" />
                      <span>ID: {seat.guest.id}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {getDayPreferenceIndicator(seat.guest)}
                    </div>
                    {seat.guest.voorkeurPersoonen && (
                      <div className="col-span-2 flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Voorkeur: {seat.guest.voorkeurPersoonen}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <span>{seat.guest.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span>IoVivat: {seat.guest.IoVivat ? "Ja" : "Nee"}</span>
                    </div>
              
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="destructive"
                    className="w-full mt-2 hover:bg-red-600 transition-colors"
                    onClick={() => seat.guest && onDelete(seat.guest.id)}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Verwijder gast
                  </Button>
                </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Home;


