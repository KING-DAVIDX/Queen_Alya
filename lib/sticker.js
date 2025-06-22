const fs = require("fs");
const { tmpdir } = require("os");
const Crypto = require("crypto");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");

const KING_URL = "https://king-api-437z.onrender.com";

async function imageToWebp(media) {
    const form = new FormData();
    form.append("image", media, "image.jpg");
    
    try {
        const response = await fetch(`${KING_URL}/tools/image-to-webp`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function videoToWebp(media) {
    const form = new FormData();
    form.append("video", media, "video.mp4");
    
    try {
        const response = await fetch(`${KING_URL}/tools/video-to-webp`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function writeExifImg(media, metadata) {
    const form = new FormData();
    form.append("image", media, "image.jpg");
    if (metadata.packname) form.append("packname", metadata.packname);
    if (metadata.author) form.append("author", metadata.author);
    if (metadata.categories) form.append("categories", Array.isArray(metadata.categories) ? metadata.categories.join(",") : metadata.categories);
    
    try {
        const response = await fetch(`${KING_URL}/tools/write-exif-img`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function writeExifVid(media, metadata) {
    const form = new FormData();
    form.append("video", media, "video.mp4");
    if (metadata.packname) form.append("packname", metadata.packname);
    if (metadata.author) form.append("author", metadata.author);
    if (metadata.categories) form.append("categories", Array.isArray(metadata.categories) ? metadata.categories.join(",") : metadata.categories);
    
    try {
        const response = await fetch(`${KING_URL}/tools/write-exif-vid`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function writeExifWebp(media, metadata) {
    const form = new FormData();
    form.append("webp", media, "sticker.webp");
    if (metadata.packname) form.append("packname", metadata.packname);
    if (metadata.author) form.append("author", metadata.author);
    if (metadata.categories) form.append("categories", Array.isArray(metadata.categories) ? metadata.categories.join(",") : metadata.categories);
    
    try {
        const response = await fetch(`${KING_URL}/tools/write-exif-webp`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function toVideo(media, ext) {
    const form = new FormData();
    form.append("file", media, `file.${ext}`);
    
    try {
        const response = await fetch(`${KING_URL}/tools/to-video?ext=${ext}`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function webpToMp4(media) {
    const form = new FormData();
    form.append("webp", media, "animation.webp");
    
    try {
        const response = await fetch(`${KING_URL}/tools/webp-to-mp4`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

async function videoToAudio(media, ext, format = 'mp3') {
    const form = new FormData();
    form.append("video", media, `video.${ext}`);
    
    try {
        const response = await fetch(`${KING_URL}/tools/video-to-audio?ext=${ext}&format=${format}`, {
            method: "POST",
            body: form
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.buffer();
    } catch (error) {
        throw error;
    }
}

module.exports = {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    writeExifWebp: writeExifWebp,
    toVideo,
    webp2mp4: webpToMp4,
    videoToAudio
};