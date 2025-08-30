const config = require('../config');
const fileService = require('./fileService');
const { getStoreLogoUrl } = require('../config/stores');

class CategoryService {
    constructor() {
        this.tagsData = this.loadCategories();
        this.synonyms = this.loadSynonyms();
    }

    loadCategories() {
        const data = fileService.loadJSON(config.categoriesFile);
        if (Array.isArray(data)) {
            return data;
        }
        console.warn('⚠️ Categories-filen har feil format, forventet array');
        return [];
    }

    loadSynonyms() {
        return fileService.loadJSON(config.synonymsFile);
    }

    reloadData() {
        this.tagsData = this.loadCategories();
        this.synonyms = this.loadSynonyms();
        console.log(`✅ Reloadet ${this.tagsData.length} kategorier og ${Object.keys(this.synonyms).length} synonymer`);
    }

    tagProduct(title) {
        if (!title || typeof title !== 'string') {
            return ['annet'];
        }

        const matchedTags = [];
        const lowerTitle = title.toLowerCase();

        this.tagsData.forEach(catObj => {
            if (!catObj.category || !Array.isArray(catObj.aliases)) {
                return;
            }

            catObj.aliases.forEach(alias => {
                if (typeof alias === 'string' && lowerTitle.includes(alias.toLowerCase())) {
                    if (!matchedTags.includes(catObj.category)) {
                        matchedTags.push(catObj.category);
                    }
                }
            });
        });

        return matchedTags.length > 0 ? matchedTags : ['annet'];
    }

    getCategories() {
        return this.tagsData;
    }

    getCategoryByName(name) {
        return this.tagsData.find(cat => 
            cat.category && cat.category.toLowerCase() === name.toLowerCase()
        );
    }

    searchByCategory(offers, categoryName) {
        if (!categoryName || !Array.isArray(offers)) {
            return [];
        }

        const category = this.getCategoryByName(categoryName);
        if (!category) {
            return [];
        }

        const matchingOffers = offers.filter(offer => {
            if (!offer.title) return false;
            
            const tags = this.tagProduct(offer.title);
            return tags.includes(category.category);
        });

        // Legg til logoer i resultatene
        return matchingOffers.map(offer => {
            const storeName = offer.store || offer.dealer?.name || 'Ukjent';
            return {
                ...offer,
                logo: getStoreLogoUrl(storeName)
            };
        });
    }
}

module.exports = new CategoryService();
