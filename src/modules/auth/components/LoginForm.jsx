import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Eye, EyeOff, Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

const LoginForm = ({ onSubmit, isLoading, error, clearError }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    if (localError) setLocalError('');
    if (error) clearError();
    
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.identifier.trim()) {
      setLocalError('Username/Email is required');
      return;
    }

    if (!formData.password.trim()) {
      setLocalError('Password is required');
      return;
    }

    try {
      const result = await onSubmit(formData.identifier, formData.password);

      if (!result.success) {
        setLocalError(result.error || 'Login failed');
      }
    } catch (err) {
      setLocalError('An unexpected error occurred. Please try again.');
    }
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {displayError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{displayError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="identifier">
          Username or Email
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="identifier"
            name="identifier"
            type="text"
            value={formData.identifier}
            onChange={handleChange}
            className="pl-10 border-none dark:text-gray-200"
            placeholder="Enter your username or email "
            required
            disabled={isLoading}
            autoComplete="username"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            className="pl-10 pr-10 border-none dark:text-gray-200 "
            placeholder="Enter your password"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
          <Button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !formData.identifier.trim() || !formData.password.trim()}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4 mr-2" />
            Sign in to Hub
          </>
        )}
      </Button>
    </form>
  );
};

export default LoginForm;