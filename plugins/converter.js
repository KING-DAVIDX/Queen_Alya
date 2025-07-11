const bot = require("../lib/plugin");
const { downloadContentFromMessage } = require('baileys');
const fs = require('fs');
const path = require('path');
const { imageToWebp, videoToWebp, writeExifWebp, toVideo, webp2mp4, videoToAudio } = require('../lib/sticker');
const webpmux = require('node-webpmux');
const ass = require("../lib/modules/ai");

bot(
    {
        name: "photo",
        info: "Converts replied stickers back to images",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.sticker) {
            return await bot.reply("Please reply to a sticker to convert it to an image!");
        }

        try {
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                'sticker'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tmpFile = path.join(
                require('os').tmpdir(),
                `${Math.random().toString(36).slice(2)}.jpg`
            );
            
            fs.writeFileSync(tmpFile, buffer);
            await bot.sendImage(
                message.chat,
                tmpFile,
                "Here's your image"
            );
            fs.unlinkSync(tmpFile);
            
        } catch (error) {
            console.error("Sticker to image conversion error:", error);
            await bot.reply("Failed to convert sticker to image. Please try again.");
        }
    }
);

bot(
    {
        name: "mp3",
        info: "Converts replied videos to audio (MP3)",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.video) {
            return await bot.reply("Please reply to a video to convert it to audio!");
        }

        try {
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                'video'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const audioBuffer = await videoToAudio(buffer, 'mp4', 'mp3');
            await bot.sendAudio(
                message.chat,
                audioBuffer,
"Here's your audio"
            );
            
        } catch (error) {
            console.error("Video to audio conversion error:", error);
            await bot.reply("Failed to convert video to audio. Please try again.");
        }
    }
);

bot(
    {
        name: "ptv",
        info: "Converts replied videos to PTV format",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.video) {
            return await bot.reply("Please reply to a video to convert it to PTV format!");
        }

        try {
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                'video'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tmpFile = path.join(
                require('os').tmpdir(),
                `${Math.random().toString(36).slice(2)}.mp4`
            );
            
            fs.writeFileSync(tmpFile, buffer);
            
            await bot.sock.sendMessage(
                message.chat,
                { 
                    video: { url: tmpFile },
                    caption: "Here's your video in PTV format",
                    ptv: true
                },
                { quoted: message }
            );
            
            fs.unlinkSync(tmpFile);
            
        } catch (error) {
            console.error("Video to PTV conversion error:", error);
            await bot.reply("Failed to convert video to PTV format. Please try again.");
        }
    }
);

bot(
    {
        name: "wawe",
        info: "Converts replied audio to PTT format",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.audio) {
            return await bot.reply("Please reply to an audio message to convert it to PTT format!");
        }

        try {
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                'audio'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tmpFile = path.join(
                require('os').tmpdir(),
                `${Math.random().toString(36).slice(2)}.ogg`
            );
            
            fs.writeFileSync(tmpFile, buffer);
            
            await bot.sock.sendMessage(
                message.chat,
                { 
                    audio: { url: tmpFile },
                    ptt: true
                },
                { quoted: message }
            );
            
            fs.unlinkSync(tmpFile);
            
        } catch (error) {
            console.error("Audio to PTT conversion error:", error);
            await bot.reply("Failed to convert audio to PTT format. Please try again.");
        }
    }
);

