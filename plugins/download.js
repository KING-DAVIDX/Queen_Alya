const { extractUrlsFromString } = require('baileys');
const yts = require('yt-search');
const bot = require("../lib/plugin");
const config = require('../config');
const prefix = config.PREFIX;
const fetch = require("node-fetch");
async function ytaudio(url) {
  try {
    const k = await fetch(`https://kord-api.vercel.app/ytmp3?url=${encodeURIComponent(url)}`)
    const d = await k.json()

    if (d.status) {
      return {
        url: d.data.downloadUrl,
        title: d.data.title
      }
    } else {
      const g = await fetch(`https://kord-api.vercel.app/yt-savetube?url=${encodeURIComponent(url)}&type=mp3`)
      const data = await g.json()

      if (data.status && data.code === 200) {
        return {
          url: data.result.download,
          title: data.result.title
        }
      }
    }
  } catch (err) {
    console.error(err)
    return err
  }
}

async function ytvideo(url) {
  try {
    const k = await fetch(`https://kord-api.vercel.app/ytmp4?url=${encodeURIComponent(url)}`)
    const d = await k.json()

    if (d.status) {
      return {
        url: d.data.downloadUrl,
        title: d.data.title
      }
    } else {
      const g = await fetch(`https://kord-api.vercel.app/yt-savetube?url=${encodeURIComponent(url)}&type=360`)
      const data = await g.json()

      if (data.status && data.code === 200) {
        return {
          url: data.result.download,
          title: data.result.title
        }
      }
    }
  } catch (err) {
    console.error('ytvideo error:', err)
    return err
  }
}

async function tt(url) {
  try {
    const apiUrl = `https://api.kordai.biz.id/tiktok?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const videoInfo = await response.json();
    return videoInfo
  } catch (err) {
    return err
  }
}

async function insta(url) {
  try {
    const apiUrl = `https://kord-api.vercel.app/insta?url=${encodeURIComponent(url)}`
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data;
  } catch (e) {
    return e
  }
}

async function fb(url) {
    try {
     const apiUrl = `https://api.kordai.biz.id/facebook?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data
    } catch (e) {
        return e
    }
}

async function xdl(url) {
  try {
    var dlf = await fetch(`https://api.kordai.biz.id/xdl?url=${url}`)
    var dlData = await dlf.json()
    return dlData
  } catch(e) {
    return e
  }
}

bot({
    name: "ytv",
    aliases: ["ytmp4"],
    info: "download a YouTube video with its link",
    category: "downloader"
}, async (message, bot) => {
    const input = message.query || message.quoted?.text
    if (!input) {
        return await bot.reply(`_*Please provide a YouTube link or title*_\n_Example: ${prefix}ytv https://youtube.com/watch?v=xyz_`)
    }

    await bot.react("⏰")
    
    let videoUrl
    const urls = await extractUrlsFromString(input)
    const ytPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    
    videoUrl = urls.find(url => ytPattern.test(url))
    
    if (!videoUrl) {
        const searchResults = await yts(input)
        videoUrl = searchResults.videos[0]?.url
        if (!videoUrl) return bot.reply("_*No results found for your search*_")
    }

    try {
        let videoData = await ytvideo(videoUrl)
        
        if (videoData.url.toLowerCase().includes("processing")) {
            await sleep(1000)
            videoData = await ytvideo(videoUrl)
        }
        
        if (!videoData.url) {
            await bot.react("❌")
            return bot.reply("_*Failed to fetch video, please try again*_")
        }

        await bot.react("✅")
        
        const caption = `➟ ${videoData.title}\n\n${config.CAPTION}`
        await bot.sock.sendMessage(message.chat, {
            video: { url: videoData.url },
            caption,
            quoted: message
        })
    } catch (error) {
        console.error(error)
        await bot.react("❌")
        return bot.reply(`Error: ${error.message || error}`)
    }
})

bot({
    name: "yta",
    aliases: ["ytmp3"],
    info: "downloads YouTube audio with its link", 
    category: "downloader"
}, async (message, bot) => {
    const query = message.query || message.quoted?.text
    
    if (!query) {
        return bot.reply(`_*Provide a YouTube link or search term*_\n_Example: ${prefix}yta unstoppable sia_`)
    }

    bot.react("🎵")
    
    let audioUrl
    const extractedUrls = await extractUrlsFromString(query)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    
    audioUrl = extractedUrls.find(link => youtubeRegex.test(link))
    
    if (!audioUrl) {
        const search = await yts(query)
        audioUrl = search.videos[0]?.url
        
        if (!audioUrl) {
            await bot.react("❌")
            return bot.reply("_*No matching videos found*_")
        }
    }

    try {
        let audioData = await ytaudio(audioUrl)
        
        if (audioData.url.toLowerCase().includes("processing")) {
            await sleep(1000)
            audioData = await ytaudio(audioUrl)
        }
        
        if (!audioData.url) {
            return bot.reply("_*Audio processing failed, try again*_")
        }

        await bot.react("🎶")
        
        bot.sock.sendMessage(message.chat, {
            audio: { url: audioData.url },
            mimetype: 'audio/mp4',
            caption: `🎵 ${audioData.title}\n\n${config.CAPTION}`,
            quoted: message
        })
    } catch (err) {
        console.error(err)
        bot.reply(`Processing error: ${err}`)
    }
})

bot({
    name: "video",
    aliases: ["ytvideo"],
    info: "downloads and send video based on the title given",
    category: "downloader"
}, async (message, bot) => {
    if (!message.query) {
        return bot.reply(`_*Enter a search query*_\n_Example: ${prefix}video marvel trailer 2024_`)
    }

    bot.react("🔍")
    
    try {
        const searchResult = await yts(message.query)
        const video = searchResult.videos[0]
        
        if (!video) {
            await bot.react("❌")
            return bot.reply("No videos found for your search")
        }

        await bot.react("⬇️")
        
        const downloadData = await ytvideo(video.url)
        
        const videoInfo = `*🎬 Video Details*
*Title:* ${video.title}
*URL:* ${video.url}
*Duration:* ${video.duration.timestamp}
*Views:* ${video.views.toLocaleString()}
*Uploaded:* ${video.ago}
*Description:* ${video.description}

${config.CAPTION}`

        await bot.react("✅")
        
        return bot.sock.sendMessage(message.chat, {
            video: { url: downloadData.url },
            caption: videoInfo,
            quoted: message
        })
    } catch (error) {
        console.error(error)
        await bot.react("❌")
        bot.reply(`An error occurred: ${error}`)
    }
})

bot({
    name: "play",
    aliases: ["music"],
    info: "downloads and send audio based on the title given",
    category: "downloader"
}, async (message, bot) => {
    const searchTerm = message.query
    
    if (!searchTerm) {
        return bot.reply(`_*What would you like to play?*_\n_Example: ${prefix}play shape of you_`)
    }

    await bot.react("🎵")
    
    try {
        const results = await yts(searchTerm)
        const track = results.videos[0]
        
        if (!track) {
            bot.react("❌")
            return bot.reply("No music found for your search")
        }

        const audioDownload = await ytaudio(track.url)
        const progressBar = `00:00 ───◁ㅤ ❚❚ ㅤ▷─── ${track.duration.timestamp} ♡`
        
        await bot.react("🎶")
        
        bot.sock.sendMessage(message.chat, {
            audio: { url: audioDownload.url },
            ptt: false,
            mimetype: 'audio/mp4',
            contextInfo: {
                externalAdReply: {
                    title: track.title,
                    body: progressBar,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnailUrl: track.thumbnail,
                    sourceUrl: track.url
                }
            }
        })
    } catch (error) {
        console.error(error)
        bot.react("❌")
        bot.reply(`Playback error: ${error}`)
    }
})

bot({
    name: "videodoc",
    aliases: ["ytvideodoc"], 
    info: "downloads and send video(document) based on the title given",
    category: "downloader"
}, async (message, bot) => {
    const query = message.query
    
    if (!query) {
        return bot.reply(`_*Enter video title to download*_\n_Example: ${prefix}videodoc funny cats compilation_`)
    }

    bot.react("📁")
    
    try {
        const searchData = await yts(query)
        const videoResult = searchData.videos[0]
        
        const downloadUrl = await ytvideo(videoResult.url)
        
        const documentCaption = `*📹 Video Document*
*Title:* ${videoResult.title}
*Link:* ${videoResult.url}  
*Duration:* ${videoResult.duration.timestamp}
*Views:* ${videoResult.views.toLocaleString()}
*Published:* ${videoResult.ago}
*Description:* ${videoResult.description}

${config.CAPTION}`

        await bot.react("📤")
        
        return bot.sock.sendMessage(message.chat, {
            document: { url: downloadUrl.url },
            mimetype: "video/mp4",
            fileName: `${videoResult.title}.mp4`,
            caption: documentCaption,
            quoted: message
        })
    } catch (error) {
        console.error(error)
        bot.react("❌")
        bot.reply(`Download failed: ${error}`)
    }
})

bot({
    name: "playdoc",
    aliases: ["musicdoc"],
    info: "downloads and send audio from YouTube as doc",
    category: "downloader"
}, async (message, bot) => {
    if (!message.query) {
        return bot.reply(`_*Enter song name*_\n_Example: ${prefix}playdoc despacito_`)
    }

    await bot.react("🎵")
    
    try {
        const searchResults = await yts(message.query)
        const song = searchResults.videos[0]
        
        const audioFile = await ytaudio(song.url) 
        const playerText = `00:00 ───◁ㅤ ❚❚ ㅤ▷─── ${song.duration.timestamp} ♡`
        
        bot.react("📎")
        
        return bot.sock.sendMessage(message.chat, {
            document: { url: audioFile.url },
            ptt: false,
            mimetype: 'audio/mpeg',
            fileName: `${song.title}.mp3`,
            caption: song.title,
            contextInfo: {
                externalAdReply: {
                    title: song.title,
                    body: playerText,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnailUrl: song.thumbnail,
                    sourceUrl: song.url
                }
            }
        })
    } catch (error) {
        console.error(error)
        await bot.react("❌")
        bot.reply(`Error occurred: ${error}`)
    }
})

bot({
    name: "ytvdoc", 
    aliases: ["ytmp4doc"],
    info: "download a YouTube video with its link and send as document",
    category: "downloader"
}, async (message, bot) => {
    const content = message.query || message.quoted?.text
    
    if (!content) {
        return bot.reply(`_*Send YouTube link or title*_\n_Example: ${prefix}ytvdoc https://youtu.be/xyz_`)
    }

    const urlList = await extractUrlsFromString(content)
    const ytRegexp = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    
    let targetUrl = urlList.find(url => ytRegexp.test(url))
    
    if (!targetUrl) {
        const searchResult = await yts(content)
        targetUrl = searchResult.videos[0]?.url
        if (!targetUrl) return bot.reply("_*No results found*_")
    }

    if (!ytRegexp.test(targetUrl)) {
        return bot.reply(`_*Invalid YouTube URL! Use ${prefix}videodoc for title search*_`)
    }

    await bot.react("📥")
    
    try {
        let videoInfo = await ytvideo(targetUrl)
        
        if (videoInfo.url.toLowerCase().includes("processing")) {
            await sleep(1000)
            videoInfo = await ytvideo(targetUrl)
        }
        
        if (!videoInfo.url) {
            return bot.reply("_*Video fetch failed, retry*_")
        }

        bot.react("📋")
        
        return bot.sock.sendMessage(message.chat, {
            document: { url: videoInfo.url },
            mimetype: "video/mp4", 
            fileName: `${videoInfo.title}.mp4`,
            caption: `📱 ${videoInfo.title}\n\n${config.CAPTION}`,
            quoted: message
        })
    } catch (e) {
        console.error(e)
        bot.reply(`${e}`)
    }
})

bot({
    name: "ytadoc",
    aliases: ["ytmp3doc"],
    info: "downloads YouTube audio with its link",
    category: "downloader"
}, async (message, bot) => {
    const input = message.query || message.quoted?.text
    
    if (!input) {
        return bot.reply(`_*Provide YouTube link or title*_\n_Example: ${prefix}ytadoc https://youtu.be/abc123_`)
    }

    const foundUrls = await extractUrlsFromString(input)
    const ytPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    
    let audioUrl = foundUrls.find(url => ytPattern.test(url))
    
    if (!audioUrl) {
        const searchData = await yts(input)
        audioUrl = searchData.videos[0]?.url
        if (!audioUrl) return bot.reply("_*No matching content found*_")
    }

    if (!ytPattern.test(audioUrl)) {
        return bot.reply(`_*Invalid YouTube link! Use ${prefix}playdoc for title search*_`)
    }
    
    bot.react("🎧")
    
    try {
        let audioResult = await ytaudio(audioUrl)
        
        if (audioResult.url.toLowerCase().includes("processing")) {
            await sleep(1000)
            audioResult = await ytaudio(audioUrl)
        }
        
        if (!audioResult.url) {
            return bot.reply("_*Audio extraction failed, try again*_")
        }

        await bot.react("🎼")
        
        return bot.sock.sendMessage(message.chat, {
            audio: { url: audioResult.url },
            mimetype: 'audio/mp4',
            fileName: `${audioResult.title}.mp3`, 
            caption: `🎵 ${audioResult.title}\n\n${config.CAPTION}`,
            quoted: message
        })
    } catch (e) {
        console.error(e)
        bot.reply(`${e}`)
    }
})

bot({
    name: "tt",
    aliases: ["tiktok"],
    info: "downloads tiktok videos using the link given",
    category: "downloader"
}, async (message, bot) => {
    const linkText = message.query || message.quoted?.text
    
    if (!linkText) {
        return bot.reply("_*Send a TikTok link!*_")
    }

    await bot.react("🎬")
    
    try {
        const urlsFound = await extractUrlsFromString(linkText)
        const tiktokPattern = /https:\/\/(?:www\.|vm\.)?tiktok\.com\/(?:(@[\w.-]+\/)?(?:video|photo)\/[\d]+|[\w-]+\/?)(?:\?.*)?$/
        
        const tiktokLink = urlsFound.find(url => tiktokPattern.test(url))
        
        if (!tiktokLink) {
            await bot.react("❌")
            return bot.reply("No valid TikTok link detected")
        }

        const videoData = await tt(tiktokLink)
        
        if (!videoData.success || !videoData.data) {
            bot.react("❌")
            return bot.reply(`TikTok fetch failed: ${JSON.stringify(videoData)}`)
        }

        if (!videoData.data.downloadLinks || videoData.data.downloadLinks.length === 0) {
            bot.react("❌")
            return bot.reply("_No download links available for this TikTok_")
        }

        const downloadLink = videoData.data.downloadLinks[0].link
        const videoTitle = `${videoData.data.title || "TikTok Video"}\n${config.CAPTION}`
        
        await bot.react("✅")
        
        return bot.sock.sendMessage(message.chat, {
            video: { url: downloadLink },
            caption: videoTitle,
            quoted: message
        })
    } catch (err) {
        console.error("TikTok error:", err)
        bot.react("❌")
        bot.reply(`Download error: ${err.message || err}`)
    }
})

bot({
    name: "twitter",
    aliases: ["xdl"],
    info: "downloads Twitter/X video/pic", 
    category: "downloader"
}, async (message, bot) => {
    const linkInput = message.query || message.quoted?.text
    
    if (!linkInput) {
        return bot.reply("_*Send a valid Twitter/X link!*_")
    }

    await bot.react("🐦")
    
    try {
        const extractedLinks = await extractUrlsFromString(linkInput)
        const twitterRegex = /^(https?:\/\/)?(www\.)?(x\.com|twitter\.?com)\/.+$/
        
        const twitterUrl = extractedLinks.find(url => twitterRegex.test(url))
        
        const mediaData = await xdl(twitterUrl)
        const mediaUrl = mediaData.links[0].url
        
        bot.react("📱")
        
        return bot.sock.sendMessage(message.chat, {
            [mediaData.type]: { url: mediaUrl },
            caption: config.CAPTION,
            quoted: message
        })
    } catch (error) {
        console.error(error)
        bot.reply(`${error}`)
    }
})

