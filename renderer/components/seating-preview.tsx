import React from "react";
import { zaalIndeling } from "../../main/helpers/zaalIndeling";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface Props {
  idealRowStart: number;
  idealRowEnd: number;
  onClose: () => void;
}

export const SeatingPreview: React.FC<Props> = ({
  idealRowStart,
  idealRowEnd,
  onClose,
}) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Zaalindeling Voorbeeld</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-4">
          <div className="stage bg-gray-800 text-white p-4 text-center rounded-t-lg mb-4">
            <span>Podium</span>
          </div>

          <div className="space-y-2">
            {Object.entries(zaalIndeling.rijen).map(([rowNum, rowData]) => {
              const rowNumber = parseInt(rowNum) + 1;
              const isIdealRow = rowNumber >= idealRowStart && rowNumber <= idealRowEnd;
              
              return (
                <div
                  key={rowNumber}
                  className={`flex justify-between items-center p-2 rounded transition-colors ${
                    isIdealRow ? "bg-green-100 dark:bg-green-900/30" : 
                    "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="font-medium">Rij {rowNumber}</span>
                  </div>
                  
                  <div className="flex-1 flex justify-center">
                    <div className="flex gap-1 flex-wrap justify-center" style={{ maxWidth: '80%' }}>
                      {Array.from({ length: rowData.maxStoelen }, (_, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-sm"
                        />
                      ))}
                    </div>
                  </div>

                  {rowData.balkon && (
                    <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full ml-2">
                      Balkon
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded" />
              <span className="text-sm">Ideale Rijen</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
