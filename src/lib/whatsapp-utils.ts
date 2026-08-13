/**
 * WhatsApp Integration Utilities for BIN USMAN
 * Official WhatsApp Contact: +923309998917 (URL format: 923309998917)
 */

export const BIN_USMAN_WHATSAPP_NUMBER = '923309998917';
export const BIN_USMAN_WHATSAPP_DISPLAY = '+92 330 9998917';

export interface WhatsAppBookingParams {
  propertyName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number | string;
  rooms: number | string;
  nights: number | string;
  totalAmount: string | number;
  guestName: string;
  phone: string;
  email: string;
  listingId: string;
  durationType?: string;
  startTime?: string;
}

/**
 * Builds the official BIN USMAN WhatsApp booking confirmation message template
 */
export function generateWhatsAppBookingMessage(params: WhatsAppBookingParams): string {
  const formattedAmount = typeof params.totalAmount === 'number' 
    ? `Rs. ${params.totalAmount.toLocaleString()}` 
    : (params.totalAmount.startsWith('Rs.') ? params.totalAmount : `Rs. ${params.totalAmount}`);

  return `Hello BIN USMAN,

I would like to book the following property:

Property: ${params.propertyName}
Location: ${params.location}
Check-in: ${params.checkIn}
Check-out: ${params.checkOut}
Guests: ${params.guests}
Rooms: ${params.rooms}
Nights: ${params.nights}
Total Amount: ${formattedAmount}

Guest Name: ${params.guestName}
Phone: ${params.phone || 'N/A'}
Email: ${params.email || 'N/A'}

Listing ID: ${params.listingId}

Please confirm my booking and provide the next steps.

Thank you.`;
}

/**
 * Generates the standard WhatsApp click-to-chat URL with proper encoding
 */
export function getWhatsAppClickToChatUrl(message: string, number: string = BIN_USMAN_WHATSAPP_NUMBER): string {
  const cleanNumber = number.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

/**
 * Triggers opening WhatsApp across Mobile and Desktop environments
 */
export function openWhatsAppChat(message: string, number: string = BIN_USMAN_WHATSAPP_NUMBER): boolean {
  const url = getWhatsAppClickToChatUrl(message, number);
  
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
    }, 500);
    return true;
  } catch (err) {
    console.error("Error launching WhatsApp:", err);
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
}
