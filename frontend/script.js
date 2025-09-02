// Global state
const state = {
  offersRaw: [],
  selectedStore: '',
  generalOffersLoaded: false,
  loadingOffers: false,
  sortBy: '', // '', 'price', 'title', 'store'
  sortOrder: 'asc', // 'asc', 'desc'
  priceFilter: 'all', // 'all', 'under50', 'under100', 'over100'
  selectedTags: new Set(), // Track selected ingredient tags
  offersSearchTimeout: null // For debounced search
};

// Tab switching
function showTab(tabName) {
  console.log('🎯 showTab called:', tabName);
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
  document.getElementById(`${tabName}-content`).classList.add('active');
  
  // Load offers when showing tilbud tab
  if (tabName === 'tilbud') {
    if (!state.generalOffersLoaded) {
      loadCurrentOffers();
    } else {
      // If offers are already loaded, trigger search to show current results
      setTimeout(() => searchOffers(), 100);
    }
  }
  
  // Load all meal suggestions when showing middager tab
  if (tabName === 'middager') {
    const container = document.getElementById('selected-tags');
    const searchInput = document.getElementById('search-input');
    const hasSearchTerm = searchInput.value.trim().length > 0;
    const hasTags = state.selectedTags.size > 0;
    
    // Only show tag container if user has searched or has tags
    if (hasSearchTerm || hasTags) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
    
    const ingredientsInput = document.getElementById('ingredients-input');
    if (!ingredientsInput.value.trim() && state.selectedTags.size === 0 && !hasSearchTerm) {
      setTimeout(() => loadAllMealSuggestions(), 100);
    }
  }
}