bot({
    name: "fb",
    aliases: ["facebook"],
    info: "downloads Facebook videos",
    category: "downloader"
}, async (message, bot) => {
    const fbLink = message.query || message.quoted?.text
    
    if (!fbLink) {
        return bot.reply("_*Send a valid Facebook link!*_")
    }
    
    bot.react("📘")
    
    try {
        const linkArray = await extractUrlsFromString(fbLink)
        const fbRegex = /^(https?:\/\/)?(www\.)?(fb\.com|facebook\.?com)\/.+$/
        const validLink = linkArray.find(url => fbRegex.test(url))
        
        if (!validLink) {
            return bot.reply("_*No valid Facebook URL detected!*_")
        }
        
        let fbData, videoInfo, attempts = 0
        const maxAttempts = 3
        
        while (attempts < maxAttempts) {
            fbData = await fb(validLink)
            videoInfo = fbData?.data?.[0]
            if (videoInfo) break
            attempts++
            await sleep(2000)
        }
        
        if (!videoInfo) {
            return bot.react("❌")
        }
        
        const downloadLink = videoInfo.hdQualityLink || videoInfo.normalQualityLink
        if (!downloadLink) {
            return bot.react("❌")
        }
        
        await bot.react("✅")
        
        return bot.sock.sendMessage(message.chat, {
            video: { url: downloadLink },
            caption: config.CAPTION
        })
    } catch (e) {
        console.error(e)
        bot.reply(`${e}`)
    }
})

bot({
    name: "insta",
    aliases: ["ig"],
    info: "downloads Instagram videos/images", 
    category: "downloader"
}, async (message, bot) => {
    const igInput = message.query || message.quoted?.text
    
    if (!igInput) {
        return bot.reply("_*Send a valid Instagram link!*_")
    }

    await bot.react("📷")
    
    try {
        const foundLinks = await extractUrlsFromString(igInput)
        const instagramRegex = /^(https?:\/\/)?(www\.)?(ig\.com|instagram\.?com)\/.+$/  
        const instagramUrl = foundLinks.find(url => instagramRegex.test(url))
        
        const mediaData = await insta(instagramUrl)
        const mediaTitle = mediaData.title || undefined
        const mediaUrl = mediaData.url || mediaData.thumb
        
        bot.react("📸")
        
        return bot.sock.sendMessage(message.chat, {
            [mediaData.type]: { url: mediaUrl },
            caption: config.CAPTION,
            quoted: message
        })
    } catch (e) {
        console.error(e)
        bot.reply(`${e}`)
    }
})

bot({
    name: "gitclone",
    aliases: ["gitdl"],
    info: "download the zip file of a repo link",
    category: "downloader" 
}, async (message, bot) => {
    const repoInput = message.query || message.quoted?.text
    
    if (!repoInput) {
        return bot.reply("*Provide a GitHub repository link!*")
    }

    try {
        const detectedLinks = await extractUrlsFromString(repoInput)
        const githubRegex = /^(https?:\/\/)?(www\.)?(github\.com)\/.+$/
        const githubUrl = detectedLinks.find(url => githubRegex.test(url))
        
        const urlParts = githubUrl.split("/")
        const username = urlParts[3]
        const repository = urlParts[4]
        
        bot.react("⏳")
        
        const zipUrl = `https://api.github.com/repos/${username}/${repository}/zipball`
        
        await bot.sock.sendMessage(message.chat, {
            document: { url: zipUrl },
            fileName: `${repository}.zip`,
            mimetype: "application/zip",
            quoted: message
        })
        
        bot.react("✅")
    } catch (e) {
        console.error("GitHub clone error", e)
        bot.reply("*Error occurred!*\nRepository might be private or invalid")
    }
})