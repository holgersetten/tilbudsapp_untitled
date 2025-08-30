const categoryService = require('./categoryService');

class IntelligentMatchingService {
    constructor() {
        this.synonyms = {
            'egg': ['ægg', 'eggs'],
            'hvitløk': ['garlic', 'hvitlauk'],
            'kjøttdeig': ['malt kjøtt', 'kjøttfarse', 'hakket kjøtt'],
            'rømme': ['sour cream', 'crème fraîche'],
            'mais': ['corn', 'sweetcorn'],
            'ost': ['cheese'],
            'melk': ['milk'],
            'smør': ['butter'],
            'løk': ['onion', 'yellow onion'],
            'tomat': ['tomater', 'tomato'],
            'ris': ['rice'],
            'pasta': ['spaghetti', 'macaroni', 'penne'],
            'kylling': ['chicken', 'kyllingfilet'],
            'fisk': ['fish', 'laks', 'torsk'],
            'poteter': ['potato', 'potet'],
            'gulrøtter': ['carrot', 'gulrot', 'carrots'],
            'paprika': ['bell pepper', 'sweet pepper'],
            'brokkoli': ['broccoli'],
            'blomkål': ['cauliflower']
        };

        this.categories = {
            'kjøtt': ['kjøttdeig', 'kylling', 'svinekjøtt', 'storfekjøtt', 'lam', 'bacon', 'pølse'],
            'meieri': ['melk', 'ost', 'smør', 'rømme', 'yoghurt', 'fløte'],
            'grønnsaker': ['løk', 'tomat', 'gulrøtter', 'poteter', 'paprika', 'brokkoli', 'blomkål', 'mais'],
            'kornprodukter': ['ris', 'pasta', 'brød', 'mel', 'havre'],
            'fisk': ['laks', 'torsk', 'reker', 'fisk', 'fiskekaker'],
            'krydder': ['salt', 'pepper', 'oregano', 'basilikum', 'hvitløk']
        };

        this.excludeWords = {
            'kjøttdeig': ['pølse', 'bacon', 'ham', 'salami', 'pizza', 'frikadelle'],
            'ris': ['risengryn', 'risgrøt', 'sushi', 'rissalat'],
            'egg': ['eggeplante', 'legg', 'egg white'],
            'melk': ['melkesjokolade', 'melkepulver'],
            'ost': ['ostekake', 'cheese cake']
        };
    }

    async findMatchingOffers(ingredient, offers) {
        if (!ingredient || !offers || !Array.isArray(offers)) {
            return [];
        }

        const searchTerm = ingredient.toLowerCase().trim();
        const synonyms = this.synonyms[searchTerm] || [];
        const allTerms = [searchTerm, ...synonyms];
        const excludes = this.excludeWords[searchTerm] || [];

        console.log(`🔍 Søker etter "${ingredient}" med termer:`, allTerms);
        console.log(`❌ Ekskluderer:`, excludes);

        const results = [];

        for (const offer of offers) {
            const title = (offer.title || offer.heading || '').toLowerCase();
            const description = (offer.description || '').toLowerCase();
            const fullText = `${title} ${description}`;

            // Sjekk ekskluderinger først
            const hasExcluded = excludes.some(exclude => 
                fullText.includes(exclude.toLowerCase())
            );

            if (hasExcluded) {
                continue;
            }

            let score = 0;
            let matchReason = '';

            // Direkte match på hovedterm
            if (title.includes(searchTerm)) {
                score += 10;
                matchReason += `Direkte match på "${searchTerm}" `;
            }

            // Synonym match
            for (const synonym of synonyms) {
                if (title.includes(synonym.toLowerCase())) {
                    score += 8;
                    matchReason += `Synonym match på "${synonym}" `;
                }
            }

            // Kategori-basert matching
            const category = this.getCategoryForIngredient(searchTerm);
            if (category) {
                const categoryItems = this.categories[category] || [];
                for (const item of categoryItems) {
                    if (item !== searchTerm && title.includes(item)) {
                        score += 3;
                        matchReason += `Kategori match (${category}): "${item}" `;
                    }
                }
            }

            // Delvis match (substringmatching)
            const words = searchTerm.split(' ');
            for (const word of words) {
                if (word.length > 2 && title.includes(word)) {
                    score += 1;
                    matchReason += `Delvis match på "${word}" `;
                }
            }

            if (score > 0) {
                results.push({
                    ...offer,
                    matchScore: score,
                    matchReason: matchReason.trim()
                });
            }
        }

        // Sorter etter score (høyest først)
        results.sort((a, b) => b.matchScore - a.matchScore);

        console.log(`✅ Fant ${results.length} matches for "${ingredient}"`);
        if (results.length > 0) {
            console.log(`🏆 Beste match: "${results[0].title || results[0].heading}" (Score: ${results[0].matchScore})`);
        }

        return results;
    }

    getCategoryForIngredient(ingredient) {
        for (const [category, items] of Object.entries(this.categories)) {
            if (items.includes(ingredient)) {
                return category;
            }
        }
        return null;
    }

    async testMatching(ingredient, offers) {
        console.log(`\n🧪 Testing matching for "${ingredient}"`);
        console.log(`📦 Testing with ${offers.length} offers`);
        
        const results = await this.findMatchingOffers(ingredient, offers);
        
        console.log(`\n📊 Results for "${ingredient}":`);
        console.log(`Found ${results.length} matches`);
        
        if (results.length > 0) {
            console.log('\n🏆 Top 5 matches:');
            results.slice(0, 5).forEach((result, index) => {
                console.log(`${index + 1}. ${result.title || result.heading} - ${result.pricing?.price || result.price || 'N/A'} (Score: ${result.matchScore})`);
                console.log(`   Reason: ${result.matchReason}`);
            });
        } else {
            console.log('❌ No matches found');
        }
        
        return results;
    }
}

module.exports = new IntelligentMatchingService();
