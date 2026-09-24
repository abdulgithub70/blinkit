"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import ServiceBoyCard from "@/components/profiles/serviceBoy";

export default function ServiceBoysPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServiceBoys = async () => {
        console.log("Fetching service boys..." );
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "service_boy"); // agar role nahi hai, hata dena
        console.log("Data:", data);
        console.log("Error:", error);
      if (!error && data) {
        setProfiles(data);
      }

      setLoading(false);
    };

    fetchServiceBoys();
  }, []);

  if (loading) {
  return (
    <div className="flex flex-col items-center justify-center mt-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      <p className="text-sm text-gray-500">Loading service boys...</p>
    </div>
  );
}


  return (
    <div className="p-2 rounded-2xl">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-9 rounded-[6px]">
        {profiles.map((profile) => (
          <ServiceBoyCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
}
