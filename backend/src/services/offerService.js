const tjekApiService = require('./tjekApiService');
const fileService = require('./fileService');
const categoryService = require('./categoryService');
const intelligentMatching = require('./intelligentMatchingService');
const { getActiveStores, getStoreLogoUrl } = require('../config/stores');

class OfferService {
    constructor() {
        this.updateInProgress = false;
        this.lastUpdateAttempt = null;
        this.setupPeriodicUpdates();
    }

    setupPeriodicUpdates() {
        // Prøv å oppdatere hver time på hverdager
        setInterval(() => {
            const now = new Date();
            const isWeekday = now.getDay() >= 1 && now.getDay() <= 5; // Mandag-Fredag
            const isBusinessHours = now.getHours() >= 8 && now.getHours() <= 20;
            
            if (isWeekday && isBusinessHours && !this.updateInProgress) {
                console.log('⏰ Automatisk oppdatering av tilbud...');
                this.updateAllStoreOffers();
            }
        }, 60 * 60 * 1000); // Hver time
    }

    async updateAllStoreOffers() {
        if (this.updateInProgress) {
            console.log('🔄 Oppdatering pågår allerede...');
            return false;
        }

        this.updateInProgress = true;
        console.log('🔄 Starter oppdatering av tilbud fra alle butikker...');

        try {
            const stores = getActiveStores();
            const updatePromises = stores.map(store => this.updateStoreOffers(store));
            await Promise.allSettled(updatePromises);
            
            console.log('✅ Oppdatering av alle butikker fullført');
            return true;
        } catch (error) {
            console.error('❌ Feil under oppdatering av tilbud:', error.message);
            return false;
        } finally {
            this.updateInProgress = false;
        }
    }

    async updateStoreOffers(store) {
        console.log(`🔄 Henter tilbud fra ${store.name}...`);
        
        try {
            const offers = await tjekApiService.getStoreOffers(store.dealerId);
            
            if (offers.length === 0) {
                console.warn(`⚠️ Ingen tilbud funnet for ${store.name} - bruker eksisterende lokale data`);
                return this.validateExistingOffers(store);
            }

            // Legg til butikknavn og tags til hvert tilbud
            const enrichedOffers = offers.map(offer => ({
                ...offer,
                store: store.name,
                storeId: store.dealerId,
                tags: categoryService.tagProduct(offer.title),
                updatedAt: new Date().toISOString()
            }));

            // Lagre til fil
            const filename = `${store.name.toLowerCase().replace(/\s+/g, '_')}_offers.json`;
            const saved = fileService.saveIfChanged(filename, enrichedOffers);
            
            if (saved) {
                console.log(`✅ Oppdatert ${enrichedOffers.length} tilbud fra ${store.name}`);
            } else {
                console.log(`ℹ️ Ingen nye tilbud fra ${store.name}`);
            }
            
            return true;
        } catch (error) {
            console.error(`❌ Feil ved oppdatering av ${store.name}:`, error.message);
            console.log(`🔄 Fallback: Bruker eksisterende lokale data for ${store.name}`);
            return this.validateExistingOffers(store);
        }
    }

