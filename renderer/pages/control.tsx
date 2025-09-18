import React, { useState, useEffect } from "react";
import { Nav } from "../components/nav";
import { DataTable } from "../components/data-table";
import { columns } from "../components/columns";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { EditGuestDialog } from "../components/edit-guest-dialog";
import { type Guest } from "../types/guest";

const ControlPanel = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    const data = await window.electronAPI.getGuests();
    setGuests(data);
  };

  const handleUpdate = async (guestData: Guest) => {
    await window.electronAPI.updateGuest(guestData);
    fetchGuests();
    setEditGuest(null);
  };

  const handleExport = async () => {
    try {
      const result = await window.electronAPI.exportUsers();
      if (result.success) {
        alert(`Successfully exported ${result.count} guests to ${result.path}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export guests');
    }
  };

  const filteredGuests = guests.filter(guest => 
    guest.voornaam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.achternaam.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.leerlingnummer.toString().includes(searchTerm)
  );

  return (
    <div className="container mx-auto p-4">
      <Nav />
      <div className="max-w-6xl mx-auto">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Gastenbeheer</h1>
            <p className="text-gray-500 mt-2">
              Bekijk en bewerk gastinformatie, zitplaatsen en voorkeuren.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Zoek gasten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                Exporteer Lijst
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <DataTable 
              columns={columns} 
              data={filteredGuests}
              meta={{ setEditGuest }}
            />
          </div>

          {filteredGuests.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              Geen gasten gevonden die overeenkomen met uw zoekopdracht.
            </div>
          )}
        </div>
      </div>

      {editGuest && (
        <EditGuestDialog
          guest={editGuest}
          onClose={() => setEditGuest(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
};

export default ControlPanel;
