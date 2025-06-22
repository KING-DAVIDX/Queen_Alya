const bot = require("../lib/plugin");
const config = require("../config");

// Game state storage
const tttGames = new Map();

// Helper function to generate the game board
function generateBoard(boardState) {
    return [
        `${boardState[0] || '1️⃣'}${boardState[1] || '2️⃣'}${boardState[2] || '3️⃣'}`,
        `${boardState[3] || '4️⃣'}${boardState[4] || '5️⃣'}${boardState[5] || '6️⃣'}`,
        `${boardState[6] || '7️⃣'}${boardState[7] || '8️⃣'}${boardState[8] || '9️⃣'}`
    ].join('\n');
}

// Helper function to check for a winner
function checkWinner(board, playerSymbol) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    return winPatterns.some(pattern => 
        pattern.every(index => board[index] === playerSymbol)
    );
}

// Helper function to check if the board is full
function isBoardFull(board) {
    return board.every(cell => cell !== null);
}

// Main Tic-Tac-Toe command
bot(
    {
        name: 'ttt',
        info: 'Play Tic-Tac-Toe with another player',
        category: "game",
        usage: "ttt start - Start a new game\n" +
               "ttt del - Delete current game (bot owner only)"
    },
    async (message, bot) => {
        // Skip processing if message is from the bot itself or missing required properties
        if (message.isBot || !message.chat || !message.sender) return;

        const command = message.args?.[0]?.toLowerCase();
        const chatId = message.chat.id;

        if (command === 'start') {
            // Check if there's already a game in this chat
            if (tttGames.has(chatId)) {
                return await bot.sock.sendMessage(message.chat, {
                    text: "There's already a Tic-Tac-Toe game in progress in this chat!",
                    mentions: []
                });
            }

            // Create a new game state
            const newGame = {
                status: 'waiting',
                player1: message.sender,
                player2: null,
                board: Array(9).fill(null),
                currentPlayer: null,
                symbols: {
                    [message.sender]: Math.random() < 0.5 ? '❌' : '⭕'
                }
            };

            tttGames.set(chatId, newGame);

            return await bot.sock.sendMessage(message.chat, {
                text: `🎮 Tic-Tac-Toe Game Started!\n\n` +
                      `Waiting for another player to reply with "ttt join" to join the game.\n\n` +
                      `Current player: @${message.sender.split('@')[0]} (${newGame.symbols[message.sender]})`,
                mentions: [message.sender]
            });
        }
        else if (command === 'del') {
    // Check if sender is bot owner by comparing the numeric part
    const senderNumber = message.sender.split('@')[0];
    if (!config.OWNER_NUMBER.includes(senderNumber)) {
        return await bot.sock.sendMessage(message.chat, {
            text: "Only bot owners can delete games!",
            mentions: []
        });
    }

    // Check if there's a game to delete
    if (!tttGames.has(chatId)) {
        return await bot.sock.sendMessage(message.chat, {
            text: "There's no active Tic-Tac-Toe game in this chat!",
            mentions: []
        });
    }

    const game = tttGames.get(chatId);
    let participants = [];
    
    if (game.player1) participants.push(game.player1);
    if (game.player2) participants.push(game.player2);

    tttGames.delete(chatId);

    return await bot.sock.sendMessage(message.chat, {
        text: `⚠️ Game forcefully deleted by owner!\n\n` +
              `Players: ${participants.length ? participants.map(p => `@${p.split('@')[0]}`).join(' ') : 'None'}`,
        mentions: participants
    });
}
    }
);

