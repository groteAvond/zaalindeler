import { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Button } from "./ui/button";
import { Pencil, Calendar, User } from "lucide-react";

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
}

interface CellProps {
  row: Row<Guest>;
  table: Table<Guest>;
}

export const handleEdit = (guest: Guest, setEditGuest: (guest: Guest) => void) => {
  setEditGuest(guest);
};

export const columns: ColumnDef<Guest>[] = [
  {
    accessorKey: "name",
    header: "Guest Details",
    cell: ({ row }: { row: Row<Guest> }) => {
      const guest = row.original;
      return (
        <div className="flex gap-3 items-center py-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{guest.voornaam} {guest.achternaam}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <span>#{guest.id}</span>
              {guest.email && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{guest.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "roles",
    header: "Roles & Status",
    cell: ({ row }: { row: Row<Guest> }) => {
      const guest = row.original;
      const statuses = [];

      if (guest.isErelid) statuses.push({ label: "Erelid", color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 ring-green-400/30" });
      if (guest.isDocent) statuses.push({ label: "Docent", color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-blue-400/30" });
      if (guest.speeltMee) statuses.push({ label: "Speler", color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 ring-yellow-400/30" });
      if (guest.IoVivat) statuses.push({ label: "IoVivat", color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 ring-purple-400/30" });
      if (!guest.isErelid && !guest.isDocent && !guest.speeltMee) {
        statuses.push({ label: "Gast", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-gray-400/30" });
      }

      return (
        <div className="flex flex-wrap gap-1.5">
          {statuses.map(({ label, color }, index) => (
            <span key={index} className={`px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${color}`}>
              {label}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "preferences",
    header: "Show Details",
    cell: ({ row }: { row: Row<Guest> }) => {
      const guest = row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1 text-sm">
                <span className="text-muted-foreground">1:</span>
                <span className="font-medium capitalize">{guest.voorkeurDag1}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1 text-sm">
                <span className="text-muted-foreground">2:</span>
                <span className="font-medium capitalize">{guest.voorkeurDag2}</span>
              </div>
            </div>
            <div className="text-sm font-medium">
              {guest.aantalKaarten} tickets
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }: CellProps) => {
      const guest = row.original;
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(guest, (table.options.meta as any).setEditGuest)}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      );
    },
  },
];
