import React from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'info', 
  title, 
  children, 
  className, 
  ...props 
}) => {
  const baseStyles = "rounded-md p-4 border";
  
  const variantConfig = {
    info: {
      container: "bg-blue-50 border-blue-200",
      icon: <Info className="h-5 w-5 text-blue-400" />,
      title: "text-blue-800",
      content: "text-blue-700"
    },
    success: {
      container: "bg-green-50 border-green-200",
      icon: <CheckCircle className="h-5 w-5 text-green-400" />,
      title: "text-green-800",
      content: "text-green-700"
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200",
      icon: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
      title: "text-yellow-800",
      content: "text-yellow-700"
    },
    error: {
      container: "bg-red-50 border-red-200",
      icon: <AlertCircle className="h-5 w-5 text-red-400" />,
      title: "text-red-800",
      content: "text-red-700"
    }
  };

  const config = variantConfig[variant];

  return (
    <div className={cn(baseStyles, config.container, className)} {...props}>
      <div className="flex">
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="ml-3">
          {title && <h3 className={cn("text-sm font-medium", config.title)}>{title}</h3>}
          <div className={cn("text-sm", title ? "mt-2" : "", config.content)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
