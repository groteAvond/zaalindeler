import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { type Guest } from "../types/guest";

interface Props {
  guest: Guest;
  onClose: () => void;
  onSave: (guest: Guest) => void;
}

type DayValue = 'woensdag' | 'donderdag' | 'vrijdag';

export function EditGuestDialog({ guest, onClose, onSave }: Props) {
  const [editedGuest, setEditedGuest] = useState(guest);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedGuest);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Guest) => (
    e: React.ChangeEvent<HTMLInputElement> | boolean
  ) => {
    const value = typeof e === 'boolean' ? e : e.target.value;
    setEditedGuest(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: 'voorkeurDag1' | 'voorkeurDag2') => (value: DayValue) => {
    setEditedGuest(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gast Bewerken</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Voornaam</label>
              <Input
                value={editedGuest.voornaam}
                onChange={e => handleChange('voornaam')(e)}
              />
            </div>
            <div>
              <label>Achternaam</label>
              <Input
                value={editedGuest.achternaam}
                onChange={e => handleChange('achternaam')(e)}
              />
            </div>
          </div>

          <div>
            <label>Email</label>
            <Input
              value={editedGuest.email}
              onChange={e => handleChange('email')(e)}
            />
          </div>

          <div>
            <label>Aantal Kaarten</label>
            <Input
              type="number"
              value={editedGuest.aantalKaarten}
              onChange={e => handleChange('aantalKaarten')(e)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Voorkeur Dag 1</label>
              <Select
                value={editedGuest.voorkeurDag1}
                onValueChange={(value: DayValue) => handleSelectChange('voorkeurDag1')(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="woensdag">Woensdag</SelectItem>
                  <SelectItem value="donderdag">Donderdag</SelectItem>
                  <SelectItem value="vrijdag">Vrijdag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label>Voorkeur Dag 2</label>
              <Select
                value={editedGuest.voorkeurDag2}
                onValueChange={(value: DayValue) => handleSelectChange('voorkeurDag2')(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="woensdag">Woensdag</SelectItem>
                  <SelectItem value="donderdag">Donderdag</SelectItem>
                  <SelectItem value="vrijdag">Vrijdag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            {editedGuest.isDocent ? (
              <div>
                <label>Voorkeur Email (voor docenten)</label>
                <Input
                  type="text"
                  value={editedGuest.voorkeurEmail || ''}
                  onChange={e => handleChange('voorkeurEmail')(e)}
                  placeholder="Vul email(s) in gescheiden door komma's"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Vul de emailadressen in van collega's waar u naast wilt zitten (gescheiden door komma's)
                </p>
              </div>
            ) : (
              <div>
                <label>Voorkeur Persoon (Leerlingnummer)</label>
                <Input
                  type="text"
                  value={editedGuest.voorkeurPersoonen || ''}
                  onChange={e => handleChange('voorkeurPersoonen')(e)}
                  placeholder="Vul leerlingnummer in van voorkeur persoon"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Vul het leerlingnummer in van de persoon waar je naast wilt zitten
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
            <h3 className="font-medium mb-2">Rollen & Status</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="font-medium">Erelid</label>
                <p className="text-sm text-muted-foreground">Is deze gast een erelid?</p>
              </div>
              <Switch
                checked={editedGuest.isErelid}
                onCheckedChange={(checked) => setEditedGuest(prev => ({ ...prev, isErelid: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="font-medium">Docent</label>
                <p className="text-sm text-muted-foreground">Is deze gast een docent?</p>
              </div>
              <Switch
                checked={editedGuest.isDocent}
                onCheckedChange={(checked) => setEditedGuest(prev => ({ ...prev, isDocent: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="font-medium">Speelt Mee</label>
                <p className="text-sm text-muted-foreground">Speelt deze gast mee?</p>
              </div>
              <Switch
                checked={editedGuest.speeltMee}
                onCheckedChange={(checked) => setEditedGuest(prev => ({ ...prev, speeltMee: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="font-medium">IoVivat</label>
                <p className="text-sm text-muted-foreground">Is deze gast lid van IoVivat?</p>
              </div>
              <Switch
                checked={editedGuest.IoVivat}
                onCheckedChange={(checked) => setEditedGuest(prev => ({ ...prev, IoVivat: checked }))}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSaving}
          >
            Annuleren
          </Button>
          <Button 
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
