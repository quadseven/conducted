/**
 * Game constants - matching Pokemon Red/Blue style
 */

const CONSTANTS = {
    // Display settings
    TILE_SIZE: 16,
    SCALE: 3,
    SCREEN_TILES_X: 16,
    SCREEN_TILES_Y: 14,
    CANVAS_WIDTH: 768,
    CANVAS_HEIGHT: 672,
    FPS: 60,

    // Game info
    GAME_TITLE: "Grand Transit",
    VERSION: "2.0.0",

    // Colors (Authentic Game Boy Color palette - Pokemon Red/Blue style)
    // Based on GBC 15-bit RGB palette used in Pokemon games
    COLORS: {
        // Base 4-shade palette (inspired by Pokemon SGB palette)
        WHITE: '#F8F8F0',      // Slightly warm white
        LIGHT: '#C8C8A0',      // Light tan/cream
        MEDIUM: '#90A090',     // Medium gray-green
        DARK: '#485048',       // Dark gray-green
        BLACK: '#181818',      // Near black
        TRANSPARENT: '#FF00FF',

        // UI Colors (limited GBC palette)
        UI_BG: '#F8F8F0',      // Warm white background
        UI_BORDER: '#181818',  // Dark border
        UI_TEXT: '#181818',    // Dark text
        UI_HIGHLIGHT: '#5878A8', // Blue highlight (Pokemon menu blue)
        UI_SHADOW: '#90A090',  // Shadow color for depth

        // HP Bar Colors (Pokemon-accurate)
        HP_GREEN: '#58D878',   // Bright green (high HP)
        HP_YELLOW: '#F8C838',  // Yellow (medium HP)
        HP_RED: '#F83048',     // Red (low HP)
        HP_BG: '#90A090',      // HP bar background

        // Battle Screen Colors
        BATTLE_BG: '#F8F8F0',
        BATTLE_TEXT_BG: '#F8F8F0',
        BATTLE_TEXT_BORDER: '#181818',

        // Overworld Colors
        GRASS_LIGHT: '#58D878',
        GRASS_DARK: '#309850',
        WATER: '#5890D0',
        PATH: '#C8B898',

        LIGHT_GRAY: '#C8C8A0',

        // Cohesive overworld tile palette (muted GBC, two tones per material
        // so tiles read as textured rather than flat fills).
        GRASS_BASE: '#7BB662',
        GRASS_ALT: '#6AA552',
        GRASS_SPECK: '#5C9447',
        TALLGRASS_BASE: '#4F9A4B',
        TALLGRASS_ALT: '#3F8540',
        PATH_BASE: '#D8C7A0',
        PATH_ALT: '#C8A882',
        PATH_EDGE: '#B8924E',
        WATER_BASE: '#5878A8',
        WATER_ALT: '#6E8CC0',
        WALL_BASE: '#6B4226',
        WALL_ALT: '#4A2818',
        RAIL_BASE: '#5C5C5C',
        RAIL_TIE: '#3A3A3A',
        DOOR_BASE: '#8B5A3C',

        // Battle backdrop + locomotive fallback art (steam-engine palette from
        // ART_DIRECTION_SPECS.md).
        BATTLE_SKY: '#9CD0E8',
        BATTLE_SKY2: '#BCE0F0',
        BATTLE_GROUND: '#C8A882',
        BATTLE_PLATFORM: '#A67C52',
        LOCO_BODY: '#6B4226',
        LOCO_BODY_DARK: '#4A2818',
        LOCO_BRASS: '#D4A857',
        LOCO_IRON: '#5C5C5C',
        LOCO_IRON_DARK: '#3A3A3A',
        LOCO_RED: '#D64545',
        LOCO_STEAM: '#E8E8E8'
    },

    // Game states
    STATES: {
        TITLE: 'title',
        INTRO: 'intro',
        STARTER_SELECTION: 'starter_selection',
        OVERWORLD: 'overworld',
        BATTLE: 'battle',
        BATTLE_SUMMARY: 'battle_summary',
        MENU: 'menu',
        DIALOGUE: 'dialogue',
        TRANSITION: 'transition'
    },

    // Directions
    DIRECTIONS: {
        UP: 0,
        DOWN: 1,
        LEFT: 2,
        RIGHT: 3
    },

    // Train types
    TYPES: [
        'STEAM',
        'ELECTRIC',
        'DIESEL',
        'MAGLEV',
        'FREIGHT',
        'PASSENGER',
        'NUCLEAR',
        'MONORAIL'
    ],

    // Type colors for UI (GBC-limited palette, Pokemon-style)
    TYPE_COLORS: {
        'STEAM': '#C8C8C8',    // Light gray (like Normal type)
        'ELECTRIC': '#F8D030',  // Yellow (Pokemon Electric yellow)
        'DIESEL': '#705848',    // Brown (Pokemon Ground brown)
        'MAGLEV': '#A890F0',    // Purple (Pokemon Psychic purple)
        'FREIGHT': '#C09058',   // Orange-brown (Pokemon Fighting)
        'PASSENGER': '#A8A878', // Gray-tan (Pokemon Normal)
        'NUCLEAR': '#A040A0',   // Dark purple (Pokemon Poison)
        'MONORAIL': '#A8B820'   // Yellow-green (Pokemon Bug)
    },

    // Type effectiveness chart
    TYPE_CHART: {
        'STEAM': { 'ELECTRIC': 0.5, 'DIESEL': 2.0, 'NUCLEAR': 0.5 },
        'ELECTRIC': { 'STEAM': 2.0, 'DIESEL': 0.5, 'MAGLEV': 2.0 },
        'DIESEL': { 'ELECTRIC': 2.0, 'STEAM': 0.5, 'FREIGHT': 0.5 },
        'MAGLEV': { 'FREIGHT': 2.0, 'ELECTRIC': 0.5, 'MONORAIL': 0.5 },
        'FREIGHT': { 'MAGLEV': 0.5, 'PASSENGER': 2.0, 'DIESEL': 2.0 },
        'PASSENGER': { 'NUCLEAR': 2.0, 'FREIGHT': 0.5, 'MONORAIL': 0.5 },
        'NUCLEAR': { 'PASSENGER': 0.5, 'MONORAIL': 2.0, 'STEAM': 2.0 },
        'MONORAIL': { 'NUCLEAR': 0.5, 'MAGLEV': 2.0, 'PASSENGER': 2.0 }
    },

    // Max values
    MAX_LEVEL: 100,
    MAX_PARTY_SIZE: 6,
    MAX_MOVES: 4,
    TOTAL_TRAINS: 151,

    // Battle
    BATTLE_STATES: {
        INTRO: 'intro',
        MENU: 'menu',
        FIGHT: 'fight',
        POKEMON: 'pokemon',
        ITEM: 'item',
        RUN: 'run',
        ANIMATION: 'animation',
        MESSAGE: 'message',
        VICTORY: 'victory',
        DEFEAT: 'defeat',
        BATTLE_SUMMARY: 'battle_summary'
    },

    // Player starting position
    PLAYER_START: {
        x: 10,
        y: 10,
        map: 'PistonTown'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}
