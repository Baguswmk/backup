import React, { useState, useEffect } from "react";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { getWorkShiftInfo  } from "@/shared/utils/date";
import { getCurrentShift } from "@/shared/utils/shift";

const InformationDays = ({
  selectedDate,
  selectedShift,
  selectedGroup,
  selectedSatker,
  selectedUrutkan,
  onSatkerChange,
  onUrutkanChange,
  workUnits = [],
  locations = [],
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workShiftInfo, setWorkShiftInfo] = useState(getWorkShiftInfo());

  // Update waktu setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setWorkShiftInfo(getWorkShiftInfo());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format hari saja (contoh: Kamis)
  const formatDay = (date) => {
    if (!date) {
      const options = { weekday: "long" };
      return currentTime.toLocaleDateString("id-ID", options);
    }
    const options = { weekday: "long" };
    return new Date(date).toLocaleDateString("id-ID", options);
  };

  // Format tanggal saja (contoh: 29 Januari 2026)
  const formatDate = (date) => {
    if (!date) {
      const options = { year: "numeric", month: "long", day: "numeric" };
      return currentTime.toLocaleDateString("id-ID", options);
    }
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(date).toLocaleDateString("id-ID", options);
  };

  // Format shift
  const formatShift = (shift) => {
    if (!shift) {
      const currentShift = getCurrentShift();
      return currentShift;
    }
    return shift;
  };

  // Format jam real-time (HH:MM:SS)
  const formatTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, "0");
    const minutes = String(currentTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentTime.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left Column - Information */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hari :</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatDay(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tanggal :</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatDate(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shift :</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatShift(selectedShift)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Jam :</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatTime()}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Column - Group Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Group :</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {selectedGroup || "D"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="w-full">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Satker
              </p>
              <select
                value={selectedSatker || ""}
                onChange={(e) => onSatkerChange(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">All</option>
                {workUnits.map((wu) => (
                  <option key={wu.id} value={wu.subsatker}>
                    {wu.subsatker}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column - Urutkan Berdasarkan */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="w-full">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Urutkan Berdasarkan
              </p>
              <select
                value={selectedUrutkan || ""}
                onChange={(e) => onUrutkanChange(e.target.value)}
                   className="w-full px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All</option>
                <option value="dumping">Dumping Point</option>
                <option value="loading">Loading Point</option>
                <option value="mitra">Mitra</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationDays;