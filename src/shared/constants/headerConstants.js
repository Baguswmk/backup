export const HEADER_COLORS = {
  primary: "#ea661c",
  secondary: "#656367",
};

export const HEADER_ICON_SIZES = {
  default: "w-4 h-4",
  small: "w-3 h-3",
  medium: "w-5 h-5",
};

export const HEADER_TRANSITIONS = {
  default: "transition-all duration-200",
  transform: "transition-transform duration-200",
};

export const HEADER_CLASS_NAMES = {
  navTriggerActive:
    "bg-[#ea661c] text-white hover:bg-[#ea661c] hover:text-white data-[state=open]:bg-[#ea661c]",
  navTriggerHover:
    "hover:bg-[#656367] hover:text-white data-[state=open]:bg-[#656367]",
  navMenuItemActive: "bg-orange-50 text-[#ea661c] font-medium",
  navMenuItemHover:
    "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
  borderLeft: "border-l-2 border-gray-200",
};
