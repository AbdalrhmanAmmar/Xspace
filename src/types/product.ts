export type Category = {
  id: string;
  name: string;
  created_at?: string;
};

export type Product = {
  id: string;
  name: string;
  buyPrice: string | null;
  price: number;
  quantity: number;
  category_id?: string | null;
  category?: Category | null;
};

export interface LinkedProduct {
  id: string;
  mainProductId: string;
  linkedProductId: string;
  quantity: number;
  linkedProduct?: Product;
}

export interface CartItem extends Product {
  quantity: number;
  linkedItems?: CartItem[];
}

export interface Checkout {
  products: CartItem[];
  startTime: Date;
  endTime: Date | null;
  hallPrice: number;
  totalPrice: number;
}