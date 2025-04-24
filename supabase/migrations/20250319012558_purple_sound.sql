/*
  # Complete Application Schema

  1. Tables
    - clients (Client information)
    - products (Product inventory)
    - halls (Meeting halls)
    - visits (Client visits)
    - visit_products (Products used during visits)
    - visit_pauses (Visit pause periods)
    - reservations (Hall reservations)
    - subscriptions (Client subscriptions)
    - subscription_prices (Subscription pricing)
    - hall_prices (Hall pricing)
    - notifications (System notifications)

  2. Features
    - Automatic notifications for:
      - Low product stock (≤ 5 items)
      - Subscription expiration (≤ 2 days)
      - Upcoming reservations (within 24 hours)
    - Price management for halls and subscriptions
    - Visit tracking with pause/resume
    - Subscription management
*/

-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  job text,
  age integer CHECK (age > 0),
  is_new_client boolean DEFAULT true,
  last_visit timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription_prices table
CREATE TABLE public.subscription_prices (
  id integer PRIMARY KEY DEFAULT 1,
  weekly numeric NOT NULL CHECK (weekly >= 0),
  half_monthly numeric NOT NULL CHECK (half_monthly >= 0),
  monthly numeric NOT NULL CHECK (monthly >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT subscription_prices_singleton_row CHECK (id = 1)
);

-- Create hall_prices table
CREATE TABLE public.hall_prices (
  id integer PRIMARY KEY DEFAULT 1,
  large_hall_price numeric NOT NULL CHECK (large_hall_price >= 0),
  small_hall_price numeric NOT NULL CHECK (small_hall_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT hall_prices_singleton_row CHECK (id = 1)
);

-- Create halls table
CREATE TABLE public.halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_per_hour numeric NOT NULL CHECK (price_per_hour >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create visits table
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
  is_paused boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create visit_products table
CREATE TABLE public.visit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create visit_pauses table
CREATE TABLE public.visit_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  deposit_amount numeric NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  total_days integer NOT NULL CHECK (total_days > 0),
  remaining_days integer NOT NULL CHECK (remaining_days >= 0),
  is_flexible boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to manage all data"
  ON public.clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.subscription_prices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.hall_prices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.halls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.visits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.visit_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.visit_pauses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.reservations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage all data"
  ON public.notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default prices
INSERT INTO public.subscription_prices (weekly, half_monthly, monthly)
VALUES (150, 300, 500)
ON CONFLICT (id) DO UPDATE
SET
  weekly = EXCLUDED.weekly,
  half_monthly = EXCLUDED.half_monthly,
  monthly = EXCLUDED.monthly,
  updated_at = now();

INSERT INTO public.hall_prices (large_hall_price, small_hall_price)
VALUES (90, 45)
ON CONFLICT (id) DO UPDATE
SET
  large_hall_price = EXCLUDED.large_hall_price,
  small_hall_price = EXCLUDED.small_hall_price,
  updated_at = now();

-- Create notification triggers
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

CREATE TRIGGER check_product_quantities_trigger
AFTER UPDATE OF quantity ON public.products
FOR EACH ROW
EXECUTE FUNCTION check_product_quantities();

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

CREATE TRIGGER check_subscription_expiration_trigger
AFTER INSERT OR UPDATE OF remaining_days ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION check_subscription_expiration();

CREATE OR REPLACE FUNCTION check_upcoming_reservations()
RETURNS trigger AS $$
DECLARE
  hours_until_reservation interval;
  client_name text;
BEGIN
  hours_until_reservation := NEW.start_time - now();
  
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

CREATE TRIGGER check_upcoming_reservations_trigger
AFTER INSERT OR UPDATE OF start_time ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION check_upcoming_reservations();

-- Create indexes for better performance
CREATE INDEX clients_name_idx ON public.clients(name);
CREATE INDEX products_name_idx ON public.products(name);
CREATE INDEX visits_client_id_idx ON public.visits(client_id);
CREATE INDEX visit_products_visit_id_idx ON public.visit_products(visit_id);
CREATE INDEX visit_products_product_id_idx ON public.visit_products(product_id);
CREATE INDEX visit_pauses_visit_id_idx ON public.visit_pauses(visit_id);
CREATE INDEX reservations_client_id_idx ON public.reservations(client_id);
CREATE INDEX reservations_hall_id_idx ON public.reservations(hall_id);
CREATE INDEX subscriptions_client_id_idx ON public.subscriptions(client_id);