// Search offers based on input
async function searchOffers() {
  console.log('🔍 searchOffers() called');
  
  try {
    const searchTerm = document.getElementById('offers-search-input').value.trim().toLowerCase();
    console.log('🔍 Search term:', searchTerm);
    
    state.loadingOffers = true;
    document.getElementById('offers-content').innerHTML = '<div class="loading">Søker i tilbud...</div>';
    
    // Load all offers if not already loaded
    if (!state.offersRaw || state.offersRaw.length === 0) {
      console.log('📦 Loading all offers first...');
      const response = await fetch('/api/offers');
      if (!response.ok) {
        throw new Error('Failed to load offers');
      }
      const offers = await response.json();
      state.offersRaw = offers;
    }
    
    let filteredOffers = [];
    
    if (!searchTerm) {
      // Show all offers if no search term
      filteredOffers = state.offersRaw;
    } else {
      // Filter offers based on search term
      filteredOffers = state.offersRaw.filter(offer => {
        const title = (offer.title || '').toLowerCase();
        const description = (offer.description || '').toLowerCase();
        const store = (offer.store || '').toLowerCase();
        return title.includes(searchTerm) || 
               description.includes(searchTerm) || 
               store.includes(searchTerm);
      });
    }
    
    console.log(`🎯 Found ${filteredOffers.length} offers matching "${searchTerm}"`);
    
    // Update state with filtered offers
    const originalOffers = state.offersRaw;
    state.offersRaw = filteredOffers;
    state.loadingOffers = false;
    
    // Render filtered offers
    renderOffers();
    
    // Restore original offers to state for future searches
    setTimeout(() => {
      if (originalOffers) {
        state.offersRaw = originalOffers;
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ Error searching offers:', error);
    state.loadingOffers = false;
    document.getElementById('offers-content').innerHTML = `
      <div class="error">
        <h3>Kunne ikke søke i tilbud</h3>
        <p>Prøv igjen senere</p>
      </div>
    `;
  }
}

// Handle offers search input
function handleOffersSearchInput() {
  const searchInput = document.getElementById('offers-search-input');
  const searchTerm = searchInput.value.trim();
  
  // Auto-search after short delay for better UX
  if (state.offersSearchTimeout) {
    clearTimeout(state.offersSearchTimeout);
  }
  
  state.offersSearchTimeout = setTimeout(() => {
    if (searchTerm.length >= 2 || searchTerm.length === 0) {
      searchOffers();
    }
  }, 300);
}

// Search offers by category
async function searchOffersByCategory(category) {
  console.log('🏷️ searchOffersByCategory called with:', category);
  
  // Set the search input to the category
  const searchInput = document.getElementById('offers-search-input');
  searchInput.value = category;
  
  // Clear any existing search timeout
  if (state.offersSearchTimeout) {
    clearTimeout(state.offersSearchTimeout);
  }
  
  // Trigger search immediately
  await searchOffers();
}

// Load offers from API
async function loadCurrentOffers() {
  console.log('🔄 loadCurrentOffers() called');
  
  try {
    state.loadingOffers = true;
    document.getElementById('offers-content').innerHTML = '<div class="loading">Laster tilbud...</div>';
    
    console.log('🌐 Fetching /api/offers...');
    const response = await fetch('/api/offers');
    console.log('📡 Response status:', response.status, response.ok);
    
    const offers = await response.json();
    console.log('📦 Received offers:', offers.length, 'items');
    console.log('🔍 First 3 offers:', offers.slice(0, 3));
    console.log('🔍 Store names in first 10:', offers.slice(0, 10).map(o => o.store));
    
    // Store the offers
    state.offersRaw = offers;
    state.generalOffersLoaded = true;
    state.loadingOffers = false;
    
    console.log('✅ Processed offers for rendering:', offers.length);
    console.log('🎯 state.offersRaw structure:', state.offersRaw);
    console.log('🏪 Stores in processed offers:', offers.slice(0, 10).map(o => o.store));
    
    renderOffers();
    
  } catch(e) {
    console.error('❌ Error loading offers:', e);
    state.loadingOffers = false;
    document.getElementById('offers-content').innerHTML = '<div class="empty"><h3>Feil ved lasting</h3><p>Kunne ikke hente tilbud nå.</p></div>';
  }
}

// Render offers to DOM
function renderOffers() {
  console.log('🎨 renderOffers() called');
  console.log('📊 state.offersRaw:', state.offersRaw);
  console.log('🔍 state.offersRaw type:', typeof state.offersRaw);
  console.log('🔍 state.offersRaw length:', state.offersRaw?.length);
  
  const content = document.getElementById('offers-content');
  if (state.loadingOffers) { 
    content.innerHTML = '<div class="loading">Søker etter tilbud...</div>'; 
    return; 
  }
  
  // Check if we have data
  if (!state.offersRaw || state.offersRaw.length === 0) { 
    console.log('❌ No offersRaw data');
    content.innerHTML = '<div class="empty"><h3>Ingen tilbud</h3><p>Prøv andre ingredienser.</p></div>'; 
    return; 
  }

  let offersToRender = [];
  
  // Check if it's grouped data (array of objects with ingredient/offers) or simple array
  const isGroupedData = Array.isArray(state.offersRaw) && state.offersRaw.length > 0 && 
                       state.offersRaw[0].hasOwnProperty('ingredient') && state.offersRaw[0].hasOwnProperty('offers');
  
  console.log('🔍 Is grouped data:', isGroupedData);
  
  if (isGroupedData) {
    // Handle grouped data structure (from /api/best-offers)
    console.log('📂 Processing grouped data structure');
    const grouped = {};
    state.offersRaw.forEach(group => { 
      if (group.ingredient && group.offers) {
        grouped[group.ingredient] = group.offers;
      }
    });
    console.log('📂 Grouped offers:', Object.keys(grouped));
    
    // Filter by selected store and collect all offers
    Object.keys(grouped).forEach(ing => {
      console.log(`🔍 Processing ingredient "${ing}" with ${grouped[ing].length} offers`);
      console.log(`🔍 Current selectedStore: "${state.selectedStore}"`);
      console.log(`🔍 Sample stores in this group:`, [...new Set(grouped[ing].slice(0, 5).map(o => o.store))]);
      
      const filtered = grouped[ing].filter(o => {
        if (!state.selectedStore || state.selectedStore === '') {
          return true; // Show all if no store selected
        }
        const matches = o.store && o.store.toLowerCase().includes(state.selectedStore.toLowerCase());
        if (!matches) {
          console.log(`🚫 Filtered out: "${o.store}" (doesn't match "${state.selectedStore}")`);
        }
        return matches;
      });
      
      console.log(`🎯 Filtered ${ing}: ${grouped[ing].length} -> ${filtered.length} offers`);
      offersToRender.push(...filtered);
    });
  } else {
    // Handle simple array structure (from /api/offers)
    console.log('📋 Processing simple offers array');
    console.log('🔍 Current selectedStore:', state.selectedStore);
    console.log('🔍 Sample store names:', [...new Set(state.offersRaw.slice(0, 20).map(o => o.store))]);
    offersToRender = state.offersRaw.filter(o => {
      if (!state.selectedStore || state.selectedStore === '') {
        return true; // Show all if no store selected
      }
      const matches = o.store && o.store.toLowerCase().includes(state.selectedStore.toLowerCase());
      return matches;
    });
  }

  console.log('🎯 Final offers to render:', offersToRender.length);
  console.log('🏪 Stores in final offers:', [...new Set(offersToRender.map(o => o.store))]);
  
  if (offersToRender.length === 0) {
    content.innerHTML = '<div class="empty"><h3>Ingen tilbud</h3><p>Ingen tilbud funnet for valgt butikk.</p></div>';
    return;
  }
  
  // Apply price filter and sorting
  offersToRender = filterOffersByPrice(offersToRender);
  offersToRender = sortOffers(offersToRender);
  
  // Render the offers
  let html = '<div class="search-results">';
  html += `<div class="ingredient-section">
    <div class="ingredient-header">
      <h3>Aktuelle tilbud</h3>
      <div class="header-controls">
        <div class="filter-controls">
          <select class="filter-select" onchange="updateSort(this.value)">
            <option value="" ${state.sortBy === '' ? 'selected' : ''}>Ingen sortering</option>
            <option value="price" ${state.sortBy === 'price' ? 'selected' : ''}>Pris ${state.sortBy === 'price' ? (state.sortOrder === 'asc' ? '↑' : '↓') : ''}</option>
            <option value="title" ${state.sortBy === 'title' ? 'selected' : ''}>Navn ${state.sortBy === 'title' ? (state.sortOrder === 'asc' ? '↑' : '↓') : ''}</option>
            <option value="store" ${state.sortBy === 'store' ? 'selected' : ''}>Butikk ${state.sortBy === 'store' ? (state.sortOrder === 'asc' ? '↑' : '↓') : ''}</option>
          </select>
          <select class="filter-select" onchange="updatePriceFilter(this.value)">
            <option value="all" ${state.priceFilter === 'all' ? 'selected' : ''}>Alle priser</option>
            <option value="under50" ${state.priceFilter === 'under50' ? 'selected' : ''}>Under 50kr</option>
            <option value="under100" ${state.priceFilter === 'under100' ? 'selected' : ''}>Under 100kr</option>
            <option value="over100" ${state.priceFilter === 'over100' ? 'selected' : ''}>Over 100kr</option>
          </select>
        </div>
        <span class="count-badge">${offersToRender.length} tilbud</span>
      </div>
    </div>
    <div class="offers-grid fixed-size">`;
  
  offersToRender.forEach(offer => {
    const priceVal = (()=>{ 
      if (!offer.price && offer.price!==0) return 'N/A'; 
      const str = offer.price.toString(); 
      return /kr/i.test(str)? str.replace(/\s*kr\s*$/i,'') : str; 
    })();
    const unitPrice = calculateUnitPrice(offer);
    html += `<div class="offer-card" data-store="${offer.store || ''}" data-heading="${offer.title || ''}">
      <div class="offer-image">
        <img class="offer-product-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3Elaster bilde%3C/text%3E%3C/svg%3E" alt="Produktbilde" style="display:none;" />
        <img class="offer-store-logo" src="${getStoreLogo(offer.store)}" alt="${offer.store}" />
      </div>
      <div class="offer-content">
        <h4 class="offer-title">${formatTitle(offer.title)}</h4>
        <div class="offer-price">
          <span class="offer-price-main">${priceVal} kr</span>
          ${unitPrice ? `<span class="offer-unit-price">(${unitPrice})</span>` : ''}
        </div>
        ${offer.quantity ? `<div class="offer-quantity" title="${offer.quantity}">${offer.quantity}</div>` : ''}
      </div>
    </div>`;
  });
  
  html += '</div></div></div>';
  content.innerHTML = html;
  console.log('✅ Rendered offers to DOM');
  
  // Load product images
  setTimeout(() => loadProductImages(), 100);
}

function getStoreLogo(storeName) {
  const logos = { 
    'Rema 1000': '/images/rema_logo.png',
    'Kiwi': '/images/kiwi_logo.png',
    'Meny': '/images/meny_logo.png',
    'Coop Extra': '/images/coop_extra_logo.png',
    'Coop Mega': '/images/coop_mega_logo.png',
    'Coop Marked': '/images/coop_marked_logo.png',
    'Coop Prix': '/images/coop_prix_logo.png',
    'Obs': '/images/coop_obs_logo.png',
    'Bunnpris': '/images/bunnpris_logo.png',
    'Spar': '/images/spar_logo_1.png',
    'Joker': '/images/joker_logo.png'
  };
  return logos[storeName] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Ctext y="24" font-size="20" text-anchor="middle" x="16"%3E🏪%3C/text%3E%3C/svg%3E';
}

// Calculate unit price (per kg/liter) for display
function calculateUnitPrice(offer) {
  if (!offer.price || !offer.size || !offer.unit) {
    return null;
  }
  
  const price = parseFloat(offer.price);
  let size = parseFloat(offer.size);
  
  if (isNaN(price) || isNaN(size) || size <= 0) {
    return null;
  }
  
  // Check for multi-pack quantities like "4 × 100g" or "2 × 0.5l"
  let pieces = offer.pieces || 1;
  if (offer.quantity && typeof offer.quantity === 'string') {
    const multiPackMatch = offer.quantity.match(/(\d+)\s*[×x]\s*[\d.,]+[a-zA-Z]+/);
    if (multiPackMatch) {
      pieces = parseInt(multiPackMatch[1]);
    }
  }
  
  // Calculate total size for multi-pack
  const totalSize = size * pieces;
  
  let unitText = '';
  let unitPricePerUnit = 0;
  
  // Convert to per kg or per liter
  if (offer.unit === 'g') {
    unitPricePerUnit = (price / totalSize) * 1000; // Convert to per kg
    unitText = 'kg';
  } else if (offer.unit === 'ml' || offer.unit === 'l') {
    if (offer.unit === 'ml') {
      unitPricePerUnit = (price / totalSize) * 1000; // Convert to per liter
    } else {
      unitPricePerUnit = price / totalSize; // Already per liter
    }
    unitText = 'l';
  } else {
    return null; // Unknown unit
  }
  
  // Format the price nicely
  const formattedPrice = unitPricePerUnit < 10 
    ? unitPricePerUnit.toFixed(2)
    : Math.round(unitPricePerUnit);
  
  return `${formattedPrice} kr/${unitText}`;
}

function formatTitle(title) {
  if (!title) return 'Ukjent produkt';
  
  // Convert to lowercase first, then capitalize each word
  return title.toLowerCase()
    .split(' ')
    .map(word => {
      // Handle special cases like "kg", "ml", "l", etc.
      if (['kg', 'g', 'ml', 'l', 'dl', 'cl', 'stk', 'pk', 'bx', 'fl'].includes(word)) {
        return word;
      }
      // Handle numbers with units like "500g", "1l"
      if (/^\d+[a-z]+$/.test(word)) {
        return word;
      }
      // Capitalize first letter of regular words
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

async function loadProductImages() {
  // console.log('🖼️ Starting loadProductImages function');
  
  const offerCards = document.querySelectorAll('.offer-card[data-store][data-heading]');
  // console.log(`🖼️ Found ${offerCards.length} offer cards with data attributes`);
  
  for (const card of offerCards) {
    const storeName = card.getAttribute('data-store');
    const heading = card.getAttribute('data-heading');
    const imageElement = card.querySelector('.offer-product-image');
    
    // console.log(`🖼️ Processing card: store="${storeName}", heading="${heading}"`);
    
    // Try to fetch image
    if (!imageElement) {
      continue;
    }
    
    try {
      // Clean the heading to avoid encoding issues
      const cleanHeading = heading.trim();
      const cleanStoreName = storeName.trim();
      
      const url = `/api/product-image/${encodeURIComponent(cleanStoreName)}/${encodeURIComponent(cleanHeading)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        // Stille feil - ikke log hver gang
        continue;
      }
      
      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        imageElement.src = data.imageUrl;
        imageElement.style.display = 'block';
        // console.log(`✅ Image loaded for: ${cleanHeading}`);
      } else if (data.reason === 'NO_HOTSPOT_ID') {
        // Stille håndtering - bilde ikke tilgjengelig for denne butikken
        continue;
      }
    } catch (error) {
      // Kun log faktiske feil, ikke manglende bilder
      if (error.name !== 'TypeError') {
        console.error(`❌ Error loading image for "${heading}":`, error);
      }
    }
  }
}

function sortOffers(offers) {
  if (!state.sortBy) return offers; // No sorting if none selected
  
  return offers.sort((a, b) => {
    switch (state.sortBy) {
      case 'price':
        const priceA = parseFloat(a.price?.toString().replace(/[^0-9.]/g, '') || '0');
        const priceB = parseFloat(b.price?.toString().replace(/[^0-9.]/g, '') || '0');
        return state.sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      case 'title':
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return state.sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      case 'store':
        const storeA = (a.store || '').toLowerCase();
        const storeB = (b.store || '').toLowerCase();
        return state.sortOrder === 'asc' ? storeA.localeCompare(storeB) : storeB.localeCompare(storeA);
      default:
        return 0;
    }
  });
}

function filterOffersByPrice(offers) {
  if (state.priceFilter === 'all') return offers;
  
  return offers.filter(offer => {
    const price = parseFloat(offer.price?.toString().replace(/[^0-9.]/g, '') || '0');
    switch (state.priceFilter) {
      case 'under50': return price <= 50;
      case 'under100': return price <= 100;
      case 'over100': return price > 100;
      default: return true;
    }
  });
}

function updateSort(sortBy) {
  if (sortBy === '') {
    state.sortBy = '';
    state.sortOrder = 'asc';
  } else if (state.sortBy === sortBy) {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortBy = sortBy;
    state.sortOrder = 'asc';
  }
  renderOffers();
}

function updatePriceFilter(filter) {
  state.priceFilter = filter;
  renderOffers();
}

function filterStore(btn) {
  console.log('🎯 filterStore called, store:', btn.dataset.store);
  state.selectedStore = btn.dataset.store || '';
  
  // Update active button styling
  document.querySelectorAll('.store-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // Auto-switch to Tilbud tab
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-tilbud').classList.add('active');
  document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
  document.getElementById('tilbud-content').classList.add('active');
  
  // Load offers if not already loaded
  if (!state.generalOffersLoaded) {
    loadCurrentOffers();
  } else {
    // Re-render offers for this store
    renderOffers();
  }
}

// Reset search state helper function
function resetSearchState() {
  console.log('🔄 Resetting search state');
  
  // Clear content areas
  const content = document.getElementById('content');
  const offersContent = document.getElementById('offers-content');
  const resultsContent = document.getElementById('results-content');
  
  if (content) content.innerHTML = '';
  if (offersContent) offersContent.innerHTML = '';
  if (resultsContent) resultsContent.innerHTML = '';
  
  // Reset offers state
  state.offersRaw = [];
  state.generalOffersLoaded = false;
  state.loadingOffers = false;
  
  // Show placeholder meals again
  const placeholderMeals = document.getElementById('placeholder-meals');
  if (placeholderMeals) {
    placeholderMeals.style.display = 'block';
  }
}

async function searchMeals() {
  const ingredientsInput = document.getElementById('ingredients-input');
  const searchTerm = ingredientsInput.value.trim();
  
  // Reset previous search state when starting new search
  if (searchTerm) {
    console.log('🔄 Starting new meal search, resetting state');
    resetSearchState();
  }
  
  if (!searchTerm && state.selectedTags.size === 0) {
    loadAllMealSuggestions();
    return;
  }
  
  // If we have tags, prioritize searching for offers directly
  if (state.selectedTags.size > 0) {
    const ingredients = Array.from(state.selectedTags).join(', ');
    searchBestOffers(ingredients);
    return;
  }
  
  // Otherwise search in meal names first
  if (searchTerm) {
    await searchInMealNames(searchTerm);
  }
}

async function searchInMealNames(searchTerm) {
  try {
    // Show tag container since user is performing a search
    const container = document.getElementById('selected-tags');
    container.style.display = 'block';
    updateSelectedTagsDisplay();
    
    const response = await fetch(`/api/meals?search=${encodeURIComponent(searchTerm)}`);
    const meals = await response.json();
    
    if (meals.length > 0) {
      // Show matching meals
      renderMatchingMeals(meals, searchTerm);
    } else {
      // No meals found, search in ingredients
      await searchInIngredients(searchTerm);
    }
  } catch (error) {
    console.error('Error searching meals:', error);
    await searchInIngredients(searchTerm);
  }
}

function renderMatchingMeals(meals, searchTerm) {
  const content = document.getElementById('content');
  const placeholderMeals = document.getElementById('placeholder-meals');
  
  if (placeholderMeals) {
    placeholderMeals.style.display = 'none';
  }
  
  let html = '<div class="matching-meals-section">';
  html += '<div class="suggested-header">';
  html += `<h3>🍽️ Middager som matcher "${searchTerm}"</h3>`;
  html += '<p>Klikk på en rett for å søke etter tilbud på ingrediensene</p>';
  html += '</div>';
  html += '<div class="suggested-meals-grid">';
  
  meals.forEach(meal => {
    const ingredients = meal.ingredients.join(', ').toLowerCase();
    const icon = getMealIcon(meal.name);
    html += `
      <div class="meal-suggestion" onclick="loadMealSuggestion('${ingredients}')">
        <div class="meal-icon">${icon}</div>
        <h4>${meal.name}</h4>
        <p>${ingredients}</p>
      </div>`;
  });
  
  html += '</div>';
  
  // Add fallback to ingredient search
  html += '<div class="search-fallback">';
  html += `<p>Fant ikke det du lette etter? <button class="link-btn" onclick="searchInIngredients('${searchTerm}')">Søk i ingredienser i stedet</button></p>`;
  html += '</div>';
  
  html += '</div>';
  content.innerHTML = html;
}

async function searchInIngredients(searchTerm) {
  // Show ingredient suggestions based on search term
  const suggestions = [
    'kjøttdeig', 'kyllingfilet', 'laks', 'pasta', 'ris', 'poteter',
    'tomat', 'løk', 'gulrøtter', 'brokkoli', 'ost', 'egg',
    'bacon', 'fløte', 'kokosmelk', 'karri', 'hvitløk'
  ];
  
  // Filter suggestions based on search term
  const filteredSuggestions = suggestions.filter(ingredient => 
    ingredient.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (filteredSuggestions.length > 0) {
    renderFilteredIngredientSuggestions(filteredSuggestions, searchTerm);
  } else {
    renderIngredientSuggestions();
  }
}

function renderFilteredIngredientSuggestions(suggestions, searchTerm) {
  const content = document.getElementById('content');
  const placeholderMeals = document.getElementById('placeholder-meals');
  
  if (placeholderMeals) {
    placeholderMeals.style.display = 'none';
  }
  
  let html = '<div class="ingredient-suggestions-section">';
  html += '<div class="suggested-header">';
  html += `<h3>💡 Ingredienser som matcher "${searchTerm}"</h3>`;
  html += '<p>Klikk på en ingrediens for å legge den til i søket</p>';
  html += '</div>';
  html += '<div class="ingredient-tags">';
  
  suggestions.forEach(ingredient => {
    html += `<span class="ingredient-tag" onclick="addIngredientTag('${ingredient}')">${ingredient}</span>`;
  });
  
  html += '</div></div>';
  content.innerHTML = html;
}

function handleSearchInput() {
  const ingredientsInput = document.getElementById('ingredients-input');
  const searchTerm = ingredientsInput.value.trim();
  
  // Show tag container when user starts searching, hide when clearing search
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab && activeTab.id === 'tab-middager') {
    const container = document.getElementById('selected-tags');
    if (searchTerm.length > 0 || state.selectedTags.size > 0) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
      // If search is cleared and no tags, show all meal suggestions
      setTimeout(() => loadAllMealSuggestions(), 100);
    }
    updateSelectedTagsDisplay();
  }
}

// Tag management functions
function addIngredientTag(ingredient) {
  state.selectedTags.add(ingredient.toLowerCase().trim());
  updateSelectedTagsDisplay();
  
  // Automatically search when tag is added
  const ingredients = Array.from(state.selectedTags).join(', ');
  searchBestOffers(ingredients);
}

function handleTagInput(event) {
  const input = event.target;
  
  // Add typing class when user starts typing
  if (input.value.length > 0) {
    input.classList.add('typing');
  } else {
    input.classList.remove('typing');
  }
  
  if (event.key === 'Enter') {
    event.preventDefault();
    addTagFromInput();
  }
}

function handleTagFocus() {
  const input = document.getElementById('tag-input');
  if (input.value === '') {
    input.placeholder = '';
  }
}

function handleTagBlur() {
  const input = document.getElementById('tag-input');
  if (input.value.trim()) {
    addTagFromInput();
  } else {
    // Reset to plus sign when no input
    input.placeholder = '+';
    input.classList.remove('typing');
  }
}

function addTagFromInput() {
  const tagInput = document.getElementById('tag-input');
  const ingredient = tagInput.value.trim();
  
  if (ingredient && ingredient.length > 0) {
    addIngredientTag(ingredient);
    tagInput.value = '';
    tagInput.placeholder = '+';
    tagInput.classList.remove('typing');
    tagInput.blur(); // Remove focus to contract the input
  }
}

function focusTagInput(event) {
  // Prevent focusing if clicked on a tag or remove button
  if (event && (event.target.classList.contains('selected-tag') || 
               event.target.classList.contains('tag-remove'))) {
    return;
  }
  
  const tagInput = document.getElementById('tag-input');
  tagInput.focus();
}

function removeIngredientTag(ingredient) {
  state.selectedTags.delete(ingredient);
  updateSelectedTagsDisplay();
  
  // Auto-focus the tag input after removing a tag with longer delay
  setTimeout(() => {
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
      tagInput.focus();
    }
  }, 150);
  
  if (state.selectedTags.size === 0) {
    const ingredientsInput = document.getElementById('ingredients-input');
    if (!ingredientsInput.value.trim()) {
      loadAllMealSuggestions();
    }
  } else {
    const ingredients = Array.from(state.selectedTags).join(', ');
    searchBestOffers(ingredients);
  }
}

function clearAllTags() {
  state.selectedTags.clear();
  resetSearchState(); // Clear all previous results
  updateSelectedTagsDisplay();
  
  const ingredientsInput = document.getElementById('ingredients-input');
  if (!ingredientsInput.value.trim()) {
    loadAllMealSuggestions();
  }
}

function updateSelectedTagsDisplay() {
  const container = document.getElementById('selected-tags');
  const tagsList = document.getElementById('selected-tags-list');
  
  // Always show the container if there are tags OR to allow adding new ones
  container.style.display = 'block';
  
  let html = '';
  state.selectedTags.forEach(tag => {
    html += `
      <div class="selected-tag">
        <span>${tag}</span>
        <button class="tag-remove" onclick="removeIngredientTag('${tag}')">×</button>
      </div>`;
  });
  
  tagsList.innerHTML = html;
  
  // Hide container only if no tags and user hasn't interacted with meals tab
  if (state.selectedTags.size === 0) {
    const ingredientsInput = document.getElementById('ingredients-input');
    if (!ingredientsInput.value.trim()) {
      // Only hide if we're not actively in meals mode
      const activeTab = document.querySelector('.tab-btn.active');
      if (!activeTab || activeTab.id !== 'tab-middager') {
        container.style.display = 'none';
      }
    }
  }
}

function loadMealSuggestion(ingredients) {
  // Clear text input and add ingredients as tags
  const ingredientsInput = document.getElementById('ingredients-input');
  ingredientsInput.value = '';
  
  // Parse ingredients and add as tags
  const ingredientList = ingredients.split(',').map(i => i.trim().toLowerCase());
  state.selectedTags.clear();
  ingredientList.forEach(ingredient => {
    if (ingredient) {
      state.selectedTags.add(ingredient);
    }
  });
  
  updateSelectedTagsDisplay();
  
  // Search for offers
  const ingredientsString = Array.from(state.selectedTags).join(', ');
  searchBestOffers(ingredientsString);
}

async function loadAllMealSuggestions() {
  try {
    const response = await fetch('/api/meals');
    const meals = await response.json();
    renderAllMealSuggestions(meals);
  } catch (error) {
    console.error('Error loading meal suggestions:', error);
    renderPlaceholderMeals();
  }
}

function renderAllMealSuggestions(meals) {
  const content = document.getElementById('content');
  const placeholderMeals = document.getElementById('placeholder-meals');
  
  if (placeholderMeals) {
    placeholderMeals.style.display = 'none';
  }
  
  let html = '<div class="all-meals-section">';
  html += '<div class="suggested-header">';
  html += '<h3>🍽️ Alle middagsforslag</h3>';
  html += '<p>Klikk på en rett for å søke etter tilbud på ingrediensene</p>';
  html += '</div>';
  html += '<div class="suggested-meals-grid">';
  
  meals.forEach(meal => {
    if (meal.category === 'middag') {
      const ingredients = meal.ingredients.join(', ').toLowerCase();
      const icon = getMealIcon(meal.name);
      html += `
        <div class="meal-suggestion" onclick="loadMealSuggestion('${ingredients}')">
          <div class="meal-icon">${icon}</div>
          <h4>${meal.name}</h4>
          <p>${ingredients}</p>
        </div>`;
    }
  });
  
  html += '</div></div>';
  content.innerHTML = html;
}

function getMealIcon(mealName) {
  const name = mealName.toLowerCase();
  if (name.includes('spaghetti') || name.includes('pasta')) return '🍝';
  if (name.includes('curry') || name.includes('karri')) return '🍛';
  if (name.includes('taco')) return '🌮';
  if (name.includes('laks') || name.includes('fisk')) return '🐟';
  if (name.includes('pizza')) return '🍕';
  if (name.includes('suppe')) return '🍲';
  if (name.includes('kylling')) return '🍗';
  if (name.includes('biff')) return '🥩';
  return '🍽️';
}

function renderIngredientSuggestions() {
  const content = document.getElementById('content');
  const placeholderMeals = document.getElementById('placeholder-meals');
  
  if (placeholderMeals) {
    placeholderMeals.style.display = 'none';
  }
  
  const suggestions = [
    'kjøttdeig', 'kyllingfilet', 'laks', 'pasta', 'ris', 'poteter',
    'tomat', 'løk', 'gulrøtter', 'brokkoli', 'ost', 'egg',
    'bacon', 'fløte', 'kokosmelk', 'karri', 'hvitløk'
  ];
  
  let html = '<div class="ingredient-suggestions-section">';
  html += '<div class="suggested-header">';
  html += '<h3>💡 Prøv disse ingrediensene</h3>';
  html += '<p>Klikk på en ingrediens for å legge den til i søket</p>';
  html += '</div>';
  html += '<div class="ingredient-tags">';
  
  suggestions.forEach(ingredient => {
    html += `<span class="ingredient-tag" onclick="addIngredientTag('${ingredient}')">${ingredient}</span>`;
  });
  
  html += '</div></div>';
  content.innerHTML = html;
}

async function searchBestOffers(ingredients) {
  console.log('🔍 searchBestOffers called with:', ingredients);
  
  try {
    state.loadingOffers = true;
    document.getElementById('content').innerHTML = '<div class="loading">Søker etter beste tilbud...</div>';
    
    const response = await fetch(`/api/best-offers?ingredients=${encodeURIComponent(ingredients)}`);
    const data = await response.json();
    
    console.log('📦 Best offers response:', data);
    
    state.offersRaw = data;
    state.loadingOffers = false;
    
    renderBestOffers();
    
  } catch(e) {
    console.error('❌ Error searching best offers:', e);
    state.loadingOffers = false;
    document.getElementById('content').innerHTML = '<div class="empty"><h3>Feil ved søk</h3><p>Kunne ikke hente tilbud nå.</p></div>';
  }
}

function renderBestOffers() {
  const content = document.getElementById('content');
  const placeholderMeals = document.getElementById('placeholder-meals');
  
  if (state.loadingOffers) { 
    content.innerHTML = '<div class="loading">Søker etter tilbud...</div>'; 
    return; 
  }
  
  if (!state.offersRaw || state.offersRaw.length === 0) { 
    // Show ingredient suggestions instead of placeholder meals when no matches
    renderIngredientSuggestions();
    return; 
  }

  let html = '<div class="search-results">';
  
  state.offersRaw.forEach(group => {
    if (!group.offers || group.offers.length === 0) return;
    
    html += `<div class="ingredient-section">
      <div class="ingredient-header">
        <h3>${group.ingredient}</h3>
        <span class="count-badge">${group.offers.length} tilbud</span>
      </div>
      <div class="offers-grid">`;
    
    group.offers.forEach(offer => {
      const priceVal = (()=>{ 
        if (!offer.price && offer.price!==0) return 'N/A'; 
        const str = offer.price.toString(); 
        return /kr/i.test(str)? str.replace(/\s*kr\s*$/i,'') : str; 
      })();
      const unitPrice = calculateUnitPrice(offer);
      html += `<div class="offer-card" data-store="${offer.store || ''}" data-heading="${offer.title || ''}">
        <div class="offer-image">
          <img class="offer-product-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3Elaster bilde%3C/text%3E%3C/svg%3E" alt="Produktbilde" style="display:none;" />
          <img class="offer-store-logo" src="${getStoreLogo(offer.store)}" alt="${offer.store}" />
        </div>
        <div class="offer-content">
          <h4 class="offer-title">${formatTitle(offer.title)}</h4>
          <div class="offer-price">
            <span class="offer-price-main">${priceVal} kr</span>
            ${unitPrice ? `<span class="offer-unit-price">(${unitPrice})</span>` : ''}
          </div>
          ${offer.quantity ? `<div class="offer-quantity" title="${offer.quantity}">${offer.quantity}</div>` : ''}
        </div>
      </div>`;
    });
    
    html += '</div></div>';
  });
  
  html += '</div>';
  content.innerHTML = html;
  
  // Load product images
  setTimeout(() => loadProductImages(), 100);
}

function renderPlaceholderMeals() {
  const placeholderMeals = document.getElementById('placeholder-meals');
  if (placeholderMeals) {
    placeholderMeals.style.display = 'block';
  }
  document.getElementById('content').innerHTML = '';
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', () => {
  showTab('middager');

  // Check if we need to auto-search on page load
  const urlParams = new URLSearchParams(window.location.search);
  const autoIngredients = urlParams.get('ingredients');
  const currentTab = urlParams.get('tab');
  
  if (autoIngredients) {
    // Parse ingredients and add as tags
    const ingredientList = autoIngredients.split(',').map(i => i.trim().toLowerCase());
    state.selectedTags.clear();
    ingredientList.forEach(ingredient => {
      if (ingredient) {
        state.selectedTags.add(ingredient);
      }
    });
    updateSelectedTagsDisplay();
    setTimeout(() => searchBestOffers(autoIngredients), 100);
  } else {
    // Always load all meal suggestions when opening the site (regardless of tab)
    setTimeout(() => loadAllMealSuggestions(), 200);
  }
});
