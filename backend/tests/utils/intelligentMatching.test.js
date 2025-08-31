const intelligentMatching = require('../../src/utils/intelligentMatching');

describe('Intelligent Matching', () => {
    describe('findMatchingOffers', () => {
        const mockOffers = [
            {
                title: 'SVINEKJØTTDEIG 20%',
                description: 'Fersk svinekjøttdeig',
                price: 89,
                quantity: '500g',
                store: 'Rema 1000'
            },
            {
                title: 'KYLLINGFILET',
                description: 'Fersk kyllingfilet',
                price: 199,
                quantity: '1kg',
                store: 'Bunnpris'
            },
            {
                title: 'COCA-COLA',
                description: 'Leskedrikk',
                price: 99,
                quantity: '6 × 1.5l',
                store: 'Kiwi'
            },
            {
                title: 'RIS BASMATI',
                description: 'Basmati ris',
                price: 45,
                quantity: '1kg',
                store: 'Meny'
            }
        ];

        test('should find exact matches', async () => {
            const result = await intelligentMatching.findMatchingOffers('kjøttdeig', mockOffers);
            
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].title).toContain('SVINEKJØTTDEIG');
            expect(result[0].matchScore).toBeGreaterThan(0.8);
        });

        test('should find partial matches', async () => {
            const result = await intelligentMatching.findMatchingOffers('kylling', mockOffers);
            
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].title).toContain('KYLLINGFILET');
            expect(result[0].matchScore).toBeGreaterThan(0.7);
        });

        test('should handle Norwegian characters', async () => {
            const result = await intelligentMatching.findMatchingOffers('kjøtt', mockOffers);
            
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].title).toContain('SVINEKJØTTDEIG');
        });

        test('should return empty array for no matches', async () => {
            const result = await intelligentMatching.findMatchingOffers('unicorn', mockOffers);
            
            expect(result).toEqual([]);
        });

        test('should rank results by relevance', async () => {
            const result = await intelligentMatching.findMatchingOffers('cola', mockOffers);
            
            if (result.length > 1) {
                expect(result[0].matchScore).toBeGreaterThanOrEqual(result[1].matchScore);
            }
        });
    });

    describe('calculateMatchScore', () => {
        test('should give high score for exact matches', () => {
            const score = intelligentMatching.calculateMatchScore('kjøttdeig', 'SVINEKJØTTDEIG 20%');
            expect(score).toBeGreaterThan(0.8);
        });

        test('should give medium score for partial matches', () => {
            const score = intelligentMatching.calculateMatchScore('ris', 'RIS BASMATI');
            expect(score).toBeGreaterThan(0.6);
            expect(score).toBeLessThan(0.9);
        });

        test('should give low score for weak matches', () => {
            const score = intelligentMatching.calculateMatchScore('fisk', 'KYLLINGFILET');
            expect(score).toBeLessThan(0.3);
        });

        test('should handle empty strings', () => {
            const score = intelligentMatching.calculateMatchScore('', 'PRODUCT');
            expect(score).toBe(0);
        });
    });

    describe('normalizeText', () => {
        test('should normalize Norwegian text', () => {
            const normalized = intelligentMatching.normalizeText('KJØTTDEIG ØL ÅS');
            expect(normalized).toBe('kjottdeig ol as');
        });

        test('should remove special characters', () => {
            const normalized = intelligentMatching.normalizeText('TEST-PRODUCT 20% (SPECIAL)');
            expect(normalized).toBe('test product 20 special');
        });

        test('should handle empty input', () => {
            const normalized = intelligentMatching.normalizeText('');
            expect(normalized).toBe('');
        });
    });
});
