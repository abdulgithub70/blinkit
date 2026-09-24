import { Phone, Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Contact Support</h1>

      <p className="text-gray-700 mb-6">
        Need help or have questions? Our support team is always here for you.
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Phone className="text-gray-600" />
          <span>+91 8587879712, +91 7053851429</span>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="text-gray-600" />
          <span>abd.support@expoease.com</span>
        </div>

        <div className="flex items-center gap-3">
          <MapPin className="text-gray-600" size={45} />
          <span>Pragati Maidan, Noida Expo Mart, YashBhoomi(Dwarka ) New Delhi, India</span>
        </div>
      </div>

      <p className="text-gray-600 mt-8 text-sm">
        Working Hours : (09:00 AM – 8:00 PM)
      </p>
    </div>
  );
}
