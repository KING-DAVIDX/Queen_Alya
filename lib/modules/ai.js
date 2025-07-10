const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const KING_URL = "https://king-xer-api.vercel.app";
const KING_URL2 = "https://king-api-437z.onrender.com";

async function aigf(prompt, userId = null) {
  try {
    // First try POST request with userId if available
    if (userId) {
      try {
        const response = await fetch(`${KING_URL}/ai/aigf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            prompt: prompt,
          })
        });
        const data = await response.json();
        
        if (data && data.status && data.response) {
          return data.response;
        }
      } catch (postError) {
        console.log("POST request failed, falling back to GET:", postError.message);
        // Continue to GET request
      }
    }
    
    // Fallback to GET request
    const response = await fetch(`${KING_URL}/ai/aigf?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "Hmm, I couldn't understand that, love. Wanna try again?";
    }
  } catch (err) {
    console.error("AIGF Error:", err.message);
    return "Something went wrong, baby. But don't worry, I'm still here for you.";
  }
}

async function gpt(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/gpt?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "I'm having trouble processing that. Could you rephrase it for me?";
    }
  } catch (err) {
    console.error("GPT Error:", err.message);
    return "Oops! Something went wrong on my end. Try again?";
  }
}

async function groq(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/groq?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "I didn't quite get that. Mind trying again?";
    }
  } catch (err) {
    console.error("Groq Error:", err.message);
    return "My circuits are a bit tangled right now. Could you repeat that?";
  }
}

async function powerbrain(question) {
  try {
    const response = await fetch(`${KING_URL}/ai/powerbrain?question=${encodeURIComponent(question)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response.response || "I got your answer but it came in a format I didn't expect.";
    } else {
      return "I'm not sure about that one. Maybe ask me something else?";
    }
  } catch (err) {
    console.error("Powerbrain Error:", err.message);
    return "My knowledge engine is stalling. Give me another question?";
  }
}

async function xai(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/xai?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "I'm having some trouble accessing my extended intelligence. Could you try asking differently?";
    }
  } catch (err) {
    console.error("XAI Error:", err.message);
    return "My extended intelligence module seems to be offline. Want to try again later?";
  }
}

async function gemini(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/gemini?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response.trim() || "I received an empty response from Gemini.";
    } else {
      return "Gemini seems to be giving me a blank stare. Could you rephrase?";
    }
  } catch (err) {
    console.error("Gemini Error:", err.message);
    return "Gemini's lights are flickering. Try again in a moment?";
  }
}

async function blackbox(query) {
  try {
    const response = await fetch(`${KING_URL}/ai/blackbox?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "The black box returned nothing but darkness. Try another query?";
    }
  } catch (err) {
    console.error("Blackbox Error:", err.message);
    return "The black box is currently opaque. Maybe it needs a restart?";
  }
}

async function tts(text) {
  try {
    const response = await fetch(`${KING_URL}/ai/tts?text=${encodeURIComponent(text)}&lang=en`);
    const data = await response.json();
    if (data && data.status && data.response && data.response.audioUrl) {
      return data.response.audioUrl;
    } else {
      return null;
    }
  } catch (err) {
    console.error("TTS Error:", err.message);
    return null;
  }
}

async function realistic(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/aicreate/realistic?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response && Array.isArray(data.response) && data.response.length > 0) {
      return data.response[0];
    } else {
      return null;
    }
  } catch (err) {
    console.error("Realistic Error:", err.message);
    return null;
  }
}

async function flux(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/aicreate/flux?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response && Array.isArray(data.response) && data.response.length > 0) {
      return data.response[0];
    } else {
      return null;
    }
  } catch (err) {
    console.error("Flux Error:", err.message);
    return null;
  }
}

async function deepimg(prompt, style = "Fantasy 3D") {
  try {
    const response = await fetch(`${KING_URL2}/ai/deepimg?prompt=${encodeURIComponent(prompt)}&style=${encodeURIComponent(style)}`);
    const data = await response.json();
    if (data && data.status && data.response && data.response.imageUrl) {
      return data.response.imageUrl;
    } else {
      return null;
    }
  } catch (err) {
    console.error("Deepimg Error:", err.message);
    return null;
  }
}

