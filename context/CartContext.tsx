import React, { createContext, useContext, useMemo, useState } from 'react';

import type { Product } from '@/data/shopProducts';

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  size?: string;
  color?: string;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: Product, quantity: number, size?: string, color?: string) => void;
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const buildItemKey = (productId: string, size?: string, color?: string) => `${productId}|${size ?? ''}|${color ?? ''}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity: number, size?: string, color?: string) => {
    if (quantity < 1) return;

    const key = buildItemKey(product.id, size, color);

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.key === key);
      if (existingIndex === -1) {
        return [
          ...current,
          {
            key,
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity,
            size,
            color,
          },
        ];
      }

      return current.map((item) =>
        item.key === key ? { ...item, quantity: item.quantity + quantity } : item,
      );
    });
  };

  const incrementItem = (key: string) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  };

  const decrementItem = (key: string) => {
    setItems((current) =>
      current
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const clearCart = () => setItems([]);

  const itemCount = useMemo(
    () => items.reduce((totalCount, item) => totalCount + item.quantity, 0),
    [items],
  );

  const total = useMemo(
    () => items.reduce((runningTotal, item) => runningTotal + item.unitPrice * item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      total,
      addItem,
      incrementItem,
      decrementItem,
      removeItem,
      clearCart,
    }),
    [items, itemCount, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
