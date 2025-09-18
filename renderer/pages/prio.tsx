import React, { useState, useEffect } from "react";
import { Nav } from "../components/nav";
interface Seat {
  stoel: number;
  guest: null;
  priority: number;
}

interface Row {
  stoelen: Seat[];
  maxStoelen: number;
  ereLidStoelen?: number[];
  rolstoelPlek?: string[];
  balkon?: boolean;
}

const Prio = () => {
  const [seating, setSeating] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  interface EditPriority {
    rowNumber: number;
    newPriority: number;
  }

  const [editPriorities, setEditPriorities] = useState<{
    [key: string]: EditPriority;
  }>({});

  const isEmpty = seating === null || seating.length === 0;

  const fetchSeatingData = async () => {
    try {
      const data = await window.electronAPI.sortUsers();
      const rows = data.map((seats: any[], rowIndex: number) => ({
        stoelen: seats
          .map((seat) => ({
            stoel: seat.stoel,
            guest: seat.guest || null,
            priority: seat.priority,
          }))
          .sort((a, b) => a.stoel - b.stoel),
        maxStoelen: seats.length,
      }));

      setSeating(rows);
    } catch (err) {
      setError("Failed to fetch seating data");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSeatingData();
  }, []);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setEditPriorities({});
  };

  const handlePriorityChange = (rowNumber: number, seatNumber: number, newPriority: number) => {
    const key = `${rowNumber}-${seatNumber}`;
    setEditPriorities((prev) => ({
      ...prev,
      [key]: { rowNumber, newPriority },
    }));
  };

  const saveChanges = async () => {
    try {
      for (const [key, { rowNumber, newPriority }] of Object.entries(editPriorities)) {
        const seatNumber = parseInt(key.split("-")[1], 10);
        await window.electronAPI.updateSeatPriority(rowNumber, seatNumber, newPriority);

        setSeating((prevSeating) =>
          prevSeating?.map((row, rowIndex) =>
            rowIndex === rowNumber
              ? {
                  ...row,
                  stoelen: row.stoelen.map((seat) =>
                    seat.stoel === seatNumber
                      ? { ...seat, priority: newPriority }
                      : seat
                  ),
                }
              : row
          ) || null
        );
      }
      setEditPriorities({});
    } catch (error) {
      console.error("Failed to update seat priorities:", error);
    }

    setIsEditing(false);
  };

  return (
    <div className="container mx-auto p-4">
       <Nav />
      <h1 className="text-2xl font-bold mb-4">Prio</h1>
      {error && <p className="text-red-500">{error}</p>}
      {isEmpty ? (
        <p>No seats found.</p>
      ) : (
        <div className="cinema">
          <button
            onClick={handleEditToggle}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            {isEditing ? "Cancel Edit" : "Edit Priorities"}
          </button>
          {isEditing && (
            <button
              onClick={saveChanges}
              className="ml-2 px-4 py-2 bg-green-500 text-white rounded"
            >
              Save Changes
            </button>
          )}
          {seating &&
            seating.map((row, rowIndex) => (
              <div key={rowIndex} className="row mb-8">
                <div className="seats flex flex-wrap justify-center">
                  {row.stoelen.slice(0, row.maxStoelen).map((seat) => {
                    const priority = seat.priority;

                    return (
                      <div
                        key={seat.stoel}
                        className={`seat relative group m-1 p-2 border rounded-lg w-12 text-center cursor-pointer ${getSeatColor(
                          priority
                        )}`}
                      >
                        <div className="seat-info">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={
                                editPriorities[`${rowIndex}-${seat.stoel}`]?.newPriority ?? priority
                              }
                              onChange={(e) =>
                                handlePriorityChange(
                                  rowIndex,
                                  seat.stoel,
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full text-xs text-center border"
                            />
                          ) : (
                            <span className="text-s">
                              🪑{seat.stoel}📌 {priority}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const getSeatColor = (priority: number): string => {
  if (priority <= 1) return "bg-blue-500 text-black";
  if (priority <= 3) return "bg-green-400 text-black";
  if (priority <= 5) return "bg-green-300 text-black";
  if (priority <= 7) return "bg-yellow-400 text-black";
  if (priority <= 9) return "bg-yellow-300 text-black";
  if (priority <= 11) return "bg-orange-400 text-black";
  if (priority <= 13) return "bg-orange-300 text-black";
  if (priority <= 15) return "bg-red-400 text-black";
  if (priority <= 17) return "bg-red-300 text-black";
  if (priority <= 20) return "bg-purple-400 text-black";

  return "bg-gray-200 text-black";
};

export default Prio;
