import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => {
  const phoneNumber = "31851249091"; // Dutch number without leading 0, with country code
  const whatsappUrl = `https://wa.me/${phoneNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
      aria-label="Chat op WhatsApp"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </a>
  );
};

export default WhatsAppButton;
