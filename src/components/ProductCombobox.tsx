// ✅ ProductCombobox.tsx

'use client';
import { useState, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { Check, ChevronUpDown } from 'lucide-react';
import type { Product } from '../types/product';

interface Props {
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  disabled?: boolean;
}

export const ProductCombobox = ({
  products,
  selectedProductId,
  setSelectedProductId,
  disabled = false,
}: Props) => {
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    products.find((p) => p.id === selectedProductId) || null
  );

  useEffect(() => {
    const match = products.find((p) => p.id === selectedProductId) || null;
    setSelectedProduct(match);
  }, [selectedProductId, products]);

  const filteredProducts =
    query === ''
      ? products
      : products.filter((product) =>
          product.name.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Combobox
      value={selectedProductId}
      onChange={(id) => setSelectedProductId(id)}
      disabled={disabled}
    >
      <div className="relative">
        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-slate-800 text-white border border-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 bg-transparent focus:outline-none"
            displayValue={() =>
              selectedProduct ? `${selectedProduct.name} - ${selectedProduct.price} جنيه` : ''
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن منتج..."
          />
          <Combobox.Button className="absolute inset-y-0 left-0 flex items-center pl-2">
            <ChevronUpDown className="h-4 w-4 text-slate-400" />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-slate-900 text-white shadow-lg border border-slate-700 z-50">
            {filteredProducts.length === 0 ? (
              <div className="relative cursor-default select-none px-4 py-2 text-slate-400">
                لا يوجد نتائج.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Combobox.Option
                  key={product.id}
                  value={product.id}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 px-4 ${
                      active ? 'bg-blue-600 text-white' : 'text-white'
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {product.name} - {product.price} جنيه
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-2 flex items-center">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
};
