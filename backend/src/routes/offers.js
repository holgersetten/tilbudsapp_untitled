const express = require('express');
const offerService = require('../services/offerService');

const router = express.Router();

// GET /api/offers - Hent alle tilbud
router.get('/', async (req, res) => {
    try {
        const { store } = req.query;
        let offers = offerService.getAllOffers();
        
        // Filter by store if specified
        if (store) {
            offers = offers.filter(offer => offer.store === store);
        }
        
        console.log(`📦 Returnerer ${offers.length} tilbud`);
        res.json(offers);
    } catch (error) {
        console.error('❌ Feil ved henting av tilbud:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente tilbud',
            message: error.message 
        });
    }
});

// GET /api/offers/best - Hent beste tilbud for ingredienser
router.get('/best', async (req, res) => {
    try {
        const { ingredients } = req.query;
        
        if (!ingredients) {
            return res.status(400).json({ 
                error: 'Mangler ingredienser parameter' 
            });
        }

        const ingredientsList = Array.isArray(ingredients) 
            ? ingredients 
            : ingredients.split(',').map(i => i.trim());

        console.log('🔎 Mottatt forespørsel om beste tilbud for ingredienser:', ingredientsList);
        
        const bestOffers = await offerService.getBestOffers(ingredientsList);
        
        console.log(`📦 Returnerer ${bestOffers.length} beste tilbud`);
        res.json(bestOffers);
    } catch (error) {
        console.error('❌ Feil ved henting av beste tilbud:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente beste tilbud',
            message: error.message 
        });
    }
});

// GET /api/offers/category/:category - Hent tilbud for kategori
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const offers = offerService.getCategoryOffers(decodeURIComponent(category));
        
        console.log(`📦 Returnerer ${offers.length} tilbud for kategori: ${category}`);
        res.json(offers);
    } catch (error) {
        console.error('❌ Feil ved henting av kategoritilbud:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente kategoritilbud',
            message: error.message 
        });
    }
});

// GET /api/offers/store/:store - Hent tilbud for spesifikk butikk
router.get('/store/:store', async (req, res) => {
    try {
        const { store } = req.params;
        const offers = offerService.getOffersByStore(decodeURIComponent(store));
        
        console.log(`📦 Returnerer ${offers.length || 0} tilbud for butikk: ${store}`);
        res.json(offers || []);
    } catch (error) {
        console.error('❌ Feil ved henting av butikktilbud:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente butikktilbud',
            message: error.message 
        });
    }
});

// POST /api/offers/update - Oppdater tilbud fra alle butikker
router.post('/update', async (req, res) => {
    try {
        if (offerService.isUpdateInProgress()) {
            return res.status(429).json({ 
                error: 'Oppdatering pågår allerede',
                message: 'Vent til pågående oppdatering er ferdig' 
            });
        }

        // Start oppdatering i bakgrunnen
        offerService.updateAllStoreOffers();
        
        res.json({ 
            message: 'Oppdatering av tilbud startet',
            status: 'started' 
        });
    } catch (error) {
        console.error('❌ Feil ved start av oppdatering:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke starte oppdatering',
            message: error.message 
        });
    }
});

// GET /api/offers/status - Hent status for tilbud
router.get('/status', async (req, res) => {
    try {
        const status = offerService.getOfferStatus();
        res.json(status);
    } catch (error) {
        console.error('❌ Feil ved henting av tilbudsstatus:', error.message);
        res.status(500).json({ 
            error: 'Kunne ikke hente tilbudsstatus',
            message: error.message 
        });
    }
});

// GET /api/offers/update/status - Sjekk oppdateringsstatus
router.get('/update/status', (req, res) => {
    res.json({ 
        updating: offerService.isUpdateInProgress(),
        status: offerService.isUpdateInProgress() ? 'running' : 'idle'
    });
});

module.exports = router;
