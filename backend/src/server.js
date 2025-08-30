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

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

// Product image endpoint  
app.get('/api/product-image/:storeName/:offerHeading', async (req, res) => {
    try {
        const { storeName, offerHeading } = req.params;
        console.log(`🖼️ Søker etter produktbilde: ${offerHeading} fra ${storeName}`);
        
        // Enkel test uten ImageService først
        console.log(`🧪 Test respons for ${storeName} - ${offerHeading}`);
        
        res.json({
            success: false,
            message: 'Bildehenting deaktivert for testing',
            debug: {
                storeName,
                offerHeading: decodeURIComponent(offerHeading)
            }
        });
        
    } catch (error) {
        console.error('❌ Feil ved henting av produktbilde:', error);
        res.status(500).json({
            success: false,
            error: error.message
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
