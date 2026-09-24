import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_ORDERS = 20;

// Guests have no account, so the browser remembers the ids of orders it placed
// (the order id is also the secret used to look the order up).
export const useMyOrdersStore = create(
  persist(
    (set) => ({
      ids: [],
      addOrder: (id) =>
        set((state) =>
          state.ids.includes(id)
            ? state
            : { ids: [id, ...state.ids].slice(0, MAX_ORDERS) }
        ),
    }),
    { name: "stall-my-orders", version: 1 }
  )
);
