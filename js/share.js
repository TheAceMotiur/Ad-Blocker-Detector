function shareOnSocial(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    const description = encodeURIComponent(document.querySelector('meta[name="description"]').content);

    const shareUrls = {
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${description}`,
        reddit: `https://reddit.com/submit?url=${url}&title=${title}`,
        whatsapp: `https://api.whatsapp.com/send?text=${title}%20${url}`,
        telegram: `https://t.me/share/url?url=${url}&text=${title}`
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
}
