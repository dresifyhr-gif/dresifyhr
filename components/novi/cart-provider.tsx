"use client";

/* NOVI DIZAJN — zamjena za components/providers/cart-provider.tsx SAMO u buildu s
   NEXT_PUBLIC_NOVI_DIZAJN=1 (webpack NormalModuleReplacementPlugin u next.config.mjs).
   Isti kontekst, isti localStorage ključ, isti AddToCart piksel. Razlike prema živoj datoteci:
   1) javlja dodavanje za animaciju "let u košaricu" (emitCartAdd — samo događaj),
   2) ne otvara stari prozor "Dodano" (AddToCartModal se u novom dizajnu ne montira; inače bi
      isAddModalOpen ostao true i zaključao skrol body-ja bez ikakvog prozora). */

import type { MixAddons } from "@/lib/mix";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { JERSEY_PRICE_EUR } from "@/lib/site";
import { fbTrack } from "@/lib/fbpixel";
import { emitCartAdd } from "@/components/site/fly-to-cart";

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
  category?: string; // "streetwear" → besplatna dostava
  addons?: MixAddons; // "Složi svoj mix": lopta/kapa po klubu (cijena već uključena u price)
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
  const loadedRef = useRef(false);

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

    // Prvi prolaz ima početni [] — ne smije prepisati spremljenu košaricu prije učitavanja.
    if (!loadedRef.current) { loadedRef.current = true; return; }
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
      id: `${item.slug}-${item.segment}-${item.size}${item.addons?.lopta ? `-l${item.addons.lopta}` : ""}${item.addons?.kapa ? `-k${item.addons.kapa}` : ""}${item.addons?.figura ? `-f${item.addons.figura}` : ""}-${Date.now()}`,
      price: item.price ?? JERSEY_PRICE_EUR
    };

    setItems((current) => [nextItem, ...current]);
    setRecentlyAddedItem(nextItem);
    // Samo događaj za animaciju "let u košaricu" (dodavanje iz same ladice se ne animira).
    emitCartAdd({ item: nextItem, fromCart: isDrawerOpen });

    fbTrack("AddToCart", {
      content_ids: [nextItem.slug],
      content_type: "product",
      content_name: `${nextItem.klub} ${nextItem.igrac}`,
      value: nextItem.price,
      currency: "EUR"
    });
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
