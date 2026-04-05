(() => {
    const root = document.documentElement;
    const LOADING_ATTR = 'data-page-loading';

    function showLoader() {
        root.setAttribute(LOADING_ATTR, 'true');
    }

    function hideLoader() {
        root.removeAttribute(LOADING_ATTR);
    }

    function hideLoaderSoon() {
        requestAnimationFrame(() => {
            setTimeout(hideLoader, 80);
        });
    }

    function isInternalNavigation(anchor, event) {
        if (!anchor || event.defaultPrevented) return false;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (anchor.target && anchor.target !== '_self') return false;
        if (anchor.hasAttribute('download')) return false;

        const rawHref = anchor.getAttribute('href');
        if (!rawHref) return false;
        if (
            rawHref.startsWith('#') ||
            rawHref.startsWith('mailto:') ||
            rawHref.startsWith('tel:') ||
            rawHref.startsWith('javascript:')
        ) return false;

        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        if (url.href === window.location.href) return false;

        return true;
    }

    showLoader();

    if (document.readyState === 'complete') hideLoaderSoon();
    else window.addEventListener('load', hideLoaderSoon, { once: true });

    document.addEventListener('click', (event) => {
        const anchor = event.target.closest('a[href]');
        if (isInternalNavigation(anchor, event)) showLoader();
    });

    window.addEventListener('beforeunload', showLoader);
    window.addEventListener('pageshow', hideLoaderSoon);
})();