// Text listener for game moves, replies, and join commands
bot(
    {
        on: 'text',
        name: "ttt-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            // Skip processing if:
            // - This message should be ignored by game system
            // - Message is from the bot itself
            if (message.skipAlya || message.isBot || !message.chat || !message.sender) return;
            
            const chatId = message.chat.id;
            const text = message.text?.toLowerCase().trim();
            const game = tttGames.get(chatId);

            // Handle join command (either direct or as reply)
            if (text === 'ttt join' || (message.quoted?.fromMe && text.includes('ttt join'))) {
                if (!game || game.status !== 'waiting') return; // No game waiting for players
                
                if (message.sender !== game.player1) {
                    game.player2 = message.sender;
                    game.status = 'playing';
                    
                    // Assign symbol to player2 (opposite of player1)
                    game.symbols[message.sender] = game.symbols[game.player1] === '❌' ? '⭕' : '❌';
                    
                    // Randomly choose who goes first
                    game.currentPlayer = Math.random() < 0.5 ? game.player1 : game.player2;

                    return await bot.sock.sendMessage(message.chat, {
                        text: `🎮 Game is on!\n\n` +
                              `Player 1: @${game.player1.split('@')[0]} (${game.symbols[game.player1]})\n` +
                              `Player 2: @${game.player2.split('@')[0]} (${game.symbols[game.player2]})\n\n` +
                              `First move: @${game.currentPlayer.split('@')[0]}\n\n` +
                              `${generateBoard(game.board)}`,
                        mentions: [game.player1, game.player2, game.currentPlayer]
                    });
                }
                return;
            }

            // Handle game moves if there's an active game
            if (!game || game.status !== 'playing') return;

            const sender = message.sender;

            // Check if the sender is one of the players
            if (sender !== game.player1 && sender !== game.player2) return;

            // Check if it's a reply to the game message or a direct move
            const isReplyToGame = message.quoted?.fromMe;
            
            // Extract move number from message
            let moveText = text;
            if (isReplyToGame || !isNaN(parseInt(text))) {
                moveText = text.replace(/[^1-9]/g, ''); // Extract numbers
                if (!moveText) return;
            } else {
                return;
            }

            // Parse the move (number 1-9)
            const move = parseInt(moveText);
            if (isNaN(move)) return; // Not a number

            // Check if it's the sender's turn
            if (sender !== game.currentPlayer) {
                return await bot.sock.sendMessage(message.chat, {
                    text: `⚠️ It's not your turn! @${game.currentPlayer.split('@')[0]} should play next.`,
                    mentions: [game.currentPlayer]
                });
            }

            // Check if move is valid (1-9)
            if (move < 1 || move > 9) {
                return await bot.sock.sendMessage(message.chat, {
                    text: "Please enter a number between 1 and 9.",
                    mentions: []
                });
            }

            const boardIndex = move - 1;

            // Check if the cell is already taken
            if (game.board[boardIndex] !== null) {
                return await bot.sock.sendMessage(message.chat, {
                    text: "That position is already taken! Choose another one.",
                    mentions: []
                });
            }

            // Make the move
            game.board[boardIndex] = game.symbols[sender];

            // Check for winner
            if (checkWinner(game.board, game.symbols[sender])) {
                const winner = sender;
                const loser = sender === game.player1 ? game.player2 : game.player1;
                
                await bot.sock.sendMessage(message.chat, {
                    text: `🎉 @${winner.split('@')[0]} (${game.symbols[winner]}) wins!\n\n` +
                          `${generateBoard(game.board)}\n\n` +
                          `Better luck next time @${loser.split('@')[0]}!`,
                    mentions: [winner, loser]
                });
                
                tttGames.delete(chatId);
                return;
            }

            // Check for tie
            if (isBoardFull(game.board)) {
                await bot.sock.sendMessage(message.chat, {
                    text: `🤝 It's a tie!\n\n` +
                          `${generateBoard(game.board)}\n\n` +
                          `Good game @${game.player1.split('@')[0]} and @${game.player2.split('@')[0]}!`,
                    mentions: [game.player1, game.player2]
                });
                
                tttGames.delete(chatId);
                return;
            }

            // Switch turns
            game.currentPlayer = sender === game.player1 ? game.player2 : game.player1;

            // Send updated board
            return await bot.sock.sendMessage(message.chat, {
                text: `@${game.currentPlayer.split('@')[0]}'s turn (${game.symbols[game.currentPlayer]})\n\n` +
                      `${generateBoard(game.board)}`,
                mentions: [game.currentPlayer]
            });
        } catch (error) {
            console.error('Error in ttt listener:', error);
        }
    }
);

