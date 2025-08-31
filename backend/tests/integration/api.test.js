const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Import routes
const mealsRoutes = require('../../src/routes/meals');
const offersRoutes = require('../../src/routes/offers');

// Mock services
jest.mock('../../src/services/offerService');
jest.mock('../../src/services/fileService');

const offerService = require('../../src/services/offerService');
const fileService = require('../../src/services/fileService');

describe('API Integration Tests', () => {
    let app;

    beforeAll(() => {
        // Create Express app for testing
        app = express();
        app.use(cors());
        app.use(express.json());
        app.use('/api/meals', mealsRoutes);
        app.use('/api/offers', offersRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/offers/best', () => {
        test('should return offers for valid ingredients', async () => {
            const mockResults = [
                {
                    ingredient: 'kjøttdeig',
                    offers: [
                        {
                            title: 'SVINEKJØTTDEIG 20%',
                            price: 89,
                            currency: 'NOK',
                            quantity: '500g',
                            store: 'Rema 1000',
                            logo: 'http://localhost:5000/images/rema_logo.png'
                        }
                    ]
                }
            ];

            offerService.getBestOffers = jest.fn().mockReturnValue(mockResults);

            const response = await request(app)
                .get('/api/offers/best')
                .query({ ingredients: 'kjøttdeig' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResults);
            expect(response.body[0].offers[0]).toHaveProperty('quantity');
            expect(response.body[0].offers[0]).toHaveProperty('currency');
        });

        test('should handle missing ingredients parameter', async () => {
            const response = await request(app)
                .get('/api/offers/best');

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('should handle service errors gracefully', async () => {
            offerService.getBestOffers = jest.fn().mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .get('/api/offers/best')
                .query({ ingredients: 'test' });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/meals/suggested/by-offers', () => {
        test('should return meal suggestions with offer scores', async () => {
            const mockMeals = [
                {
                    id: 1,
                    name: 'Spaghetti Bolognese',
                    ingredients: ['kjøttdeig', 'tomat', 'løk'],
                    difficulty: 'Lett',
                    category: 'pasta'
                }
            ];

            const mockOffers = [
                {
                    title: 'SVINEKJØTTDEIG',
                    price: 89,
                    quantity: '500g',
                    store: 'Rema 1000'
                }
            ];

            fileService.loadJSON = jest.fn().mockReturnValue(mockMeals);
            offerService.getAllOffers = jest.fn().mockReturnValue(mockOffers);

            const response = await request(app)
                .get('/api/meals/suggested/by-offers');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            
            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('name');
                expect(response.body[0]).toHaveProperty('offerScore');
                expect(response.body[0]).toHaveProperty('availableIngredients');
            }
        });
    });

    describe('GET /api/offers/status', () => {
        test('should return offer status information', async () => {
            const mockStatus = {
                totalOffers: 420,
                storeCount: 10,
                lastUpdated: new Date().toISOString(),
                stores: [
                    { name: 'Bunnpris', offers: 87, status: 'fresh' },
                    { name: 'Rema 1000', offers: 85, status: 'cached' }
                ]
            };

            offerService.getOfferStatus = jest.fn().mockReturnValue(mockStatus);

            const response = await request(app)
                .get('/api/offers/status');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalOffers');
            expect(response.body).toHaveProperty('storeCount');
            expect(response.body).toHaveProperty('stores');
        });
    });
});
