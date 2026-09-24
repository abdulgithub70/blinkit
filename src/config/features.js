// Feature flags. Anything switched off here is hidden from the UI but the code,
// routes and database tables are kept so it can be turned back on later.
//
// Staff booking (service boys / hostesses) is not part of the exhibition
// delivery MVP. To bring it back set NEXT_PUBLIC_FEATURE_STAFF_BOOKING=true
// (it is inlined at build time, so redeploy after changing it).
export const FEATURES = {
  staffBooking: process.env.NEXT_PUBLIC_FEATURE_STAFF_BOOKING === "true",
};

// Categories (by slug) grouped under "Food court" on the home page. Until food
// vendors exist these are simply normal products in normal categories.
export const FOOD_COURT_CATEGORY_SLUGS = ["breakfast", "lunch", "fast-food", "desserts"];
