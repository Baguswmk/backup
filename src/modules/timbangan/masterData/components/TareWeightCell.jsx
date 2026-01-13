import { Badge } from "@/shared/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
const TARE_WEIGHT_EXPIRY_DAYS = 7;

const getTareWeightStatus = (tareWeight, updatedAt) => {
  if (!tareWeight || !updatedAt) {
    return {
      status: "missing",
      severity: "error",
      message: "Belum ada data tare weight",
      daysRemaining: 0,
    };
  }

  const now = new Date();
  const updated = new Date(updatedAt);
  const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  const daysRemaining = TARE_WEIGHT_EXPIRY_DAYS - daysDiff;

  if (daysDiff >= TARE_WEIGHT_EXPIRY_DAYS) {
    return {
      status: "expired",
      severity: "error",
      message: `Kadaluarsa ${daysDiff} hari`,
      daysRemaining: 0,
    };
  } else if (daysRemaining <= 2) {
    return {
      status: "warning",
      severity: "warning",
      message: `${daysRemaining} hari lagi`,
      daysRemaining,
    };
  } else {
    return {
      status: "valid",
      severity: "success",
      message: `${daysRemaining} hari lagi`,
      daysRemaining,
    };
  }
};

export const TareWeightCell = ({ tareWeight, updatedAt }) => {
  if (!tareWeight || tareWeight === 0) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Belum
      </Badge>
    );
  }

  const status = getTareWeightStatus(tareWeight, updatedAt);

  const variantMap = {
    valid: { className: "bg-green-100 text-green-800", icon: CheckCircle },
    warning: { className: "bg-orange-100 text-orange-800", icon: Clock },
    expired: { className: "bg-red-100 text-red-800", icon: AlertTriangle },
    missing: { className: "bg-gray-100 text-gray-600", icon: AlertTriangle },
  };

  const config = variantMap[status.status] || variantMap.missing;
  const Icon = config.icon;

  return (
    <div className="space-y-1">
      <Badge variant="secondary" className={cn(
  config.className,
  "dark:bg-opacity-30" 
)}>
        <Icon className="w-3 h-3 mr-1" />
        {typeof tareWeight === "number" ? tareWeight.toFixed(2) : "0.00"}t
      </Badge>
      <p className="text-xs text-gray-500">{status.message}</p>
    </div>
  );
};
