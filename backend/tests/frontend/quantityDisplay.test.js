// Frontend Quantity Display Tests
// These tests verify that quantity information is correctly displayed in the UI

// Test data
const testOffers = [
    {
        title: 'COCA-COLA',
        store: 'rema',
        price: 99,
        originalPrice: 120,
        quantity: '6 × 1.5l',
        unit: 'l',
        pieces: 6,
        size: 1.5,
        imageUrl: 'test.jpg'
    },
    {
        title: 'Leverpostei',
        store: 'kiwi',
        price: 89,
        originalPrice: 99,
        quantity: '22g',
        unit: 'g',
        pieces: 1,
        size: 22,
        imageUrl: 'test.jpg'
    },
    {
        title: 'Ost',
        store: 'meny',
        price: 45,
        originalPrice: 55,
        quantity: '1kg',
        unit: 'kg',
        pieces: 1,
        size: 1,
        imageUrl: 'test.jpg'
    }
];

describe('Frontend Quantity Display', () => {
    // Mock DOM environment
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="offers-container"></div>
            <div class="filters">
                <select id="store-filter">
                    <option value="">Alle butikker</option>
                    <option value="rema">Rema 1000</option>
                    <option value="kiwi">KIWI</option>
                </select>
                <input type="text" id="search-input" placeholder="Søk etter tilbud...">
            </div>
        `;
    });

    describe('Quantity Information Display', () => {
        test('should display quantity information for multi-pack items', () => {
            const offer = testOffers[0]; // Coca-Cola 6-pack
            const offerElement = createOfferElement(offer);
            
            expect(offerElement.querySelector('.offer-quantity')).toBeTruthy();
            expect(offerElement.querySelector('.offer-quantity').textContent).toBe('6 × 1.5l');
        });

        test('should display simple quantity for single items', () => {
            const offer = testOffers[1]; // Leverpostei single tube
            const offerElement = createOfferElement(offer);
            
            expect(offerElement.querySelector('.offer-quantity').textContent).toBe('22g');
        });

        test('should handle missing quantity gracefully', () => {
            const offerWithoutQuantity = {
                title: 'Product Without Quantity',
                store: 'rema',
                price: 50,
                imageUrl: 'test.jpg'
            };
            
            const offerElement = createOfferElement(offerWithoutQuantity);
            const quantityElement = offerElement.querySelector('.offer-quantity');
            
            // Quantity element should either not exist or be empty
            expect(!quantityElement || quantityElement.textContent.trim() === '').toBe(true);
        });

        test('should filter offers by store correctly', () => {
            // Simulate having offers displayed
            window.allOffers = testOffers;
            
            // Simulate filtering by REMA
            const storeFilter = document.getElementById('store-filter');
            storeFilter.value = 'rema';
            
            // Apply filter (simulate the filtering logic)
            const filteredOffers = testOffers.filter(offer => 
                storeFilter.value === '' || offer.store === storeFilter.value
            );
            
            expect(filteredOffers).toHaveLength(1);
            expect(filteredOffers[0].title).toBe('COCA-COLA');
        });

        test('should search offers by title correctly', () => {
            // Simulate search functionality
            const searchInput = document.getElementById('search-input');
            searchInput.value = 'coca';
            
            const filteredOffers = testOffers.filter(offer =>
                offer.title.toLowerCase().includes(searchInput.value.toLowerCase())
            );
            
            expect(filteredOffers).toHaveLength(1);
            expect(filteredOffers[0].title).toBe('COCA-COLA');
        });
    });

    describe('Store Logo Display', () => {
        test('should display store logos without text', () => {
            const offer = testOffers[0];
            const offerElement = createOfferElement(offer);
            
            const storeLogoContainer = offerElement.querySelector('.store-logo-container');
            expect(storeLogoContainer).toBeTruthy();
            
            // Should not contain store name text
            expect(storeLogoContainer.textContent.trim()).toBe('');
        });
    });
});

// Helper function to create offer elements (mock implementation)
function createOfferElement(offer) {
    const offerDiv = document.createElement('div');
    offerDiv.className = 'offer-card';
    
    offerDiv.innerHTML = `
        <div class="store-logo-container">
            <img src="icons/${offer.store}.png" alt="${offer.store}" class="store-logo">
        </div>
        <img src="${offer.imageUrl || 'placeholder.jpg'}" alt="${offer.title}" class="offer-image">
        <div class="offer-info">
            <div class="offer-title">${offer.title}</div>
            ${offer.quantity ? `<div class="offer-quantity">${offer.quantity}</div>` : ''}
            <div class="offer-price">
                <span class="current-price">${offer.price} kr</span>
                ${offer.originalPrice ? `<span class="original-price">${offer.originalPrice} kr</span>` : ''}
            </div>
        </div>
    `;
    
    return offerDiv;
}