async function geminiUpload(prompt, image, mimeType) {
  try {
    const form = new FormData();
    form.append('prompt', prompt);
    if (Buffer.isBuffer(image)) {
      if (!mimeType) {
        throw new Error('mimeType is required when providing a Buffer');
      }
      form.append('image', image, { 
        filename: 'uploaded_image',
        contentType: mimeType 
      });
    } else if (typeof image === 'string') {
      form.append('image', fs.createReadStream(image));
    } else {
      throw new Error('Image must be either a Buffer or file path');
    }

    const response = await fetch(`${KING_URL}/ai/gemini-upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "Gemini didn't provide a response about the image. Try again?";
    }
  } catch (err) {
    console.error("Gemini Upload Error:", err.message);
    return "Failed to analyze the image. Please check the image and try again.";
  }
}

async function translate(text, targetLang = 'en') {
  try {
    const prompt = `Translate this text to ${targetLang}: ${text}`;
    return await gemini(prompt);
  } catch (err) {
    console.error("Translate Error:", err.message);
    return "Error doing translation: " + err.message;
  }
}

async function ocr(imageBuffer) {
  try {
    return await geminiUpload("Extract the text from this image", imageBuffer, 'image/png');
  } catch (err) {
    console.error("OCR Error:", err.message);
    return "Error doing OCR: " + err.message;
  }
}

async function transimg(imageBuffer, targetLang = 'en') {
  try {
    const extractedText = await ocr(imageBuffer);
    if (!extractedText || extractedText.trim() === '') {
      return "No text could be extracted from the image.";
    }
    const translatedText = await translate(extractedText, targetLang);
    return translatedText;
  } catch (err) {
    console.error("TranslateImg Error:", err.message);
    return "Error processing image translation: " + err.message;
  }
}

async function alya(prompt) {
  try {
    const response = await fetch(`${KING_URL}/ai/alya?prompt=${encodeURIComponent(prompt)}`);
    const data = await response.json();
    if (data && data.status && data.response) {
      return data.response;
    } else {
      return "I'm having some trouble accessing my extended intelligence. Could you try asking differently?";
    }
  } catch (err) {
    console.error("Alya Error:", err.message);
    return "My extended intelligence module seems to be offline. Want to try again later?";
  }
}

async function resize(image, options = {}) {
  try {
    const form = new FormData();
    
    // Handle different image input types
    if (Buffer.isBuffer(image)) {
      form.append('image', image, {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
      });
    } else if (typeof image === 'string') {
      form.append('image', fs.createReadStream(image));
    } else {
      throw new Error('Image must be either a Buffer or file path');
    }

    // Add options if provided
    if (options.width) form.append('width', options.width);
    if (options.height) form.append('height', options.height);
    if (options.quality) form.append('quality', options.quality);
    if (options.format) form.append('format', options.format);

    const response = await fetch(`${KING_URL}/tools/resize`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const buffer = await response.buffer();
    if (buffer) {
      return {
        status: true,
        buffer: buffer,
        message: 'Image resized successfully'
      };
    } else {
      return {
        status: false,
        message: 'Failed to resize image'
      };
    }
  } catch (err) {
    console.error("Resize Error:", err.message);
    return {
      status: false,
      message: "Error resizing image: " + err.message
    };
  }
}

async function rotate(image, direction = 'right') {
  try {
    const form = new FormData();
    
    // Handle different image input types
    if (Buffer.isBuffer(image)) {
      form.append('image', image, {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
      });
    } else if (typeof image === 'string') {
      form.append('image', fs.createReadStream(image));
    } else {
      throw new Error('Image must be either a Buffer or file path');
    }

    const response = await fetch(`${KING_URL}/tools/rotate?direction=${direction}`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const buffer = await response.buffer();
    return {
      status: true,
      buffer: buffer,
      message: 'Image rotated successfully'
    };
  } catch (err) {
    console.error("Rotate Error:", err.message);
    return {
      status: false,
      message: `Error rotating image: ${err.message}`
    };
  }
}

module.exports = {
  resize,
  rotate,
  aigf,
  gpt,
  groq,
  powerbrain,
  xai,
  gemini,
  blackbox,
  tts,
  realistic,
  flux,
  deepimg,
  geminiUpload,
  translate,
  ocr,
  transimg,
  alya
};