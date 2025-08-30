const config = require('../config');
const fileService = require('./fileService');

class MealService {
    constructor() {
        this.meals = this.loadMeals();
    }

    loadMeals() {
        const data = fileService.loadJSON(config.mealsFile);
        if (Array.isArray(data)) {
            return data;
        }
        console.warn('⚠️ Meals-filen har feil format, forventet array');
        return [];
    }

    reloadMeals() {
        this.meals = this.loadMeals();
        console.log(`✅ Reloadet ${this.meals.length} middagsforslag`);
    }

    getAllMeals() {
        return this.meals;
    }

    getMealByName(name) {
        if (!name || typeof name !== 'string') {
            return null;
        }

        return this.meals.find(meal => 
            meal.name && meal.name.toLowerCase() === name.toLowerCase()
        );
    }

    searchMeals(query) {
        if (!query || typeof query !== 'string') {
            return this.meals;
        }

        const queryLower = query.toLowerCase();
        return this.meals.filter(meal => 
            (meal.name && meal.name.toLowerCase().includes(queryLower)) ||
            (meal.ingredients && Array.isArray(meal.ingredients) && 
             meal.ingredients.some(ing => ing.toLowerCase().includes(queryLower)))
        );
    }

    getMealsByCategory(category) {
        if (!category || typeof category !== 'string') {
            return [];
        }

        const categoryLower = category.toLowerCase();
        return this.meals.filter(meal => 
            meal.category && meal.category.toLowerCase() === categoryLower
        );
    }

    addMeal(mealData) {
        if (!mealData.name || !mealData.ingredients) {
            throw new Error('Måltid må ha navn og ingredienser');
        }

        // Sjekk om måltid allerede eksisterer
        const existing = this.getMealByName(mealData.name);
        if (existing) {
            throw new Error(`Måltid "${mealData.name}" eksisterer allerede`);
        }

        const newMeal = {
            id: Date.now(),
            name: mealData.name,
            ingredients: Array.isArray(mealData.ingredients) ? mealData.ingredients : [],
            instructions: mealData.instructions || '',
            category: mealData.category || 'annet',
            createdAt: new Date().toISOString(),
            ...mealData
        };

        this.meals.push(newMeal);
        
        // Lagre til fil
        const saved = fileService.saveJSON(config.mealsFile, this.meals);
        if (!saved) {
            throw new Error('Kunne ikke lagre måltid til fil');
        }

        console.log(`✅ Lagt til ny måltid: ${newMeal.name}`);
        return newMeal;
    }

    updateMeal(name, updateData) {
        const mealIndex = this.meals.findIndex(meal => 
            meal.name && meal.name.toLowerCase() === name.toLowerCase()
        );

        if (mealIndex === -1) {
            throw new Error(`Måltid "${name}" ikke funnet`);
        }

        this.meals[mealIndex] = {
            ...this.meals[mealIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        // Lagre til fil
        const saved = fileService.saveJSON(config.mealsFile, this.meals);
        if (!saved) {
            throw new Error('Kunne ikke lagre oppdatert måltid til fil');
        }

        console.log(`✅ Oppdatert måltid: ${name}`);
        return this.meals[mealIndex];
    }

    deleteMeal(name) {
        const mealIndex = this.meals.findIndex(meal => 
            meal.name && meal.name.toLowerCase() === name.toLowerCase()
        );

        if (mealIndex === -1) {
            throw new Error(`Måltid "${name}" ikke funnet`);
        }

        const deletedMeal = this.meals.splice(mealIndex, 1)[0];

        // Lagre til fil
        const saved = fileService.saveJSON(config.mealsFile, this.meals);
        if (!saved) {
            throw new Error('Kunne ikke lagre endringer til fil');
        }

        console.log(`✅ Slettet måltid: ${name}`);
        return deletedMeal;
    }
}

module.exports = new MealService();
