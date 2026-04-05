(function () {
    function isDesktopGradeDevice() {
        const hasDesktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const notSmallViewport = window.matchMedia('(max-width: 1100px)').matches === false;
        return hasDesktopPointer && notSmallViewport;
    }

    function setLandingLockState(locked) {
        const lockBanner = document.getElementById('deviceLockBanner');
        const demoCards = Array.from(document.querySelectorAll('.demo-card'));
        document.body.classList.toggle('mobile-locked', locked);
        if (lockBanner) lockBanner.hidden = !locked;

        demoCards.forEach((card) => {
            if (!card.dataset.href) {
                card.dataset.href = card.getAttribute('href') || '';
            }
            if (locked) {
                card.removeAttribute('href');
                card.setAttribute('aria-disabled', 'true');
                card.tabIndex = -1;
            } else {
                if (card.dataset.href) card.setAttribute('href', card.dataset.href);
                card.removeAttribute('aria-disabled');
                card.removeAttribute('tabindex');
            }
        });
    }

    function enforceDeviceGate() {
        const locked = !isDesktopGradeDevice();
        const isLandingPage = Boolean(document.querySelector('.landing'));

        if (!locked) {
            if (isLandingPage) setLandingLockState(false);
            return;
        }

        if (isLandingPage) {
            setLandingLockState(true);
            return;
        }

        const homeUrl = new URL('../index.html', window.location.href);
        homeUrl.searchParams.set('desktop_required', '1');
        window.location.replace(homeUrl.toString());
    }

    function setupLandingClickBlocker() {
        document.addEventListener('click', function (event) {
            if (isDesktopGradeDevice()) return;
            const card = event.target.closest('.demo-card');
            if (!card) return;
            event.preventDefault();
            event.stopPropagation();
        }, true);
    }

    setupLandingClickBlocker();
    window.addEventListener('resize', enforceDeviceGate);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceDeviceGate, { once: true });
    } else {
        enforceDeviceGate();
    }
})();
