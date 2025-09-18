import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from './alert-dialog';
import { Button } from './button';
import { XCircle, AlertTriangle, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';

interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  error: {
    message: string;
    code: string;
    severity: 'warning' | 'error';
    solution?: string;
  };
}

export function ErrorDialog({ open, onClose, error }: ErrorDialogProps) {
  const isConnectionError = error.message.includes('Connection is closed') || 
                          error.message.includes('failed to connect');
  const Icon = error.severity === 'error' ? XCircle : AlertTriangle;
  const colors = error.severity === 'error' 
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isConnectionError ? <WifiOff className="h-5 w-5 text-red-500" /> : 
                               <AlertCircle className="h-5 w-5 text-red-500" />}
            <AlertDialogTitle>
              {isConnectionError ? "Verbindingsprobleem" : "Fout"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4">
            {isConnectionError ? (
              <>
                <p className="font-medium text-red-600 dark:text-red-400">
                  Er kan geen verbinding worden gemaakt met de database.
                </p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>Controleer of je een stabiele internetverbinding hebt</li>
                  <li>Zorg dat je niet verbonden bent met een VPN</li>
                  <li>Als het probleem aanhoudt, probeer de applicatie opnieuw op te starten</li>
                </ul>
              </>
            ) : (
              <>
                <div className="font-medium text-base text-foreground">
                  {error.message}
                </div>
                {error.solution && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="font-semibold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Mogelijke oplossing:
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {error.solution}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Error code: {error.code}
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button onClick={onClose}>Sluiten</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
