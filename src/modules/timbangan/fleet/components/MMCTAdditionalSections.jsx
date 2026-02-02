import React from "react";
import { Info } from "lucide-react";

const MMCTAdditionalSections = ({ selectedSatker, fleetData = [] }) => {
  if (!selectedSatker || !selectedSatker.includes("MMCT")) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section 2 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Status Dumptruck
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Section ini hanya muncul untuk Mine-Mouth Coal Transaction
          </p>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    No
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Detail
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">1</td>
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                    Coal Transaction
                  </td>
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                    Mine-Mouth
                  </td>
                  <td className="px-4 py-3 text-center">Active</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">2</td>
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                    Payment Method
                  </td>
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                    Per Ton
                  </td>
                  <td className="px-4 py-3 text-center">Direct</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">3</td>
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                    Quality Control
                  </td>
                  <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                    On-Site Testing
                  </td>
                  <td className="px-4 py-3 text-center">Required</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Status Excavator Tidak Operasi
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time monitoring untuk Mine-Mouth Coal Transaction
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Status Card 1 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                Total Fleet Active
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {fleetData.length}
              </p>
            </div>

            {/* Status Card 2 */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                Total Dump Trucks
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {fleetData.reduce((sum, f) => sum + (f.dumptruckCount || 0), 0)}
              </p>
            </div>

            {/* Status Card 3 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Locations Active
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {new Set(fleetData.map((f) => f.dumpingLocation)).size}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Location
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Fleet Count
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Total Units
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(fleetData.map((f) => f.dumpingLocation))).map(
                  (location, idx) => {
                    const locationFleets = fleetData.filter(
                      (f) => f.dumpingLocation === location,
                    );
                    const totalUnits = locationFleets.reduce(
                      (sum, f) => sum + (f.dumptruckCount || 0),
                      0,
                    );

                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                      >
                        <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600">
                          {location || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                          {locationFleets.length}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600">
                          {totalUnits}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            Operational
                          </span>
                        </td>
                      </tr>
                    );
                  },
                )}

                {fleetData.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                      Tidak ada data monitoring
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MMCTAdditionalSections;