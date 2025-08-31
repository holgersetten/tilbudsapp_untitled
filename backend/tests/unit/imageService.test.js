const imageService = require('../../src/services/imageService');

describe('ImageService - Real API Integration', () => {
    beforeAll(() => {
        // Clear cache before tests
        imageService.clearCache();
    });

    describe('getOfferImage', () => {
        test('should fetch image data from etilbudsavis API', async () => {
            // Use a real hotspotId from our test data
            const testHotspotId = 'f7O_xEWcRSIMtvIIx4ysv'; // Coop spaghetti
            
            const result = await imageService.getOfferImage(testHotspotId);
            
            // Should return image structure
            expect(result).toHaveProperty('view');
            expect(result).toHaveProperty('zoom');
            expect(result).toHaveProperty('thumb');
            
            // If successful, at least one image should be available
            if (!result.error) {
                const hasImage = result.view || result.zoom || result.thumb;
                expect(hasImage).toBeTruthy();
            }
        }, 10000); // 10 second timeout for API call

        test('should handle invalid offer ID gracefully', async () => {
            const invalidId = 'invalid-offer-id-123';
            
            const result = await imageService.getOfferImage(invalidId);
            
            // Should return structure with nulls and error
            expect(result).toHaveProperty('view', null);
            expect(result).toHaveProperty('zoom', null);
            expect(result).toHaveProperty('thumb', null);
            expect(result).toHaveProperty('error');
        });

        test('should cache results', async () => {
            const testHotspotId = 'f7O_xEWcRSIMtvIIx4ysv';
            
            // First call
            const result1 = await imageService.getOfferImage(testHotspotId);
            
            // Second call should use cache
            const result2 = await imageService.getOfferImage(testHotspotId);
            
            expect(result1).toEqual(result2);
            
            // Check cache stats
            const stats = imageService.getCacheStats();
            expect(stats.total).toBeGreaterThan(0);
        });
    });

    describe('getBestImage', () => {
        test('should prefer thumb over view over zoom', () => {
            const images1 = {
                view: 'view.jpg',
                zoom: 'zoom.jpg',
                thumb: 'thumb.jpg'
            };
            expect(imageService.getBestImage(images1)).toBe('thumb.jpg');

            const images2 = {
                view: 'view.jpg',
                zoom: 'zoom.jpg',
                thumb: null
            };
            expect(imageService.getBestImage(images2)).toBe('view.jpg');

            const images3 = {
                view: null,
                zoom: 'zoom.jpg',
                thumb: null
            };
            expect(imageService.getBestImage(images3)).toBe('zoom.jpg');
        });

        test('should return null when no images available', () => {
            const images = {
                view: null,
                zoom: null,
                thumb: null
            };
            expect(imageService.getBestImage(images)).toBeNull();
        });
    });
});
