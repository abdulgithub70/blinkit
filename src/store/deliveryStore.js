import { create } from "zustand";
import { persist } from "zustand/middleware";

// Where (and to whom) the customer wants things delivered. Remembered between
// visits so a busy exhibitor only types it once.
export const useDeliveryStore = create(
  persist(
    (set) => ({
      exhibitionId: null,
      hall: "",
      stall: "",
      stallName: "",
      name: "",
      phone: "",

      setDelivery: (patch) => set(patch),

      // Halls belong to a venue, so changing venue clears the hall.
      setExhibition: (id) =>
        set((state) =>
          state.exhibitionId === id ? {} : { exhibitionId: id, hall: "" }
        ),

      resetDelivery: () =>
        set({ exhibitionId: null, hall: "", stall: "", stallName: "", name: "", phone: "" }),
    }),
    { name: "stall-delivery", version: 1 }
  )
);
