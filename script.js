const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const randomBtn = document.getElementById('randomBtn');
const recipeGrid = document.getElementById('recipeGrid');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

let favorites = JSON.parse(localStorage.getItem('recipeFavorites') || '[]');

function isFavorite(id) {
  return favorites.includes(id);
}

function toggleFavorite(id) {
  if (isFavorite(id)) {
    favorites = favorites.filter(f => f !== id);
  } else {
    favorites.push(id);
  }
  localStorage.setItem('recipeFavorites', JSON.stringify(favorites));
}

function showSkeletons(count = 8) {
  recipeGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `).join('');
}

function showEmpty(message) {
  recipeGrid.innerHTML = `
    <div class="empty-state" style="grid-column: 1/-1;">
      <div class="emoji">🍽️</div>
      <p>${message}</p>
    </div>
  `;
}

function renderCards(meals) {
  if (!meals || meals.length === 0) {
    showEmpty('No recipes found. Try a different search term.');
    return;
  }

  recipeGrid.innerHTML = meals.map(meal => `
    <div class="recipe-card" data-id="${meal.idMeal}">
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
      <button class="fav-btn ${isFavorite(meal.idMeal) ? 'active' : ''}" data-fav="${meal.idMeal}" onclick="event.stopPropagation()">
        <span class="heart">&#9829;</span>
      </button>
      <div class="card-body">
        <div class="card-title">${meal.strMeal}</div>
        <div class="card-meta">
          ${meal.strCategory ? `<span class="tag">${meal.strCategory}</span>` : ''}
          ${meal.strArea ? `<span class="tag area">${meal.strArea}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.fav;
      toggleFavorite(id);
      btn.classList.toggle('active');
    });
  });

  document.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function getIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`);
    }
  }
  return ingredients;
}

async function openDetail(id) {
  modalBody.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--text-dim)">Loading...</div>';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`${API_BASE}/lookup.php?i=${id}`);
    const data = await res.json();
    const meal = data.meals[0];
    const ingredients = getIngredients(meal);

    modalBody.innerHTML = `
      <img class="detail-img" src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <div class="detail-body">
        <h2 class="detail-title">${meal.strMeal}</h2>
        <div class="detail-tags">
          ${meal.strCategory ? `<span class="tag">${meal.strCategory}</span>` : ''}
          ${meal.strArea ? `<span class="tag area">${meal.strArea}</span>` : ''}
          ${meal.strTags ? meal.strTags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('') : ''}
        </div>

        <div class="detail-section">
          <h3>Ingredients</h3>
          <ul class="ingredients-list">
            ${ingredients.map(ing => `<li>${ing}</li>`).join('')}
          </ul>
        </div>

        <div class="detail-section">
          <h3>Instructions</h3>
          <div class="instructions">${meal.strInstructions}</div>
        </div>

        ${meal.strYoutube ? `
          <div class="detail-section">
            <a href="${meal.strYoutube}" target="_blank" rel="noopener" class="yt-link">
              ▶ Watch on YouTube
            </a>
          </div>
        ` : ''}
      </div>
    `;
  } catch {
    modalBody.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--heart)">Failed to load recipe details.</div>';
  }
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

async function searchMeals(query) {
  showSkeletons();
  try {
    const res = await fetch(`${API_BASE}/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderCards(data.meals);
  } catch {
    showEmpty('Something went wrong. Please try again.');
  }
}

async function fetchRandom() {
  showSkeletons(1);
  try {
    const res = await fetch(`${API_BASE}/random.php`);
    const data = await res.json();
    if (data.meals) {
      renderCards(data.meals);
      openDetail(data.meals[0].idMeal);
    }
  } catch {
    showEmpty('Failed to fetch a random recipe.');
  }
}

async function filterByCategory(category) {
  if (!category) {
    searchMeals('');
    return;
  }
  showSkeletons();
  try {
    const res = await fetch(`${API_BASE}/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    renderCards(data.meals);
  } catch {
    showEmpty('Failed to filter recipes.');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories.php`);
    const data = await res.json();
    data.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.strCategory;
      opt.textContent = cat.strCategory;
      categoryFilter.appendChild(opt);
    });
  } catch {
    // Categories will just show "All Categories"
  }
}

searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (q) {
    categoryFilter.value = '';
    searchMeals(q);
  }
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (q) {
      categoryFilter.value = '';
      searchMeals(q);
    }
  }
});

categoryFilter.addEventListener('change', () => {
  searchInput.value = '';
  filterByCategory(categoryFilter.value);
});

randomBtn.addEventListener('click', fetchRandom);

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

loadCategories();
searchMeals('chicken');
