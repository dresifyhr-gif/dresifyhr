"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { JERSEY_PRICE_EUR } from "@/lib/site";

export type CartItem = {
  id: string;
  slug: string;
  klub: string;
  igrac: string;
  size: string;
  segment: "adult" | "kid";
  segmentLabel: string;
  price: number;
  imageSrc?: string;
};

export type CartInput = Omit<CartItem, "id" | "price"> & { price?: number };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isDrawerOpen: boolean;
  isAddModalOpen: boolean;
  recentlyAddedItem: CartItem | null;
  addItem: (item: CartInput) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  closeAddModal: () => void;
};

const STORAGE_KEY = "dresify_cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [recentlyAddedItem, setRecentlyAddedItem] = useState<CartItem | null>(null);
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setItems(JSON.parse(stored) as CartItem[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.style.overflow = isDrawerOpen || isAddModalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, isAddModalOpen]);

  const addItem = (item: CartInput) => {
    const nextItem = {
      ...item,
      id: `${item.slug}-${item.segment}-${item.size}-${Date.now()}`,
      price: item.price ?? JERSEY_PRICE_EUR
    };

    setItems((current) => [nextItem, ...current]);
    setRecentlyAddedItem(nextItem);
    setIsAddModalOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setRecentlyAddedItem(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount: items.length,
        subtotal,
        isDrawerOpen,
        isAddModalOpen,
        recentlyAddedItem,
        addItem,
        removeItem,
        clearCart,
        openDrawer,
        closeDrawer,
        closeAddModal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
