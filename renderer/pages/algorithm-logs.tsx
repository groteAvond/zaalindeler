import React, { useState, useEffect } from "react";
import { Nav } from "../components/nav";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Search, RefreshCw, Download, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  details?: any;
  guestId?: number;
  guestName?: string;
  phase?: 'initialization' | 'seating' | 'optimization';
  day?: string;
}

const AlgorithmLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const algorithmLogs = await window.electronAPI.getAlgorithmLogs();
      setLogs(algorithmLogs || []);
      applyFilters(algorithmLogs, searchTerm, selectedDay, selectedPhase, selectedType);
    } catch (error) {
      console.error("Error fetching algorithm logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters(logs, searchTerm, selectedDay, selectedPhase, selectedType);
  }, [searchTerm, selectedDay, selectedPhase, selectedType]);

  const applyFilters = (
    allLogs: LogEntry[], 
    search: string, 
    day: string, 
    phase: string, 
    type: string
  ) => {
    let filtered = [...allLogs];
    
    if (search) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(search.toLowerCase()) ||
        log.guestName?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (day !== "all") {
      filtered = filtered.filter(log => log.day === day);
    }
    
    if (phase !== "all") {
      filtered = filtered.filter(log => log.phase === phase);
    }
    
    if (type !== "all") {
      filtered = filtered.filter(log => log.type === type);
    }
    
    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const content = JSON.stringify(logs, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `algorithm-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'info': return "bg-blue-100 text-blue-800";
      case 'warning': return "bg-yellow-100 text-yellow-800";
      case 'success': return "bg-green-100 text-green-800";
      case 'error': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch(phase) {
      case 'initialization': return "Initialisatie";
      case 'seating': return "Plaatsing";
      case 'optimization': return "Optimalisatie";
      default: return phase;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Nav />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Algoritme Logs</h1>
            <p className="text-muted-foreground">
              Bekijk hoe het algoritme beslissingen neemt bij het toewijzen van zitplaatsen
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
            <Button variant="outline" onClick={exportLogs} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Exporteer Logs
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Filter de logs op basis van dag, fase of type bericht
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoeken in logs..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter op dag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle dagen</SelectItem>
                    <SelectItem value="woensdag">Woensdag</SelectItem>
                    <SelectItem value="donderdag">Donderdag</SelectItem>
                    <SelectItem value="vrijdag">Vrijdag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter op fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle fases</SelectItem>
                    <SelectItem value="initialization">Initialisatie</SelectItem>
                    <SelectItem value="seating">Plaatsing</SelectItem>
                    <SelectItem value="optimization">Optimalisatie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter op type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Waarschuwing</SelectItem>
                    <SelectItem value="success">Succes</SelectItem>
                    <SelectItem value="error">Fout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="space-y-4">
            {filteredLogs.map((log, index) => (
              <Card key={index} className="overflow-hidden">
                <div className={`${log.type === 'info' ? 'bg-blue-50' : log.type === 'warning' ? 'bg-yellow-50' : log.type === 'success' ? 'bg-green-50' : 'bg-red-50'} px-6 py-2 border-b flex justify-between items-center`}>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(log.type)}>
                      {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                    </Badge>
                    {log.phase && (
                      <Badge variant="outline">
                        {getPhaseLabel(log.phase)}
                      </Badge>
                    )}
                    {log.day && (
                      <Badge variant="outline">
                        {log.day.charAt(0).toUpperCase() + log.day.slice(1)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <CardContent className="py-4">
                  <div className="space-y-2">
                    <p className="font-medium">{log.message}</p>
                    {log.guestName && (
                      <p className="text-sm text-muted-foreground">
                        Gast: {log.guestName} (ID: {log.guestId})
                      </p>
                    )}
                    {log.details && (
                      <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-60">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <InfoCircledIcon className="h-4 w-4" />
            <AlertDescription>
              {searchTerm || selectedDay !== "all" || selectedPhase !== "all" || selectedType !== "all" 
                ? "Geen logs gevonden met deze filters." 
                : "Nog geen algoritme logs beschikbaar. Voer eerst het algoritme uit om zitplaatsen toe te wijzen."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default AlgorithmLogs;
