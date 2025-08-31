const tjekApiService = require('../../src/services/tjekApiService');

describe('TjekApiService', () => {
    describe('transformHotspotsToOffers', () => {
        test('should correctly parse quantity with pieces and size', () => {
            const mockHotspots = [
                {
                    offer: {
                        heading: 'COCA-COLA',
                        pricing: {
                            price: 99,
                            currency: 'NOK'
                        },
                        quantity: {
                            unit: { symbol: 'l' },
                            size: { from: 1.5, to: 1.5 },
                            pieces: { from: 6, to: 6 }
                        },
                        run_from: '2025-08-24T22:00:00+0000',
                        run_till: '2025-08-31T21:59:59+0000'
                    },
                    catalog_id: 'test123',
                    id: 'hotspot123'
                }
            ];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspots);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: 'COCA-COLA',
                description: '',
                price: 99,
                originalPrice: null,
                discount: null,
                currency: 'NOK',
                quantity: '6 × 1.5l',
                unit: 'l',
                pieces: 6,
                size: 1.5,
                validFrom: '2025-08-24T22:00:00+0000',
                validTo: '2025-08-31T21:59:59+0000',
                imageUrl: null,
                catalogId: 'test123',
                hotspotId: 'hotspot123'
            });
        });

        test('should handle single item with size and unit', () => {
            const mockHotspots = [
                {
                    offer: {
                        heading: 'Mills Majones',
                        pricing: { price: 25, currency: 'NOK' },
                        quantity: {
                            unit: { symbol: 'g' },
                            size: { from: 160, to: 160 },
                            pieces: { from: 1, to: 1 }
                        }
                    },
                    catalog_id: 'test123',
                    id: 'hotspot456'
                }
            ];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspots);
            
            expect(result[0].quantity).toBe('160g');
            expect(result[0].pieces).toBe(1);
            expect(result[0].size).toBe(160);
            expect(result[0].unit).toBe('g');
        });

        test('should handle multiple pieces without size', () => {
            const mockHotspots = [
                {
                    offer: {
                        heading: 'Støvmopp Startsett',
                        pricing: { price: 29, currency: 'NOK' },
                        quantity: {
                            unit: { symbol: 'pcs' },
                            size: { from: 1, to: 1 },
                            pieces: { from: 2, to: 2 }
                        }
                    },
                    catalog_id: 'test123',
                    id: 'hotspot789'
                }
            ];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspots);
            
            expect(result[0].quantity).toBe('2 × 1pcs');
        });

        test('should handle legacy string format for quantities', () => {
            const mockHotspots = [
                {
                    offer: {
                        heading: 'Legacy Product',
                        pricing: { price: 50, currency: 'NOK' },
                        quantity: {
                            unit: 'kg',
                            size: 0.5,
                            pieces: 1
                        }
                    },
                    catalog_id: 'test123',
                    id: 'hotspot999'
                }
            ];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspots);
            
            expect(result[0].quantity).toBe('0.5kg');
            expect(result[0].unit).toBe('kg');
        });

        test('should handle missing quantity data gracefully', () => {
            const mockHotspots = [
                {
                    offer: {
                        heading: 'Product Without Quantity',
                        pricing: { price: 100, currency: 'NOK' }
                    },
                    catalog_id: 'test123',
                    id: 'hotspot000'
                }
            ];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspots);
            
            expect(result[0].quantity).toBe('');
            expect(result[0].pieces).toBe(1);
            expect(result[0].size).toBeNull();
            expect(result[0].unit).toBe('');
        });
    });

    describe('API Integration', () => {
        test('should have correct base URL', () => {
            expect(tjekApiService.baseURL).toBe('https://squid-api.tjek.com/v2');
        });
    });
});
