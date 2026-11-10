export interface CreateProductInput {
  productname: string;
  productquantity: number;
  productprice: number;
  imageKey: string;
  categoryId?: string;
}

export interface EditProductInput {
  productquantity: number;
  productprice: number;
  imageKey: string;
  categoryId?: string;
}

export const productService = {
  validateCreate: (data: CreateProductInput): { valid: boolean; error?: string } => {
    if (!data.productname || data.productname.length < 3) {
      return { valid: false, error: 'Product name must be at least 3 characters' };
    }
    if (data.productquantity < 1) {
      return { valid: false, error: 'Quantity must be at least 1' };
    }
    if (data.productprice <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }
    if (!data.imageKey) {
      return { valid: false, error: 'Please upload a product image' };
    }
    return { valid: true };
  },

  validateEdit: (data: EditProductInput): { valid: boolean; error?: string } => {
    if (data.productquantity < 0) {
      return { valid: false, error: 'Quantity cannot be negative' };
    }
    if (data.productprice <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }
    if (!data.imageKey) {
      return { valid: false, error: 'Please upload a product image' };
    }
    return { valid: true };
  },

  formatPrice: (price?: number | null): string => {
    const val = Number(price || 0);
    return `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },
};
