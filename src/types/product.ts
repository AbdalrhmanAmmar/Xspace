export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Checkout {
  products: CartItem[];
  startTime: Date;
  endTime: Date | null;
  hallPrice: number;
  totalPrice: number;
}