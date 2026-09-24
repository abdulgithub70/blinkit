import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import RegisterForm from "@/components/auth/RegisterForm";

// Only service_boy / hostess sign up here, so this is only reachable while
// the staff-booking feature is on.
export default function RegisterPage() {
  if (!FEATURES.staffBooking) redirect("/login");
  return <RegisterForm />;
}
