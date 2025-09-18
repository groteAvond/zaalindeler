import React, { useState } from "react";
import Head from "next/head";
import { Nav } from "../components/nav";

import { searchStudents } from "../../main/helpers/searchStudents";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Command, CommandInput, CommandList, CommandItem } from "../components/ui/command";

export default function AddUserPage() {
  const [options] = useState([
    { value: "woensdag", label: "Woensdag" },
    { value: "donderdag", label: "Donderdag" },
    { value: "vrijdag", label: "Vrijdag" },
  ]);

  const [isErelid, setIsErelid] = useState(false);
  const [isDocent, setIsDocent] = useState(false);
  const [speeltMee, setSpeeltMee] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedDay1, setSelectedDay1] = useState("");
  const [selectedDay2, setSelectedDay2] = useState("");
  const [voorkeurPersoonen, setVoorkeurPersoonen] = useState("");

  const handleInputChange = async (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      const results = await searchStudents(value);
      setSuggestions(
        results.map(result => ({
          value: result,
          label: result
        }))
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (value: string) => {
    // Extract student ID from the string (assuming format "Name (ID)")
    const match = value.match(/\(([^)]+)\)/);
    const studentId = match ? match[1] : value;
    
    setQuery(value); // Keep displaying the full string in the input
    setVoorkeurPersoonen(studentId); // Store only the ID
    setSuggestions([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    
    const guest = {
      voornaam: form.voornaam.value,
      achternaam: form.achternaam.value,
      isErelid: isErelid,
      isDocent: isDocent,
      speeltMee: speeltMee,
      aantalKaarten: form.aantalKaarten.value,
      voorkeurDag1: selectedDay1,
      voorkeurDag2: selectedDay2,
      voorkeurPersoonen: voorkeurPersoonen, // Use state value instead of form field
    };

    try {
      await window.electronAPI.addGuest(guest);
      window.history.back(); // Go back after successful submission
    } catch (error) {
      console.error("Error invoking add-guest:", error);
    }
  };

  const handleDay1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDay1(e.target.value);
  };

  const handleDay2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDay2(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container max-w-3xl mx-auto p-6">
        <Head>
          <title>Add Guest • PWS Grote Avond</title>
        </Head>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Guest</CardTitle>
            <CardDescription>
              Add a new guest to the event. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voornaam">First Name *</Label>
                    <Input id="voornaam" name="voornaam" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="achternaam">Last Name *</Label>
                    <Input id="achternaam" name="achternaam" required />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Role</h3>
                <div className="flex space-x-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isErelid" 
                      checked={isErelid}
                      onCheckedChange={(checked) => setIsErelid(checked as boolean)}
                    />
                    <Label htmlFor="isErelid">Erelid</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isDocent" 
                      checked={isDocent}
                      onCheckedChange={(checked) => setIsDocent(checked as boolean)}
                    />
                    <Label htmlFor="isDocent">Docent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="speeltMee" 
                      checked={speeltMee}
                      onCheckedChange={(checked) => setSpeeltMee(checked as boolean)}
                    />
                    <Label htmlFor="speeltMee">Speelt Mee</Label>
                  </div>
                </div>
              </div>

              {/* Ticket Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ticket Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aantalKaarten">Number of Tickets *</Label>
                    <Input 
                      id="aantalKaarten" 
                      name="aantalKaarten" 
                      type="number" 
                      min="1" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>First Choice Day *</Label>
                    <Select name="voorkeurDag1" onValueChange={value => setSelectedDay1(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.value === selectedDay2}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Second Choice Day *</Label>
                    <Select name="voorkeurDag2" onValueChange={value => setSelectedDay2(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.value === selectedDay1}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seating Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Seating Preferences</h3>
                <div className="space-y-2">
                  <Label>Preferred Seating With (Student Number)</Label>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput
                      placeholder="Search student number..."
                      value={query}
                      onValueChange={handleInputChange}
                    />
                    <CommandList>
                      {suggestions.length > 0 ? (
                        suggestions.map((suggestion) => (
                          <CommandItem
                            key={suggestion.value}
                            value={suggestion.value}
                            onSelect={(value) => handleSuggestionClick(value)}
                          >
                            {suggestion.label}
                          </CommandItem>
                        ))
                      ) : (
                        query.length > 0 && (
                          <p className="p-2 text-sm text-gray-500">
                            No results found.
                          </p>
                        )
                      )}
                    </CommandList>
                  </Command>
                  <input 
                    type="hidden" 
                    name="voorkeurPersoonen" 
                    value={voorkeurPersoonen} 
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button variant="outline" type="button" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Guest
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
