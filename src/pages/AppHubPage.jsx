  import React, { useState } from "react";
  import { useAuth } from "@/modules/auth/hooks/useAuth";
  import { authService } from "@/modules/auth/services/authService";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/shared/components/ui/card";
  import { Button } from "@/shared/components/ui/button";
  import {
    Scale,
    BarChart3,
    FileText,
    User,
    Grid3x3,
    ExternalLink,
    Lock,
  } from "lucide-react";
  import LogoutConfirmationDialog from "@/shared/components/LogoutConfirmationDialog";
  import ThemeToggle from "@/shared/components/ThemeToggle";

  const ICON_MAP = {
    Scale,
    BarChart3,
    FileText,
  };

  const SuperAppsHub = () => {
    const { logout, userName, userRole, navigateToApp, getUserApps, token } =
      useAuth();
    const [redirectingApp, setRedirectingApp] = useState(null);
    const timbanganApps = getUserApps().filter((app) =>
      app.key.startsWith("timbangan"),
    );
    const businessApps = getUserApps().filter(
      (app) => !app.key.startsWith("timbangan"),
    );

    const isAppAccessible = (app) => {
      const hasUrl = app.url && app.url.trim() !== "";
      const hasPath = app.path && app.path.trim() !== "";
      return hasUrl || hasPath;
    };

    const handleAppClick = async (app) => {
      if (!isAppAccessible(app)) {
        return;
      }
      if (app.url && app.url.trim() !== "") {
        setRedirectingApp(app.key);
        const url = new URL(app.url);

        // Auth mode per app: jwt | sso | none
        const authMode = app.authMode || "none";

        if (authMode === "jwt" && token) {
          url.searchParams.set("token", token);
        }

        if (authMode === "sso") {
          const ssoTargetApp = app.ssoTargetApp || app.key;
          const ssoResult = await authService.generateSSOToken(ssoTargetApp);
          if (ssoResult.success && ssoResult.data?.sso_token) {
            url.searchParams.set("sso_token", ssoResult.data.sso_token);
          } else {
            setRedirectingApp(null);
            return;
          }
        }

        window.location.href = url.toString();
      } else if (app.path && app.path.trim() !== "") {
        setRedirectingApp(app.key);
        if (navigateToApp) {
          navigateToApp(app.key);
        } else {
          window.location.href = app.path;
        }
      }
    };

    const handleLogout = async () => {
      await logout();
    };

    const AppCard = ({ app }) => {
      const IconComponent = ICON_MAP[app.icon] || Grid3x3;
      const hasExternalUrl = app.url && app.url.trim() !== "";
      const isAccessible = isAppAccessible(app);

      return (
        <Card
          className={`transition-all duration-300 border ${
            isAccessible
              ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 group dark:bg-gray-800"
              : "cursor-not-allowed opacity-60 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          }`}
          onClick={() => isAccessible && handleAppClick(app)}
        >
          <CardHeader className="text-center pb-4">
            <div
              className={`w-16 h-16 mx-auto rounded-full ${
                isAccessible ? app.color : "bg-gray-400 dark:bg-gray-600"
              } flex items-center justify-center text-white mb-3 transition-all duration-300 ${
                isAccessible ? "group-hover:scale-110" : ""
              } shadow-lg relative`}
            >
              <IconComponent className="h-8 w-8" />
              {!isAccessible && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                  <Lock className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2">
              {app.name}
              {hasExternalUrl && isAccessible && (
                <ExternalLink className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p
              className={`text-sm text-center mb-4 min-h-10 flex items-center justify-center ${
                isAccessible
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-500 dark:text-gray-500"
              }`}
            >
              {app.description}
            </p>

            {isAccessible ? (
              <Button
                className={`w-full cursor-pointer ${app.color} text-white transition-all duration-200 hover:shadow-md`}
                disabled={redirectingApp === app.key}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAppClick(app);
                }}
              >
                {redirectingApp === app.key ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : hasExternalUrl ? (
                  <div className="flex items-center justify-center gap-2">
                    <span>Open App</span>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                ) : (
                  "Open App"
                )}
              </Button>
            ) : (
              <Button
                disabled
                className="w-full bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Coming Soon</span>
                </div>
              </Button>
            )}
          </CardContent>
        </Card>
      );
    };

    const renderSectionHeader = ({ icon: Icon, title, color }) => (
      <div className="flex items-center mb-8">
        <div className="flex items-center space-x-4">
          <div
            className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shadow-sm`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
        <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent ml-6"></div>
      </div>
    );

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Grid3x3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Application Hub
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select an application to continue
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    {userRole}
                  </span>
                </div>
                <ThemeToggle />

                <LogoutConfirmationDialog
                  onLogout={handleLogout}
                  buttonProps={{
                    className:
                      "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800 transition-colors",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Timbangan Applications Section - DALAM 1 BARIS */}
          {timbanganApps.length > 0 && (
            <div className="mb-12">
              {renderSectionHeader({
                icon: Scale,
                title: "Timbangan",
                color: "bg-blue-500",
              })}

              {/* Grid 3 kolom untuk timbangan agar dalam 1 baris */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {timbanganApps.map((app) => (
                  <AppCard key={app.key} app={app} />
                ))}
              </div>
            </div>
          )}

          {/* Business Applications Section */}
          {businessApps.length > 0 && (
            <div className="mb-12">
              {renderSectionHeader({
                icon: ExternalLink,
                title: "Business Applications",
                color: "bg-purple-500",
              })}

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {businessApps.map((app) => (
                  <AppCard key={app.key} app={app} />
                ))}
              </div>
            </div>
          )}

          {/* No Apps Available */}
          {timbanganApps.length === 0 && businessApps.length === 0 && (
            <Card className="text-center py-16 border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
              <CardContent>
                <div className="text-gray-400 dark:text-gray-600 mb-6">
                  <Grid3x3 className="h-24 w-24 mx-auto" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  No Applications Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  You don't have access to any applications yet. Please contact
                  your administrator to request access to the applications you
                  need.
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 inline-block">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your current role:{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {userRole}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Contact your system administrator to get access to
                    applications
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  export default SuperAppsHub;
