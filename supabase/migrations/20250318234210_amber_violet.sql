-- تعطيل Row Level Security مؤقتًا
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;

-- إضافة عمود created_by
ALTER TABLE public.clients ADD COLUMN created_by uuid;
ALTER TABLE public.products ADD COLUMN created_by uuid;
ALTER TABLE public.halls ADD COLUMN created_by uuid;
ALTER TABLE public.reservations ADD COLUMN created_by uuid;
ALTER TABLE public.subscriptions ADD COLUMN created_by uuid;
ALTER TABLE public.sales ADD COLUMN created_by uuid;
ALTER TABLE public.sale_items ADD COLUMN created_by uuid;

-- إنشاء جدول العملاء مع عمود created_by
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  job text,
  age integer,
  is_new_client boolean DEFAULT true,
  last_visit timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- إنشاء جدول المنتجات مع عمود created_by
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- إنشاء جدول القاعات مع عمود created_by
CREATE TABLE public.halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_per_hour numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- إنشاء جدول الحجوزات مع عمود created_by
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  total_price numeric NOT NULL,
  deposit_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- إنشاء جدول الاشتراكات مع عمود created_by
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  price numeric NOT NULL,
  total_days integer NOT NULL,
  remaining_days integer NOT NULL,
  is_flexible boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- إنشاء جدول المبيعات مع عمود created_by
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  hall_price numeric DEFAULT 0,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- إنشاء جدول عناصر المبيعات مع عمود created_by
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid -- عمود الذي يخزن من أنشأ السجل
);

-- تمكين Row Level Security مجددًا
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات للمستخدمين المصادق عليهم
CREATE POLICY "Allow authenticated users to manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sales"
  ON public.sales FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sale_items"
  ON public.sale_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- إدخال القاعات الافتراضية مع تحديد عمود created_by
INSERT INTO public.halls (name, price_per_hour, created_by)
VALUES 
  ('القاعة الكبيرة', 90, 'adminguid_here'),
  ('القاعة الصغيرة', 45, 'adminguid_here');
