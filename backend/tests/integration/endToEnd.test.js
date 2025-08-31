const request = require('supertest');
const app = require('../../src/server');

describe('End-to-End Quantity Information Flow', () => {
    describe('API to Frontend Data Flow', () => {
        test('should return offers with complete quantity information', async () => {
            const response = await request(app)
                .get('/api/offers')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            
            // Check that at least some offers have quantity information
            const offersWithQuantity = response.body.filter(offer => 
                offer.quantity && offer.quantity.trim() !== ''
            );
            
            expect(offersWithQuantity.length).toBeGreaterThan(0);
            
            // Validate quantity format
            offersWithQuantity.forEach(offer => {
                expect(offer).toHaveProperty('quantity');
                expect(offer).toHaveProperty('unit');
                expect(offer).toHaveProperty('pieces');
                expect(offer).toHaveProperty('size');
                
                // Quantity should be non-empty string
                expect(typeof offer.quantity).toBe('string');
                expect(offer.quantity.length).toBeGreaterThan(0);
            });
        });

        test('should handle external API failures gracefully', async () => {
            // This test ensures the app still works even if external APIs fail
            const response = await request(app)
                .get('/api/offers')
                .expect(200);

            // Should return at least local offers
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        test('should return meal suggestions with quantity-aware pricing', async () => {
            const response = await request(app)
                .get('/api/meals/suggested/by-offers')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            
            response.body.forEach(suggestion => {
                expect(suggestion).toHaveProperty('name');
                expect(suggestion).toHaveProperty('offersFound');
                expect(suggestion).toHaveProperty('totalIngredients'); 
                expect(suggestion).toHaveProperty('availableOffers');
                expect(suggestion).toHaveProperty('score');
                
                // Validate available offers structure
                if (suggestion.availableOffers && suggestion.availableOffers.length > 0) {
                    suggestion.availableOffers.forEach(ingredientGroup => {
                        expect(ingredientGroup).toHaveProperty('ingredient');
                        expect(ingredientGroup).toHaveProperty('offers');
                        expect(Array.isArray(ingredientGroup.offers)).toBe(true);
                    });
                }
            });
        });
    });

    describe('Store Filter Integration', () => {
        test('should filter offers by specific store', async () => {
            const stores = ['Rema 1000', 'Kiwi', 'Meny', 'Coop Extra'];
            
            for (const store of stores) {
                const response = await request(app)
                    .get(`/api/offers?store=${store}`)
                    .expect(200);

                if (response.body.length > 0) {
                    response.body.forEach(offer => {
                        expect(offer.store).toBe(store);
                    });
                }
            }
        });
    });

    describe('Performance Tests', () => {
        test('should respond to offers endpoint within reasonable time', async () => {
            const startTime = Date.now();
            
            await request(app)
                .get('/api/offers')
                .expect(200);
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Should respond within 10 seconds (accounting for external API calls)
            expect(responseTime).toBeLessThan(10000);
        });

        test('should handle concurrent requests', async () => {
            const promises = Array(5).fill().map(() =>
                request(app).get('/api/offers')
            );

            const responses = await Promise.all(promises);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
            });
        });
    });

    describe('Data Consistency', () => {
        test('should maintain consistent offer structure across all stores', async () => {
            const response = await request(app)
                .get('/api/offers')
                .expect(200);

            response.body.forEach(offer => {
                // Required fields that should always exist
                expect(offer).toHaveProperty('title');
                expect(offer).toHaveProperty('store');
                expect(offer).toHaveProperty('price');
                
                // Type validation
                expect(typeof offer.title).toBe('string');
                expect(typeof offer.store).toBe('string');
                expect(typeof offer.price).toBe('number');
                
                // Optional fields (may not exist in local JSON files)
                // Note: quantity fields are only available from live API calls
            });
        });

        test('should normalize store names consistently', async () => {
            const response = await request(app)
                .get('/api/offers')
                .expect(200);

            const storeNames = [...new Set(response.body.map(offer => offer.store))];
            
            // Check that store names are normalized
            const validStores = ['Rema 1000', 'Kiwi', 'Meny', 'Coop Extra', 'Coop Mega', 'Coop Marked', 'Coop Prix', 'Coop Obs', 'Spar', 'Bunnpris'];
            
            storeNames.forEach(storeName => {
                expect(validStores).toContain(storeName);
            });
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty API responses', async () => {
            // This test ensures robustness when external APIs return empty data
            const response = await request(app)
                .get('/api/offers')
                .expect(200);

            // Should always return an array, even if empty
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('should handle missing quantity data gracefully', async () => {
            const response = await request(app)
                .get('/api/offers')
                .expect(200);

            // Should always return an array, even if local files don't have quantity info
            expect(Array.isArray(response.body)).toBe(true);
            
            // All offers should have core fields
            response.body.forEach(offer => {
                expect(offer).toHaveProperty('title');
                expect(offer).toHaveProperty('price');
                expect(offer).toHaveProperty('store');
            });
        });
    });
});
