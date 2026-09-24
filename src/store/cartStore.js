import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_QTY = 99;

// Cart lines are snapshots ({ id, name, price, image, description, quantity }).
// The database recalculates every price on checkout, so this is display-only.
export const useCartStore = create(
  persist(
    (set) => ({
      cart: [],

      addItem: (product) =>
        set((state) => {
          const existing = state.cart.find((p) => p.id === product.id);
          if (existing) {
            if (existing.quantity >= MAX_QTY) return state;
            return {
              cart: state.cart.map((p) =>
                p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
              ),
            };
          }
          return {
            cart: [
              ...state.cart,
              {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image: product.image ?? null,
                description: product.description ?? null,
                quantity: 1,
              },
            ],
          };
        }),

      // One unit less; the line disappears at zero.
      decrementItem: (id) =>
        set((state) => ({
          cart: state.cart.flatMap((p) => {
            if (p.id !== id) return [p];
            return p.quantity > 1 ? [{ ...p, quantity: p.quantity - 1 }] : [];
          }),
        })),

      // Removes the whole line.
      removeItem: (id) =>
        set((state) => ({ cart: state.cart.filter((p) => p.id !== id) })),

      removeUnavailable: () =>
        set((state) => ({ cart: state.cart.filter((p) => !p.unavailable) })),

      clearCart: () => set({ cart: [] }),

      // Refresh names/prices from the catalogue and flag lines that can no
      // longer be ordered (disabled, deleted, or sold at another exhibition).
      syncWithCatalog: (products, exhibitionId) =>
        set((state) => {
          const byId = new Map(products.map((p) => [p.id, p]));
          return {
            cart: state.cart.map((line) => {
              const p = byId.get(line.id);
              if (!p) return { ...line, unavailable: true };
              const wrongVenue =
                exhibitionId && p.exhibition_id && p.exhibition_id !== exhibitionId;
              return {
                ...line,
                name: p.name,
                price: Number(p.price),
                image: p.image ?? null,
                description: p.description ?? null,
                unavailable: !p.is_available || Boolean(wrongVenue),
              };
            }),
          };
        }),
    }),
    {
      name: "stall-cart",
      version: 1,
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);

export const selectCartCount = (state) =>
  state.cart.reduce((n, item) => n + item.quantity, 0);

export const selectCartSubtotal = (state) =>
  state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
