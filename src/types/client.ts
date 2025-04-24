import { CartItem } from './product';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  job?: string;
  age?: number;
  lastVisit: Date;
  createdAt: Date;
  isNewClient: boolean;
}

export interface Visit {
  id: string;
  clientName: string;
  startTime: Date;
  endTime?: Date;
  products: CartItem[];
  totalAmount?: number;
  isPaused: boolean;
  pauseHistory: {
    startTime: Date;
    endTime?: Date;
  }[];
}

export interface Subscription {
  id: string;
  clientName: string;
  type: 'أسبوعي' | 'نصف شهري' | 'شهري';
  startDate: Date;
  endDate: Date;
  price: number;
  status: 'نشط' | 'منتهي' | 'قريباً';
  totalDays: number;
  remainingDays: number;
  isFlexible: boolean;
}

export const SUBSCRIPTION_TYPES = {
  WEEKLY: 'أسبوعي',
  HALF_MONTHLY: 'نصف شهري',
  MONTHLY: 'شهري'
} as const;

export const SUBSCRIPTION_PRICES = {
  [SUBSCRIPTION_TYPES.WEEKLY]: 150,
  [SUBSCRIPTION_TYPES.HALF_MONTHLY]: 300,
  [SUBSCRIPTION_TYPES.MONTHLY]: 500
} as const;

export const SUBSCRIPTION_DAYS = {
  [SUBSCRIPTION_TYPES.WEEKLY]: 7,
  [SUBSCRIPTION_TYPES.HALF_MONTHLY]: 15,
  [SUBSCRIPTION_TYPES.MONTHLY]: 30
} as const;

export const HALLS = {
  LARGE: 'القاعة الكبيرة',
  SMALL: 'القاعة الصغيرة'
} as const;

export const HALL_PRICES = {
  [HALLS.LARGE]: 90,
  [HALLS.SMALL]: 45
} as const;

// Add Supabase database types
export interface DbClient {
  id: string;
  name: string;
  phone: string | null;
  job: string | null;
  age: number | null;
  is_new_client: boolean;
  last_visit: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DbReservation {
  id: string;
  client_id: string;
  hall_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_price: number;
  deposit_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DbHall {
  id: string;
  name: string;
  price_per_hour: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}