import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle2, CreditCard } from "lucide-react";

const FleetSummary = ({ fleetInfo, hullNo, rfidTapDetected }) => {
  return (
    <Card className="border-green-200 bg-green-50 m-0 p-0">
      <CardContent className="py-3">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Fleet: {fleetInfo.name}
          </span>
          <Badge className="bg-green-600 text-xs">{hullNo}</Badge>
          {rfidTapDetected && (
            <Badge className="bg-purple-600 text-xs animate-pulse">
              <CreditCard className="w-3 h-3 mr-1" />
              RFID
            </Badge>
          )}
        </div>

        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <div className="text-gray-500">Excavator</div>
              <div className="font-semibold text-gray-900">
                {fleetInfo.excavator}
              </div>
              {fleetInfo.operator && (
                <>
                  <div className="text-gray-500 mt-2">Operator</div>
                  <div className="font-medium text-blue-600">
                    {fleetInfo.operator}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-gray-500">Loading</div>
              <div className="font-semibold text-blue-600">
                {fleetInfo.loadingLocation}
              </div>
              <div className="text-gray-500 mt-2">Dumping</div>
              <div className="font-semibold text-red-600">
                {fleetInfo.dumpingLocation}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-gray-500">Shift</div>
              <Badge variant="outline" className="text-xs">
                {fleetInfo.shift}
              </Badge>
              <div className="text-gray-500 mt-2">Tanggal</div>
              <div className="font-medium">
                {new Date(fleetInfo.date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-gray-500">Inspector</div>
              <div className="font-medium">{fleetInfo.inspector}</div>
              <div className="text-gray-500 mt-2">Checker</div>
              <div className="font-medium">{fleetInfo.checker}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetSummary;