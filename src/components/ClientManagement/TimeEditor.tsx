import React, { useState, useEffect } from "react";
import { Edit, X } from "lucide-react";

interface TimeEditorProps {
  startTime: Date;
  endTime?: Date;
  onSave: (startTime: string, endTime: string) => void;
  loading: boolean;
}

export const TimeEditor: React.FC<TimeEditorProps> = ({
  startTime,
  endTime,
  onSave,
  loading,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");

  const formatDateTimeForInput = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    setEditedStartTime(formatDateTimeForInput(startTime));
    setEditedEndTime(endTime ? formatDateTimeForInput(endTime) : "");
  }, [startTime, endTime]);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "مساءً" : "صباحاً";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleSave = () => {
    onSave(editedStartTime, editedEndTime);
    setIsEditing(false);
  };

  return (
    <div>
      {isEditing ? (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              وقت البدء
            </label>
            <input
              type="datetime-local"
              value={editedStartTime}
              onChange={(e) => setEditedStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              وقت الانتهاء
            </label>
            <input
              type="datetime-local"
              value={editedEndTime}
              onChange={(e) => setEditedEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
              disabled={loading || !endTime}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-2 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            حفظ التعديلات
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors mb-2"
            disabled={loading}
          >
            <Edit size={16} />
          </button>
          <p className="text-white">
            البدء: {formatDate(startTime)} - {formatTime(startTime)}
          </p>
          {endTime && (
            <p className="text-white mt-1">
              الانتهاء: {formatDate(endTime)} - {formatTime(endTime)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
