/**
 * Intro and Story System
 */

class IntroScene {
    constructor() {
        this.step = 0;
        this.dialogue = [
            {
                speaker: 'Professor Cypress',
                text: 'Welcome to the world of Locomotia! This land is home to remarkable creatures called trains—living beings of steam, steel, and spirit.',
                avatar: 'professor'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Trains aren\'t mere machines here. They\'re born from the ancient Rails of Power, and each one has its own personality, dreams, and fighting spirit!',
                avatar: 'professor'
            },
            {
                speaker: 'Professor Cypress',
                text: 'People who bond with these trains are called Conductors. We raise them, battle alongside them, and journey together across this great land.',
                avatar: 'professor'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Your grandfather... he was the greatest Conductor Locomotia has ever known. His partner train, Old Iron, saved us all during the Great Derailment decades ago.',
                avatar: 'professor'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Old Iron was a magnificent steam locomotive with a heart of gold and the strength to move mountains. The bond between them was legendary...',
                avatar: 'professor'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Your grandfather always believed that trains and humans were meant to be partners—equals on the journey of life. I know he\'d be proud to see you here today.',
                avatar: 'professor'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Now, your very own train legend is about to unfold! A new chapter in the great story of Locomotia begins with you!',
                avatar: 'professor'
            }
        ];

        this.currentDialogue = 0;
        this.playerName = 'Alex';
        this.completed = false;
    }

    getCurrentDialogue() {
        if (this.currentDialogue < this.dialogue.length) {
            return this.dialogue[this.currentDialogue];
        }
        return null;
    }

    advance() {
        this.currentDialogue++;
        if (this.currentDialogue >= this.dialogue.length) {
            this.completed = true;
        }
    }

    isComplete() {
        return this.completed;
    }
}

class StarterSelection {
    constructor(game) {
        this.game = game;
        this.selection = 0;
        this.confirmed = false;
        this.selectedTrain = null;
        this.phase = 'intro'; // 'intro', 'selection', 'confirmation', 'post-selection'

        this.introDialogue = [
            {
                speaker: 'Professor Cypress',
                text: 'Look here! I\'ve discovered three rare train eggs near the old Whistlestop Yards. Each one contains a different type of train—each with unique potential!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'As my late friend—your grandfather—used to say: \'The best train isn\'t the strongest or fastest. It\'s the one whose heart beats in rhythm with yours.\''
            },
            {
                speaker: 'Professor Cypress',
                text: 'Now, take your time and choose the partner who calls to you. This is an important decision!'
            }
        ];

        this.currentIntroDialogue = 0;

        this.starters = [
            {
                id: 1,
                name: 'Steamini',
                displayName: 'STEAMINI',
                types: ['STEAM'],
                description: 'A copper-colored steam train with a warm, gentle heart. Steamini puffs clouds of white steam when happy and loves to help others. Reliable and steadfast—a true friend for any journey.',
                sprite: 'steamini'
            },
            {
                id: 4,
                name: 'Sparkart',
                displayName: 'SPARKART',
                types: ['ELECTRIC'],
                description: 'A sleek, silver electric train crackling with energy. Sparkart is quick-witted and loves to race the wind. Fast, ambitious, and always ready for a challenge!',
                sprite: 'sparkart'
            },
            {
                id: 7,
                name: 'Diesling',
                displayName: 'DIESLING',
                types: ['DIESEL'],
                description: 'A sturdy brown diesel train with a loyal, protective nature. Diesling may be slow to start, but once it gets going, nothing can stop it. Dependable and incredibly strong.',
                sprite: 'diesling'
            }
        ];

        this.postSelectionDialogue = [
            {
                speaker: 'Professor Cypress',
                text: '',  // Will be filled based on selection
                choiceBased: true
            },
            {
                speaker: 'You',
                text: 'I choo-choose you, [TRAIN]!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Now then! Your [TRAIN] is officially registered to you as its Conductor. The bond between you two begins today!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Before you set off, let me give you some essential supplies. Every Conductor needs these!'
            },
            {
                speaker: 'System',
                text: 'Professor Cypress handed you 5 TRAINBALLS and 2 POTIONS!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Boxcars are used to catch wild trains you encounter on your journey. Throw one when a wild train is weakened in battle!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Potions will heal your trains when they\'re injured. Remember—a good Conductor always takes care of their trains\' health and happiness!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Your grandfather used to tell me: \'The rails will take you anywhere, but only your heart will show you where to go.\''
            },
            {
                speaker: 'Professor Cypress',
                text: 'Now, head out to Coal Harbor! Captain Marina is the Station Master there—defeat her in battle to earn your first Rail Badge!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'But take your time! Explore Route 1, catch some wild trains, and train your partner. The journey is just as important as the destination!'
            },
            {
                speaker: 'Professor Cypress',
                text: 'Good luck, young Conductor! May your rails always run true, and may your trains always come home safely!'
            }
        ];

        this.currentPostDialogue = 0;
    }

