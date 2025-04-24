import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/notification';

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    audio.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    audio.preload = 'auto';
    audioRef.current = audio;

    // Load the audio
    audio.load();
    
    fetchNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = {
            id: payload.new.id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            read: payload.new.read,
            createdAt: new Date(payload.new.created_at),
          };
          setNotifications(prev => [newNotification, ...prev]);
          
          // Play sound for product_low notifications
          if (payload.new.type === 'product_low' && audioRef.current) {
            // Reset audio to start
            audioRef.current.currentTime = 0;
            // Play the sound
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Error playing notification sound:', error);
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedNotifications = data.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        createdAt: new Date(notification.created_at),
      }));

      setNotifications(formattedNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute left-0 mt-2 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2">
          <h3 className="px-4 py-2 text-sm font-medium text-slate-300 border-b border-slate-700">
            الإشعارات
          </h3>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-3 text-center text-slate-400">
                جاري التحميل...
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`px-4 py-3 hover:bg-slate-700/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-slate-700/20' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-white">{notification.title}</p>
                  <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {notification.createdAt.toLocaleString('ar-SA')}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-slate-400">
                لا توجد إشعارات
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};