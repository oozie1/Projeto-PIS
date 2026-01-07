document.addEventListener("DOMContentLoaded", function() {
    const stars = document.querySelectorAll('.star-item');
    const input = document.getElementById('ratingInput');
    
    function fillStars(value) {
        stars.forEach(star => {
            const starValue = parseInt(star.getAttribute('data-value'));
            if (starValue <= value) {
                star.classList.remove('fa-regular');
                star.classList.add('fa-solid', 'selected'); 
                star.style.color = '#f5c518';
            } else {
                star.classList.remove('fa-solid', 'selected');
                star.classList.add('fa-regular');
                star.style.color = '';
            }
        });
    }

    if (input && input.value) {
        fillStars(input.value);
    }

    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            if (input) {
                input.value = value;
                fillStars(value); 
            }
        });
    });

    const listModal = document.getElementById('listModal');
    
    const btnOpenList = document.querySelector('.btn-icon[title="Adicionar à Lista"]');
    if (btnOpenList && listModal) {
        btnOpenList.onclick = function() {
            listModal.style.display = "block";
        }
    }

    const btnClose = document.querySelector('.close-modal');
    if (btnClose && listModal) {
        btnClose.onclick = function() {
            listModal.style.display = "none";
        }
    }

    window.onclick = function(event) {
        if (listModal && event.target == listModal) {
            listModal.style.display = "none";
        }
    }
});