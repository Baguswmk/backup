import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import {  Menu, X, ChevronRight, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import useAuthStore from '@/modules/auth/store/authStore';
import LogoutConfirmationDialog from '@/shared/components/LogoutConfirmationDialog';
import { showToast } from '@/shared/utils/toast';
import { useMenuAccess } from '@/shared/hooks/useMenuAccess';
import ThemeToggle from '@/shared/components/ThemeToggle';

export const Header = ({
  activeMenu,
  setActiveMenu,
  menuItems,
  isMenuAccessible,
  extraHeaderContent
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { checkMenuAccess } = useMenuAccess(menuItems, isMenuAccessible);

  const isActive = useMemo(() => {
    return (item) => {
      if (!item) return false;
      if (item.name === activeMenu) return true;
      if (item.children && Array.isArray(item.children)) {
        return item.children.some(child => {
          if (child?.name === activeMenu) return true;
          if (child?.children && Array.isArray(child.children)) {
            return child.children.some(grandchild => grandchild?.name === activeMenu);
          }
          return false;
        });
      }
      return false;
    };
  }, [activeMenu]);

  const handleMenuClick = useCallback((menuName, item) => {
    if (item?.children && item.children.length > 0) return;
    if (!item || !checkMenuAccess(item)) return;
    
    setActiveMenu(menuName);
    setIsMobileMenuOpen(false);
  }, [checkMenuAccess, setActiveMenu]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    const loadingToastId = showToast.loading('Logging out...');
    
    try {
      const { logout } = useAuthStore.getState();
      await logout();
      
      showToast.safeDismiss(loadingToastId);
      showToast.success('Logged out successfully');
      
      window.location.replace('/timbangan-internal/login');
    } catch (error) {
      console.error('Logout error:', error);
      showToast.safeDismiss(loadingToastId);
      showToast.error('Logout failed. Please try again.', {
        description: error.message || 'An unexpected error occurred'
      });
      
      setTimeout(() => {
        window.location.replace('/timbangan-internal/login');
      }, 2000);
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  const toggleMobileSubmenu = useCallback((itemPath) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemPath]: !prev[itemPath]
    }));
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-white dark:bg-slate-900 shadow-sm z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto sm:pr-1 sm:pl-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Extra Content */}
          <div className="flex items-center space-x-4">
            {extraHeaderContent}
          </div>

          {/* Desktop Navigation with Dropdown */}
          <nav className="hidden lg:flex items-center space-x-2">
            {menuItems.map((item) => {
              if (!item) return null;
              
              const hasChildren = item.children && item.children.length > 0;
              
              // ✅ HIDE menu jika tidak ada akses
              // Check akses parent atau child
              const hasAccess = checkMenuAccess(item) || 
                (hasChildren && item.children.some(child => checkMenuAccess(child)));

              // ✅ RETURN NULL = HIDE menu
              if (!hasAccess) return null;

              const ParentIcon = item.icon;

              // Menu with children (dropdown)
              if (hasChildren) {
                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={isActive(item) ? 'default' : 'ghost'}
                        className={cn(
                          "transition-all duration-200 cursor-pointer",
                          isActive(item)
                            ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] hover:text-white dark:bg-[#ea661c]'
                            : 'hover:bg-[#656367] hover:text-white dark:hover:bg-slate-700 dark:text-gray-200'
                        )}
                      >
                        {ParentIcon && <ParentIcon className="w-5 h-5 mr-2" />}
                        {item.name}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-56 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                    >
                      {item.children.map((child) => {
                        if (!child) return null;
                        
                        const ChildIcon = child.icon;
                        const hasGrandchildren = child.children && child.children.length > 0;
                        
                        // ✅ HIDE child jika tidak ada akses
                        const childAccessible = checkMenuAccess(child) || 
                          (hasGrandchildren && child.children.some(gc => checkMenuAccess(gc)));
                        
                        if (!childAccessible) return null;
                        
                        // Level 2 with Level 3 children (nested dropdown)
                        if (hasGrandchildren) {
                          return (
                            <DropdownMenuSub key={child.name}>
                              <DropdownMenuSubTrigger
                                className={cn(
                                  "cursor-pointer",
                                  activeMenu === child.name || child.children.some(gc => gc?.name === activeMenu)
                                    ? "bg-orange-50 dark:bg-orange-900/20 text-[#ea661c] dark:text-orange-400"
                                    : "dark:text-gray-200 dark:hover:bg-slate-700"
                                )}
                              >
                                {ChildIcon && <ChildIcon className="w-4 h-4 mr-2" />}
                                <span>{child.name}</span>
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="w-56 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                                {child.children.map((grandchild) => {
                                  if (!grandchild) return null;
                                  
                                  const GrandchildIcon = grandchild.icon;
                                  const grandchildAccessible = checkMenuAccess(grandchild);
                                  
                                  // ✅ HIDE grandchild jika tidak ada akses
                                  if (!grandchildAccessible) return null;
                                  
                                  return (
                                    <DropdownMenuItem
                                      key={grandchild.name}
                                      onClick={() => handleMenuClick(grandchild.name, grandchild)}
                                      className={cn(
                                        "cursor-pointer",
                                        activeMenu === grandchild.name
                                          ? "bg-orange-100 dark:bg-orange-900/30 text-[#ea661c] dark:text-orange-400 font-semibold "
                                          : "dark:text-gray-200 dark:hover:bg-slate-700"
                                      )}
                                    >
                                      {GrandchildIcon && <GrandchildIcon className="w-4 h-4 mr-2" />}
                                      <span>{grandchild.name}</span>
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          );
                        }
                        
                        // Level 2 without children (leaf node)
                        return (
                          <DropdownMenuItem
                            key={child.name}
                            onClick={() => handleMenuClick(child.name, child)}
                            className={cn(
                              "cursor-pointer",
                              activeMenu === child.name
                                ? "bg-orange-50 dark:bg-orange-900/20 text-[#ea661c] dark:text-orange-400 font-medium"
                                : "dark:text-gray-200"
                            )}
                          >
                            {ChildIcon && <ChildIcon className="w-4 h-4 mr-2" />}
                            <span>{child.name}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              // Standalone menu (no children)
              return (
                <Button
                  key={item.name}
                  onClick={() => handleMenuClick(item.name, item)}
                  variant={activeMenu === item.name ? 'default' : 'ghost'}
                  className={cn(
                    "transition-all duration-200 cursor-pointer",
                    activeMenu === item.name 
                      ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] hover:text-white dark:bg-[#ea661c]' 
                      : 'hover:text-white hover:bg-[#656367] dark:hover:bg-slate-700 dark:text-gray-200'
                  )}
                >
                  {ParentIcon && <ParentIcon className="w-5 h-5 mr-2" />}
                  {item.name}
                </Button>
              );
            })}
          </nav>

          {/* Actions (mobile toggle + theme + logout) */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden dark:text-gray-200 dark:hover:bg-slate-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            <ThemeToggle />

            <LogoutConfirmationDialog 
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden bg-white dark:bg-slate-900 transition-colors duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-2 space-y-1">
            {menuItems.map((item) => {
              if (!item) return null;
              
              const hasChildren = item.children && item.children.length > 0;
              
              // ✅ HIDE menu di mobile jika tidak ada akses
              const hasAccess = checkMenuAccess(item) || 
                (hasChildren && item.children.some(child => checkMenuAccess(child)));

              if (!hasAccess) return null;

              const ParentIcon = item.icon;
              const isDropdownOpen = openDropdowns[item.name];

              // Menu with children
              if (hasChildren) {
                return (
                  <div key={item.name}>
                    <Button
                      onClick={() => toggleMobileSubmenu(item.name)}
                      variant={isActive(item) ? 'default' : 'ghost'}
                      className={cn(
                        "w-full justify-between transition-all duration-200",
                        isActive(item) 
                          ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] dark:bg-[#ea661c]' 
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                      )}
                      aria-expanded={isDropdownOpen}
                    >
                      <span className="flex items-center gap-2">
                        {ParentIcon && <ParentIcon className="w-5 h-5" />}
                        {item.name}
                      </span>
                      <ChevronRight 
                        className={cn(
                          "w-5 h-5 transition-transform duration-200",
                          isDropdownOpen && 'rotate-90'
                        )}
                      />
                    </Button>
                    
                    {isDropdownOpen && (
                      <div className="ml-4 mt-1 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-slate-700">
                        {item.children.map((child) => {
                          if (!child) return null;
                          
                          const ChildIcon = child.icon;
                          const hasGrandchildren = child.children && child.children.length > 0;
                          const childPath = `${item.name}-${child.name}`;
                          const isChildDropdownOpen = openDropdowns[childPath];
                          
                          // ✅ HIDE child di mobile jika tidak ada akses
                          const childAccessible = checkMenuAccess(child) ||
                            (hasGrandchildren && child.children.some(gc => checkMenuAccess(gc)));
                          
                          if (!childAccessible) return null;
                          
                          // Level 2 with Level 3 children
                          if (hasGrandchildren) {
                            return (
                              <div key={child.name}>
                                <Button
                                  onClick={() => toggleMobileSubmenu(childPath)}
                                  variant={activeMenu === child.name || child.children.some(gc => gc?.name === activeMenu) ? 'default' : 'ghost'}
                                  className={cn(
                                    "w-full justify-between text-sm transition-all duration-200",
                                    activeMenu === child.name || child.children.some(gc => gc?.name === activeMenu)
                                      ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] dark:bg-[#ea661c]' 
                                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                                  )}
                                  aria-expanded={isChildDropdownOpen}
                                >
                                  <span className="flex items-center gap-2">
                                    {ChildIcon && <ChildIcon className="w-4 h-4" />}
                                    {child.name}
                                  </span>
                                  <ChevronDown 
                                    className={cn(
                                      "w-4 h-4 transition-transform duration-200",
                                      isChildDropdownOpen && 'rotate-180'
                                    )}
                                  />
                                </Button>
                                
                                {isChildDropdownOpen && (
                                  <div className="ml-4 mt-1 space-y-1 pl-2 border-l-2 border-orange-200 dark:border-orange-800">
                                    {child.children.map((grandchild) => {
                                      if (!grandchild) return null;
                                      
                                      const GrandchildIcon = grandchild.icon;
                                      const grandchildAccessible = checkMenuAccess(grandchild);
                                      
                                      // ✅ HIDE grandchild di mobile jika tidak ada akses
                                      if (!grandchildAccessible) return null;
                                      
                                      return (
                                        <Button
                                          key={grandchild.name}
                                          onClick={() => handleMenuClick(grandchild.name, grandchild)}
                                          variant={activeMenu === grandchild.name ? 'default' : 'ghost'}
                                          className={cn(
                                            "w-full justify-start text-xs transition-all duration-200",
                                            activeMenu === grandchild.name 
                                              ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] dark:bg-[#ea661c]' 
                                              : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                                          )}
                                        >
                                          <span className="flex items-center gap-2">
                                            {GrandchildIcon && <GrandchildIcon className="w-4 h-4" />}
                                            {grandchild.name}
                                          </span>
                                        </Button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // Level 2 without children (leaf node)
                          return (
                            <Button
                              key={child.name}
                              onClick={() => handleMenuClick(child.name, child)}
                              variant={activeMenu === child.name ? 'default' : 'ghost'}
                              className={cn(
                                "w-full justify-start text-sm transition-all duration-200",
                                activeMenu === child.name 
                                  ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] dark:bg-[#ea661c]' 
                                  : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                              )}
                            >
                              <span className="flex items-center gap-2">
                                {ChildIcon && <ChildIcon className="w-5 h-5" />}
                                {child.name}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Standalone menu
              return (
                <Button
                  key={item.name}
                  onClick={() => handleMenuClick(item.name, item)}
                  variant={activeMenu === item.name ? 'default' : 'ghost'}
                  className={cn(
                    "w-full justify-start transition-all duration-200",
                    activeMenu === item.name 
                      ? 'bg-[#ea661c] text-white hover:bg-[#ea661c] dark:bg-[#ea661c]' 
                      : 'hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {ParentIcon && <ParentIcon className="w-5 h-5" />}
                    {item.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};