bot(
    {
        name: "mp4",
        info: "Converts replied audio or stickers to MP4 video",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted) {
            return await bot.reply("Please reply to an audio message or sticker to convert it to video!");
        }

        try {
            let buffer;
            let downloadStream;
            
            if (message.quoted.audio) {
                downloadStream = await downloadContentFromMessage(
                    message.quoted,
                    'audio'
                );
                
                buffer = Buffer.from([]);
                for await (const chunk of downloadStream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                const videoBuffer = await toVideo(buffer, 'mp3');
                await bot.sendVideo(
                    message.chat,
                    videoBuffer,
 "Here's your video converted from audio"
                );
                
            } else if (message.quoted.sticker) {
                downloadStream = await downloadContentFromMessage(
                    message.quoted,
                    'sticker'
                );
                
                buffer = Buffer.from([]);
                for await (const chunk of downloadStream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                const videoBuffer = await webp2mp4(buffer);
                await bot.sendVideo(
                    message.chat,
                    videoBuffer,
 "Here's your video converted from sticker"
                );
                
            } else {
                return await bot.reply("Please reply to an audio message or sticker to convert it to video!");
            }
            
        } catch (error) {
            console.error("MP4 conversion error:", error);
            await bot.reply("Failed to convert to video. Please try again.");
        }
    }
);

bot(
    {
        name: "gif",
        info: "Converts replied video to GIF or sticker to video then GIF",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted) {
            return await bot.reply("Please reply to a video or sticker to convert it to GIF!");
        }

        try {
            let buffer;
            let downloadStream;
            
            if (message.quoted.video) {
                downloadStream = await downloadContentFromMessage(
                    message.quoted,
                    'video'
                );
                
                buffer = Buffer.from([]);
                for await (const chunk of downloadStream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                await bot.sock.sendMessage(
                    message.chat, 
                    { 
                        video: buffer, 
                        gifPlayback: true, 
                        caption: "Here's your GIF converted from video" 
                    }, 
                    { quoted: message }
                );
                
            } else if (message.quoted.sticker) {
                downloadStream = await downloadContentFromMessage(
                    message.quoted,
                    'sticker'
                );
                
                buffer = Buffer.from([]);
                for await (const chunk of downloadStream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                const videoBuffer = await webp2mp4(buffer);
                await bot.sock.sendMessage(
                    message.chat,
                    {
                        video: videoBuffer,
                        gifPlayback: true,
                        caption: "Here's your GIF converted from sticker"
                    },
                    { quoted: message }
                );
                
            } else {
                return await bot.reply("Please reply to a video or sticker to convert it to GIF!");
            }
            
        } catch (error) {
            console.error("GIF conversion error:", error);
            await bot.reply("Failed to convert to GIF. Please try again.");
        }
    }
);

bot(
    {
        name: "take",
        info: "Resends stickers with modified pack info",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.sticker) {
            return await bot.reply("Please reply to a sticker to use this command!");
        }

        const defaultMetadata = {
            packname: "QUEEN_ALYA",
            author: "KING-DAVIDX"
        };

        let packname = defaultMetadata.packname;
        let author = defaultMetadata.author;

        if (message.query) {
            const parts = message.query.split("|").map(part => part.trim());
            
            if (parts.length === 1) {
                author = parts[0] || defaultMetadata.author;
            } else if (parts.length === 2) {
                author = parts[0] || defaultMetadata.author;
                packname = parts[1] || defaultMetadata.packname;
            }
        }

        try {
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                'sticker'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const metadata = {
                packname: packname,
                author: author
            };

            const webpWithExif = await writeExifWebp(buffer, metadata);
            await bot.sendMessage(
                message.chat,
                {
                    sticker: webpWithExif
                },
                { quoted: message }
            );
            
        } catch (error) {
            console.error("Error processing sticker:", error);
            await bot.reply("Failed to process sticker. Please try again.");
        }
    }
);

bot(
    {
        name: "sticker",
        info: "Creates stickers from images or videos with customizable pack info",
        category: "converter"
    },
    async (message, bot) => {
        let mediaType = null;
        let mediaMessage = null;
        if (message.quoted) {
            if (message.quoted.image) {
                mediaType = 'image';
                mediaMessage = message.quoted;
            } else if (message.quoted.video) {
                mediaType = 'video';
                mediaMessage = message.quoted;
            }
        }
        if (!mediaType || !mediaMessage) {
            return await bot.reply("Please send or reply to an image or video to create a sticker!");
        }

        const defaultMetadata = {
            packname: "QUEEN_ALYA",
            author: "KING-DAVIDX"
        };
        let packname = defaultMetadata.packname;
        let author = defaultMetadata.author;
        
        if (message.text) {
            const [customPack, customAuthor] = message.text.split("|");
            if (customPack) packname = customPack.trim();
            if (customAuthor) author = customAuthor.trim();
        }

        try {
            await bot.reply(`Creating sticker from ${mediaType}... ⏳`);
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                mediaType
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            let webpBuffer;
            if (mediaType === 'image') {
                webpBuffer = await imageToWebp(buffer);
            } else if (mediaType === 'video') {
                webpBuffer = await videoToWebp(buffer);
            }

            const metadata = {
                packname: packname,
                author: author
            };

            const webpWithExif = await writeExifWebp(webpBuffer, metadata);
            await bot.sendMessage(
                message.chat,
                {
                    sticker: webpWithExif
                },
                { quoted: message }
            );
            
        } catch (error) {
            console.error("Sticker creation error:", error);
            await bot.reply("Failed to create sticker. Please try again.");
        }
    }
);

bot(
    {
        name: "exif",
        info: "Extracts and displays EXIF metadata from stickers",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.sticker) {
            return await bot.reply("Please reply to a sticker to use this command!");
        }

        try {
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                'sticker'
            );
            
            let stickerBuffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                stickerBuffer = Buffer.concat([stickerBuffer, chunk]);
            }

            let img = new webpmux.Image();
            await img.load(stickerBuffer);

            const exifBuffer = img.exif;
            let exifData = exifBuffer ? JSON.parse(exifBuffer.slice(22).toString()) : { error: "No metadata found" };

            await bot.reply(JSON.stringify(exifData, null, 2));

        } catch (error) {
            console.error("Error processing sticker:", error);
            await bot.reply("Failed to extract metadata from sticker. Please try again.");
        }
    }
);

