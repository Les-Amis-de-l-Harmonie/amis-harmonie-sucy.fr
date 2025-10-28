import { RippleButton } from "./ui/shadcn-io/ripple-button";

interface EventReservationButtonProps {
  className?: string;
}

const EventReservationButton: React.FC<EventReservationButtonProps> = ({ className }) => {
  return (
    <RippleButton
      className={className}
      onClick={() =>
        window.open(
          "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2026-sucy-en-brie",
          "_blank",
        )
      }
    >
      Réservation
    </RippleButton>
  );
};

export default EventReservationButton;