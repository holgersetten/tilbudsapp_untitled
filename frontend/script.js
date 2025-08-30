document.addEventListener("DOMContentLoaded", async () => {
    const mealsContainer = document.querySelector(".container");

    try {
        const response = await fetch("http://localhost:5000/api/meals"); // Hent data fra backend
        if (!response.ok) throw new Error("Feil ved henting av data");

        const meals = await response.json();

        meals.forEach(meal => {
            const mealDiv = document.createElement("div");
            mealDiv.classList.add("meal");
            mealDiv.innerHTML = `<h2>${meal.name}</h2>
                                 <p><strong>Pris:</strong> ${meal.price} kr</p>
                                 <p><strong>Butikker:</strong> ${meal.stores.join(", ")}</p>`;
            mealsContainer.appendChild(mealDiv);
        });
    } catch (error) {
        console.error("Feil ved henting av mattilbud:", error);
    }
    
});
