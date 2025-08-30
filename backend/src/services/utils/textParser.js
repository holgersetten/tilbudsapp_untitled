class TextParser {
  static normalize(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/æ/g, "ae")
      .replace(/ø/g, "o") 
      .replace(/å/g, "aa")
      .replace(/[,;:()\[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static tokenize(text) {
    if (!text) return [];
    const normalized = this.normalize(text);
    return normalized
      .replace(/[\-–—_/+×]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  static parsePackSize(text) {
    if (!text) return null;
    
    const sizeRegex = /(?:(\d+)\s*(?:x|×|stk\.?)\s*)?(\d+[.,]?\d*)\s*(kg|g|hg|l|dl|cl|ml|stk)\b/i;
    const match = text.match(sizeRegex);
    
    if (!match) return null;
    
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const amount = parseFloat(match[2].replace(',', '.'));
    const unit = match[3].toLowerCase();
    
    // Konverter til basis-enhet (gram/milliliter)
    let amountInBase = amount;
    if (unit === "kg") amountInBase = amount * 1000;
    if (unit === "hg") amountInBase = amount * 100;
    if (unit === "l") amountInBase = amount * 1000;
    if (unit === "dl") amountInBase = amount * 100;
    if (unit === "cl") amountInBase = amount * 10;
    
    return {
      count,
      amount,
      unit,
      totalAmount: count * amountInBase,
      baseUnit: ['l', 'dl', 'cl', 'ml'].includes(unit) ? 'ml' : 'g'
    };
  }

  static parseAttributes(text) {
    if (!text) return {};
    
    const normalized = this.normalize(text);
    const tokens = this.tokenize(text);
    
    const attributes = {};
    
    // Norske merker
    const norwegianBrands = new Set([
      "tine", "q", "synnove", "prior", "gilde", "first price", 
      "rema", "eldorado", "toro", "freia", "uncle ben", "nortura",
      "leroy", "salmar", "stabburet", "finsbråten", "jarlsberg",
      "president", "bakehuset", "mutti", "santa maria", "old el paso",
      "barilla", "mission"
    ]);
    
    for (const token of tokens) {
      if (norwegianBrands.has(token)) {
        attributes.brand = token;
        break;
      }
    }
    
    // Spesielle egenskaper på norsk
    attributes.organic = /\b(øko|økologisk|organic|naturell)\b/i.test(normalized);
    attributes.lactoseFree = /\b(laktosefri|laktosefritt|lactose free)\b/i.test(normalized);
    attributes.frozen = /\b(frossen|fryst|dypfryst|frozen)\b/i.test(normalized);
    attributes.fresh = /\b(fersk|fresh|ferskt)\b/i.test(normalized);
    attributes.lowFat = /\b(lett|light|low fat|lavt fettinnhold)\b/i.test(normalized);
    
    return attributes;
  }

  static extractPrice(offer) {
    if (!offer) return 0;
    
    // Prøv forskjellige prisfelter
    let priceText = offer.pricing?.price || offer.price || '0';
    
    // Hvis priceText er et tall allerede
    if (typeof priceText === 'number') {
      return priceText;
    }
    
    // Rens prisstreng og konverter
    const cleanPrice = priceText.toString()
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    
    return parseFloat(cleanPrice) || 0;
  }
}

module.exports = TextParser;