    validateExistingOffers(store) {
        try {
            const filename = `${store.name.toLowerCase().replace(/\s+/g, '_')}_offers.json`;
            const filePath = require('path').join(__dirname, '../../offers', filename);
            const existingOffers = fileService.loadJSON(filePath);
            
            if (Array.isArray(existingOffers) && existingOffers.length > 0) {
                console.log(`✅ Bruker ${existingOffers.length} eksisterende tilbud fra ${store.name}`);
                return true;
            } else {
                console.warn(`⚠️ Ingen gyldige lokale tilbud funnet for ${store.name}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Kunne ikke laste lokale tilbud for ${store.name}:`, error.message);
            return false;
        }
    }

    getAllOffers() {
        try {
            return fileService.loadAllOffers();
        } catch (error) {
            console.error('❌ Feil ved henting av alle tilbud:', error.message);
            return [];
        }
    }

    async getBestOffers(ingredients = []) {
        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return [];
        }

        console.log('🧠 Bruker intelligent matching for ingredienser:', ingredients);

        const allOffers = this.getAllOffers();
        console.log(`📦 Totalt tilgjengelige tilbud: ${allOffers.length}`);
        
        const result = [];
        const storeIngredientCount = {}; // Teller hvor mange ingredienser hver butikk har

        // Intelligent matching for hver ingrediens
        for (const ingredient of ingredients) {
            if (!ingredient || typeof ingredient !== 'string') continue;

            console.log(`🔍 Analyserer "${ingredient}" med intelligent matching...`);
            
            const matchingOffers = await intelligentMatching.findMatchingOffers(ingredient, allOffers);
            
            console.log(`✅ Fant ${matchingOffers.length} relevante tilbud for "${ingredient}"`);
            
            // Debug: Vis topp 3 matches
            if (matchingOffers.length > 0) {
                console.log('🏆 Topp 3 matches:');
                matchingOffers.slice(0, 3).forEach((offer, idx) => {
                    console.log(`   ${idx + 1}. ${offer.title || offer.heading || 'NO_TITLE'} - ${offer.pricing?.price || offer.price || 'N/A'} (Score: ${offer.matchScore})`);
                });
            }

            if (matchingOffers.length > 0) {
                // Tell opp butikker for optimalisering
                matchingOffers.forEach(offer => {
                    const store = offer.store || offer.dealer?.name || 'Ukjent';
                    if (!storeIngredientCount[store]) {
                        storeIngredientCount[store] = { count: 0, ingredients: [] };
                    }
                    if (!storeIngredientCount[store].ingredients.includes(ingredient)) {
                        storeIngredientCount[store].count++;
                        storeIngredientCount[store].ingredients.push(ingredient);
                    }
                });

                // Konverter til forventet format
                const formattedOffers = matchingOffers.slice(0, 5).map(offer => {
                    const storeName = offer.store || offer.dealer?.name || 'Ukjent';
                    return {
                        title: offer.title || offer.heading || 'Ukjent produkt',
                        price: this.extractPrice(offer),
                        store: storeName,
                        logo: getStoreLogoUrl(storeName),
                        originalPrice: offer.run_from && offer.run_till ? `Gyldig ${offer.run_from} - ${offer.run_till}` : null,
                        description: offer.description || '',
                        quantity: offer.quantity || '',
                        currency: offer.currency || 'NOK',
                        unit: offer.unit || '',
                        pieces: offer.pieces || 1,
                        size: offer.size || '',
                        matchScore: offer.matchScore,
                        matchReason: offer.matchReason
                    };
                });

                result.push({
                    ingredient: ingredient,
                    offers: formattedOffers
                });
            } else {
                console.log(`⚠️  Ingen relevante tilbud funnet for "${ingredient}"`);
                result.push({
                    ingredient: ingredient,
                    offers: []
                });
            }
        }

        console.log(`📊 Butikk-rangering:`, storeIngredientCount);
        
        // Optimaliser valg basert på butikk-konsentrasjon
        const optimizedResult = this.optimizeStoreSelection(result, storeIngredientCount);
        
        console.log(`✅ Returnerer ${optimizedResult.length} ingrediensgrupper`);
        return optimizedResult;
    }

    extractPrice(offer) {
        // Støtt ulike pris-formater
        let priceValue = offer.pricing?.price || offer.price || offer.priceText || '0';
        
        if (typeof priceValue === 'object' && priceValue.value !== undefined) {
            priceValue = priceValue.value;
        }
        
        const cleanPrice = priceValue.toString().replace(/[^\d,.-]/g, '').replace(',', '.');
        const numericPrice = parseFloat(cleanPrice) || 0;
        
        // Returner som streng med kr for frontend
        return numericPrice > 0 ? `${numericPrice} kr` : 'N/A';
    }

    getCategoryOffers(categoryName) {
        console.log(`🔎 Henter tilbud for kategori: ${categoryName}`);
        
        const allOffers = this.getAllOffers();
        return categoryService.searchByCategory(allOffers, categoryName);
    }

    optimizeStoreSelection(ingredientGroups, storeCount) {
        // Finn butikker med høyest ingrediens-dekning
        const topStores = Object.entries(storeCount)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3) // Top 3 butikker
            .map(entry => entry[0]);

        console.log(`🏪 Top butikker: ${topStores.join(', ')}`);

