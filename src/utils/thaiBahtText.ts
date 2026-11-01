/**
 * Convert numbers to Thai Baht text format
 * e.g. 1,234.50 -> "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์"
 * e.g. 100,000.00 -> "หนึ่งแสนบาทถ้วน"
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertIntegerGroup(numberStr: string): string {
  let result = '';
  const len = numberStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numberStr.charAt(i), 10);
    const place = len - i - 1;

    if (digit !== 0) {
      if (place === 0 && digit === 1 && len > 1 && parseInt(numberStr.charAt(len - 2), 10) !== 0) {
        result += 'เอ็ด';
      } else if (place === 1 && digit === 1) {
        result += 'สิบ';
      } else if (place === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += THAI_DIGITS[digit] + THAI_PLACES[place];
      }
    }
  }

  return result;
}

export function convertToThaiBahtText(num: number): string {
  if (isNaN(num) || num === null || num === undefined) {
    return 'ศูนย์บาทถ้วน';
  }

  if (num === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Format to 2 decimal places to avoid floating point anomalies
  const fixed = absNum.toFixed(2);
  const [bahtPart, satangPart] = fixed.split('.');

  let bahtText = '';
  
  if (bahtPart === '0') {
    bahtText = '';
  } else {
    // Handle numbers larger than 10^6 (ล้าน)
    let remainingBaht = bahtPart;
    let millionsCount = 0;
    const groups: string[] = [];

    while (remainingBaht.length > 6) {
      groups.unshift(remainingBaht.slice(-6));
      remainingBaht = remainingBaht.slice(0, -6);
    }
    if (remainingBaht.length > 0) {
      groups.unshift(remainingBaht);
    }

    const groupCount = groups.length;
    for (let g = 0; g < groupCount; g++) {
      const groupText = convertIntegerGroup(groups[g]);
      const millionsIndex = groupCount - g - 1;
      if (groupText) {
        bahtText += groupText + 'ล้าน'.repeat(millionsIndex);
      }
    }
    bahtText += 'บาท';
  }

  let satangText = '';
  const satangInt = parseInt(satangPart, 10);

  if (satangInt === 0) {
    satangText = 'ถ้วน';
  } else {
    satangText = convertIntegerGroup(satangPart) + 'สตางค์';
  }

  const result = (isNegative ? 'ลบ' : '') + bahtText + satangText;
  return result || 'ศูนย์บาทถ้วน';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}
