/**
 * Service for henting produktbilder fra API
 */

const https = require('https');

class ImageService {
    constructor() {
        this.dealerIds = {
            'Rema 1000': 'faa0Ym',
            'Kiwi': 'QCrhJhG',
            'Bunnpris': 'dlPsX3rT',
            'Meny': '6a0p1Y',
            'Spar': 'ogAOGCK',
            'Obs': 'UOJIIGTf',
            'Coop Extra': 'IcZWZW',
            'Coop Mega': 'PXK2QLO',
            'Coop Prix': 'PbLLbcfM',
            'Coop Marked': 'LNQkL6'
        };
        this.catalogCache = new Map();
    }

    /**
     * Hjelpefunksjon for HTTP requests
     */
    async fetchJSON(url) {
        return new Promise((resolve, reject) => {
            console.log(`🌐 Fetching: ${url}`);
            
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        console.error(`❌ JSON parse error for ${url}:`, error.message);
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                console.error(`❌ HTTP error for ${url}:`, error.message);
                reject(error);
            });
        });
    }

    /**
     * Finn produktbilde for et spesifikt tilbud
     */
    async getProductImageForOffer(storeName, offerHeading) {
        try {
            console.log(`🖼️ Søker etter bilde for "${offerHeading}" i ${storeName}`);
            
            const dealerId = this.dealerIds[storeName];
            if (!dealerId) {
                console.log(`❌ Ingen dealer ID for ${storeName}`);
                return null;
            }

            // Sjekk cache først
            const cacheKey = storeName;
            let storeData = this.catalogCache.get(cacheKey);
            
            if (!storeData) {
                console.log(`🔍 Henter katalog for ${storeName}...`);
                
                // Hent katalog
                const catalogsUrl = `https://squid-api.tjek.com/v2/catalogs?dealer_ids=${dealerId}`;
                const catalogs = await this.fetchJSON(catalogsUrl);
                
                if (!catalogs || catalogs.length === 0) {
                    console.log(`❌ Ingen kataloger for ${storeName}`);
                    return null;
                }

                const catalog = catalogs[0];
                console.log(`📖 Fant katalog: ${catalog.label || catalog.id} for ${storeName}`);

                // Hent hotspots
                const hotspotsUrl = `https://squid-api.tjek.com/v2/catalogs/${catalog.id}/hotspots`;
                const hotspots = await this.fetchJSON(hotspotsUrl);

                // Hent sider
                const pagesUrl = `https://squid-api.tjek.com/v2/catalogs/${catalog.id}/pages`;
                const pages = await this.fetchJSON(pagesUrl);

                storeData = {
                    catalog,
                    hotspots: hotspots || [],
                    pages: pages || []
                };

                // Cache resultatet i 10 minutter
                this.catalogCache.set(cacheKey, storeData);
                setTimeout(() => this.catalogCache.delete(cacheKey), 10 * 60 * 1000);
                
                console.log(`✅ Cached ${storeData.hotspots.length} hotspots og ${storeData.pages.length} sider for ${storeName}`);
            }

            // Finn hotspot som matcher tilbudet
            const matchingHotspot = storeData.hotspots.find(hotspot => {
                if (!hotspot.offer || !hotspot.offer.heading) return false;
                
                const hotspotHeading = hotspot.offer.heading.toLowerCase();
                const searchHeading = offerHeading.toLowerCase();
                
                // Enkel matching først
                return hotspotHeading.includes(searchHeading) || 
                       searchHeading.includes(hotspotHeading);
            });

            if (!matchingHotspot) {
                console.log(`❌ Ingen hotspot funnet for "${offerHeading}" i ${storeName}`);
                return null;
            }

            console.log(`✅ Fant match: "${matchingHotspot.offer.heading}"`);

            // Finn riktig side
            const locations = matchingHotspot.locations;
            const pageNumber = Object.keys(locations)[0]; // Første side med dette tilbudet
            const pageIndex = parseInt(pageNumber) - 1;

            if (pageIndex >= storeData.pages.length || pageIndex < 0) {
                console.log(`❌ Side ${pageNumber} ikke funnet for ${storeName}`);
                return null;
            }

            const page = storeData.pages[pageIndex];
            
            return {
                imageUrl: page.view,  // Medium kvalitet
                zoomUrl: page.zoom,   // Høy kvalitet  
                thumbUrl: page.thumb, // Lav kvalitet
                coordinates: locations[pageNumber],
                pageNumber: pageNumber,
                productName: matchingHotspot.offer.heading,
                price: matchingHotspot.offer.pricing?.price
            };

        } catch (error) {
            console.error(`❌ Feil ved søk etter produktbilde for "${offerHeading}" i ${storeName}:`, error.message);
            return null;
        }
    }
}

module.exports = new ImageService();
