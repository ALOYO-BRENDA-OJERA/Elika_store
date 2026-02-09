// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  imageLabels?: string[];
  category: string;
  categorySlug?: string;
  features?: string[];
  subcategory?: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  featured?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
}

// Cart types
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

// Order types
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'mtn_momo' | 'airtel_money' | 'card';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  region: string;
  country: string;
}

// User types
export type UserRole = 'customer' | 'admin' | 'moderator';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  addresses: Address[];
  createdAt: string;
}

// Filter types
export interface ProductFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  sortBy: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular';
}
