const express = require('express');
const categoryService = require('../services/categoryService');

const router = express.Router();

// GET /api/categories - Hent alle kategorier
router.get('/', (req, res) => {
    try {
        const categories = categoryService.getCategories();
        console.log(`📦 Returnerer ${categories.length} kategorier`);
        res.json(categories);
    } catch (error) {
        console.error('❌ Feil ved henting av kategorier:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente kategorier',
            message: error.message 
        });
    }
});

// GET /api/categories/:name - Hent spesifikk kategori
router.get('/:name', (req, res) => {
    try {
        const { name } = req.params;
        const category = categoryService.getCategoryByName(decodeURIComponent(name));
        
        if (!category) {
            return res.status(404).json({ 
                error: `Kategori "${name}" ikke funnet` 
            });
        }

        console.log(`📦 Returnerer kategori: ${category.category}`);
        res.json(category);
    } catch (error) {
        console.error('❌ Feil ved henting av kategori:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente kategori',
            message: error.message 
        });
    }
});

// POST /api/categories/tag - Tag et produkt med kategorier
router.post('/tag', (req, res) => {
    try {
        const { title } = req.body;
        
        if (!title) {
            return res.status(400).json({ 
                error: 'Mangler title i request body' 
            });
        }

        const tags = categoryService.tagProduct(title);
        
        console.log(`🏷️ Tagget "${title}" med: ${tags.join(', ')}`);
        res.json({ 
            title,
            tags 
        });
    } catch (error) {
        console.error('❌ Feil ved tagging av produkt:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke tagge produkt',
            message: error.message 
        });
    }
});

// POST /api/categories/reload - Reload kategorier og synonymer
router.post('/reload', (req, res) => {
    try {
        categoryService.reloadData();
        res.json({ 
            message: 'Kategorier og synonymer reloadet',
            categories: categoryService.getCategories().length 
        });
    } catch (error) {
        console.error('❌ Feil ved reload av kategorier:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke reloade kategorier',
            message: error.message 
        });
    }
});

module.exports = router;
