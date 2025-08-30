const axios = require('axios');
const config = require('../config');

class TjekApiService {
    constructor() {
        this.baseURL = config.tjekApiBaseUrl;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
    }

    async getLatestCatalog(dealerId) {
        try {
            const url = `${this.baseURL}/catalogs?dealer_id=${dealerId}&order_by=-publication_date&limit=1`;
            const response = await axios.get(url, { headers: this.headers });
            return response.data?.[0] || null;
        } catch (error) {
            console.error(`❌ Feil ved henting av katalog for dealer ${dealerId}:`, error.message);
            return null;
        }
    }

    async getCatalogHotspots(catalogId) {
        try {
            const url = `${this.baseURL}/catalogs/${catalogId}/hotspots`;
            const response = await axios.get(url, { headers: this.headers });
            return response.data || [];
        } catch (error) {
            console.error(`❌ Feil ved henting av hotspots for katalog ${catalogId}:`, error.message);
            return [];
        }
    }

    async getStoreOffers(dealerId) {
        try {
            const catalog = await this.getLatestCatalog(dealerId);
            if (!catalog) {
                console.warn(`⚠️ Ingen katalog funnet for dealer ${dealerId}`);
                return [];
            }

            const hotspots = await this.getCatalogHotspots(catalog.id);
            return this.transformHotspotsToOffers(hotspots);
        } catch (error) {
            console.error(`❌ Feil ved henting av tilbud for dealer ${dealerId}:`, error.message);
            return [];
        }
    }

    transformHotspotsToOffers(hotspots) {
        return hotspots.map(hotspot => ({
            title: hotspot.offer?.heading || 'Ukjent tilbud',
            description: hotspot.offer?.description || '',
            price: hotspot.offer?.pricing?.price || null,
            originalPrice: hotspot.offer?.pricing?.pre_price || null,
            discount: hotspot.offer?.pricing?.discount || null,
            validFrom: hotspot.offer?.run_from || null,
            validTo: hotspot.offer?.run_till || null,
            imageUrl: hotspot.offer?.images?.[0]?.view?.zoom?.url || null,
            catalogId: hotspot.catalog_id,
            hotspotId: hotspot.id
        }));
    }
}

module.exports = new TjekApiService();
