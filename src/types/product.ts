export interface Product {
  id: string;
  name: string;
  buyPrice: string;
  price: number;
  quantity: number;
}

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