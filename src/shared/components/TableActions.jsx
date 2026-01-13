import React from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/shared/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

const TableActions = ({ actions, disabled = false }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed dark:hover:bg-gray-700"
          disabled={disabled}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700 bg-white border-none">
        {actions.map((action, idx) => (
          <DropdownMenuItem
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-200 ${
              action.variant === 'destructive' ? 'text-red-600 dark:text-red-400' : ''
            }`}
          >
            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TableActions;