import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => {
  const phoneNumber = "31851249091";
  const message = encodeURIComponent("Hoi Harkas IT, ik wil graag mijn vraag bespreken.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/70"
      aria-label="Chat met Harkas IT via WhatsApp"
      title="Chat via WhatsApp"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" fill="white" />
    </a>
  );
};

export default WhatsAppButton;
