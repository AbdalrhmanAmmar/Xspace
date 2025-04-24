/*
  # Add Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `type` (text) - Type of notification (product_low, subscription_expiring, reservation_upcoming)
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `read` (boolean) - Whether the notification has been read
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions and Triggers
    - Check product quantities (≤ 5 items)
    - Check subscription expiration (≤ 2 days)
    - Check upcoming reservations (within 24 hours)
*/

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to check product quantities and create notifications
CREATE OR REPLACE FUNCTION check_product_quantities()
RETURNS trigger AS $$
BEGIN
  IF NEW.quantity <= 5 AND OLD.quantity > 5 THEN
    INSERT INTO public.notifications (type, title, message)
    VALUES (
      'product_low',
      'تنبيه: مخزون منخفض',
      'المنتج ' || NEW.name || ' وصل إلى ' || NEW.quantity || ' قطع فقط'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for product quantities
DROP TRIGGER IF EXISTS check_product_quantities_trigger ON public.products;
CREATE TRIGGER check_product_quantities_trigger
AFTER UPDATE OF quantity ON public.products
FOR EACH ROW
EXECUTE FUNCTION check_product_quantities();

-- Function to check subscription expiration
CREATE OR REPLACE FUNCTION check_subscription_expiration()
RETURNS trigger AS $$
BEGIN
  IF NEW.remaining_days <= 2 AND (OLD.remaining_days > 2 OR OLD.remaining_days IS NULL) THEN
    INSERT INTO public.notifications (type, title, message)
    VALUES (
      'subscription_expiring',
      'تنبيه: اشتراك قارب على الانتهاء',
      'اشتراك العميل سينتهي خلال ' || NEW.remaining_days || ' يوم'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscription expiration
DROP TRIGGER IF EXISTS check_subscription_expiration_trigger ON public.subscriptions;
CREATE TRIGGER check_subscription_expiration_trigger
AFTER INSERT OR UPDATE OF remaining_days ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION check_subscription_expiration();

-- Function to check upcoming reservations
CREATE OR REPLACE FUNCTION check_upcoming_reservations()
RETURNS trigger AS $$
DECLARE
  hours_until_reservation interval;
  client_name text;
BEGIN
  hours_until_reservation := NEW.start_time - now();
  
  -- Get client name
  SELECT name INTO client_name
  FROM public.clients
  WHERE id = NEW.client_id;
  
  IF extract(epoch from hours_until_reservation) / 3600 <= 24 AND NEW.status = 'active' THEN
    INSERT INTO public.notifications (type, title, message)
    VALUES (
      'reservation_upcoming',
      'تنبيه: حجز قريب',
      'حجز قاعة للعميل ' || client_name || ' خلال 24 ساعة'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for upcoming reservations
DROP TRIGGER IF EXISTS check_upcoming_reservations_trigger ON public.reservations;
CREATE TRIGGER check_upcoming_reservations_trigger
AFTER INSERT OR UPDATE OF start_time ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION check_upcoming_reservations();