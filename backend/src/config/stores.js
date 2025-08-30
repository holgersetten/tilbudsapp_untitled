// 📂 Butikker med dealer-ID
const STORES = [
    { name: "Bunnpris", dealerId: "5b11sm", active: true, logo: "bunnpris_logo.png" },
    { name: "Rema 1000", dealerId: "faa0Ym", active: true, logo: "rema_logo.png" },
    { name: "Meny", dealerId: "4333pm", active: true, logo: "meny_logo.png" },
    { name: "Spar", dealerId: "c062vm", active: true, logo: "spar_logo.png" },
    { name: "Kiwi", dealerId: "257bxm", active: true, logo: "kiwi_logo.png" },
    { name: "Obs", dealerId: "51dawm", active: true, logo: "coop_obs_logo.png" },
    { name: "Coop Extra", dealerId: "80742m", active: true, logo: "coop_extra_logo.png" },
    { name: "Coop Mega", dealerId: "de79dm", active: true, logo: "coop_mega_logo.png" },
    { name: "Coop Prix", dealerId: "f5d5lm", active: true, logo: "coop_prix_logo.png" },
    { name: "Coop Marked", dealerId: "68baam", active: true, logo: "coop_marked_logo.png" },
    // Deaktivert butikker
    // { name: "Holdbart", dealerId: "pR2h9x", active: false },
    // { name: "Eurocash", dealerId: "c7f7VC", active: false },
    // { name: "Europris", dealerId: "e857Mm", active: false },
    // { name: "Oda", dealerId: "7kuNoZ", active: false }
];

const getActiveStores = () => STORES.filter(store => store.active);

const getStoreByName = (name) => STORES.find(store => 
    store.name.toLowerCase() === name.toLowerCase()
);

const getStoreByDealerId = (dealerId) => STORES.find(store => 
    store.dealerId === dealerId
);

const getStoreLogoUrl = (storeName) => {
    const store = getStoreByName(storeName);
    if (store && store.logo) {
        return `http://localhost:5000/images/${store.logo}`;
    }
    return null;
};

module.exports = {
    STORES,
    getActiveStores,
    getStoreByName,
    getStoreByDealerId,
    getStoreLogoUrl
};
