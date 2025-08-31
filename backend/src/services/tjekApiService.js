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
        return hotspots.map(hotspot => {
            const offer = hotspot.offer;
            const quantity = offer?.quantity || {};
            
            // Parse quantity data - handle both API formats
            let pieces = 1;
            let size = null;
            let unit = '';
            
            // Handle different formats of quantity data
            if (quantity.pieces) {
                if (typeof quantity.pieces === 'object') {
                    pieces = quantity.pieces.from || quantity.pieces.to || 1;
                } else {
                    pieces = quantity.pieces || 1;
                }
            }
            
            if (quantity.size) {
                if (typeof quantity.size === 'object') {
                    size = quantity.size.from || quantity.size.to;
                } else {
                    size = quantity.size;
                }
            }
            
            if (quantity.unit) {
                if (typeof quantity.unit === 'object' && quantity.unit.symbol) {
                    unit = quantity.unit.symbol;
                } else if (typeof quantity.unit === 'string') {
                    unit = quantity.unit;
                }
            }
            
            // Bygg mengdetekst
            let quantityText = '';
            if (pieces > 1 && size && unit) {
                quantityText = `${pieces} × ${size}${unit}`;
            } else if (size && unit) {
                quantityText = `${size}${unit}`;
            } else if (pieces > 1) {
                quantityText = `${pieces} stk`;
            }
            
            return {
                title: offer?.heading || 'Ukjent tilbud',
                description: offer?.description || '',
                price: offer?.pricing?.price || null,
                originalPrice: offer?.pricing?.pre_price || null,
                discount: offer?.pricing?.discount || null,
                currency: offer?.pricing?.currency || 'NOK',
                quantity: quantityText,
                unit: unit,
                pieces: pieces,
                size: size,
                validFrom: offer?.run_from || null,
                validTo: offer?.run_till || null,
                imageUrl: offer?.images?.[0]?.view?.zoom?.url || null,
                catalogId: hotspot.catalog_id,
                hotspotId: hotspot.id
            };
        });
    }
}

module.exports = new TjekApiService();
