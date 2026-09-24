"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";


export default function ServiceBoyCard({ profile }) {
  const router = useRouter();

  const images = [
    profile.image1,
    profile.image2,
    profile.image3,
    profile.image4,
    profile.image5,
  ].filter(Boolean);

  const [current, setCurrent] = useState(0);

  return (
    <div className="bg-white rounded-[8px] shadow pt-1">
      {/* CAROUSEL */}
      <div className="relative w-full h-96"> {/* height increased */}
        <Image
          src={images[current] || "/placeholder.png"}
          alt={profile.full_name}
          fill
          className="object-cover"
        />

        {/* ARROWS OVER IMAGE */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 
                            flex items-center gap-16
                            bg-gray-400/30 
                            px-2 py-1 rounded-full">
            <button
              onClick={() =>
                setCurrent(current === 0 ? images.length - 1 : current - 1)
              }
              className=" rounded-full hover:bg-blue-400 transition"
            >
              <ChevronLeft size={22} className="text-black m-0" />
            </button>
            {/* ANIMATED DIVIDER */}
            <div className="relative w-10 h-[6px] overflow-hidden rounded-full ">
              <div className="absolute inset-0 bg-green-500 animate-pulse rounded-full" />
            </div>

            <button
              onClick={() =>
                setCurrent(current === images.length - 1 ? 0 : current + 1)
              }
              className="rounded-full hover:bg-blue-400 transition"
            >
              <ChevronRight size={22} className="text-black m-0 transition" />
            </button>
          </div>
        )}
      </div>
      {/* DETAILS */}
      <h3 className="text-lg font-semibold mt-4">
        {profile.full_name}
      </h3>

      <p className="text-sm text-gray-600">{profile.bio}</p>

      {/*<p className="text-sm mt-2 font-medium">
        ₹ {profile.price_per_day} / day
      </p>
        */}
      {/* BOOK BUTTON */}
      <button
        onClick={() =>
          router.push(`/service?profileId=${profile.id}`)
        }
        className="w-full mt-4 bg-black text-white py-2 rounded-lg hover:bg-gray-800"
      >
        Book for Service
      </button>
    </div>
  );
}