bot(
    {
        name: "rotate",
        info: "Rotates an image based on user direction (up, down, left, right)",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !message.quoted.image) {
            return await bot.reply("Please reply to an image to rotate it.");
        }

        const direction = message.query.toLowerCase();
        const validDirections = ['up', 'down', 'left', 'right'];
        
        if (!validDirections.includes(direction)) {
            return await bot.reply("Invalid direction! Use: up, down, left, or right.");
        }

        try {
            const buffer = await message.quoted.download();
            const result = await ass.rotate(buffer, direction);

            if (!result.status) {
                throw new Error(result.message || "Rotation failed");
            }

            await bot.sock.sendMessage(
                message.chat,
                {
                    image: result.buffer,
                    caption: "Here's your rotated image!"
                },
                { quoted: message }
            );

        } catch (error) {
            console.error("Image rotation error:", error);
            await bot.reply(`Failed to rotate the image: ${error.message}`);
        }
    }
);

bot(
    {
        name: "tovv",
        info: "Converts replied media (image/video/audio) to viewOnce message",
        category: "converter"
    },
    async (message, bot) => {
        let mediaType = null;
        let mediaMessage = null;
        let caption = "";
        
        if (message.quoted) {
            if (message.quoted.image) {
                mediaType = 'image';
                mediaMessage = message.quoted;
                caption = message.quoted.caption || "";
            } else if (message.quoted.video) {
                mediaType = 'video';
                mediaMessage = message.quoted;
                caption = message.quoted.caption || "";
            } else if (message.quoted.audio) {
                mediaType = 'audio';
                mediaMessage = message.quoted;
                caption = message.quoted.caption || "";
            }
        }
        
        if (!mediaType || !mediaMessage) {
            return await bot.reply("Please reply to an image, video, or audio message to convert to viewOnce!");
        }

        try {
            await bot.reply(`Converting ${mediaType} to viewOnce... ⏳`);
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                mediaType
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const extension = mediaType === 'image' ? 'jpg' : 
                             mediaType === 'video' ? 'mp4' : 'mp3';
            const tmpFile = path.join(
                require('os').tmpdir(),
                `${Math.random().toString(36).slice(2)}.${extension}`
            );
            
            fs.writeFileSync(tmpFile, buffer);
            
            await bot.sock.sendMessage(
                message.chat,
                {
                    [mediaType]: { url: tmpFile },
                    viewOnce: true,
                    caption: caption,
                    mimetype: mediaType === 'image' ? 'image/jpeg' : 
                            mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'
                },
                { quoted: message }
            );
            
            fs.unlinkSync(tmpFile);
            
        } catch (error) {
            console.error("ViewOnce conversion error:", error);
            await bot.reply("Failed to convert to viewOnce. Please try again.");
        }
    }
);

bot(
    {
        name: "todoc",
        info: "Converts replied media (image/video/audio) to document message",
        category: "converter"
    },
    async (message, bot) => {
        let mediaType = null;
        let mediaMessage = null;
        let caption = "";
        let mime = "";
        let filename = "";
        
        if (message.quoted) {
            if (message.quoted.image) {
                mediaType = 'image';
                mediaMessage = message.quoted;
                caption = message.quoted.caption || "";
                mime = 'image/jpeg';
                filename = "image.jpg";
            } else if (message.quoted.video) {
                mediaType = 'video';
                mediaMessage = message.quoted;
                caption = message.quoted.caption || "";
                mime = 'video/mp4';
                filename = "video.mp4";
            } else if (message.quoted.audio) {
                mediaType = 'audio';
                mediaMessage = message.quoted;
                caption = message.quoted.caption || "";
                mime = 'audio/mpeg';
                filename = "audio.mp3";
            }
        }
        
        if (!mediaType || !mediaMessage) {
            return await bot.reply("Please reply to an image, video, or audio message to convert to document!");
        }

        try {
            await bot.reply(`Converting ${mediaType} to document... ⏳`);
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                mediaType
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await bot.sock.sendMessage(message.chat, {
                document: buffer,
                mimetype: mime,
                fileName: filename,
                caption: caption
            }, { quoted: message });
            
        } catch (error) {
            console.error("Document conversion error:", error);
            await bot.reply("Failed to convert to document. Please try again.");
        }
    }
);

bot(
    {
        name: "url",
        info: "Uploads replied media and returns URL",
        category: "converter"
    },
    async (message, bot) => {
        if (!message.quoted || !(
            message.quoted.image || 
            message.quoted.video || 
            message.quoted.audio || 
            message.quoted.sticker || 
            message.quoted.document
        )) {
            return await bot.reply("Please reply to a media message (image, video, audio, sticker, or document) to get its URL!");
        }

        try {
            let mediaType = 'image';
            if (message.quoted.video) mediaType = 'video';
            else if (message.quoted.audio) mediaType = 'audio';
            else if (message.quoted.sticker) mediaType = 'sticker';
            else if (message.quoted.document) mediaType = 'document';
            
            const downloadStream = await downloadContentFromMessage(
                message.quoted,
                mediaType
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of downloadStream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const mediaUrl = await message.upload(buffer);
            await bot.reply(`Media URL: ${mediaUrl}`);
            
        } catch (error) {
            console.error("Media upload error:", error);
            await bot.reply("Failed to upload media. Please try again.");
        }
    }
);