const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

async function loadMore(type, containerId, btnElement) {
    const container = document.getElementById(containerId);
    let currentPage = parseInt(container.getAttribute('data-page')) || 1;
    const nextPage = currentPage + 1;
    const originalContent = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnElement.style.pointerEvents = 'none';

    try {
        const response = await fetch(`/api/load-more?type=${type}&page=${nextPage}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            data.results.forEach(movie => {
                const card = document.createElement('a');
                card.href = `/details/${movie.media_type}/${movie.id}`;
                card.className = 'movie-card';
                
                const poster = movie.poster_path 
                    ? `${IMAGE_BASE_URL}${movie.poster_path}` 
                    : 'https://via.placeholder.com/160x240?text=Sem+Imagem';

                card.innerHTML = `
                    <img src="${poster}" alt="${movie.title}">
                    <div class="movie-info">${movie.title}</div>
                    <div class="rating">
                        <i class="fa-solid fa-star"></i> ${movie.vote_average}
                    </div>
                `;

                if (container.classList.contains('movie-row')) {
                    container.insertBefore(card, btnElement);
                } else {
                    container.appendChild(card);
                }
            });

            container.setAttribute('data-page', nextPage);
        } else {
            if (container.classList.contains('movie-row')) {
                btnElement.style.display = 'none';
            } else {
                btnElement.parentElement.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Erro ao carregar filmes:', error);
    } finally {
        btnElement.innerHTML = originalContent;
        btnElement.style.pointerEvents = 'auto';
    }
}