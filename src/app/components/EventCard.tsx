import type { Event } from "@/db/types";

function isEventPast(dateStr: string): boolean {
  const eventDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const isPast = isEventPast(event.date);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/50 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow flex flex-col">
      {event.image && (
        <div className="relative aspect-[15/8] overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 text-center">
        <h3 className="font-['Merriweather_Sans'] font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">
          {event.title}
        </h3>

        {event.location && (
          <div className="flex items-center justify-center gap-1 text-primary text-sm mb-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{event.location}</span>
          </div>
        )}

        {event.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-4 flex-1">
            {event.description}
          </p>
        )}

        {event.details_link && (
          <a
            href={event.details_link}
            className="text-primary text-sm underline hover:text-primary-dark mb-4"
          >
            En savoir +
          </a>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto">
          <p className="text-primary font-medium mb-3">
            {formatDateFrench(event.date)}
          </p>

          <div className="flex justify-center gap-8 mb-4">
            {event.time && (
              <div className="flex flex-col items-center text-gray-500 dark:text-gray-400 text-sm">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{event.time}</span>
              </div>
            )}

            {event.price && (
              <div className="flex flex-col items-center text-gray-500 dark:text-gray-400 text-sm">
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>{event.price}</span>
              </div>
            )}
          </div>

          {event.reservation_link && !isPast && (
            <a
              href={event.reservation_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 text-white text-center font-bold bg-primary hover:bg-primary-dark transition-colors rounded-b-lg -mx-5 -mb-5 mt-4"
              style={{ width: 'calc(100% + 2.5rem)' }}
            >
              Réserver
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateFrench(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  
  const dayName = days[date.getDay()];
  const dayNum = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${dayName} ${dayNum} ${month} ${year}`;
}
