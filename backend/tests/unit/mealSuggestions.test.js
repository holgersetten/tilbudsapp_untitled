const fs = require('fs');
const path = require('path');

// Mock meal data matching the actual meals.json structure
const mockMeals = [
    {
        "name": "Spaghetti Bolognese",
        "ingredients": ["Spaghetti", "Kjøttdeig", "Hakkede tomater", "Løk", "Hvitløk"],
        "difficulty": "enkel",
        "category": "middag"
    },
    {
        "name": "Kylling i curry",
        "ingredients": ["Kyllingfilet", "Kokosmelk", "Karri", "Løk", "Ris"],
        "difficulty": "medium",
        "category": "middag"
    },
    {
        "name": "Taco",
        "ingredients": ["Kjøttdeig", "Tacosaus", "Lomper", "Ost", "Salat", "Mais", "Rømme"],
        "difficulty": "enkel",
        "category": "middag"
    }
];

// Mock offers data
const mockOffers = [
    {
        title: 'Kjøttdeig',
        store: 'rema',
        price: 89,
        quantity: '500g',
        tags: ['kjøtt', 'deig']
    },
    {
        title: 'Spaghetti',
        store: 'kiwi',
        price: 25,
        quantity: '500g',
        tags: ['pasta']
    },
    {
        title: 'Laks filet',
        store: 'meny',
        price: 149,
        quantity: '400g',
        tags: ['fisk', 'laks']
    },
    {
        title: 'Kyllingfilet',
        store: 'rema',
        price: 99,
        quantity: '1kg',
        tags: ['kylling', 'filet']
    }
];

describe('Meal Suggestion System', () => {
    let mealService;

    beforeEach(() => {
        // Mock file system calls
        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
            if (filePath.includes('meals.json')) {
                return JSON.stringify(mockMeals);
            }
            if (filePath.includes('synonyms.json')) {
                return JSON.stringify({
                    "kjøttdeig": ["kjøtt", "deig", "storfe"],
                    "kyllingfilet": ["kylling", "kyllingbryst"],
                    "spaghetti": ["pasta"]
                });
            }
            return '{}';
        });

        // Re-require to get fresh module with mocked fs
        delete require.cache[require.resolve('../../src/services/mealService')];
        mealService = require('../../src/services/mealService');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Meal Ranking Algorithm', () => {
        test('should return meals from service', () => {
            const allMeals = mealService.getAllMeals();
            
            expect(allMeals).toHaveLength(3);
            expect(allMeals[0].name).toBe('Spaghetti Bolognese');
        });

        test('should filter meals by category', () => {
            const dinnerMeals = mealService.getMealsByCategory('middag');
            
            expect(dinnerMeals).toHaveLength(3);
            dinnerMeals.forEach(meal => {
                expect(meal.category).toBe('middag');
            });
        });

        test('should search meals by name and ingredients', () => {
            const spaghettiMeals = mealService.searchMeals('spaghetti');
            
            expect(spaghettiMeals).toHaveLength(1);
            expect(spaghettiMeals[0].name).toBe('Spaghetti Bolognese');
        });

        test('should find meal by exact name', () => {
            const meal = mealService.getMealByName('Taco');
            
            expect(meal).toBeTruthy();
            expect(meal.name).toBe('Taco');
            expect(meal.ingredients).toContain('Kjøttdeig');
        });

        test('should handle case insensitive meal name search', () => {
            const meal = mealService.getMealByName('taco');
            
            expect(meal).toBeTruthy();
            expect(meal.name).toBe('Taco');
        });
    });

    describe('Meal Management', () => {
        test('should add new meal successfully', () => {
            const newMealData = {
                name: 'Test Meal',
                ingredients: ['Test Ingredient 1', 'Test Ingredient 2'],
                difficulty: 'enkel',
                category: 'middag'
            };

            const addedMeal = mealService.addMeal(newMealData);
            
            expect(addedMeal).toBeTruthy();
            expect(addedMeal.name).toBe('Test Meal');
            expect(addedMeal.ingredients).toEqual(['Test Ingredient 1', 'Test Ingredient 2']);
            expect(addedMeal).toHaveProperty('id');
            expect(addedMeal).toHaveProperty('createdAt');
        });

        test('should update existing meal', () => {
            const updateData = {
                difficulty: 'vanskelig',
                ingredients: ['Updated Ingredient']
            };

            const updatedMeal = mealService.updateMeal('Taco', updateData);
            
            expect(updatedMeal.difficulty).toBe('vanskelig');
            expect(updatedMeal.ingredients).toEqual(['Updated Ingredient']);
            expect(updatedMeal.name).toBe('Taco'); // Name should remain unchanged
        });

        test('should delete meal by name', () => {
            const deletedMeal = mealService.deleteMeal('Taco');
            
            expect(deletedMeal).toBeTruthy();
            expect(deletedMeal.name).toBe('Taco');
            
            // Meal should no longer exist
            const foundMeal = mealService.getMealByName('Taco');
            expect(foundMeal).toBeUndefined();
        });

        test('should throw error when adding duplicate meal', () => {
            const duplicateMeal = {
                name: 'Spaghetti Bolognese', // Already exists in mock data
                ingredients: ['Test'],
                category: 'middag'
            };

            expect(() => {
                mealService.addMeal(duplicateMeal);
            }).toThrow('eksisterer allerede');
        });

        test('should throw error when updating non-existent meal', () => {
            expect(() => {
                mealService.updateMeal('Non-existent Meal', { difficulty: 'enkel' });
            }).toThrow('ikke funnet');
        });
    });

    describe('Error Handling', () => {
        test('should handle missing meals.json file', () => {
            fs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            delete require.cache[require.resolve('../../src/services/mealService')];
            
            expect(() => {
                require('../../src/services/mealService');
            }).not.toThrow();
        });

        test('should handle invalid JSON in meals file', () => {
            fs.readFileSync.mockReturnValue('invalid json');

            delete require.cache[require.resolve('../../src/services/mealService')];
            
            expect(() => {
                require('../../src/services/mealService');
            }).not.toThrow();
        });

        test('should handle empty offers array', () => {
            const allMeals = mealService.getAllMeals();
            
            expect(allMeals).toHaveLength(3);
            allMeals.forEach(meal => {
                expect(meal).toHaveProperty('name');
                expect(meal).toHaveProperty('ingredients');
                expect(meal).toHaveProperty('category');
            });
        });
    });
});
