"use client";

export function TheDansantClient() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <img
        src="/images/events/the-dansant.jpg"
        alt="Thé Dansant"
        className="w-full h-64 object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://placehold.co/600x400/a5b3e2/white?text=Thé+Dansant";
        }}
      />
    </div>
  );
}
