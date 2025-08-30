const fs = require('fs');
const path = require('path');
const TextParser = require('./utils/textParser');
const fileService = require('./fileService'); // Bruk eksisterende file service

class HybridMatchingService {
  constructor() {
    this.synsets = null;
    this.offersCache = null;
    this.loadData();
  }

  loadData() {
    try {
      // Last norske synsets
      const synsetsPath = path.join(__dirname, 'synsets', 'norwegian-synsets.json');
      this.synsets = JSON.parse(fs.readFileSync(synsetsPath, 'utf8'));
      console.log(`🇳🇴 Loaded ${this.synsets.length} Norwegian synsets`);
      
    } catch (error) {
      console.error('❌ Error loading Norwegian synsets:', error.message);
      this.synsets = [];
    }
  }

  scoreCandidate(synset, offer, hits, penalties, brandBoost, exactMatch) {
    let score = 0;
    const reasons = [];
    
    // Base score for hits (ChatGPT-5 metodikk)
    score += hits * 0.35;
    if (hits > 0) reasons.push(`${hits} synonym-treff`);
    
    // Eksakt match bonus
    if (exactMatch) {
      score += 0.25;
      reasons.push("eksakt match");
    }
    
    // Merke-bonus (norske merker)
    if (brandBoost) {
      score += 0.20;
      reasons.push("kjent norsk merke");
    }
    
    // Straff for ekskluderte ord
    if (penalties > 0) {
      const penalty = Math.min(0.6, 0.25 * penalties);
      score -= penalty;
      reasons.push(`${penalties} negative ord (-${penalty.toFixed(2)})`);
      
      // Streng matching = umiddelbar diskvalifisering
      if (synset.strictMatching && penalties > 0) {
        return { score: 0, reasons: ["Diskvalifisert av strict matching"] };
      }
    }
    
    // Prissjekk (norske priser)
    const price = TextParser.extractPrice(offer);
    if (price && synset.maxPrice && price > synset.maxPrice) {
      const pricePenalty = Math.min(0.4, (price - synset.maxPrice) / synset.maxPrice);
      score -= pricePenalty;
      reasons.push(`høy pris (${price}kr > ${synset.maxPrice}kr)`);
    }
    
    // Minimum og maximum score
    const finalScore = Math.max(0, Math.min(1, score));
    
    return { 
      score: finalScore, 
      reasons: reasons.length > 0 ? reasons : ["basis matching"]
    };
  }

  findMatches(ingredient, offers) {
    console.log(`🔍 Norwegian hybrid matching for: "${ingredient}"`);
    
    // Finn relevant synset
    const synset = this.synsets.find(s => 
      s.canonical === ingredient.toLowerCase() ||
      s.synonyms.some(syn => TextParser.normalize(syn) === TextParser.normalize(ingredient))
    );
    
    if (!synset) {
      console.log(`❌ No Norwegian synset found for "${ingredient}"`);
      return this.fallbackSearch(ingredient, offers);
    }
    
    console.log(`📋 Using Norwegian synset: ${synset.canonical}`);
    console.log(`   Synonyms: ${synset.synonyms.join(', ')}`);
    console.log(`   Excludes: ${synset.exclude?.join(', ') || 'none'}`);
    
    const matches = [];
    
    for (const offer of offers) {
      const text = offer.title || offer.heading || '';
      const normalized = TextParser.normalize(text);
      const tokens = TextParser.tokenize(text);
      const tokenSet = new Set(tokens);
      
      // Tell synonym-treff
      let hits = 0;
      let exactMatch = false;
      
      for (const synonym of synset.synonyms) {
        const synNorm = TextParser.normalize(synonym);
        const synTokens = synNorm.split(' ');
        
        // Fullstendig frase-match
        if (normalized.includes(synNorm)) {
          hits += 2;
          exactMatch = true;
        }
        // Alle tokens matcher
        else if (synTokens.length > 1 && synTokens.every(token => tokenSet.has(token))) {
          hits += 1;
        }
        // Enkelt token match
        else if (synTokens.length === 1 && tokenSet.has(synTokens[0])) {
          hits += 1;
        }
      }
      
      if (hits === 0) continue;
      
      // Tell straff-ord
      let penalties = 0;
      if (synset.exclude) {
        for (const exclude of synset.exclude) {
          if (normalized.includes(TextParser.normalize(exclude))) {
            penalties++;
          }
        }
      }
      
      // Parse egenskaper
      const attributes = TextParser.parseAttributes(text);
      const brandBoost = attributes.brand && 
        synset.brands && 
        synset.brands.includes(attributes.brand);
      
      // Score kandidaten
      const { score, reasons } = this.scoreCandidate(
        synset, offer, hits, penalties, brandBoost, exactMatch
      );
      
      if (score > 0.15) { // Høyere terskel for norske produkter
        matches.push({
          offer,
          score,
          reasons,
          packSize: TextParser.parsePackSize(text),
          attributes,
          ingredient: synset.canonical,
          category: synset.category
        });
      }
    }
    
    // Sorter etter score og returner topp-matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Færre, men bedre matches
  }