// Game state storage
const wcGames = new Map();
const TURN_TIME_LIMIT = 30000; // 30 seconds in milliseconds
const BASE_WORD_LENGTH = 3; // Starting word length
const SCORE_PER_LETTER = 1; // Points per letter in the word

// List of common 3-letter starting words
const STARTING_WORDS = [
    'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 
    'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'pear',
    'quince', 'raspberry', 'strawberry', 'tangerine', 'ugli', 'vanilla',
    'watermelon', 'xigua', 'yam', 'zucchini'
];

// Helper function to validate word chain rules
function isValidWord(currentWord, newWord, usedWords, requiredLength) {
    // Check if the new word starts with the last letter of current word,
    // hasn't been used before, and meets length requirement
    return newWord[0].toLowerCase() === currentWord.slice(-1).toLowerCase() && 
           !usedWords.includes(newWord.toLowerCase()) &&
           newWord.length === requiredLength;
}

// Function to handle turn timeout
async function handleTimeout(chatId, bot) {
    const game = wcGames.get(chatId);
    if (!game || !game.timer) return;

    clearTimeout(game.timer);
    game.timer = null;
    
    // Eliminate the player who didn't respond in time
    const eliminatedPlayer = game.currentPlayer;
    const playerIndex = game.players.indexOf(eliminatedPlayer);
    game.players.splice(playerIndex, 1);

    if (game.players.length < 2) {
        // Game ends if only one player remains
        const winner = game.players[0];
        await bot.sock.sendMessage(chatId, {
            text: `⏰ Time's up! @${eliminatedPlayer.split('@')[0]} was eliminated.\n\n` +
                  `🎉 @${winner.split('@')[0]} wins with a score of ${game.scores[winner]} points!\n\n` +
                  `Final word: *${game.currentWord}*\n` +
                  `Game lasted ${game.round} rounds.`,
            mentions: [eliminatedPlayer, winner]
        });
        wcGames.delete(chatId);
        return;
    }

    // Continue game with remaining players
    game.currentPlayer = game.players[playerIndex % game.players.length];
    game.timer = setTimeout(() => handleTimeout(chatId, bot), TURN_TIME_LIMIT);

    await bot.sock.sendMessage(chatId, {
        text: `⏰ Time's up! @${eliminatedPlayer.split('@')[0]} was eliminated.\n\n` +
              `Remaining players: ${game.players.map(p => `@${p.split('@')[0]} (${game.scores[p]} pts)`).join(' ')}\n\n` +
              `Next word must start with "${game.currentWord.slice(-1)}" and be ${game.requiredLength} letters long\n` +
              `@${game.currentPlayer.split('@')[0]}'s turn!`,
        mentions: [...game.players, eliminatedPlayer]
    });
}

