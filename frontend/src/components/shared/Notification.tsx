import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../../store/notificationStore';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const Notification: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => {
          let Icon = Info;
          let colorClass = 'bg-blue-50 border-blue-200 text-blue-800';
          let iconColor = 'text-blue-500';

          if (notif.type === 'success') {
            Icon = CheckCircle;
            colorClass = 'bg-green-50 border-green-200 text-green-800';
            iconColor = 'text-green-500';
          } else if (notif.type === 'error') {
            Icon = AlertCircle;
            colorClass = 'bg-red-50 border-red-200 text-red-800';
            iconColor = 'text-red-500';
          } else if (notif.type === 'warning') {
            Icon = AlertTriangle;
            colorClass = 'bg-yellow-50 border-yellow-200 text-yellow-800';
            iconColor = 'text-yellow-500';
          }

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`flex items-start p-4 border rounded-lg shadow-lg pointer-events-auto backdrop-blur-md ${colorClass}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <p className="ml-3 mr-4 text-sm font-medium flex-1">{notif.message}</p>
              <button
                onClick={() => removeNotification(notif.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
