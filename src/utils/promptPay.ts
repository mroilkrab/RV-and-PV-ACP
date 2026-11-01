import QRCode from 'qrcode';

/**
 * Standard CRC16-CCITT calculation for EMVCo / PromptPay QR
 * Polynomial: 0x1021, Initial value: 0xFFFF
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const code = data.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format TLV (Tag-Length-Value) field
 */
function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Generate standard Thai EMVCo PromptPay QR string
 * @param target 13-digit Tax ID / Citizen ID or 10-digit mobile number
 * @param amount Optional transaction amount in THB
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const cleanTarget = target.replace(/[^0-9]/g, '');

  let subTagValue = '';
  if (cleanTarget.length === 13) {
    // Tax ID / National ID: Subtag 02
    subTagValue = formatTLV('00', 'A000000677010111') + formatTLV('02', cleanTarget);
  } else if (cleanTarget.length >= 9 && cleanTarget.length <= 10) {
    // Phone number: Subtag 01 (convert leading 0 to 0066)
    const formattedPhone = cleanTarget.startsWith('0') ? '0066' + cleanTarget.substring(1) : cleanTarget;
    subTagValue = formatTLV('00', 'A000000677010111') + formatTLV('01', formattedPhone.padStart(13, '0'));
  } else {
    // Default fallback to 13-digit Tax ID format
    subTagValue = formatTLV('00', 'A000000677010111') + formatTLV('02', cleanTarget.padEnd(13, '0'));
  }

  const tag29 = formatTLV('29', subTagValue);

  // Initiation method: 11 = static (no amount or reusable), 12 = dynamic (fixed amount)
  const isDynamic = typeof amount === 'number' && amount > 0;
  const tag01 = formatTLV('01', isDynamic ? '12' : '11');

  let raw = formatTLV('00', '01') + tag01 + tag29 + formatTLV('58', 'TH') + formatTLV('53', '764');

  if (isDynamic && amount) {
    const formattedAmount = amount.toFixed(2);
    raw += formatTLV('54', formattedAmount);
  }

  // Append Tag 63 with length 04, then compute checksum
  raw += '6304';
  const checksum = crc16(raw);
  return raw + checksum;
}

/**
 * Generate QR code Data URL (PNG base64) for PromptPay
 */
export async function generatePromptPayQRDataUrl(
  target: string,
  amount?: number,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: options?.width || 256,
      margin: options?.margin ?? 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate PromptPay QR code:', err);
    return '';
  }
}