// Main Word Chain command
bot(
    {
        name: 'wc',
        info: 'Play Word Chain with other players',
        category: "game",
        usage: "wc start - Start a new game with a random word\n" +
               "wc join - Join an existing game\n" +
               "wc del - Delete current game (bot owner only)"
    },
    async (message, bot) => {
        // Skip processing if message is from the bot itself or missing required properties
        if (message.isBot || !message.chat || !message.sender) return;

        const command = message.args?.[0]?.toLowerCase();
        const chatId = message.chat.id;

        if (command === 'start') {
            // Check if there's already a game in this chat
            if (wcGames.has(chatId)) {
                return await bot.sock.sendMessage(message.chat, {
                    text: "There's already a Word Chain game in progress in this chat!",
                    mentions: []
                });
            }

            // Select a random starting word
            const startingWord = STARTING_WORDS[Math.floor(Math.random() * STARTING_WORDS.length)];

            // Create a new game state
            const newGame = {
                status: 'waiting',
                players: [message.sender],
                currentWord: startingWord,
                usedWords: [startingWord.toLowerCase()],
                currentPlayer: null,
                lastPlayer: null,
                timer: null,
                round: 1,
                requiredLength: BASE_WORD_LENGTH,
                scores: { [message.sender]: 0 }
            };

            wcGames.set(chatId, newGame);

            return await bot.sock.sendMessage(message.chat, {
                text: `🔠 Word Chain Game Started!\n\n` +
                      `Starting word: *${startingWord}* (${startingWord.length} letters)\n\n` +
                      `Waiting for players to reply with "wc join" to join the game.\n\n` +
                      `Current players: @${message.sender.split('@')[0]} (0 pts)\n\n` +
                      `Each turn has a ${TURN_TIME_LIMIT/1000}-second time limit!\n` +
                      `Score is calculated by word length (${SCORE_PER_LETTER} pt per letter).\n\n` +
                      `Game will start automatically when at least 2 players have joined.`,
                mentions: [message.sender]
            });
        }
        else if (command === 'del') {
            // Check if sender is bot owner by comparing the numeric part
            const senderNumber = message.sender.split('@')[0];
            if (!config.OWNER_NUMBER.includes(senderNumber)) {
                return await bot.sock.sendMessage(message.chat, {
                    text: "Only bot owners can delete games!",
                    mentions: []
                });
            }

            // Check if there's a game to delete
            if (!wcGames.has(chatId)) {
                return await bot.sock.sendMessage(message.chat, {
                    text: "There's no active Word Chain game in this chat!",
                    mentions: []
                });
            }

            const game = wcGames.get(chatId);
            const participants = game.players || [];
            
            // Clear any active timer
            if (game.timer) {
                clearTimeout(game.timer);
            }
            
            wcGames.delete(chatId);

            return await bot.sock.sendMessage(message.chat, {
                text: `⚠️ Game forcefully deleted by owner!\n\n` +
                      `Players: ${participants.length ? participants.map(p => `@${p.split('@')[0]} (${game.scores[p]} pts)`).join(' ') : 'None'}`,
                mentions: participants
            });
        }
    }
);

