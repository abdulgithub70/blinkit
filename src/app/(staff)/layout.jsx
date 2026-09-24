import { FEATURES } from "@/config/features";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";

// Staff booking (service boys / hostesses) is hidden in the exhibition-
// delivery MVP but kept working behind NEXT_PUBLIC_FEATURE_STAFF_BOOKING,
// using its original chrome.
export default function StaffLayout({ children }) {
  if (!FEATURES.staffBooking) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold text-slate-800">This feature isn&apos;t available right now</p>
          <p className="mt-1 text-sm text-slate-500">Please check back later.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="pt-28">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
