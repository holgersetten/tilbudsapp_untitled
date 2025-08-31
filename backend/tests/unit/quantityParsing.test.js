const tjekApiService = require('../../src/services/tjekApiService');

describe('Quantity Information Tests', () => {
    describe('Quantity Parsing', () => {
        const quantityTestCases = [
            {
                description: 'Coca-Cola 6-pack',
                input: {
                    unit: { symbol: 'l' },
                    size: { from: 1.5, to: 1.5 },
                    pieces: { from: 6, to: 6 }
                },
                expected: {
                    quantity: '6 × 1.5l',
                    unit: 'l',
                    pieces: 6,
                    size: 1.5
                }
            },
            {
                description: 'Single tube mayonnaise',
                input: {
                    unit: { symbol: 'g' },
                    size: { from: 160, to: 160 },
                    pieces: { from: 1, to: 1 }
                },
                expected: {
                    quantity: '160g',
                    unit: 'g',
                    pieces: 1,
                    size: 160
                }
            },
            {
                description: 'Multi-pack without size',
                input: {
                    unit: { symbol: 'pcs' },
                    size: { from: 1, to: 1 },
                    pieces: { from: 4, to: 4 }
                },
                expected: {
                    quantity: '4 × 1pcs',
                    unit: 'pcs',
                    pieces: 4,
                    size: 1
                }
            },
            {
                description: 'Leverpostei tubes',
                input: {
                    unit: { symbol: 'g' },
                    size: { from: 22, to: 22 },
                    pieces: { from: 6, to: 6 }
                },
                expected: {
                    quantity: '6 × 22g',
                    unit: 'g',
                    pieces: 6,
                    size: 22
                }
            },
            {
                description: 'String format units (legacy)',
                input: {
                    unit: 'kg',
                    size: 0.5,
                    pieces: 1
                },
                expected: {
                    quantity: '0.5kg',
                    unit: 'kg',
                    pieces: 1,
                    size: 0.5
                }
            },
            {
                description: 'Missing quantity data',
                input: {},
                expected: {
                    quantity: '',
                    unit: '',
                    pieces: 1,
                    size: null
                }
            }
        ];

        quantityTestCases.forEach(({ description, input, expected }) => {
            test(`should correctly parse ${description}`, () => {
                const mockHotspot = [{
                    offer: {
                        heading: description,
                        pricing: { price: 50, currency: 'NOK' },
                        quantity: input
                    },
                    catalog_id: 'test',
                    id: 'test'
                }];

                const result = tjekApiService.transformHotspotsToOffers(mockHotspot);
                
                expect(result[0].quantity).toBe(expected.quantity);
                expect(result[0].unit).toBe(expected.unit);
                expect(result[0].pieces).toBe(expected.pieces);
                expect(result[0].size).toBe(expected.size);
            });
        });
    });

    describe('Real API Response Format', () => {
        test('should handle PowerShell parsed API response format', () => {
            // This simulates how PowerShell parses the JSON response
            const mockApiResponse = [{
                offer: {
                    heading: 'COCA-COLA',
                    pricing: {
                        price: 99,
                        currency: 'NOK'
                    },
                    quantity: {
                        unit: '@{symbol=l; si=}',
                        size: '@{from=1.5; to=1.5}',
                        pieces: '@{from=6; to=6}'
                    }
                },
                catalog_id: 'test',
                id: 'test'
            }];

            // This tests that our parser can handle various object formats
            const result = tjekApiService.transformHotspotsToOffers(mockApiResponse);
            
            // Should not crash and should provide reasonable defaults
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('quantity');
            expect(result[0]).toHaveProperty('unit');
            expect(result[0]).toHaveProperty('pieces');
            expect(result[0]).toHaveProperty('size');
        });
    });

    describe('Edge Cases', () => {
        test('should handle zero pieces', () => {
            const mockHotspot = [{
                offer: {
                    heading: 'Test Product',
                    pricing: { price: 50, currency: 'NOK' },
                    quantity: {
                        unit: { symbol: 'g' },
                        size: { from: 100, to: 100 },
                        pieces: { from: 0, to: 0 }
                    }
                },
                catalog_id: 'test',
                id: 'test'
            }];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspot);
            expect(result[0].pieces).toBe(1); // Should default to 1
        });

        test('should handle fractional sizes', () => {
            const mockHotspot = [{
                offer: {
                    heading: 'Fractional Product',
                    pricing: { price: 30, currency: 'NOK' },
                    quantity: {
                        unit: { symbol: 'l' },
                        size: { from: 0.33, to: 0.33 },
                        pieces: { from: 6, to: 6 }
                    }
                },
                catalog_id: 'test',
                id: 'test'
            }];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspot);
            expect(result[0].quantity).toBe('6 × 0.33l');
        });

        test('should handle very large numbers', () => {
            const mockHotspot = [{
                offer: {
                    heading: 'Large Product',
                    pricing: { price: 100, currency: 'NOK' },
                    quantity: {
                        unit: { symbol: 'ml' },
                        size: { from: 2000, to: 2000 },
                        pieces: { from: 1, to: 1 }
                    }
                },
                catalog_id: 'test',
                id: 'test'
            }];

            const result = tjekApiService.transformHotspotsToOffers(mockHotspot);
            expect(result[0].quantity).toBe('2000ml');
        });
    });
});
