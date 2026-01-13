import { useAuth } from '@/modules/auth/hooks/useAuth';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { ShieldX } from 'lucide-react';

export const RoleBasedRoute = ({ children, allowedRoles }) => {
    const { getUserRole, hasRole } = useAuth();
    const userRole = getUserRole();
    
    if (!hasRole(allowedRoles)) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full">
                    <Alert className="border-red-200 bg-red-50">
                        <ShieldX className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            <div className="space-y-2">
                                <p className="font-semibold">Access Denied</p>
                                <p>You don't have permission to access this page.</p>
                                <div className="text-sm">
                                    <p>Your role: <strong>{userRole}</strong></p>
                                    <p>Required roles: <strong>{Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles}</strong></p>
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return children;
};