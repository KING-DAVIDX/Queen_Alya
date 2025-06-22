const axios = require('axios');
const yts = require('yt-search');

module.exports = {
    searchTikTok: async (query) => {
        if (!query) throw new Error('Query parameter is required');
        const response = await axios.get(`https://itzpire.com/search/tiktok?query=${encodeURIComponent(query)}`);
        return response.data;
    },
    
    searchSpotify: async (query) => {
        if (!query) throw new Error('Query parameter is required');
        const response = await axios.get(`https://itzpire.com/search/spotify?query=${encodeURIComponent(query)}`);
        return {
            data: {
                name: response.data.data.name,
                artist: response.data.data.artist,
                release_date: response.data.data.release_date,
                image_url: response.data.data.image_url,
                link: response.data.data.link
            }
        };
    },
    
    searchYouTube: async (query) => {
        if (!query) throw new Error('Query parameter is required');
        const { videos } = await yts(query);
        return videos.slice(0, 10).map(video => ({
            videoId: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            author: {
                name: video.author.name
            },
            ago: video.ago,
            url: video.url
        }));
    },
    
    downloadYouTube: async (url, type = 'mp4') => {
        if (!url) throw new Error('URL parameter is required');
        const apiUrl = type === 'mp3' 
            ? `https://kord-api.vercel.app/ytmp3?url=${encodeURIComponent(url)}`
            : `https://kord-api.vercel.app/ytmp4?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);
        return {
            data: {
                quality: 'HD',
                filesize: response.data.filesize || '',
                downloadUrl: response.data.url || response.data.downloadUrl,
                previewUrl: response.data.url || response.data.downloadUrl
            }
        };
    },
    
    downloadTikTok: async (url) => {
        if (!url) throw new Error('URL parameter is required');
        const response = await axios.get(`https://kord-api.vercel.app/tiktok?url=${encodeURIComponent(url)}`);
        return response.data;
    },
    
    downloadSpotify: async (url) => {
        if (!url) throw new Error('URL parameter is required');
        const response = await axios.get(`https://ironman.koyeb.app/ironman/dl/v1/aio?url=${encodeURIComponent(url)}`);
        return {
            videoData: {
                medias: response.data.medias.map(media => ({
                    extension: media.extension,
                    quality: media.quality,
                    formattedSize: media.formattedSize,
                    url: media.url
                }))
            }
        };
    },
    
    downloadInstagram: async (url, type = 'image') => {
        if (!url) throw new Error('URL parameter is required');
        const response = await axios.get(`https://kord-api.vercel.app/indown?url=${encodeURIComponent(url)}&type=${type}`);
        return {
            data: {
                image: type === 'image' ? response.data.url : null,
                video: type === 'video' ? response.data.url : null
            }
        };
    },
    
    downloadPinterest: async (url) => {
        if (!url) throw new Error('URL parameter is required');
        const response = await axios.get(`https://kord-api.vercel.app/pinterest?url=${encodeURIComponent(url)}`);
        return {
            data: {
                data: {
                    downloads: [{
                        format: 'Image',
                        quality: 'HD',
                        url: response.data.url
                    }]
                }
            }
        };
    },
    
    downloadFacebook: async (url) => {
        if (!url) throw new Error('URL parameter is required');
        const response = await axios.get(`https://ironman.koyeb.app/ironman/dl/v1/aio?url=${encodeURIComponent(url)}`);
        return {
            videoData: {
                medias: response.data.medias.map(media => ({
                    extension: media.extension,
                    quality: media.quality,
                    formattedSize: media.formattedSize,
                    url: media.url
                }))
            }
        };
    }
};