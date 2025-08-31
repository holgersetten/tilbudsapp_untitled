const express = require('express');
const cors = require('cors');
const path = require('path');
const schedule = require('node-schedule');
require('dotenv').config();

// Import configuration and services
const config = require('./config');
const offerService = require('./services/offerService');
const mealService = require('./services/mealService');
const imageService = require('./imageService');

// Import routes
const mealsRouter = require('./routes/meals');
const offersRouter = require('./routes/offers');
const categoriesRouter = require('./routes/categories');

const app = express();

// Middleware
app.use(cors({
    origin: '*',  // Tillat alle originer for testing
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (logoer)
app.use('/images', express.static(path.join(__dirname, 'img')));

// Request logging middleware - kun for viktige endepunkter
app.use((req, res, next) => {
    // Kun log viktige endepunkter, ikke produktbilder og statiske filer
    if (!req.path.startsWith('/api/product-image') && !req.path.startsWith('/images') && !req.path.startsWith('/favicon')) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    }
    next();
});

// Serve frontend files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Root endpoint - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv
    });
});

// API Routes
app.use('/api/meals', mealsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/categories', categoriesRouter);

// Meal suggestions shortcut endpoint
app.get('/api/meal-suggestions', async (req, res) => {
    try {
        // Redirect to the full meal suggestions endpoint
        const mealsResponse = await fetch(`http://localhost:${config.port}/api/meals/suggested/by-offers`);
        const meals = await mealsResponse.json();
        res.json(meals);
    } catch (error) {
        console.error('❌ Feil ved henting av meal suggestions:', error);
        res.status(500).json({ error: 'Kunne ikke hente meal suggestions' });
    }
});

// Product image endpoint  
app.get('/api/product-image/:storeName/:offerHeading', async (req, res) => {
    try {
        const { storeName, offerHeading } = req.params;
        
        // Safely decode URI with improved error handling
        let decodedHeading;
        try {
            // First attempt: standard decodeURIComponent
            decodedHeading = decodeURIComponent(offerHeading);
            // Additional cleanup for problematic characters
            decodedHeading = decodedHeading.normalize('NFC');
        } catch (uriError) {
            try {
                // Second attempt: manually handle common percentage cases
                let cleanedHeading = offerHeading;
                // Replace common problematic sequences
                cleanedHeading = cleanedHeading.replace(/%25/g, '%');  // Double-encoded %
                cleanedHeading = cleanedHeading.replace(/%20/g, ' ');  // Spaces
                cleanedHeading = cleanedHeading.replace(/\+/g, ' ');   // Plus signs as spaces
                
                // Try decoding the cleaned version
                decodedHeading = decodeURIComponent(cleanedHeading);
                decodedHeading = decodedHeading.normalize('NFC');
                // console.log(`🔧 Fixed URI decode for: "${offerHeading}" -> "${decodedHeading}"`);
            } catch (secondError) {
                // Final fallback: use the original string with basic cleanup
                decodedHeading = offerHeading.replace(/%20/g, ' ').replace(/\+/g, ' ');
                // console.log(`⚠️ Using fallback decode for: "${offerHeading}" -> "${decodedHeading}"`);
            }
        }
        
        // Find the offer by title and store to get hotspotId
        const allOffers = offerService.getAllOffers();
        const matchingOffer = allOffers.find(offer => 
            offer.title === decodedHeading && offer.store === storeName && offer.hotspotId
        );

        // console.log(`🔍 Looking for offer: "${decodedHeading}" from ${storeName}, found: ${!!matchingOffer}`);

        if (!matchingOffer || !matchingOffer.hotspotId) {
            // Sjekk om tilbudet finnes uten hotspotId
            const offerWithoutHotspot = allOffers.find(offer => 
                offer.title === decodedHeading && offer.store === storeName
            );
            
            if (offerWithoutHotspot) {
                // Tilbudet finnes, men mangler hotspotId - dette er normalt for noen butikker
                return res.json({
                    success: false,
                    message: 'Bilde ikke tilgjengelig for denne butikken',
                    imageUrl: null,
                    reason: 'NO_HOTSPOT_ID'
                });
            } else {
                // Tilbudet finnes ikke i det hele tatt
                return res.json({
                    success: false,
                    message: 'Tilbud ikke funnet',
                    imageUrl: null,
                    debug: `Søkte etter: "${decodedHeading}" fra ${storeName}`,
                    reason: 'OFFER_NOT_FOUND'
                });
            }
        }

        // Get image from etilbudsavis API using hotspotId
        const imageService = require('./services/imageService');
        const images = await imageService.getOfferImage(matchingOffer.hotspotId);
        
        // Get the best available image
        const bestImageUrl = imageService.getBestImage(images);
        
        if (bestImageUrl) {
            // Stille success - ikke log hver gang
            // console.log(`✅ Found image for ${decodedHeading}: ${bestImageUrl}`);
            res.json({
                success: true,
                imageUrl: bestImageUrl,
                images: images, // Include all image sizes for frontend choice
                offerId: matchingOffer.hotspotId
            });
        } else {
            // Kun log ved faktiske feil
            console.log(`❌ No image found for offer ${matchingOffer.hotspotId}`);
            res.json({
                success: false,
                message: 'Ingen bilde funnet for dette tilbudet',
                imageUrl: null,
                offerId: matchingOffer.hotspotId,
                error: images.error
            });
        }

    } catch (error) {
        // Log alle unhandled errors
        console.error('❌ Feil ved henting av produktbilde:', error.message);
        res.status(500).json({
            success: false,
            error: 'Kunne ikke hente produktbilde',
            message: error.message
        });
    }
});

// Shortcut to frontend
app.get('/app', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Legacy API endpoints for backward compatibility
app.get('/api/all-offers', async (req, res) => {
    try {
        const offers = offerService.getAllOffers();
        res.json(offers);
    } catch (error) {
        console.error('❌ Feil i legacy all-offers endpoint:', error.message);
        res.status(500).json({ error: 'Kunne ikke hente tilbud' });
    }
});

app.get('/api/best-offers', async (req, res) => {
    try {
        const { ingredients } = req.query;
        console.log('📥 Best-offers request:', { ingredients });
        
        if (!ingredients) {
            console.log('❌ Mangler ingredients parameter');
            return res.status(400).json({ error: 'Mangler ingredients parameter' });
        }

        const ingredientsList = Array.isArray(ingredients) 
            ? ingredients 
            : ingredients.split(',').map(i => i.trim());

        console.log('🔍 Parsed ingredients:', ingredientsList);

        const bestOffers = await offerService.getBestOffers(ingredientsList);
        console.log('📤 Sending response:', bestOffers.length > 0 ? `${bestOffers.length} ingredient groups` : 'empty array');
        
        res.json(bestOffers);
    } catch (error) {
        console.error('❌ Feil i legacy best-offers endpoint:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Kunne ikke hente beste tilbud' });
    }
});

// GET /api/offers/status - Status for tilbudshenting
app.get('/api/offers/status', (req, res) => {
    try {
        const stores = ['rema_1000', 'kiwi', 'meny', 'coop_extra', 'bunnpris', 'coop_mega', 'coop_marked', 'coop_prix', 'coop_obs', 'spar'];
        const status = stores.map(store => {
            try {
                const filename = `${store}_offers.json`;
                const filePath = require('path').join(config.offersDir, filename);
                const offers = fileService.loadJSON(filePath);
                
                return {
                    store: offerService.normalizeStoreName(store),
                    filename,
                    hasData: Array.isArray(offers) && offers.length > 0,
                    count: Array.isArray(offers) ? offers.length : 0,
                    lastModified: require('fs').existsSync(filePath) ? 
                        require('fs').statSync(filePath).mtime.toISOString() : null
                };
            } catch (error) {
                return {
                    store: offerService.normalizeStoreName(store),
                    filename: `${store}_offers.json`,
                    hasData: false,
                    count: 0,
                    error: error.message
                };
            }
        });

        const totalOffers = status.reduce((sum, s) => sum + s.count, 0);
        const activeStores = status.filter(s => s.hasData).length;

        res.json({
            summary: {
                totalOffers,
                activeStores,
                totalStores: stores.length,
                updateInProgress: offerService.isUpdateInProgress()
            },
            stores: status
        });
    } catch (error) {
        console.error('❌ Feil i offers status endpoint:', error.message);
        res.status(500).json({ error: 'Kunne ikke hente tilbudsstatus' });
    }
});

app.get('/api/category-offers/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const offers = offerService.getCategoryOffers(category);
        res.json(offers);
    } catch (error) {
        console.error('❌ Feil i legacy category-offers endpoint:', error.message);
        res.status(500).json({ error: 'Kunne ikke hente kategoritilbud' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('🔥 Uventet feil:', error);
    res.status(500).json({ 
        error: 'Intern serverfeil',
        message: config.nodeEnv === 'development' ? error.message : 'Noe gikk galt'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint ikke funnet',
        path: req.originalUrl 
    });
});

// Scheduled jobs
if (config.nodeEnv === 'production') {
    // Oppdater tilbud hver dag kl 06:00
    schedule.scheduleJob('0 6 * * *', () => {
        console.log('🕕 Starter automatisk oppdatering av tilbud...');
        offerService.updateAllStoreOffers();
    });

    // Oppdater tilbud hver fredag kl 12:00 (helgetilbud)
    schedule.scheduleJob('0 12 * * 5', () => {
        console.log('🛍️ Starter automatisk oppdatering av helgetilbud...');
        offerService.updateAllStoreOffers();
    });
}

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
    console.log('🚀 =================================');
    console.log('🚀 Middagstilbud API Server startet');
    console.log('🚀 =================================');
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🚀 Environment: ${config.nodeEnv}`);
    console.log(`🚀 CORS Origin: ${config.corsOrigin}`);
    console.log('🚀 =================================');
    
    // Initial data load
    console.log('📂 Laster inn initial data...');
    try {
        const meals = mealService.getAllMeals();
        console.log(`✅ Lastet ${meals.length} middagsforslag`);
    } catch (error) {
        console.error('❌ Feil ved loading av middagsforslag:', error.message);
    }

    // Start initial offer update in development
    if (config.nodeEnv === 'development') {
        console.log('🔄 Starter initial oppdatering av tilbud...');
        setTimeout(() => {
            offerService.updateAllStoreOffers();
        }, 2000);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📱 SIGTERM mottatt, stenger server...');
    server.close(() => {
        console.log('✅ Server stengt gracefully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📱 SIGINT mottatt, stenger server...');
    server.close(() => {
        console.log('✅ Server stengt gracefully');
        process.exit(0);
    });
});

module.exports = app;
