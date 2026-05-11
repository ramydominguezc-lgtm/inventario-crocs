export type ProductCategory = 'crocs' | 'charms' | 'otros';

export interface ProductVariant {
  id: string;
  product_id: string;
  size_label: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stock_updated_at: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
  focal: string | null;
  zoom: number | null;
  created_at: string;
}

export interface Product {
  id: string;
  brand: string | null;
  name: string;
  slug: string;
  description: string | null;
  price_mxn: number | null;
  compare_at_price_mxn: number | null;
  is_new: boolean;
  is_hot: boolean;
  is_active: boolean;
  primary_image_url: string;
  hero_image_url: string | null;
  display_order: number | null;
  featured_order: number | null;
  category: ProductCategory;
  created_at: string;
  updated_at: string;
  product_variants?: ProductVariant[];
}

export type StockMovementType = 'venta' | 'baja' | 'restock' | 'ajuste';

export interface StockMovement {
  id: string;
  variant_id: string;
  product_id: string;
  delta: number;
  type: StockMovementType;
  created_at: string;
  product_variants?: { size_label: string };
}

export type RootStackParamList = {
  Landing: undefined;
  ProductList: { category: ProductCategory };
  ProductDetail: { productId: string };
  AddProduct: { category: ProductCategory };
  StockHistory: { productId: string; productName: string };
};
