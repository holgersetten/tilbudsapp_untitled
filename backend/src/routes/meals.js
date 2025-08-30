const express = require('express');
const mealService = require('../services/mealService');

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

module.exports = router;
