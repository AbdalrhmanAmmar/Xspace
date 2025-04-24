export interface Notification {
  id: string;
  type: 'product_low' | 'subscription_expiring' | 'reservation_upcoming';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}