    moveSelection(direction) {
        if (this.phase !== 'selection') return;
        if (direction === 'left') {
            this.selection = (this.selection - 1 + 3) % 3;
        } else if (direction === 'right') {
            this.selection = (this.selection + 1) % 3;
        }
    }

    confirmSelection() {
        if (this.phase === 'selection') {
            this.phase = 'confirmation';
        } else if (this.phase === 'confirmation') {
            this.confirm();
        }
    }

    cancelSelection() {
        if (this.phase === 'confirmation') {
            this.phase = 'selection';
        }
    }

    confirm() {
        this.selectedTrain = this.starters[this.selection];
        this.confirmed = true;

        // Set the choice-based dialogue based on selection
        const choiceDialogues = [
            'Ah, Steamini! An excellent choice! This little steam train has a heart as warm as its boiler. Your grandfather\'s Old Iron was a steam type too—it seems the rails have a way of connecting families!',
            'Ah, Sparkart! A splendid choice! This electric speedster has lightning in its wheels and fire in its spirit. You two are going to have quite the electrifying adventure together!',
            'Ah, Diesling! A wonderful choice! This diesel engine has the strength of mountains and the loyalty of a lifelong friend. Together, you\'ll overcome any obstacle on the tracks ahead!'
        ];

        this.postSelectionDialogue[0].text = choiceDialogues[this.selection];

        // Personalize the rival's selected-train line.
        this.postSelectionDialogue[1].text = this.postSelectionDialogue[1].text.replace('[TRAIN]', this.selectedTrain.name);

        // Personalize the registration line.
        this.postSelectionDialogue[2].text = this.postSelectionDialogue[2].text.replace('[TRAIN]', this.selectedTrain.name);

        const starterTrain = new Train(this.selectedTrain.id, 5);
        if (this.game && this.game.player) {
            this.game.player.addTrain(starterTrain);

            // Give player starting items
            if (!this.game.player.items) {
                this.game.player.items = {};
            }
            this.game.player.items.boxcar = 5;  // Boxcars
            this.game.player.items.pokeball = 5; // Legacy save/test alias
            this.game.player.items.potion = 2;     // Potions
            this.game.player.hasStarterTrain = true;
        }

        this.phase = 'post-selection';
        console.log(`Selected ${starterTrain.species.name}!`);
    }

    getCurrentStarter() {
        return this.starters[this.selection];
    }

    advanceIntro() {
        this.currentIntroDialogue++;
        if (this.currentIntroDialogue >= this.introDialogue.length) {
            this.phase = 'selection';
        }
    }

    getCurrentIntroDialogue() {
        if (this.currentIntroDialogue < this.introDialogue.length) {
            return this.introDialogue[this.currentIntroDialogue];
        }
        return null;
    }

    advancePostSelection() {
        this.currentPostDialogue++;
        return this.currentPostDialogue >= this.postSelectionDialogue.length;
    }

    getCurrentPostDialogue() {
        if (this.currentPostDialogue < this.postSelectionDialogue.length) {
            return this.postSelectionDialogue[this.currentPostDialogue];
        }
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IntroScene, StarterSelection };
}