  fallbackSearch(ingredient, offers) {
    console.log(`🔄 Fallback search for: "${ingredient}"`);
    const ingredientLower = ingredient.toLowerCase();
    const matches = [];

    for (const offer of offers) {
      const title = (offer.heading || offer.title || '').toLowerCase();
      const description = (offer.description || '').toLowerCase();
      
      const wordRegex = new RegExp(`\\b${ingredientLower}\\b`, 'i');
      
      let score = 0;
      if (wordRegex.test(title)) {
        score = 0.8;
      } else if (wordRegex.test(description)) {
        score = 0.4;
      }
      
      if (score > 0) {
        const price = TextParser.extractPrice(offer);
        if (price > 200) score -= 0.3;
        
        if (score > 0) {
          matches.push({
            offer,
            score,
            reasons: ['Fallback exact word match'],
            ingredient: ingredientLower,
            category: { top: "Ukategorisert", mid: "Annet", leaf: "Ukjent" }
          });
        }
      }
    }

    console.log(`🔍 "${ingredient}" (fallback): ${matches.length} exact matches`);

    return matches
      .sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.1) {
          return b.score - a.score;
        }
        return TextParser.extractPrice(a.offer) - TextParser.extractPrice(b.offer);
      })
      .slice(0, 6);
  }

  getAllOffers() {
    // Always get fresh data from fileService, don't cache it
    try {
      const offers = fileService.loadAllOffers();
      console.log(`📦 Loaded ${offers.length} Norwegian offers for hybrid matching`);
      return offers;
    } catch (error) {
      console.error('❌ Error loading offers via fileService:', error.message);
      return [];
    }
  }

  async findMatchingOffers(ingredient, offers) {
    // Kompatibilitet med eksisterende API
    const matches = this.findMatches(ingredient, offers);
    
    return matches.map(match => ({
      ...match.offer,
      matchScore: match.score,
      matchReason: match.reasons.join(', ')
    }));
  }

  getBestOffers(ingredients) {
    const offers = this.getAllOffers();
    const results = [];
    
    console.log(`🇳🇴 Processing ${ingredients.length} ingredients with Norwegian hybrid matching`);
    
    for (const ingredient of ingredients) {
      const matches = this.findMatches(ingredient, offers);
      
      if (matches.length > 0) {
        console.log(`✅ Found ${matches.length} Norwegian matches for "${ingredient}"`);
        
        // Format for frontend (topp 5)
        const formattedOffers = matches.slice(0, 5).map(match => ({
          title: match.offer.title || match.offer.heading,
          price: `${TextParser.extractPrice(match.offer).toFixed(2)} kr`,
          store: match.offer.store || match.offer.dealer || 'Ukjent butikk',
          score: match.score.toFixed(2),
          reasons: match.reasons.join(', '),
          packSize: match.packSize,
          attributes: match.attributes,
          category: match.category
        }));
        
        results.push({
          ingredient: ingredient,
          canonical: matches[0].ingredient,
          offers: formattedOffers,
          category: matches[0].category
        });
        
      } else {
        console.log(`❌ No Norwegian matches found for "${ingredient}"`);
      }
    }
    
    console.log(`📊 Returning ${results.length} ingredient groups with Norwegian data`);
    return results;
  }

  // Reload synsets uten å restarte serveren
  reloadSynsets() {
    console.log('🔄 Reloading Norwegian synsets...');
    this.loadData();
    this.offersCache = null; // Clear cache
  }

  // Test-funksjon for debugging
  async testMatching(ingredient, sampleOffers) {
    console.log(`\n=== Testing Norwegian hybrid matching for "${ingredient}" ===`);
    const matches = this.findMatches(ingredient, sampleOffers);
    
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.offer.title || match.offer.heading || 'NO TITLE'} - ${TextParser.extractPrice(match.offer)}kr`);
      console.log(`   Score: ${match.score.toFixed(2)}, Reasons: ${match.reasons.join(', ')}`);
      console.log(`   Category: ${match.category.top} > ${match.category.mid} > ${match.category.leaf}`);
    });
    
    return matches;
  }
}

module.exports = new HybridMatchingService();
