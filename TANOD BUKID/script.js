document.addEventListener('DOMContentLoaded', () => {
    const logoButton = document.querySelector('.logo-button');
    const screens = document.querySelectorAll('.screen');
    const skipButtons = document.querySelectorAll('.skip-button');
    const ctaButtons = document.querySelectorAll('.cta-button');

    const navigateTo = (target, direction = 'forward') => {
        const current = document.querySelector('.screen.active');
        const next = document.querySelector(target);

        if (!next || current === next) {
            return;
        }

        screens.forEach((screen) => {
            screen.classList.remove('active', 'exit-left', 'exit-right', 'enter-from-left');
        });

        if (direction === 'backward') {
            next.classList.add('enter-from-left');
        }

        current.classList.add(direction === 'forward' ? 'exit-left' : 'exit-right');
        next.classList.add('active');

        window.setTimeout(() => {
            current.classList.remove('exit-left', 'exit-right', 'enter-from-left');
        }, 800);
    };

    const showFeature = () => {
        navigateTo('.feature-screen', 'forward');
    };

    const showLanding = () => {
        navigateTo('.hero', 'backward');
    };

    const showNextFeature = (event) => {
        const currentFeature = event.currentTarget.closest('.feature-screen');
        const nextFeature = currentFeature.classList.contains('page-two')
            ? '.page-three'
            : '.page-four';

        navigateTo(nextFeature, 'forward');
    };

    if (logoButton) {
        logoButton.addEventListener('click', showFeature);
    }

    skipButtons.forEach((button) => {
        button.addEventListener('click', () => { window.location.hash = 'signin'; });
    });

    ctaButtons.forEach((button) => {
        button.addEventListener('click', button.classList.contains('final-cta')
            ? () => { window.location.hash = 'signin'; }
            : showNextFeature);
    });
});