// Text listener for game moves and join commands
bot(
    {
        on: 'text',
        name: "wc-listener",
        ignoreRestrictions: true
    },
    async (message, bot) => {
        try {
            // Skip processing if:
            // - This message should be ignored by game system
            // - Message is from the bot itself
            if (message.skipAlya || message.isBot || !message.chat || !message.sender) return;
            
            const chatId = message.chat.id;
            const text = message.text?.toLowerCase().trim();
            const game = wcGames.get(chatId);

            // Handle join command (either direct or as reply)
            if (text === 'wc join' || (message.quoted?.fromMe && text.includes('wc join'))) {
                if (!game || game.status !== 'waiting') return; // No game waiting for players
                
                if (!game.players.includes(message.sender)) {
                    game.players.push(message.sender);
                    game.scores[message.sender] = 0; // Initialize score for new player
                    
                    return await bot.sock.sendMessage(message.chat, {
                        text: `@${message.sender.split('@')[0]} has joined the Word Chain game!\n\n` +
                              `Current players: ${game.players.map(p => `@${p.split('@')[0]} (${game.scores[p]} pts)`).join(' ')}\n\n` +
                              `Starting word: *${game.currentWord}* (${game.currentWord.length} letters)\n\n` +
                              `Game will start automatically when at least 2 players have joined.\n` +
                              `Each turn has a ${TURN_TIME_LIMIT/1000}-second time limit!`,
                        mentions: [...game.players]
                    });
                }
                return;
            }

            // Start game automatically when 2+ players have joined
            if (game && game.status === 'waiting' && game.players.length >= 2) {
                game.status = 'playing';
                game.currentPlayer = game.players[Math.floor(Math.random() * game.players.length)];
                
                // Set timer for first turn
                game.timer = setTimeout(() => handleTimeout(chatId, bot), TURN_TIME_LIMIT);
                
                return await bot.sock.sendMessage(message.chat, {
                    text: `🔠 Game is on!\n\n` +
                          `Players: ${game.players.map(p => `@${p.split('@')[0]} (${game.scores[p]} pts)`).join(' ')}\n\n` +
                          `First word: *${game.currentWord}* (${game.currentWord.length} letters)\n\n` +
                          `First turn: @${game.currentPlayer.split('@')[0]}\n` +
                          `(must start with "${game.currentWord.slice(-1)}" and be ${game.requiredLength} letters long)\n\n` +
                          `You have ${TURN_TIME_LIMIT/1000} seconds to respond!`,
                    mentions: [...game.players, game.currentPlayer]
                });
            }

            // Handle game moves if there's an active game
            if (!game || game.status !== 'playing') return;

            const sender = message.sender;

            // Check if the sender is one of the players
            if (!game.players.includes(sender)) return;

            // Check if it's the sender's turn
            if (sender !== game.currentPlayer) {
                return await bot.sock.sendMessage(message.chat, {
                    text: `⚠️ It's not your turn! @${game.currentPlayer.split('@')[0]} should play next.`,
                    mentions: [game.currentPlayer]
                });
            }

            // Check if the word is valid
            const newWord = text.toLowerCase();
            if (!isValidWord(game.currentWord, newWord, game.usedWords, game.requiredLength)) {
                return await bot.sock.sendMessage(message.chat, {
                    text: `Invalid word! It must:\n` +
                          `1. Start with "${game.currentWord.slice(-1)}"\n` +
                          `2. Be exactly ${game.requiredLength} letters long\n` +
                          `3. Not be used before in this game`,
                    mentions: []
                });
            }

            // Clear previous timer
            if (game.timer) {
                clearTimeout(game.timer);
                game.timer = null;
            }

            // Calculate score for this word
            const wordScore = newWord.length * SCORE_PER_LETTER;
            game.scores[sender] = (game.scores[sender] || 0) + wordScore;

            // Update game state
            game.usedWords.push(newWord);
            game.currentWord = newWord;
            game.lastPlayer = sender;
            
            // Determine next player (round-robin)
            const currentIndex = game.players.indexOf(sender);
            game.currentPlayer = game.players[(currentIndex + 1) % game.players.length];

            // Increase word length every round (3-4-5-6-7-8...)
            game.round++;
            game.requiredLength = BASE_WORD_LENGTH + Math.floor((game.round - 1) / game.players.length);

            // Set new timer for next player
            game.timer = setTimeout(() => handleTimeout(chatId, bot), TURN_TIME_LIMIT);

            // Send updated game state
            return await bot.sock.sendMessage(message.chat, {
                text: `🔠 Word Chain (Round ${game.round})\n\n` +
                      `Word: *${newWord}* (${wordScore} pts)\n` +
                      `Player: @${sender.split('@')[0]} (Total: ${game.scores[sender]} pts)\n\n` +
                      `Next player: @${game.currentPlayer.split('@')[0]}\n` +
                      `(must start with "${newWord.slice(-1)}" and be ${game.requiredLength} letters long)\n\n` +
                      `You have ${TURN_TIME_LIMIT/1000} seconds to respond!\n\n` +
                      `Scores: ${game.players.map(p => `@${p.split('@')[0]}: ${game.scores[p]}`).join(' | ')}`,
                mentions: [...game.players, game.currentPlayer]
            });

        } catch (error) {
            console.error('Error in wc listener:', error);
        }
    }
);