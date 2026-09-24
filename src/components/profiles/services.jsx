"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function ServiceCheckout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileId = searchParams.get("profileId");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // CLIENT STATES
  const [clientName, setClientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [hallNo, setHallNo] = useState("");
  const [stallNo, setStallNo] = useState("");

  // FETCH PROFILE (CSR)
  useEffect(() => {
    if (!profileId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .maybeSingle();
        if (error) throw error;
        setProfile(data || null);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  // BOOKING HANDLER
  const handleBooking = async (e) => {
    e.preventDefault();

    if (!clientName || !mobile) {
      alert("Name & mobile are required");
      return;
    }

    setSubmitting(true);

    try {
      const { error: bookingError } = await supabase.from("service_bookings").insert({
        client_name: clientName,
        client_mobile: mobile,
        hall_no: hallNo,
        stall_no: stallNo,
        profile_id: profile.id, // only identity stored
      });

      if (!bookingError) {
        alert(
          "✅ Booking Confirmed! Our team will contact you soon. For queries, visit the contact page."
        );
        setClientName("");
        setMobile("");
        setHallNo("");
        setStallNo("");
        router.push("/"); // redirect after booking
      } else {
        alert("❌ Booking Failed");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Booking Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-36 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <p className="text-sm text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center mt-20">Profile not found</p>;
  }

  return (
    <div className="max-w-3xl mx-auto  mt-10">
      {/* PROFILE CARD */}
      <div className="bg-white shadow rounded-lg p-2">
        <Image
          src={profile.image1 || "/placeholder.png"}
          alt={profile.full_name}
          width={400}
          height={350}
          className="rounded-lg object-cover w-full h-min"
        />

        <h2 className="text-xl font-semibold mt-4">{profile.full_name}</h2>
        <p className="text-gray-600">{profile.bio}</p>
        <p className="text-sm mt-1 font-medium">Role: {profile.role}</p>
      </div>

      {/* CLIENT FORM */}
      <form
        onSubmit={handleBooking}
        className="bg-white shadow rounded-lg p-4 mt-6 space-y-4"
      >
        <h3 className="text-lg font-semibold">Client Details</h3>

        <input
          type="text"
          placeholder="Your Name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="tel"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Hall Number"
          value={hallNo}
          onChange={(e) => setHallNo(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Stall Number / Name"
          value={stallNo}
          onChange={(e) => setStallNo(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? "Booking..." : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}
