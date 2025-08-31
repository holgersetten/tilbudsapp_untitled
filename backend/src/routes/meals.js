const express = require('express');
const mealService = require('../services/mealService');
const offerService = require('../services/offerService');

const router = express.Router();

// GET /api/meals - Hent alle middagsforslag
router.get('/', (req, res) => {
    try {
        const { search, category } = req.query;
        let meals;

        if (search) {
            meals = mealService.searchMeals(search);
        } else if (category) {
            meals = mealService.getMealsByCategory(category);
        } else {
            meals = mealService.getAllMeals();
        }

        console.log(`📦 Returnerer ${meals.length} middagsforslag`);
        res.json(meals);
    } catch (error) {
        console.error('❌ Feil ved henting av middagsforslag:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente middagsforslag',
            message: error.message 
        });
    }
});

// GET /api/meals/:mealName - Hent detaljer om spesifikk middag
router.get('/:mealName', (req, res) => {
    try {
        const { mealName } = req.params;
        const meal = mealService.getMealByName(decodeURIComponent(mealName));
        
        if (!meal) {
            return res.status(404).json({ 
                error: `Middag "${mealName}" ikke funnet` 
            });
        }

        console.log(`📦 Returnerer detaljer for: ${meal.name}`);
        res.json(meal);
    } catch (error) {
        console.error('❌ Feil ved henting av middagsdetaljer:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente middagsdetaljer',
            message: error.message 
        });
    }
});

// POST /api/meals - Legg til ny middag
router.post('/', (req, res) => {
    try {
        const newMeal = mealService.addMeal(req.body);
        res.status(201).json(newMeal);
    } catch (error) {
        console.error('❌ Feil ved tillegging av middag:', error.message);
        res.status(400).json({ 
            error: 'Kunne ikke legge til middag',
            message: error.message 
        });
    }
});

// PUT /api/meals/:mealName - Oppdater middag
router.put('/:mealName', (req, res) => {
    try {
        const { mealName } = req.params;
        const updatedMeal = mealService.updateMeal(decodeURIComponent(mealName), req.body);
        res.json(updatedMeal);
    } catch (error) {
        console.error('❌ Feil ved oppdatering av middag:', error.message);
        const statusCode = error.message.includes('ikke funnet') ? 404 : 400;
        res.status(statusCode).json({ 
            error: 'Kunne ikke oppdatere middag',
            message: error.message 
        });
    }
});

// DELETE /api/meals/:mealName - Slett middag
router.delete('/:mealName', (req, res) => {
    try {
        const { mealName } = req.params;
        const deletedMeal = mealService.deleteMeal(decodeURIComponent(mealName));
        res.json({ 
            message: `Middag "${mealName}" slettet`,
            deleted: deletedMeal 
        });
    } catch (error) {
        console.error('❌ Feil ved sletting av middag:', error.message);
        const statusCode = error.message.includes('ikke funnet') ? 404 : 400;
        res.status(statusCode).json({ 
            error: 'Kunne ikke slette middag',
            message: error.message 
        });
    }
});

// GET /api/meals/suggested/by-offers - Hent middagsforslag rangert etter tilbud
router.get('/suggested/by-offers', async (req, res) => {
    try {
        console.log('🍽️ Henter middagsforslag basert på tilbud...');
        
        // Hent alle middagsforslag (kun middag-kategorien)
        const allMeals = mealService.getMealsByCategory('middag');
        console.log(`📦 Fant ${allMeals.length} middagsretter`);
        
        if (allMeals.length === 0) {
            return res.json([]);
        }

        // Hent alle tilbud for å sjekke mot
        const allOffers = offerService.getAllOffers();
        console.log(`📦 Fant totalt ${allOffers.length} tilbud på tvers av butikker`);

        // Ranger middagsforslag basert på tilbud
        const rankedMeals = allMeals.map(meal => {
            let offersFound = 0;
            let totalIngredients = meal.ingredients ? meal.ingredients.length : 0;
            const availableOffers = [];

            if (meal.ingredients && Array.isArray(meal.ingredients)) {
                meal.ingredients.forEach(ingredient => {
                    const matchingOffers = allOffers.filter(offer => {
                        const title = (offer.title || '').toLowerCase();
                        const ingredientLower = ingredient.toLowerCase();
                        
                        // Enkel matching - kan forbedres med NLP senere
                        return title.includes(ingredientLower) || 
                               ingredientLower.includes(title.split(' ')[0]);
                    });

                    if (matchingOffers.length > 0) {
                        offersFound++;
                        availableOffers.push({
                            ingredient,
                            offers: matchingOffers.slice(0, 3) // Maks 3 tilbud per ingrediens
                        });
                    }
                });
            }

            const offerPercentage = totalIngredients > 0 ? (offersFound / totalIngredients) * 100 : 0;

            return {
                ...meal,
                offersFound,
                totalIngredients,
                offerPercentage: Math.round(offerPercentage),
                availableOffers,
                score: offersFound * 10 + (meal.difficulty === 'enkel' ? 5 : meal.difficulty === 'medium' ? 3 : 1)
            };
        });

        // Sorter etter score (flest tilbud + enkle retter først)
        rankedMeals.sort((a, b) => b.score - a.score);

        console.log(`🏆 Rangerte ${rankedMeals.length} middagsforslag`);
        console.log(`🥇 Topp 3: ${rankedMeals.slice(0, 3).map(m => `${m.name} (${m.offerPercentage}%)`).join(', ')}`);

        res.json(rankedMeals);
    } catch (error) {
        console.error('❌ Feil ved rangering av middagsforslag:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente rangerte middagsforslag',
            message: error.message 
        });
    }
});

module.exports = router;
