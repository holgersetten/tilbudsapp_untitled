const offerService = require('../../src/services/offerService');
const fileService = require('../../src/services/fileService');
const intelligentMatching = require('../../src/utils/intelligentMatching');

// Mock dependencies
jest.mock('../../src/services/fileService');
jest.mock('../../src/utils/intelligentMatching');
jest.mock('../../src/config/stores', () => ({
    getActiveStores: () => [
        { name: "Bunnpris", dealerId: "5b11sm", active: true },
        { name: "Rema 1000", dealerId: "faa0Ym", active: true }
    ],
    getStoreLogoUrl: (storeName) => `http://localhost:5000/images/${storeName.toLowerCase()}_logo.png`
}));

describe('OfferService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBestOffers', () => {
        test('should return empty array for no ingredients', async () => {
            const result = await offerService.getBestOffers([]);
            expect(result).toEqual([]);
        });

        test('should return empty array for invalid ingredients', async () => {
            const result = await offerService.getBestOffers([null, undefined, '']);
            expect(result).toEqual([]);
        });

        test('should process ingredients and return formatted offers', async () => {
            // Mock data
            const mockOffers = [
                {
                    title: 'COCA-COLA',
                    price: 99,
                    quantity: '6 × 1.5l',
                    currency: 'NOK',
                    unit: 'l',
                    pieces: 6,
                    size: 1.5,
                    store: 'Bunnpris'
                }
            ];

            fileService.loadAllOffers.mockReturnValue(mockOffers);
            intelligentMatching.findMatchingOffers.mockResolvedValue([
                { 
                    ...mockOffers[0], 
                    matchScore: 0.95,
                    matchReason: 'Exact match'
                }
            ]);

            const result = await offerService.getBestOffers(['coca-cola']);

            expect(result).toHaveLength(1);
            expect(result[0].ingredient).toBe('coca-cola');
            expect(result[0].offers).toHaveLength(1);
            expect(result[0].offers[0]).toEqual({
                title: 'COCA-COLA',
                price: 99,
                store: 'Bunnpris',
                logo: 'http://localhost:5000/images/bunnpris_logo.png',
                originalPrice: null,
                description: '',
                quantity: '6 × 1.5l',
                currency: 'NOK',
                unit: 'l',
                pieces: 6,
                size: 1.5,
                matchScore: 0.95,
                matchReason: 'Exact match'
            });
        });
    });

    describe('extractPrice', () => {
        test('should extract price from pricing object', () => {
            const offer = {
                pricing: { price: 99 }
            };
            const price = offerService.extractPrice(offer);
            expect(price).toBe(99);
        });

        test('should extract price from direct price property', () => {
            const offer = {
                price: 75
            };
            const price = offerService.extractPrice(offer);
            expect(price).toBe(75);
        });

        test('should extract price from text and convert to number', () => {
            const offer = {
                priceText: 'Kr 129,-'
            };
            const price = offerService.extractPrice(offer);
            expect(price).toBe(129);
        });

        test('should return 0 for invalid price', () => {
            const offer = {
                priceText: 'Invalid price'
            };
            const price = offerService.extractPrice(offer);
            expect(price).toBe(0);
        });
    });

    describe('getAllOffers', () => {
        test('should return all offers from file service', () => {
            const mockOffers = [
                { title: 'Product 1', price: 50 },
                { title: 'Product 2', price: 75 }
            ];
            fileService.loadAllOffers.mockReturnValue(mockOffers);

            const result = offerService.getAllOffers();
            
            expect(result).toEqual(mockOffers);
            expect(fileService.loadAllOffers).toHaveBeenCalledTimes(1);
        });

        test('should handle file service errors', () => {
            fileService.loadAllOffers.mockImplementation(() => {
                throw new Error('File read error');
            });

            const result = offerService.getAllOffers();
            
            expect(result).toEqual([]);
        });
    });

    describe('normalizeStoreName', () => {
        test('should normalize store names correctly', () => {
            expect(offerService.normalizeStoreName('rema 1000')).toBe('rema_1000');
            expect(offerService.normalizeStoreName('Coop Extra')).toBe('coop_extra');
            expect(offerService.normalizeStoreName('BUNNPRIS')).toBe('bunnpris');
        });
    });
});