        return ingredientGroups.map(group => {
            if (group.offers.length === 0) {
                return group; // Ingen tilbud å optimalisere
            }

            const optimizedOffers = [];
            
            // Prioriter tilbud fra top-butikker
            topStores.forEach(store => {
                const storeOffers = group.offers.filter(offer => offer.store === store);
                optimizedOffers.push(...storeOffers);
            });
            
            // Legg til andre billige tilbud
            const remainingOffers = group.offers
                .filter(offer => !topStores.includes(offer.store))
                .slice(0, 2); // Maks 2 ekstra
            
            optimizedOffers.push(...remainingOffers);
            
            // Sorter etter pris og begrens til 3 alternativer
            const parsePrice = (p) => {
                if (!p) return Number.POSITIVE_INFINITY;
                const num = parseFloat(p.toString().replace(/[^\d,.-]/g, '').replace(',', '.'));
                return isNaN(num) ? Number.POSITIVE_INFINITY : num;
            };

            const finalOffers = [...new Set(optimizedOffers)] // Fjern duplikater
                .sort((a, b) => parsePrice(a.price) - parsePrice(b.price))
                .slice(0, 3);
            
            return {
                ...group,
                offers: finalOffers,
                recommendedStore: topStores[0] // Mest optimale butikk
            };
        });
    }

    getOffersByStore(storeName) {
        const filename = `${storeName.toLowerCase().replace(/\s+/g, '_')}_offers.json`;
        const filePath = require('path').join(fileService.offersDir, filename);
        return fileService.loadJSON(filePath);
    }

    getAllOffers() {
        const stores = ['rema_1000', 'kiwi', 'meny', 'coop_extra', 'bunnpris', 'coop_mega', 'coop_marked', 'coop_prix', 'coop_obs', 'spar'];
        const allOffers = [];

        stores.forEach(store => {
            try {
                const filename = `${store}_offers.json`;
                const filePath = require('path').join(require('../config').offersDir, filename);
                const offers = fileService.loadJSON(filePath);
                
                if (Array.isArray(offers)) {
                    // Normaliser butikknavn og konverter priser
                    const storeName = this.normalizeStoreName(store);
                    const normalizedOffers = offers.map(offer => ({
                        ...offer,
                        store: storeName,
                        price: typeof offer.price === 'string' ? parseFloat(offer.price) : offer.price,
                        originalPrice: offer.originalPrice ? 
                            (typeof offer.originalPrice === 'string' ? parseFloat(offer.originalPrice) : offer.originalPrice) 
                            : null
                    }));
                    allOffers.push(...normalizedOffers);
                    console.log(`📦 Lastet ${offers.length} tilbud fra ${storeName}`);
                } else {
                    console.warn(`⚠️ ${filename} er ikke en gyldig array`);
                }
            } catch (error) {
                console.warn(`⚠️ Kunne ikke laste tilbud fra ${store}:`, error.message);
            }
        });

        console.log(`📦 getAllOffers: Totalt ${allOffers.length} tilbud fra alle butikker`);
        return allOffers;
    }

    normalizeStoreName(storeKey) {
        const nameMap = {
            'rema_1000': 'Rema 1000',
            'kiwi': 'Kiwi',
            'meny': 'Meny', 
            'coop_extra': 'Coop Extra',
            'bunnpris': 'Bunnpris',
            'coop_mega': 'Coop Mega',
            'coop_marked': 'Coop Marked',
            'coop_prix': 'Coop Prix',
            'coop_obs': 'Coop Obs',
            'spar': 'Spar'
        };
        return nameMap[storeKey] || storeKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    isUpdateInProgress() {
        return this.updateInProgress;
    }

    getOfferStatus() {
        const stores = getActiveStores();
        let totalOffers = 0;
        const storeStatuses = [];

        // Count offers for each store
        stores.forEach(store => {
            try {
                const offers = fileService.loadJSON(`offers/${store.name.toLowerCase().replace(/\s+/g, '_')}_offers.json`, []);
                const storeCount = offers.length;
                totalOffers += storeCount;

                storeStatuses.push({
                    name: store.name,
                    offers: storeCount,
                    status: storeCount > 0 ? 'fresh' : 'empty'
                });
            } catch (error) {
                storeStatuses.push({
                    name: store.name,
                    offers: 0,
                    status: 'error'
                });
            }
        });

        return {
            totalOffers,
            storeCount: stores.length,
            lastUpdated: this.lastUpdateAttempt || new Date().toISOString(),
            stores: storeStatuses,
            updating: this.updateInProgress
        };
    }
}

module.exports = new OfferService();
