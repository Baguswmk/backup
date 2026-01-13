import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

export const ExpandableList = ({
  items = [],
  labelKey = "name",
  icon: Icon,
  badgeKey,
  emptyText = "No data",
  badgeVariant = () => "secondary",
  titleSingular = "item",
  titlePlural = "items",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!items || items.length === 0) {
    return <span className="text-gray-400">{emptyText}</span>;
  }

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded((s) => !s)}
        className="h-auto py-1 px-2 font-normal hover:bg-gray-100 cursor-pointer"
      >
        <Badge variant="secondary" className="mr-1">
          {items.length}
        </Badge>
        <span className="text-xs">
          {items.length === 1 ? titleSingular : titlePlural}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </Button>

      {isExpanded && (
        <div className="pl-2 space-y-1">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-2 text-xs"
            >
              {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
              <span>{item[labelKey]}</span>
              {badgeKey && (
                <Badge variant={badgeVariant(item)} className="text-xs">
                  {item[badgeKey]}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
