const offerService = require('../../src/services/offerService');
const fileService = require('../../src/services/fileService');

describe('OfferService - Duplicate Filtering', () => {
    let originalLoadJSON;

    beforeEach(() => {
        // Store original function to restore later
        originalLoadJSON = fileService.loadJSON;
    });

    afterEach(() => {
        // Restore original function
        fileService.loadJSON = originalLoadJSON;
    });

    describe('getAllOffers duplicate filtering', () => {
        test('should filter out offers with same hotspotId', () => {
            // Mock file system to return test data with duplicates
            fileService.loadJSON = jest.fn().mockImplementation((filePath) => {
                if (filePath.includes('coop_extra_offers.json')) {
                    return [
                        {
                            title: "Coop spaghetti",
                            price: 25,
                            hotspotId: "f7O_xEWcRSIMtvIIx4ysv",
                            quantity: "1kg"
                        },
                        {
                            title: "Coop spaghetti", 
                            price: 25,
                            hotspotId: "f7O_xEWcRSIMtvIIx4ysv", // Same hotspotId = duplicate
                            quantity: "1kg"
                        }
                    ];
                }
                return [];
            });

            const allOffers = offerService.getAllOffers();
            
            // Should only have 1 offer, not 2
            const spaghettiOffers = allOffers.filter(offer => offer.title === "Coop spaghetti");
            expect(spaghettiOffers).toHaveLength(1);
        });

        test('should filter out offers with same title+store+price when no hotspotId', () => {
            fileService.loadJSON = jest.fn().mockImplementation((filePath) => {
                if (filePath.includes('bunnpris_offers.json')) {
                    return [
                        {
                            title: "KJØTTDEIG SVIN",
                            price: 35,
                            hotspotId: null, // No hotspotId
                            quantity: "500g"
                        },
                        {
                            title: "KJØTTDEIG SVIN",
                            price: 35, 
                            hotspotId: null, // No hotspotId - should be filtered as duplicate
                            quantity: "500g"
                        }
                    ];
                }
                return [];
            });

            const allOffers = offerService.getAllOffers();
            
            // Should only have 1 offer, not 2
            const meatOffers = allOffers.filter(offer => offer.title === "KJØTTDEIG SVIN");
            expect(meatOffers).toHaveLength(1);
        });

        test('should keep offers with different hotspotIds even if same title', () => {
            fileService.loadJSON = jest.fn().mockImplementation((filePath) => {
                if (filePath.includes('coop_extra_offers.json')) {
                    return [
                        {
                            title: "Coop spaghetti",
                            price: 25,
                            hotspotId: "f7O_xEWcRSIMtvIIx4ysv",
                            quantity: "1kg"
                        },
                        {
                            title: "Coop spaghetti",
                            price: 25,
                            hotspotId: "Q6hOBssLrA_DeCDABhpUR", // Different hotspotId = NOT duplicate
                            quantity: "1kg"
                        }
                    ];
                }
                return [];
            });

            const allOffers = offerService.getAllOffers();
            
            // Should have 2 offers since they have different hotspotIds
            const spaghettiOffers = allOffers.filter(offer => offer.title === "Coop spaghetti");
            expect(spaghettiOffers).toHaveLength(2);
        });
    });
});
