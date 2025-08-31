const axios = require('axios');

class ImageService {
    constructor() {
        this.baseUrl = 'https://api.etilbudsavis.dk/v2';
        this.cache = new Map(); // Simple in-memory cache
        this.cacheTimeout = 60 * 60 * 1000; // 1 hour
    }

    async getOfferImage(offerId) {
        try {
            // Check cache first
            const cacheKey = `offer_${offerId}`;
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
                // Stille cache hit - ikke log hver gang
                return cached.data;
            }

            // Bare log ved feil eller ved behov for debugging
            // console.log(`📸 Fetching image data for offer ID: ${offerId}`);
            
            const response = await axios.get(`${this.baseUrl}/offers/${offerId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            const offerData = response.data;
            
            // Extract image URLs
            const images = {
                view: offerData?.images?.view || null,
                zoom: offerData?.images?.zoom || null,
                thumb: offerData?.images?.thumb || null
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: images,
                timestamp: Date.now()
            });

            // Bare log ved debugging behov
            // console.log(`📸 Retrieved images for offer ${offerId}:`, Object.keys(images).filter(k => images[k]));
            return images;

        } catch (error) {
            console.error(`❌ Error fetching image for offer ${offerId}:`, error.message);
            
            // Return fallback structure
            return {
                view: null,
                zoom: null,
                thumb: null,
                error: error.message
            };
        }
    }

    // Get best available image (prefer view -> zoom -> thumb for better quality)
    getBestImage(images) {
        return images.view || images.zoom || images.thumb || null;
    }

    // Clear cache (useful for testing or memory management)
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Image cache cleared');
    }

    // Get cache stats
    getCacheStats() {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        const validEntries = entries.filter(([, value]) => 
            (now - value.timestamp) < this.cacheTimeout
        );
        
        return {
            total: entries.length,
            valid: validEntries.length,
            expired: entries.length - validEntries.length
        };
    }
}

module.exports = new ImageService();
