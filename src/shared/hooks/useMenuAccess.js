import { useMemo } from 'react';

/**
 * Hook untuk memoize menu access checks
 * Mencegah multiple calls dengan caching hasil access check
 */
export const useMenuAccess = (menuItems, isMenuAccessible) => {
  const accessMap = useMemo(() => {
    const map = {};
    
    const buildMap = (items) => {
      if (!Array.isArray(items)) return;
      
      items.forEach(item => {
        if (!item) return;
        
        try {
          map[item.name] = isMenuAccessible(item);
        } catch (error) {
          console.error(`Error checking access for ${item.name}:`, error);
          map[item.name] = false;
        }
        
        // Recursive check for children
        if (item.children && Array.isArray(item.children)) {
          buildMap(item.children);
        }
      });
    };
    
    buildMap(menuItems);
    return map;
  }, [menuItems, isMenuAccessible]);

  const checkMenuAccess = (item) => {
    if (!item) return false;
    return accessMap[item.name] ?? false;
  };

  const hasAccessToParent = (item) => {
    if (!item) return false;
    
    const hasDirectAccess = checkMenuAccess(item);
    const hasChildAccess = item.children?.some(child => checkMenuAccess(child)) ?? false;
    
    return hasDirectAccess || hasChildAccess;
  };

  return { checkMenuAccess, hasAccessToParent };
};
