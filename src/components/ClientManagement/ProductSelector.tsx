import React, { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Product } from "../../types/product";

interface ProductSelectorProps {
  products: Product[];
  onAddProduct: (productId: string, quantity: number) => void;
  isDisabled: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  onAddProduct,
  isDisabled,
}) => {
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);

  useEffect(() => {
    setFilteredProducts(
      products.filter((product) =>
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
      )
    );
  }, [productSearchTerm, products]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  const handleAddProduct = () => {
    if (newProductId) {
      onAddProduct(newProductId, newProductQuantity);
      setProductSearchTerm("");
      setNewProductId("");
      setNewProductQuantity(1);
    }
  };

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={productSearchTerm}
          onChange={(e) => setProductSearchTerm(e.target.value)}
          onFocus={() => setIsProductDropdownOpen(true)}
          onBlur={() => setTimeout(() => setIsProductDropdownOpen(false), 200)}
          placeholder="ابحث عن منتج..."
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isDisabled}
        />
        {isProductDropdownOpen && (
          <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    setNewProductId(product.id);
                    setProductSearchTerm(
                      `${product.name} - ${formatCurrency(product.price)}`
                    );
                    setIsProductDropdownOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-slate-700 cursor-pointer flex justify-between text-white"
                >
                  <span>{product.name}</span>
                  <span>{formatCurrency(product.price)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-slate-400">
                لا توجد منتجات مطابقة
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700 px-3">
        <button
          type="button"
          onClick={() =>
            setNewProductQuantity(Math.max(1, newProductQuantity - 1))
          }
          className="text-slate-400 hover:text-white"
          disabled={newProductQuantity <= 1 || isDisabled}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-white">{newProductQuantity}</span>
        <button
          type="button"
          onClick={() => setNewProductQuantity(newProductQuantity + 1)}
          className="text-slate-400 hover:text-white"
          disabled={isDisabled}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={handleAddProduct}
        disabled={!newProductId || isDisabled}
        className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        إضافة
      </button>
    </div>
  );
};
